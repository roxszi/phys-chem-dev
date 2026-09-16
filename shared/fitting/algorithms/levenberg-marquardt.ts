/**
 * Levenberg-Marquardt 非线性最小二乘
 * ---
 * 适用：x 误差可忽略（或不存在），只优化 y 残差的场景。
 * 对物化实验中的 (t, c)、(1/T, ln k) 等时间-浓度 / 温度-速率数据，
 * x 误差通常 << y 误差，LM 是最简单可靠的选择。
 * 不适用：x 也有显著误差时改用 ODR（见 algorithms/orthogonal-distance-regression.ts）。
 * ---
 * 算法核心：
 *   每次迭代解 (JᵀJ + λ·diag(JᵀJ)) · Δp = Jᵀr
 *   λ 大 → 接近最速下降（保守）；λ 小 → 接近 Gauss-Newton（激进）
 *   通过 trust-region（试探 + 升降 λ）在两者间自适应切换
 * ---
 * 参数的两分语义：
 *   - initialParams：全参数字典（可拟合 + 固定），fn 每次收到全字典
 *   - paramNames：自由参数子集，Δp 只更新这些键；固定参数值随字典透传给 fn
 */

import type {
  ModelFunction,
  ParamValues,
  DataArray,
  IterationState,
  FitResult,
} from "../types.ts"
import type { JacobianProvider } from "../jacobian/index.ts"
import type { DampingStrategy, DampingOptions } from "../damping.ts"
import type { ConvergenceOptions } from "../convergence.ts"
import type { LinearSolver } from "../linear-solver/index.ts"
// 输入校验与权重转换
import { validateInputs, sigmaToWeights } from "../validate.ts"
// 正规方程构建 + 阻尼施加
import { buildWeightedNormalEquation, applyDamping } from "../linear-solver/normal-equation.ts"
// 数值雅可比（默认实现）
import { lmNumericalJacobian } from "../jacobian/index.ts"
// 阻尼策略（默认 Marquardt 1963）
import { createMarquardtDamping } from "../damping.ts"
// 收敛判据（默认三判据 OR）
import { createDefaultConvergence } from "../convergence.ts"
// 统计拼装
import { computeStatistics } from "../statistics.ts"
// 线性求解器（默认高斯消元）
import { createGaussianEliminationSolver } from "../linear-solver/index.ts"
// math 原语
import { getREArr, getSSE, getInfNorm } from "../../math/index.ts"


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
 * Levenberg-Marquardt 算法实现
 *
 * @typeParam ALL    全参数键元组（含固定参数）
 * @typeParam FIT    自由参数键元组，必须是 ALL 的子集（编译期强制）
 * @param fn         模型函数 (xs, 全参数字典) => ys
 * @param initialParams 全参数初值字典（含固定参数）
 * @param paramNames 自由参数名数组（锚点：从这里推导 ALL / FIT 的键检查）
 * @param xData      自变量数据
 * @param yData      因变量数据
 * @param options    配置对象
 * @returns 拟合结果（params 为全参数；paramErrors 只含自由参数）
 *
 * @example
 * ```typescript
 * const result = levenbergMarquardt(
 *   (xs, p) => xs.map(t => p.A * Math.exp(-p.k * t)),  // ModelFunction
 *   { A: 1, k: 0.1 },                                  // 全参数初值
 *   ["A", "k"],                                        // 自由参数（⊆ 全参数键）
 *   tData, cData,
 *   { sigmaY: cSigma },                                // 可选；weights = 1/σ² 自动转换
 * )
 * ```
 */
export function levenbergMarquardt<
  const ALL extends readonly string[],
  const FIT extends readonly (ALL[number])[],
