/**
 * 非线性拟合 - js实现
 *   适用于简单的小数据非线性拟合。如果涉及大量数据，建议用 `nonlinear-tfjs.ts` 的版本。
 * 
 * 算法原理（Levenberg-Marquardt迭代）：
 *   非线性最小二乘的目标：找参数 p 使 Σ (yᵢ_observed − yᵢ_predicted)² 最小。
 *   传统 Gauss-Newton 迭代：
 *     1.  算残差 r = y_obs − y_pred
 *     2.  算雅可比 J = ∂y_pred/∂p
 *     3.  解正规方程：(JᵀJ) δ = Jᵀr
 *     4.  更新参数：p_new = p + δ
 *     5.  检查收敛；不收敛就回到第 1 步
 *   Levenberg-Marquardt 迭代：
 *     把上述第 3 步的正规方程改为： (JᵀJ + λI) δ = Jᵀr
 *     LM 算法是梯度下降和高斯-牛顿法的折中。
 *     - 阻尼因子 λ 较大时接近梯度下降（稳定但收敛慢）
 *     - λ 较小时接近高斯-牛顿法（快速但可能发散）
 *     通过自适应调整 λ 来平衡收敛速度和稳定性
 *
 *  迭代公式：(JᵀJ + λI)Δp = Jᵀr
 *   其中 J 为雅可比矩阵，r 为残差向量，Δp 为参数更新量
 */


/** L-M 算法配置选项 */
export interface LevenbergMarquardtOptions {
  /** 初始阻尼因子（默认 1e-3） */
  lambdaInit?: number
  /** 阻尼因子上调因子（默认 10） */
  lambdaUp?: number
  /** 阻尼因子下调因子（默认 0.1） */
  lambdaDown?: number
  /** 最大迭代次数（默认 100） */
  maxIterations?: number
  /** 参数收敛容差（默认 1e-8） */
  paramTolerance?: number
  /** 残差收敛容差（默认 1e-8） */
  costTolerance?: number
  /** 数值差分步长（用于雅可比矩阵计算，默认 1e-6） */
  stepSize?: number
}


/**
 * Levenberg-Marquardt 非线性最小二乘拟合
 *
 * @param fn 预测函数：接受参数字典，返回预测值数组
 * @param initialParams 初始参数猜测值
 * @param paramNames 参数名列表（顺序固定）
 * @param xData 自变量数组
 * @param yData 因变量数组
 * @param options 可选配置
 * @returns 拟合结果（参数、R²、残差、协方差、收敛信息）
 */
