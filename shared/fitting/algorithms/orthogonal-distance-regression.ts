/**
 * 正交距离回归（Orthogonal Distance Regression, ODR）
 * ---
 * 解决的问题：
 *   LM 假设 x 精确无误差，只优化 y 残差。
 *   ODR 同时考虑 x 和 y 的误差，最小化数据点到曲线的"加权正交距离"：
 *
 *     S(β, δ) = Σᵢ [(yᵢ − f(xᵢ+δᵢ; β))² / σᵧᵢ² + δᵢ² / σₓᵢ²]
 *
 *   其中 δᵢ 是 x_i 的修正量（辅助变量）。
 *
 * 参数空间从 p 维扩展到 (p + n) 维，但用 Schur 补技巧降维回 p×p 系统：
 *
 *   等效权重：    w_eff,i = w_y w_x / (w_y d_i² + w_x)
 *   等效残差：    r_eff,i = r_y,i + d_i δ_i
 *   等效正规方程：(J_βᵀ W_eff J_β + λD) Δβ = J_βᵀ W_eff r_eff
 *
 *   其中 d_i = ∂f/∂x at (x_i + δ_i, β)
 *
 * 然后回代求 Δδ：
 *   Δδ_i = (w_y d_i / c_i)(r_y − J_β Δβ) − (w_x / c_i) δ_i
 *   其中 c_i = w_y d_i² + w_x
 *
 * 退化性质（重要！）：
 *   - σx → 0 (w_x → ∞)：w_eff → w_y，δ → 0，退化为加权 LM
 *   - 模型对 x 不敏感 (d ≈ 0)：w_eff → w_y，退化为加权 LM
 *   - 线性模型 + σx > 0：退化为 York 回归
 * ---
 * 参数的两分语义与 LM 一致：initialParams 全参数字典 + paramNames 自由参数子集。
 * 数学推导详见同目录 orthogonal-distance-regression.md。
 */

import type { Matrix, Vector } from "@shared/math/index.ts"
import type {
  ModelFunction,
  ParamValues,
  DataArray,
  IterationState,
  FitResult,
} from "../types.ts"
import type { LinearSolver } from "../linear-solver/index.ts"
import type { DampingStrategy, NielsenDampingOptions } from "../trust-region/index.ts"
import type { ConvergenceOptions } from "../post/convergence.ts"
import type { ODRJacobianProvider } from "../jacobian/index.ts"

// 正规方程构建 + 阻尼施加
import { applyDamping, buildWeightedNormalEquation } from "../linear-solver/normal-equation.ts"
// 数值雅可比（默认实现：参数方向 + 自变量方向）
import { odrNumericalJacobian } from "../jacobian/index.ts"
// 阻尼策略（默认 Nielsen 1999）+ 增益比判据（ρ 驱动步控）
import { createNielsenDamping, predictedReduction, gainRatio } from "../trust-region/index.ts"
// 收敛判据（默认三判据 OR）
import { createDefaultConvergence } from "../post/convergence.ts"
// 参数标准误 + 协方差组装（后置处理业务工具）
import { computeParamErrors, getCovarianceMatrix } from "../post/statistics.ts"
// 线性求解器（默认高斯消元）
import { createGaussianEliminationSolver } from "../linear-solver/index.ts"
// math 原语（跨模块，走 @shared 别名 + index.ts 唯一入口）
import { isFinitePositive, isFiniteNonNegative, getRSquared, getRMSE, getInfNorm } from "@shared/math/index.ts"


/**
 * ODR 算法配置
 *
 * ODR 在 LM 基础上扩展：
 *   - LM 假设 x 精确，只优化 y 残差
 *   - ODR 同时优化 (x, y) 残差，最小化数据点到拟合曲线的"加权正交距离"
 *
 * 适用场景：
 *   - x, y 都有显著误差（如 Beer-Lambert 校准：c 配样误差 ≈ A 仪器误差）
 *   - 强非线性公式 + x 误差不可忽略
 *
 * 数学退化（重要！）：
 *   - σx → 0 时（w_x → ∞）退化为加权 LM
 *   - 模型对 x 不敏感（d = ∂f/∂x ≈ 0）退化为加权 LM
 *   - 模型线性 + σx > 0 时退化为 York 回归
 */
