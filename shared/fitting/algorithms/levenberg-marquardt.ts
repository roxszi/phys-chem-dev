/**
 * Levenberg-Marquardt 非线性最小二乘
 *
 * 不适用：x 也有显著误差时改用 ODR（见 ../odr/）。
 */

/**
 * Levenberg-Marquardt 非线性最小二乘拟合
 *
 * 适用于：x 误差可忽略（或不存在），只优化 y 残差的场景。
 * 对物化实验中的 (t, c)、(1/T, ln k) 等时间-浓度 / 温度-速率数据，
 * x 误差通常 << y 误差，LM 是最简单可靠的选择。
 *
 * 算法核心：
 *   每次迭代解 (JᵀJ + λ·diag(JᵀJ)) · Δp = Jᵀr
 *   λ 大 → 接近最速下降（保守）
 *   λ 小 → 接近 Gauss-Newton（激进）
 *   通过 trust-region（试探 + 升降 λ）在两者间自适应切换
 */
import type {
  PredictFn,
  DataArray,
  IterationState,
} from "@shared/fitting/index.ts"
import {
  validateInputs,
  buildWeightedNormalEquation,
  applyDamping,
  createNumericalJacobian,
  createMarquardtDamping,
  createDefaultConvergence,
  computeStatistics
} from "@shared/fitting/index.ts"
import { getREArr, getSSE } from "@shared/math/index.ts"
import { createGaussianEliminationSolver } from "../matrix-solve.ts"


/**
 * LM 算法配置与结果类型
 */
import type { LinearSolver } from "../matrix-solve.ts"
import type {
  FitResult,
  JacobianProvider,
  DampingStrategy, DampingOptions,
  ConvergenceOptions
} from "@shared/fitting/index.ts"

/**
 * Levenberg-Marquardt 算法配置
 *
 * 所有字段都是可选的——不传任何配置也能用默认值跑起来。
 * 高级用户可以注入自定义的雅可比计算器、线性求解器、阻尼策略等。
 */
export interface LevenbergMarquardtOptions {
  /** 最大外层迭代次数（默认 100） */
  maxIterations?: number
  /** 内层 λ 试探最大次数（默认 20） */
  maxInnerIterations?: number

  /**
   * y 的标准差数组（与 weights 二选一）
   * 
   * 内部转换为 weights = 1/σ²，用于加权正规方程。
   * 与 weights 同时给出时，weights 优先。
   */
  sigmaY?: number[]

  /**
   * 直接指定权重数组（与 sigmaY 二选一，优先级高于 sigmaY）
   *
   * 正比于 1/σ²。若你的权重已经是 1/σ² 形式，用此字段；
   * 若是 σ 形式，用 sigmaY 字段（内部会转换）。
   */
  weights?: number[]

  // ── 可替换模块（依赖注入） ──

  /** 雅可比计算器（默认：数值中心差分） */
  jacobian?: JacobianProvider

  /** 线性方程组求解器（默认：高斯消元） */
  solver?: LinearSolver

  /**
   * 阻尼策略（默认：Marquardt 1963）
   *
   * 同时提供 damping 和 dampingOptions 时，damping 优先。
   */
  damping?: DampingStrategy

  // ── 子模块的配置 ──

  /** 收敛判据配置 */
  convergence?: ConvergenceOptions

  /** 默认阻尼策略的配置（仅当未提供 damping 时生效） */
  dampingOptions?: DampingOptions
}

/**
 * LM 拟合结果（在通用 FitResult 基础上增加 LM 特有诊断字段）
 */
export interface LevenbergMarquardtResult extends FitResult {
  /** 最终阻尼因子 λ（LM 独有诊断） */
  finalLambda: number
}




/**
 * Levenberg-Marquardt算法实现
 * 
 * @example
 * ```typescript
 * import { levenbergMarquardt } from './index.js'
 * 
 * const result = levenbergMarquardt(
 *   (p) => tData.map(t => p.A * Math.exp(-p.k * t)),  // PredictFn: 只接 params
 *   { A: 1, k: 0.1 },                                  // 初始猜测
 *   ['A', 'k'],                                         // 参数名
 *   tData, cData,
 *   {
 *     sigmaY: cSigma,   // 可选；weights = 1/σ² 自动转换
 *     weights: wArr,    // 可选；优先级高于 sigmaY
 *   },
 * )
 * ```
 */