export function levenbergMarquardt(
  fn: (params: Record<string, number>) => number[],
  initialParams: Record<string, number>,
  paramNames: string[],
  xData: number[],
  yData: number[],
  options: LevenbergMarquardtOptions = {},
) {
  // 解构赋值 + 设置默认值
  const {
    lambdaInit = 1e-3,
    lambdaUp = 10,
    lambdaDown = 0.1,
    maxIterations = 100,
    paramTolerance = 1e-8,
    costTolerance = 1e-8,
    stepSize = 1e-6,
  } = options

  /** n - 数据样本量 */
  const n = xData.length
  /** p - 参数个数 */
  const p = paramNames.length;
  // 检查输入数据长度是否一致
  if (n !== yData.length) {
    throw new Error('xData 和 yData 长度不一致')
  }
  // 检查数据点数是否足够
  if (n < p) {
    throw new Error(`数据点数 (${n}) 不能少于参数个数 (${p})`)
  }

  // 初始化迭代参数
  /** 参数集，迭代时动态改变 */
  let currentParams: Record<string, number> = { ...initialParams }
  /** 阻尼因子，迭代时动态改变 */
  let lambda = lambdaInit
  /** 收敛信息指针 */
  let converged = false
  /** 迭代次数计数 */
  let iteration = 0

  // 计算当前残差和代价（SSE）
  const computeResiduals = (params: Record<string, number>): number[] => {
    const predicted = fn(params);
    return yData.map((y, i) => y - predicted[i]!);
  };

  const computeSSE = (residuals: number[]): number => {
    return residuals.reduce((sum, r) => sum + r * r, 0);
  };

  let currentResiduals = computeResiduals(currentParams);
  let currentSSE = computeSSE(currentResiduals);

  // ── 主迭代循环 ──
  for (iteration = 0; iteration < maxIterations; iteration++) {
    // 计算雅可比矩阵
    const jacobian = computeJacobian(fn, currentParams, paramNames, stepSize, n);

    // 构建 JᵀJ（p×p 矩阵）和 Jᵀr（p 维向量）
    const jtj: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    const jtr: number[] = new Array(p).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        jtr[j]! += jacobian[i]![j]! * currentResiduals[i]!;
        for (let k = 0; k <= j; k++) {
          jtj[j]![k]! += jacobian[i]![j]! * jacobian[i]![k]!;
        }
      }
    }
    // 对称填充
    for (let j = 0; j < p; j++) {
      for (let k = j + 1; k < p; k++) {
        jtj[j]![k] = jtj[k]![j]!;
      }
    }

    // LM 迭代：尝试更新参数
    let accepted = false;
    for (let innerIter = 0; innerIter < 20; innerIter++) {
      // 构建 (JᵀJ + λI) Δp = Jᵀr 的正规方程
      // 其中 I 的对角元素替换为 JᵀJ 的对角元素（Marquardt 的改进）
      const matrix: number[][] = jtj.map((row, j) =>
        row.map((val, k) => (j === k ? val * (1 + lambda) : val)),
      );

      // 用高斯消元法求解线性方程组
      const deltaP = solveLinearSystem(matrix, jtr);
      if (deltaP === null) {
        // 矩阵奇异，增大 λ 重试
        lambda *= lambdaUp;
        continue;
      }

      // 试探新参数
      const trialParams: Record<string, number> = {};
      for (let j = 0; j < p; j++) {
        trialParams[paramNames[j]!] = (currentParams[paramNames[j]!] ?? 0) + deltaP[j]!;
      }

      const trialResiduals = computeResiduals(trialParams);
      const trialSSE = computeSSE(trialResiduals);

      if (trialSSE < currentSSE) {
        // 接受更新
        const maxDelta = Math.max(...deltaP.map(Math.abs));
        const paramChange = maxDelta / Math.max(
          ...paramNames.map((name) => Math.abs(currentParams[name] ?? 1)),
        );

        currentParams = trialParams;
        currentResiduals = trialResiduals;
        currentSSE = trialSSE;
        lambda = Math.max(lambda * lambdaDown, 1e-12);
        accepted = true;

        // 检查收敛
        if (paramChange < paramTolerance || currentSSE < costTolerance) {
          converged = true;
        }
        break;
      } else {
        // 拒绝更新，增大 λ
        lambda *= lambdaUp;
      }
    }

    if (converged || !accepted) {
      break;
    }
  }

  // ── 计算最终统计量 ──

  // 预测值
  const predicted = fn(currentParams);

  // R²
  let yMean = 0;
  for (let i = 0; i < n; i++) yMean += yData[i]!;
  yMean /= n;

  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (yData[i]! - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - currentSSE / ssTot;

  // 协方差矩阵 ≈ σ² * (JᵀJ)⁻¹
  // σ² = SSE / (n - p)
  const sigma2 = currentSSE / Math.max(n - p, 1);
  const finalJacobian = computeJacobian(fn, currentParams, paramNames, stepSize, n);

  const jtjFinal: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k <= j; k++) {
        jtjFinal[j]![k]! += finalJacobian[i]![j]! * finalJacobian[i]![k]!;
      }
    }
  }
  for (let j = 0; j < p; j++) {
    for (let k = j + 1; k < p; k++) {
      jtjFinal[j]![k] = jtjFinal[k]![j]!;
    }
  }

  const jtjInv = invertMatrix(jtjFinal);
  const covariance: number[][] = jtjInv
    ? jtjInv.map((row) => row.map((val) => val * sigma2))
    : [];

  // 参数标准误差 = sqrt(cov[i][i])
  const paramErrors: Record<string, number> = {};
  for (let j = 0; j < p; j++) {
    paramErrors[paramNames[j]!] = covariance.length > 0
      ? Math.sqrt(Math.max(covariance[j]?.[j] ?? 0, 0))
      : 0;
  }

  return {
    params: currentParams,
    paramErrors,
    rSquared,
    residuals: currentResiduals,
    predicted,
    covariance,
    converged: converged || iteration < maxIterations,
    iterations: iteration + 1,
  };
}















/**
 * 计算数值雅可比矩阵（中心差分）
 * 
 * 雅可比矩阵：对每个参数，先把它"推一下"看预测怎么变，把变化量除以推的步长，即构成雅可比矩阵。
 * 数学公式：J[i][j] = ∂yᵢ/∂pⱼ ≈ [f(p + h·eⱼ) − f(p − h·eⱼ)] / (2h)
 * 其中 hⱼ = relativeStep × max(|pⱼ|, typicalValueⱼ, 1)
 * 
 * @param fn 非线性方程，形式为：(params) => predicted[]
 * @param params 当前全部参数及其值
 * @param paramNames 需要拟合的参数名称数组
 * @param stepSize 差分步长
 * @param n 数据点数
 * @returns 雅可比矩阵 [n × p]
 */