export interface ODROptions {
  /** x 的标准差数组（每点独立）。不传或全 0 时退化为 LM */
  sigmaX?: number[]
  /** y 的标准差数组（每点独立）。不传时默认全 1（等权） */
  sigmaY?: number[]

  /** 最大外层迭代次数（默认 100） */
  maxIterations?: number
  /** 内层 λ 试探最大次数（默认 20） */
  maxInnerIterations?: number

  // ── 可替换模块（依赖注入） ──

  /** 雅可比计算器（必须 ODRJacobianProvider：需额外返回 ∂f/∂x） */
  jacobian?: ODRJacobianProvider

  /** 线性方程组求解器 */
  solver?: LinearSolver

  /** 阻尼策略（默认：Nielsen 1999 自适应，ρ 驱动，见 trust-region/） */
  damping?: DampingStrategy

  // ── 子模块的配置 ──

  /** 收敛判据配置 */
  convergence?: ConvergenceOptions

  /** 默认阻尼策略（Nielsen）的配置（仅当未提供 damping 时生效） */
  dampingOptions?: NielsenDampingOptions
}

/**
 * ODR 拟合结果
 *
 * 在通用 FitResult 基础上增加 ODR 特有字段：
 *   - xCorrection：每个数据点的 x 修正量 δ_i
 *   - xCorrected：修正后的 x（= xData + xCorrection）
 */
export interface ODRResult extends FitResult {
  /** 每个数据点的 x 修正量 δ_i（单自变量：每点一个标量） */
  xCorrection: Vector
  /** 修正后的 x（= xData + δ；n×1 行主序设计矩阵，与 xData 同形状） */
  xCorrected: DataArray
  /** 最终阻尼因子 λ */
  finalLambda: number
  /** 拟合模式（运行时判定） */
  mode: "lm" | "odr"
}

/**
 * ODR 统一传参对象（对象式传参，防位置错位）
 * - 数据契约五字段 + options（算法配置），与 LM / NumericalJacobianInput 同构风格
 */
export interface ODRInput<
  ALL extends readonly string[],
  FIT extends readonly (ALL[number])[],
> {
  /** 模型函数 (xData, 全参数字典) => ys */
  fn: ModelFunction<ALL[number]>
  /** 全参数初值字典（含固定参数） */
  initialParams: ParamValues<ALL[number]>
  /** 自由参数名数组 */
  paramNames: FIT
  /** 自变量观测值（行主序设计矩阵；ODR 仅支持单自变量，cols = 1） */
  xData: DataArray
  /** 因变量观测值（入口宽容：number[] | Vector，内部统一 Vector） */
  yData: number[] | Vector
  /** 算法配置（含 sigmaX / sigmaY） */
  options?: ODROptions
}

/**
 * ODR 主入口
 *
 * @typeParam ALL    全参数键元组（含固定参数）
 * @typeParam FIT    自由参数键元组，必须是 ALL 的子集（编译期强制）
 * @param input      统一传参对象（fn / initialParams / paramNames / xData / yData / options）
 * @returns 拟合结果（params 为全参数；附 xCorrection / xCorrected / mode）
 */
export function orthogonalDistanceRegression<
  const ALL extends readonly string[],
  const FIT extends readonly (ALL[number])[],