export function levenbergMarquardt(
  fn: PredictFn,
  initialParams: Record<string, number>,
  paramNames: string[],
  xData: DataArray,
  yData: DataArray,
  options: LevenbergMarquardtOptions = {},
): LevenbergMarquardtResult {
  // 1. 解析配置 + 构造默认模块
  const {
    maxIterations = 100,
    maxInnerIterations = 20,
    sigmaY,
    weights,
    jacobian = createNumericalJacobian(),
    solver = createGaussianEliminationSolver(),
    damping = createMarquardtDamping(options.dampingOptions),
    convergence: convOptions,
  } = options

  const convergenceCheck = createDefaultConvergence(convOptions)
  // 防御性 reset：当前每次新建实例不需要，但未来允许外部传入时不会踩坑
  convergenceCheck.reset?.()

  // 2. 输入校验
  const n = validateInputs(xData, yData, paramNames, initialParams, fn)
  const p = paramNames.length

  // 2.1 权重预处理：weights 优先；sigmaY → weights = 1/σ²；都不传则等权（=1）
  let weightArr: number[]
  if (weights) {
    if (weights.length !== n) {
      throw new Error(`weights 长度 ${weights.length} ≠ n ${n}`)
    }
    weightArr = weights
  } else if (sigmaY) {
    if (sigmaY.length !== n) {
      throw new Error(`sigmaY 长度 ${sigmaY.length} ≠ n ${n}`)
    }
    weightArr = sigmaY.map((s) => {
      if (s <= 0 || !Number.isFinite(s)) {
        throw new Error(`sigmaY 含非正或非有限值：${s}`)
      }
      return 1 / (s * s)
    })
  } else {
    weightArr = new Array<number>(n).fill(1)
  }

  // 3. 状态初始化
  let currentParams: Record<string, number> = { ...initialParams }
  let currentResiduals = getREArr(yData, fn(currentParams))
  let currentSSE = getSSE(currentResiduals, weightArr)

  let converged = false
  let iterationsUsed = 0

  // 4. 主迭代循环
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    iterationsUsed++

    // 4.1 计算雅可比矩阵
    const J = jacobian.compute(fn, currentParams, paramNames, n)

    // 4.2 构建加权正规方程 (JᵀWJ, JᵀWr)
    const { jtj, jtr } = buildWeightedNormalEquation(J, currentResiduals, weightArr)

    // 4.2.1 一阶最优性预检查（Nocedal & Wright 标准做法）
    //   若梯度范数已足够小，说明已经在极值点附近，直接判收敛。
    //   这避免初值恰好接近真值时"trial SSE ≈ current SSE 永远拒绝"的死循环。
    let preCheckGradNorm = 0
    for (let j = 0; j < p; j++) {
      const absG = Math.abs(jtr[j]!)
      if (absG > preCheckGradNorm) preCheckGradNorm = absG
    }
    if (preCheckGradNorm < (convOptions?.gradientTolerance ?? 1e-8)) {
      converged = true
      break
    }

    // 4.3 内层循环：λ 试探
    let accepted = false
    for (let inner = 0; inner < maxInnerIterations; inner++) {
      // 4.3.1 应用阻尼
      const A = applyDamping(jtj, damping.current())

      // 4.3.2 解正规方程
      const deltaP = solver.solve(A, jtr)
      if (!deltaP) {
        damping.onReject()
        continue
      }

      // 4.3.3 试探新参数
      const trialParams: Record<string, number> = { ...currentParams }
      for (let j = 0; j < p; j++) {
        const name = paramNames[j]!
        trialParams[name] = currentParams[name]! + deltaP[j]!
      }

      // 4.3.4 评估试探结果（加权 SSE）
      const trialResiduals = getREArr(yData, fn(trialParams))
      const trialSSE = getSSE(trialResiduals, weightArr)

      // 4.3.5 接受 / 拒绝
      if (trialSSE < currentSSE) {
        currentParams = trialParams
        currentResiduals = trialResiduals
        currentSSE = trialSSE
        damping.onAccept()
        accepted = true

        const state: IterationState = {
          iteration,
          params: currentParams,
          paramNames,
          residuals: currentResiduals,
          sse: currentSSE,
          deltaP,
          gradient: jtr,
        }

        if (convergenceCheck.check(state)) {
          converged = true
        }
        break
      } else {
        damping.onReject()
      }
    }

    // 4.4 检查外层退出条件
    if (converged || !accepted) break
  }

  // 5. 计算最终统计量
  const finalJacobian = jacobian.compute(fn, currentParams, paramNames, n)
  const stats = computeStatistics({
    fn,
    params: currentParams,
    paramNames,
    yData,
    residuals: currentResiduals,
    sse: currentSSE,
    jacobian: finalJacobian,
    weights: weightArr,
  })

  return {
    params: currentParams,
    paramErrors: stats.paramErrors,
    rSquared: stats.rSquared,
    rmse: stats.rmse,
    sse: currentSSE,
    dof: stats.dof,
    residuals: currentResiduals,
    predicted: stats.predicted,
    covariance: stats.covariance,
    converged,
    iterations: iterationsUsed,
    finalLambda: damping.current(),
    gradientNorm: stats.gradientNorm,
  }
}