function computeJacobian(
  fn: (params: Record<string, number>) => number[],
  params: Record<string, number>,
  paramNames: string[],
  stepSize: number,
  n: number,
): number[][] {

  // 一些校验
  // 步长校验
  if (stepSize <= 0 || !Number.isFinite(stepSize)) {
    throw new Error(`stepSize 必须为正有限数，当前为 ${stepSize}`)
  }
  /** 需要拟合的参数个数 */
  const p = paramNames.length
  // 如果需要拟合的参数个数为 0，则抛出错误
  if (p === 0) {
    throw new Error("没有需要拟合的参数")
  }
  // 以 0 初始化雅可比矩阵
  /** 雅可比矩阵：[n × p] */
  const jacobian: number[][] = Array.from({ length: n }, () =>
    new Array(p).fill(0)
  )

  // 外层 j 循环：遍历每个要拟合的参数 p
  for (let j = 0; j < p; j++) {
    /** 参数名称 */
    const paramName = paramNames[j]
    if (!paramName) {
      throw new Error(`第 ${ j } 个参数为空`)
    }
    /** 参数值 */
    const paramValue = params[paramName]
    // 如果参数值为空，则报错
    if (paramValue === undefined) {
      throw new Error(`参数名称 ${ paramName } 有误`)
    }

    // 中心差分
    // 先复制一份全部参数
    const paramsTrial: Record<string, number> = { ...params }
    // 前向扰动：只把迭代到的参数 + stepSize
    paramsTrial[paramName] = paramValue + stepSize
    /** 前向扰动值 */
    const yPlus = fn(paramsTrial)
    // 后向扰动：：只把迭代到的参数 - stepSize
    paramsTrial[paramName] = paramValue - stepSize
    /** 后向扰动值 */
    const yMinus = fn(paramsTrial)

    // 扰动值长度校验
    if ((yPlus.length !== n) || (yMinus.length !== n)) {
      throw new Error(`预设函数计算结果数量为 ${ yPlus.length } ≠ 预期 ${ n }`)
    }

    // 内层 i 循环：遍历每个数据点 n
    for (let i = 0; i < n; i++) {
      // ∂Yᵢ/∂pⱼ = (yPlus[i] − yMinus[i]) / 2h
      jacobian[i]![j] = (yPlus[i]! - yMinus[i]!) / (stepSize * 2)
    }
  }

  // 返回雅可比矩阵
  return jacobian
}
























// ── 线性代数辅助函数（纯函数实现） ──

/**
 * 高斯消元法求解线性方程组 Ax = b
 * @param matrix - 系数矩阵 A（会被修改）
 * @param vector - 右侧向量 b
 * @returns 解向量 x，如果矩阵奇异则返回 null
 */
function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  // 创建副本避免修改原始数据
  const a = matrix.map((row) => [...row]);
  const b = [...vector];

  // 前向消元（带部分主元选取）
  for (let col = 0; col < n; col++) {
    // 寻找主元
    let maxRow = col;
    let maxVal = Math.abs(a[col]![col]!);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row]![col]!) > maxVal) {
        maxRow = row;
        maxVal = Math.abs(a[row]![col]!);
      }
    }

    if (maxVal < 1e-15) {
      return null; // 矩阵奇异
    }

    // 交换行
    if (maxRow !== col) {
      [a[col], a[maxRow]] = [a[maxRow]!, a[col]!];
      [b[col], b[maxRow]] = [b[maxRow]!, b[col]!];
    }

    // 消元
    for (let row = col + 1; row < n; row++) {
      const factor = a[row]![col]! / a[col]![col]!;
      a[row]![col] = 0;
      for (let k = col + 1; k < n; k++) {
        a[row]![k]! -= factor * a[col]![k]!;
      }
      b[row]! -= factor * b[col]!;
    }
  }

  // 回代
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i]!;
    for (let j = i + 1; j < n; j++) {
      sum -= a[i]![j]! * x[j]!;
    }
    x[i] = sum / a[i]![i]!;
  }

  return x;
}

/**
 * 矩阵求逆（高斯-约旦消元法）
 * @param matrix - 方阵
 * @returns 逆矩阵，如果奇异则返回 null
 */
function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  // 创建增广矩阵 [A | I]
  const augmented: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  // 高斯-约旦消元
  for (let col = 0; col < n; col++) {
    // 部分主元
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row]![col]!) > Math.abs(augmented[maxRow]![col]!)) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow]![col]!) < 1e-15) {
      return null;
    }

    [augmented[col], augmented[maxRow]] = [augmented[maxRow]!, augmented[col]!];

    // 归一化主元行
    const pivot = augmented[col]![col]!;
    for (let j = 0; j < 2 * n; j++) {
      augmented[col]![j]! /= pivot;
    }

    // 消去其他行
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row]![col]!;
      for (let j = 0; j < 2 * n; j++) {
        augmented[row]![j]! -= factor * augmented[col]![j]!;
      }
    }
  }

  // 提取右半部分（逆矩阵）
  return augmented.map((row) => row.slice(n));
}