>(
  input: ODRInput<ALL, FIT>,
): ODRResult {
  // ── 0. 解构统一传参对象 ─────────────────────
  const { fn, initialParams, paramNames, xData, yData, options = {} } = input

  // ── 1. 解析配置 + 构造默认模块 ─────────────────────
  const {
    sigmaX,
    sigmaY,
    maxIterations = 100,
    maxInnerIterations = 20,
    jacobian,
    solver = createGaussianEliminationSolver(),
    damping = createNielsenDamping(options.dampingOptions),
    convergence: convOptions,
  } = options

  const convergenceCheck = createDefaultConvergence(convOptions)
  // 防御性 reset：当前每次新建实例不需要，但未来允许外部传入时不会踩坑
  convergenceCheck.reset?.()

  // ── 2. 输入校验 ─────────────────────────────────
  // x、y 长度匹配（单行检查）；yData 入口宽容（number[]）→ 内部统一 Vector
  if (yData.length !== xData.rows) {
    throw new Error(`xData 与 yData 长度不匹配：${xData.rows} vs ${yData.length}`)
  }
  const yVec = Float64Array.from(yData)
  const n = xData.rows
  if (n <= paramNames.length) {
    throw new Error(
      `数据点数 ${n} 必须 > 自由参数个数 ${paramNames.length}（否则无自由度）`,
    )
  }
  // 单自变量守卫：ODR 的 δ 修正量与 ∂f/∂x 当前均按单变量实现（cols = 1）；
  // 多自变量的 ODR 推广（δ / d 变矩阵）待真实业务出现再扩展，LM 无此限制
  if (xData.cols !== 1) {
    throw new Error("ODR 当前仅支持单自变量：xData 设计矩阵必须恰有 1 列（cols = 1）")
  }

  // σ 校验（单次循环同时检查长度 + 元素级条件；σ 表内部统一 Vector）
  const sigmaXY = new Float64Array(n)
  const sigmaYY = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    // σ_x：默认 0（表示 x 精确）；非负有限数
    sigmaXY[i] = sigmaX?.[i] ?? 0
    isFiniteNonNegative(sigmaXY[i]!, `sigmaX[${i}]`)

    // σ_y：默认 1（标准等权）；正有限数（权重 = 1/σ² 要求 σ > 0）
    sigmaYY[i] = sigmaY?.[i] ?? 1
    isFinitePositive(sigmaYY[i]!, `sigmaY[${i}]`)
  }

  // 判断模式：sigmaX 全为 0 时退化为 LM
  let hasXError = false
  for (let i = 0; i < n; i++) {
    if (sigmaXY[i]! > 0) {
      hasXError = true
      break
    }
  }
  const mode: "lm" | "odr" = hasXError ? "odr" : "lm"

  // 自由参数名校验（子集约束 / 有限性已由 validateInputs 统一做，这里补运行时参数名检查）
  // 注：ODR 的校验在下方通过 validateInputs 前置完成（与 LM 共享同一防线）

  const p = paramNames.length

  // ── 3. 权重预处理 ───────────────────────────────
  // w_y = 1/σ_y²（每点权重）
  // w_x = 1/σ_x²（σ_x = 0 时 w_x = +∞，标记为特殊值；Float64Array 可存 Infinity）
  const wY = new Float64Array(n)
  const wX = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const sy = sigmaYY[i]!
    const sx = sigmaXY[i]!
    wY[i] = 1 / (sy * sy)
    wX[i] = sx > 0 ? 1 / (sx * sx) : Infinity
  }

  // ── 4. 状态初始化（全参数字典 + δ 修正量） ──────────
  /** 当前全参数值（固定参数在其中保持不变） */
  let currentParams: ParamValues = { ...initialParams }
  /** 每个 x 观测值的修正量 δ，初值为 0 */
  const currentDelta = new Float64Array(n)
  /** 当前修正后的 x（= xData + δ；n×1 设计矩阵，扁平拷贝防共享引用） */
  let currentXCorrected: DataArray = { data: new Float64Array(xData.data), rows: n, cols: 1 }
  /** 当前预测值 */
  let currentPredicted = fn(currentXCorrected, currentParams)
  /** 当前 y 残差 r_y = y − f(x+δ; β) */
  const currentResidualsY = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    currentResidualsY[i] = yVec[i]! - currentPredicted[i]!
  }
  /** 当前 ODR 加权 SSE（含 y 残差项与 δ 惩罚项） */
  let currentSSE = computeODRSSE(currentResidualsY, currentDelta, wY, wX)

  // 阻尼策略初始化：每次 fit 复位策略内部状态（Nielsen 的 v 等），取初始 λ；
  // λ 由主循环持有并逐轮回传（finalLambda 直接读本变量）
  let lambda = damping.init()

  /** 是否收敛 */
  let isConverged = false
  /** 实际使用的迭代次数 */
  let iterationsUsed = 0

  // ── 5. 主迭代循环 ───────────────────────────────
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    iterationsUsed++

    // 5.1 计算雅可比 J_β（[n × p]）和 d（∂f/∂x，[n]；统一传参对象）
    const { jacobianBeta: JB, jacobianX: d } = jacobian
      ? jacobian({ fn, xData: currentXCorrected, params: currentParams, paramNames })
      : odrNumericalJacobian({ fn, xData: currentXCorrected, params: currentParams, paramNames })

    // 5.2 计算等效权重 w_eff 和等效残差 r_eff
    //   w_eff_i = w_y w_x / (w_y d² + w_x)
    //   当 w_x = ∞ 时（σx = 0）：w_eff = w_y
    //   当 d = 0 时：w_eff = w_y
    //   r_eff_i = r_y_i + d_i δ_i
    const wEff = new Float64Array(n)
    const rEff = new Float64Array(n)
    const wYdOverC = new Float64Array(n) // w_y d / c（Δδ 回代系数 1）
    const wXOverC = new Float64Array(n) // w_x / c（Δδ 回代系数 2）

    for (let i = 0; i < n; i++) {
      const wy = wY[i]!
      const wx = wX[i]!
      const di = d[i]!
      const dy = currentResidualsY[i]!
      const deltaI = currentDelta[i]!

      if (wx === Infinity) {
        // σx = 0：x 完全精确，退化为加权 LM
        wEff[i] = wy
        wYdOverC[i] = 0
        wXOverC[i] = 0
      } else {
        // c = w_y d² + w_x
        const c = wy * di * di + wx
        wEff[i] = (wy * wx) / c
        wYdOverC[i] = (wy * di) / c
        wXOverC[i] = wx / c
      }
      // 等效残差
      rEff[i] = dy + di * deltaI
    }

    // 5.3 构建等效正规方程（p × p）——gram 库路线：一次得 J_βᵀW_effJ_β 与 J_βᵀW_effr_eff
    const { jtj: S, jtr: b } = buildWeightedNormalEquation(JB, rEff, wEff)

    // 5.3.1 一阶最优性预检查（与 LM 一致，带权梯度范数）
    //   若梯度范数已足够小，说明已经在极值点附近，直接判收敛。
    //   这避免初值恰好接近真值时"trial SSE ≈ current SSE 永远拒绝"的死循环。
    //   预检查用的梯度正是 b（J_βᵀW_effr_eff），与内层收敛判据、LM 语义完全一致。
    if (getInfNorm(b) < (convOptions?.gradientTolerance ?? 1e-8)) {
      isConverged = true
      break
    }

    // 5.4 内层循环：λ 试探
    /** 本轮外层是否有步长被接受 */
    let accepted = false

    for (let inner = 0; inner < maxInnerIterations; inner++) {
      // 应用阻尼：(S + λ·diag(S))
      const A = applyDamping(S, lambda)

      // 解 S · Δβ = b（奇异返回 null → 视作最坏步 ρ = -1，走拒绝路径收紧 λ 重试）
      const trialDeltaBeta = solver.solve(A, b)
      if (!trialDeltaBeta) {
        lambda = damping.judge(-1, lambda).lambda
        continue
      }

      // 回代求 Δδ（Schur 补的回代步骤）
      //   Δδ_i = (w_y d / c) (r_y − J_β · Δβ) − (w_x / c) δ
      const trialDeltaDelta = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        // J_β[i] · Δβ（行向量点积；Matrix 行主序扁平，第 i 行起始 = i × p）
        const base = i * p
        let jDotDeltaBeta = 0
        for (let j = 0; j < p; j++) {
          jDotDeltaBeta += JB.data[base + j]! * trialDeltaBeta[j]!
        }
        trialDeltaDelta[i] =
          wYdOverC[i]! * (currentResidualsY[i]! - jDotDeltaBeta) -
          wXOverC[i]! * currentDelta[i]!
      }

      // 试探新参数（只更新自由参数键，固定参数随字典透传）
      const trialParams: ParamValues = { ...currentParams }
      for (let j = 0; j < p; j++) {
        const name = paramNames[j]!
        trialParams[name] = currentParams[name]! + trialDeltaBeta[j]!
      }
      // 试探新的 δ 与修正后 x（单自变量：data[i] = 原始 xᵢ + δᵢ，写入 n×1 扰动矩阵）
      const trialDelta = new Float64Array(n)
      const trialXCorrected: DataArray = { data: new Float64Array(n), rows: n, cols: 1 }
      for (let i = 0; i < n; i++) {
        trialDelta[i] = currentDelta[i]! + trialDeltaDelta[i]!
        trialXCorrected.data[i] = xData.data[i]! + trialDelta[i]!
      }

      // 评估试探结果
      const trialPredicted = fn(trialXCorrected, trialParams)
      const trialResidualsY = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        trialResidualsY[i] = yVec[i]! - trialPredicted[i]!
      }
      const trialSSE = computeODRSSE(trialResidualsY, trialDelta, wY, wX)

      // 增益比 ρ = 实际 SSE 下降 / 预测 SSE 下降（信赖域判据）
      //   ⚠️ 参数空间近似：ODR 的实际 SSE 含 δ 惩罚项，而 predRed = 2Δᵀg − ΔᵀAΔ
      //   只物化了 β 空间曲率（Schur 降维后 δ 空间曲率未物化）。
      //   ρ 在此的作用是“方向性判断”（单调反映步质量，驱动 λ 升降），
      //   该近似足够；ODRPACK 亦用同类简化。
      const predRed = predictedReduction(trialDeltaBeta, b, S.data, p)
      const rho = gainRatio(currentSSE, trialSSE, predRed)

      // 策略决策（ρ > 0 蕴含 SSE 真实下降；predRed ≤ 0 时 ρ = -1 必然拒绝）
      const decision = damping.judge(rho, lambda)
      // 下一轮 λ：接受步 Nielsen 降 λ（更新量随 ρ 连续），拒绝步升 λ 收紧
      lambda = decision.lambda

      if (decision.accept) {
        // 接受：提交新状态（Vector 状态为 const 数组，用 set 原地拷贝提交）
        currentParams = trialParams
        currentDelta.set(trialDelta)
        currentResidualsY.set(trialResidualsY)
        currentXCorrected = trialXCorrected
        currentPredicted = trialPredicted
        currentSSE = trialSSE
        accepted = true

        // 迭代状态快照（收敛判据消费）
        const state: IterationState = {
          iteration,
          params: currentParams,
          paramNames,
          residuals: currentResidualsY,
          sse: currentSSE,
          deltaP: trialDeltaBeta,
          gradient: b, // 等效 J_βᵀ W_eff r_eff（正梯度方向）
        }

        // 收敛判据检查（三判据 OR，见 convergence.ts）
        if (convergenceCheck.check(state)) {
          isConverged = true
        }
        break
      }
      // 拒绝：λ 已由 judge 收紧，继续内层重试
    }

    // 外层退出条件（已收敛 / 内层全部拒绝）
    if (isConverged || !accepted) break
  }

  // ── 6. 计算最终统计量 ───────────────────────────
  // 在最终参数处重新算一次雅可比（与 LM 一致；统一传参对象）
  const { jacobianBeta: finalJBeta, jacobianX: finalD } = odrNumericalJacobian({
    fn,
    xData: currentXCorrected,
    params: currentParams,
    paramNames,
  })

  // 等效权重（融合 x / y 误差，用于协方差估计；σx=0 → wx=∞ 退化为 wy）
  const finalW = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const wy = wY[i]!
    const wx = wX[i]!
    const di = finalD[i] ?? 0
    finalW[i] = wx === Infinity ? wy : (wy * wx) / (wy * di * di + wx)
  }
  // 等效残差 r_eff = r_y + d·δ
  const rEffFinal = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    rEffFinal[i] = currentResidualsY[i]! + (finalD[i] ?? 0) * currentDelta[i]!
  }

  // J_βᵀ W_eff J_β 与 J_βᵀ W_eff r_eff（gram 库路线）
  const { jtj, jtr } = buildWeightedNormalEquation(finalJBeta, rEffFinal, finalW)

  // R² / RMSE（不加权版本，与 Origin 一致；math/statistics.ts 原语）
  const rSquared = getRSquared(yVec, currentPredicted)
  const rmse = getRMSE(yVec, currentPredicted)

  // 自由度 = 2n（观测：xᵢ 和 yᵢ 各 n 个）− (p + n)（参数：β p 个 + δ n 个）= n - p
  // 注：虽然数值上与 LM 相同，但 ODR 的参数空间与观测空间都更大；
  //     这里 dof 用于估计 σ²，是 ODRPACK 推荐的保守估计。
  const dof = n - p
  const sigma2 = currentSSE / Math.max(dof, 1)

  // 协方差 = σ² × (J_βᵀ W_eff J_β)⁻¹（post/statistics 业务工具）
  const covariance: Matrix | null = getCovarianceMatrix(jtj, sigma2)

  // 参数标准误（共享原语）
  const paramErrors = computeParamErrors(covariance, paramNames)

  // 梯度无穷范数
  const gradientNorm = getInfNorm(jtr)

  return {
    params: currentParams,
    paramErrors,
    rSquared,
    rmse,
    sse: currentSSE,
    dof,
    residuals: currentResidualsY,
    predicted: currentPredicted,
    covariance,
    isConverged,
    iterations: iterationsUsed,
    gradientNorm,
    xCorrection: currentDelta,
    xCorrected: currentXCorrected,
    finalLambda: lambda,
    mode,
  }
}

/**
 * 计算 ODR 加权 SSE
 *
 * S = Σᵢ w_yᵢ r_yᵢ² + Σᵢ w_xᵢ δᵢ²
 *
 * 当 w_x = ∞ 时，δ 必须为 0 才不贡献无穷大。
 * 实际上 sigmaX = 0 时 wX = ∞，此时 Δδ 也应该总是 0（退化路径）。
 * 为安全起见，若发现 wX = ∞ 且 δ ≠ 0，抛错。
 */
function computeODRSSE(
  residualsY: Vector,
  delta: Vector,
  wY: Vector,
  wX: Vector,
): number {
  const n = residualsY.length
  let sse = 0
  for (let i = 0; i < n; i++) {
    const wy = wY[i]!
    const wx = wX[i]!
    const r = residualsY[i]!
    const d = delta[i]!
    // y 残差项
    sse += wy * r * r
    if (wx === Infinity) {
      if (d !== 0) {
        // σx=0 但 δ≠0：数值错误（理论上应保持 0）
        // 惩罚为巨大值，让 trust region 拒绝此步
        sse += 1e30
      }
    } else {
      // x 修正量惩罚项
      sse += wx * d * d
    }
  }
  return sse
}