>(
  fn: ModelFunction<ALL[number]>,
  initialParams: ParamValues<ALL[number]>,
  paramNames: FIT,
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
    jacobian,
    solver = createGaussianEliminationSolver(),
    damping = createMarquardtDamping(options.dampingOptions),
    convergence: convOptions,
  } = options

  const convergenceCheck = createDefaultConvergence(convOptions)
  // 防御性 reset：当前每次新建实例不需要，但未来允许外部传入时不会踩坑
  convergenceCheck.reset?.()

  // 2. 输入校验（paramNames 子集约束 / 全字典有限性 / n > 自由参数数）
  const n = validateInputs(xData, yData, paramNames, initialParams, fn)
  const p = paramNames.length

  // 2.1 权重预处理：weights 优先；sigmaY → weights = 1/σ²（共享原语）；都不传则等权（=1）
  let weightArr: number[]
  if (weights) {
    if (weights.length !== n) {
      throw new Error(`weights 长度 ${weights.length} ≠ n ${n}`)
    }
    weightArr = weights
  } else if (sigmaY) {
    weightArr = sigmaToWeights(sigmaY, n)
  } else {
    weightArr = new Array<number>(n).fill(1)
  }

  // 3. 状态初始化（全参数字典：固定参数值在其中保持不变）
  /** 当前全参数值 */
  let currentParams: ParamValues = { ...initialParams }
  /** 当前残差向量 r = y − f(p) */
  let currentResiduals = getREArr(yData, fn(xData, currentParams))
  /** 当前加权 SSE */
  let currentSSE = getSSE(currentResiduals, weightArr)

  /** 是否收敛 */
  let isConverged = false
  /** 实际使用的迭代次数 */
  let iterationsUsed = 0

  // 4. 主迭代循环
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    iterationsUsed++

    // 4.1 计算雅可比矩阵 [n × p]（注入则用注入实现，否则数值中心差分）
    const J = jacobian
      ? jacobian(fn, xData, currentParams, paramNames).jacobianBeta
      : lmNumericalJacobian(fn, xData, currentParams, paramNames).jacobianBeta

    // 4.2 构建加权正规方程 (JᵀWJ, JᵀWr)
    const { jtj, jtr } = buildWeightedNormalEquation(J, currentResiduals, weightArr)

    // 4.2.1 一阶最优性预检查（Nocedal & Wright 标准做法）
    //   若梯度范数已足够小，说明已经在极值点附近，直接判收敛。
    //   这避免初值恰好接近真值时"trial SSE ≈ current SSE 永远拒绝"的死循环。
    const preCheckGradNorm = getInfNorm(jtr)
    if (preCheckGradNorm < (convOptions?.gradientTolerance ?? 1e-8)) {
      isConverged = true
      break
    }

    // 4.3 内层循环：λ 试探
    /** 本轮外层是否有步长被接受 */
    let accepted = false
    for (let inner = 0; inner < maxInnerIterations; inner++) {
      // 4.3.1 应用阻尼：(JᵀWJ + λ·diag(JᵀWJ))
      const A = applyDamping(jtj, damping.current())

      // 4.3.2 解正规方程得步长 Δp（奇异返回 null → 升 λ 重试）
      const deltaP = solver.solve(A, jtr)
      if (!deltaP) {
        damping.onReject()
        continue
      }

      // 4.3.3 试探新参数：只更新自由参数键，固定参数随字典透传
      const trialParams: ParamValues = { ...currentParams }
      for (let j = 0; j < p; j++) {
        const name = paramNames[j]!
        trialParams[name] = currentParams[name]! + deltaP[j]!
      }

      // 4.3.4 评估试探结果（加权 SSE）
      const trialResiduals = getREArr(yData, fn(xData, trialParams))
      const trialSSE = getSSE(trialResiduals, weightArr)

      // 4.3.5 接受 / 拒绝
      if (trialSSE < currentSSE) {
        // 接受：提交新状态
        currentParams = trialParams
        currentResiduals = trialResiduals
        currentSSE = trialSSE
        damping.onAccept()
        accepted = true

        // 迭代状态快照（收敛判据消费）
        const state: IterationState = {
          iteration,
          params: currentParams,
          paramNames,
          residuals: currentResiduals,
          sse: currentSSE,
          deltaP,
          gradient: jtr,
        }

        // 收敛判据检查（三判据 OR，见 convergence.ts）
        if (convergenceCheck.check(state)) {
          isConverged = true
        }
        break
      } else {
        // 拒绝：升 λ 收紧步长
        damping.onReject()
      }
    }

    // 4.4 检查外层退出条件（已收敛 / 内层全部拒绝）
    if (isConverged || !accepted) break
  }

  // 5. 计算最终统计量（在最终参数处重新算一次雅可比）
  const finalJacobian = lmNumericalJacobian(fn, xData, currentParams, paramNames).jacobianBeta
  const stats = computeStatistics({
    fn,
    xs: xData,
    params: currentParams,
    paramNames,
    yData,
    residuals: currentResiduals,
    sse: currentSSE,
    jacobian: finalJacobian,
    weights: weightArr,
  })

  // 6. 拼装返回（params 全参数；paramErrors 只含自由参数）
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
    isConverged,
    iterations: iterationsUsed,
    finalLambda: damping.current(),
    gradientNorm: stats.gradientNorm,
  }
}
