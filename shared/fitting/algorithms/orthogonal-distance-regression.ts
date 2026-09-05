/**
 * 正交距离回归（Orthogonal Distance Regression, ODR）
 *
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
 *
 */
import { Matrix } from "ml-matrix"
import type {
  PredictFnODR,
  DataArray,
  IterationState,
  FitResult,
} from "../types.js"
import type { LinearSolver } from "../matrix-solve.ts"
import type { DampingStrategy, DampingOptions } from "../damping.ts"
import type { ConvergenceOptions } from "../convergence.ts"

import { applyDamping } from "../normal-equation.ts"
import { createNumericalODRJacobian } from "./numerical-jacobian.ts"
import { createMarquardtDamping } from "../damping.ts"
import { createDefaultConvergence } from "../convergence.ts"
import { createGaussianEliminationSolver } from "../matrix-solve.ts"
import { isFinitePositive, isFiniteNonNegative, getInvertMatrix } from "@shared/math/index.ts"


/**
 * ODR（正交距离回归）算法的配置与结果类型
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


/**
 * ODR 雅可比计算器接口
 *
 * 与 LM 的 JacobianProvider 不同，ODR 需要同时计算：
 *   - 对参数 β 的雅可比 J_β[i][j] = ∂f/∂βⱼ
 *   - 对自变量 x 的偏导 d[i] = ∂f/∂x
 *
 * 用户可以实现解析版（最快）或自动微分版（tfjs.grads）。
 */
export interface ODRJacobianProvider {
  /**
   * 同时计算 J_β 和 d
   *
   * @param fn 预测函数（ODR 形式，x 和 params 都显式传递）
   * @param xCorrected 修正后的 x（= x + δ）
   * @param params 当前参数
   * @param paramNames 参数名
   * @param n 数据点数
   */
  compute(
    fn: PredictFnODR,
    xCorrected: number[],
    params: Record<string, number>,
    paramNames: string[],
    n: number,
  ): { jBeta: number[][]; d: number[] }
}

/**
 * ODR 算法配置
 *
 * 所有不带 sigma 前缀的字段都是可选的；
 * sigmaX / sigmaY 控制是否启用 ODR（全为 0 时退化为 LM）。
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

  /** 雅可比计算器（必须 ODRJacobianProvider） */
  jacobian?: ODRJacobianProvider

  /** 线性方程组求解器 */
  solver?: LinearSolver

  /** 阻尼策略 */
  damping?: DampingStrategy

  // ── 子模块的配置 ──

  /** 收敛判据配置 */
  convergence?: ConvergenceOptions

  /** 默认阻尼策略的配置 */
  dampingOptions?: DampingOptions
}

/**
 * ODR 拟合结果
 *
 * 在通用 FitResult 基础上增加 ODR 特有字段：
 *   - xCorrection：每个数据点的 x 修正量 δ_i
 *   - xCorrected：修正后的 x（= xData + xCorrection）
 */
export interface ODRResult extends FitResult {
  /** 每个数据点的 x 修正量 δ_i */
  xCorrection: number[]
  /** 修正后的 x（= xData + δ） */
  xCorrected: number[]
  /** 最终阻尼因子 λ */
  finalLambda: number
  /** 拟合模式（运行时判定） */
  mode: "lm" | "odr"
}



/**
 * ODR 主入口
 *
 * @param fn 预测函数（ODR 形式：x 和 params 都显式传递）
 * @param initialParams 初始参数
 * @param paramNames 参数名（顺序固定）
 * @param xData 自变量观测值
 * @param yData 因变量观测值
 * @param options 配置（含 sigmaX / sigmaY）
 */
export function orthogonalDistanceRegression(
  fn: PredictFnODR,
  initialParams: Record<string, number>,
  paramNames: string[],
  xData: DataArray,
  yData: DataArray,
  options: ODROptions = {},
): ODRResult {
  // ── 1. 解析配置 + 构造默认模块 ─────────────────────
  const {
    sigmaX,
    sigmaY,
    maxIterations = 100,
    maxInnerIterations = 20,
    jacobian = createNumericalODRJacobian(),
    solver = createGaussianEliminationSolver(),
    damping = createMarquardtDamping(options.dampingOptions),
    convergence: convOptions,
  } = options

  const convergenceCheck = createDefaultConvergence(convOptions)
  // 防御性 reset：当前每次新建实例不需要，但未来允许外部传入时不会踩坑
  convergenceCheck.reset?.()

  // ── 2. 输入校验 ─────────────────────────────────
  // x、y 长度匹配（单行检查）
  if (yData.length !== xData.length) {
    throw new Error(`xData 与 yData 长度不匹配：${xData.length} vs ${yData.length}`)
  }
  const n = xData.length
  if (n <= paramNames.length) {
    throw new Error(
      `数据点数 ${n} 必须 > 参数个数 ${paramNames.length}（否则无自由度）`,
    )
  }

  // σ 校验（单次循环同时检查长度 + 元素级条件）
  const sigmaXY = new Array<number>(n)
  const sigmaYY = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    // σ_x：默认 0（表示 x 精确）；非负有限数
    sigmaXY[i] = sigmaX?.[i] ?? 0
    isFiniteNonNegative(sigmaXY[i]!, `sigmaX[${i}]`)

    // σ_y：默认 1（标准等权）；正有限数（权重 = 1/σ² 要求 σ > 0）
    sigmaYY[i] = sigmaY?.[i] ?? 1
    isFinitePositive(sigmaYY[i]!, `sigmaY[${i}]`)
  }

  // 判断模式：sigmaX 全为 0 时退化为 LM
  const hasXError = sigmaXY.some((s) => s > 0)
  const mode: "lm" | "odr" = hasXError ? "odr" : "lm"

  // 参数名校验
  const seen = new Set<string>()
  for (const name of paramNames) {
    if (!name) throw new Error("paramNames 包含空字符串")
    if (seen.has(name)) throw new Error(`paramNames 包含重复项：${name}`)
    seen.add(name)
  }
  for (const name of paramNames) {
    const v = initialParams[name]
    if (v === undefined || !Number.isFinite(v)) {
      throw new Error(`initialParams[${name}] 缺失或非有限数`)
    }
  }

  const p = paramNames.length

  // ── 3. 权重预处理 ───────────────────────────────
  // w_y = 1/σ_y²（每点权重）
  // w_x = 1/σ_x²（σ_x = 0 时 w_x = +∞，标记为特殊值）
  const wY = sigmaYY.map((s) => 1 / (s * s))
  // wX 用 number | Infinity 表示；∞ 表示"x 完全精确"
  // 实际计算时单独处理 ∞ 情况
  const wX: number[] = sigmaXY.map((s) => (s > 0 ? 1 / (s * s) : Infinity))

  // ── 4. 状态初始化 ───────────────────────────────
  let currentParams: Record<string, number> = { ...initialParams }
  let currentDelta = new Array<number>(n).fill(0) // δ 初值为 0
  let currentXCorrected = xData.slice()
  let currentPredicted = fn(currentXCorrected, currentParams)
  let currentResidualsY = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    currentResidualsY[i] = yData[i]! - currentPredicted[i]!
  }
  let currentSSE = computeODRSSE(currentResidualsY, currentDelta, wY, wX)

  let converged = false
  let iterationsUsed = 0

  // ── 5. 主迭代循环 ───────────────────────────────
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    iterationsUsed++

    // 5.1 计算雅可比 J_β 和 d（对 x 的偏导）
    const { jBeta, d } = jacobian.compute(
      fn,
      currentXCorrected,
      currentParams,
      paramNames,
      n,
    )

    // 5.2 计算等效权重 w_eff 和等效残差 r_eff
    //   w_eff_i = w_y w_x / (w_y d² + w_x)
    //   当 w_x = ∞ 时（σx = 0）：w_eff = w_y
    //   当 d = 0 时：w_eff = w_y
    //   r_eff_i = r_y_i + d_i δ_i
    const wEff = new Array<number>(n)
    const rEff = new Array<number>(n)
    const cInv = new Array<number>(n) // 1/c_i = 1/(w_y d² + w_x)
    const wYdOverC = new Array<number>(n) // w_y d / c
    const wXOverC = new Array<number>(n) // w_x / c

    for (let i = 0; i < n; i++) {
      const wy = wY[i]!
      const wx = wX[i]!
      const di = d[i]!
      const dy = currentResidualsY[i]!
      const deltaI = currentDelta[i]!

      if (wx === Infinity) {
        // σx = 0：x 完全精确，退化为加权 LM
        wEff[i] = wy
        cInv[i] = 0 // c = ∞, 1/c = 0
        wYdOverC[i] = 0
        wXOverC[i] = 0
      } else {
        const c = wy * di * di + wx
        wEff[i] = (wy * wx) / c
        cInv[i] = 1 / c
        wYdOverC[i] = (wy * di) / c
        wXOverC[i] = wx / c
      }
      rEff[i] = dy + di * deltaI
    }

    // 5.2.1 一阶最优性预检查（与 LM 一致）
    //   若梯度范数已足够小，说明已经在极值点附近，直接判收敛。
    //   这避免初值恰好接近真值时"trial SSE ≈ current SSE 永远拒绝"的死循环。
    let preCheckGradNorm = 0
    for (let j = 0; j < p; j++) {
      let g = 0
      for (let i = 0; i < n; i++) {
        g += jBeta[i]![j]! * (currentResidualsY[i]! + d[i]! * currentDelta[i]!)
      }
      if (Math.abs(g) > preCheckGradNorm) preCheckGradNorm = Math.abs(g)
    }
    if (preCheckGradNorm < (convOptions?.gradientTolerance ?? 1e-8)) {
      converged = true
      break
    }

    // 5.3 构建等效正规方程（p × p）
    //   S[j][k] = Σ w_eff J_β[i][j] J_β[i][k]
    //   b[j]    = Σ w_eff J_β[i][j] r_eff[i]
    // 内部用普通二维数组累加（对称半三角），构建完一次性包装成 Matrix
    const sBuf: number[][] = Array.from({ length: p }, () =>
      new Array<number>(p).fill(0),
    )
    const b = new Array<number>(p).fill(0)

    for (let i = 0; i < n; i++) {
      const w = wEff[i]!
      const J_i = jBeta[i]!
      const r = rEff[i]!
      for (let j = 0; j < p; j++) {
        const J_ij = J_i[j]!
        b[j]! += w * J_ij * r
        for (let k = 0; k <= j; k++) {
          sBuf[j]![k]! += w * J_ij * J_i[k]!
        }
      }
    }
    // 对称填充
    for (let j = 0; j < p; j++) {
      for (let k = j + 1; k < p; k++) {
        sBuf[j]![k] = sBuf[k]![j]!
      }
    }
    const S = new Matrix(sBuf)

    // 5.4 内层循环：λ 试探
    let accepted = false

    for (let inner = 0; inner < maxInnerIterations; inner++) {
      // 应用阻尼
      const A = applyDamping(S, damping.current())

      // 解 S · Δβ = b
      const trialDeltaBeta = solver.solve(A, b)
      if (!trialDeltaBeta) {
        damping.onReject()
        continue
      }

      // 回代求 Δδ
      //   Δδ_i = (w_y d / c) (r_y - J_β · Δβ) - (w_x / c) δ
      const trialDeltaDelta = new Array<number>(n)
      for (let i = 0; i < n; i++) {
        const J_i = jBeta[i]!
        let jDotDeltaBeta = 0
        for (let j = 0; j < p; j++) {
          jDotDeltaBeta += J_i[j]! * trialDeltaBeta[j]!
        }
        trialDeltaDelta[i] =
          wYdOverC[i]! * (currentResidualsY[i]! - jDotDeltaBeta) -
          wXOverC[i]! * currentDelta[i]!
      }

      // 试探新参数
      const trialParams: Record<string, number> = { ...currentParams }
      for (let j = 0; j < p; j++) {
        const name = paramNames[j]!
        trialParams[name] = currentParams[name]! + trialDeltaBeta[j]!
      }
      const trialDelta = new Array<number>(n)
      const trialXCorrected = new Array<number>(n)
      for (let i = 0; i < n; i++) {
        trialDelta[i] = currentDelta[i]! + trialDeltaDelta[i]!
        trialXCorrected[i] = xData[i]! + trialDelta[i]!
      }

      // 评估试探结果
      const trialPredicted = fn(trialXCorrected, trialParams)
      const trialResidualsY = new Array<number>(n)
      for (let i = 0; i < n; i++) {
        trialResidualsY[i] = yData[i]! - trialPredicted[i]!
      }
      const trialSSE = computeODRSSE(trialResidualsY, trialDelta, wY, wX)

      if (trialSSE < currentSSE) {
        // 接受
        currentParams = trialParams
        currentDelta = trialDelta
        currentXCorrected = trialXCorrected
        currentPredicted = trialPredicted
        currentResidualsY = trialResidualsY
        currentSSE = trialSSE
        damping.onAccept()
        accepted = true

        const state: IterationState = {
          iteration,
          params: currentParams,
          paramNames,
          residuals: currentResidualsY,
          sse: currentSSE,
          deltaP: trialDeltaBeta,
          gradient: b, // 等效 J_βᵀ W_eff r_eff（正梯度方向）
        }

        if (convergenceCheck.check(state)) {
          converged = true
        }
        break
      } else {
        damping.onReject()
      }
    }

    if (converged || !accepted) break
  }

  // ── 6. 计算最终统计量 ───────────────────────────
  // 在最终参数处重新算一次雅可比（与 LM 一致）
  const { jBeta: finalJBeta, d: _finalD } = jacobian.compute(
    fn,
    currentXCorrected,
    currentParams,
    paramNames,
    n,
  )

  // 用等效权重计算统计量
  // 注意：等效权重融合了 x 和 y 误差，用于协方差矩阵估计
  const finalW: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const wy = wY[i]!
    const wx = wX[i]!
    const di = _finalD[i] ?? 0
    if (wx === Infinity) {
      finalW[i] = wy
    } else {
      finalW[i] = (wy * wx) / (wy * di * di + wx)
    }
  }

  // 加权 J_βᵀ W J_β
  const jtjBuf: number[][] = Array.from({ length: p }, () =>
    new Array<number>(p).fill(0),
  )
  for (let i = 0; i < n; i++) {
    const w = finalW[i]!
    const J_i = finalJBeta[i]!
    for (let j = 0; j < p; j++) {
      const J_ij = J_i[j]!
      for (let k = 0; k <= j; k++) {
        jtjBuf[j]![k]! += w * J_ij * J_i[k]!
      }
    }
  }
  for (let j = 0; j < p; j++) {
    for (let k = j + 1; k < p; k++) {
      jtjBuf[j]![k] = jtjBuf[k]![j]!
    }
  }

  // R² / RMSE（不加权版本，与 Origin 一致）
  let yMean = 0
  for (let i = 0; i < n; i++) yMean += yData[i]!
  yMean /= n
  let ssTot = 0
  let unweightedSSE = 0
  for (let i = 0; i < n; i++) {
    const dy = yData[i]! - yMean
    ssTot += dy * dy
    unweightedSSE += currentResidualsY[i]! * currentResidualsY[i]!
  }
  const rSquared = ssTot === 0 ? 1 : 1 - unweightedSSE / ssTot
  const rmse = Math.sqrt(unweightedSSE / n)

  // 自由度 = 2n（观测：xᵢ 和 yᵢ 各 n 个）− (p + n)（参数：β p 个 + δ n 个）= n - p
  // 注：虽然数值上与 LM 相同，但 ODR 的参数空间与观测空间都更大；
  //     这里 dof 用于估计 σ²，是 ODRPACK 推荐的保守估计。
  const dof = n - p
  const sigma2 = currentSSE / Math.max(dof, 1)

  // 协方差 = σ² × (J_βᵀ W_eff J_β)⁻¹
  const jtjInv = getInvertMatrix(new Matrix(jtjBuf))
  const covariance: Matrix | null = jtjInv ? Matrix.mul(jtjInv, sigma2) : null

  // 参数标准误
  const paramErrors: Record<string, number> = {}
  for (let j = 0; j < p; j++) {
    const variance = covariance !== null ? covariance.get(j, j) : 0
    paramErrors[paramNames[j]!] = Math.sqrt(Math.max(variance, 0))
  }

  // 梯度无穷范数
  let gradientNorm = 0
  for (let j = 0; j < p; j++) {
    // 重算 J_βᵀ r_eff（已在最后一次迭代用过，这里简化）
    let g = 0
    for (let i = 0; i < n; i++) {
      g += finalW[i]! * finalJBeta[i]![j]! * (currentResidualsY[i]! + (_finalD[i] ?? 0) * currentDelta[i]!)
    }
    if (Math.abs(g) > gradientNorm) gradientNorm = Math.abs(g)
  }

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
    converged,
    iterations: iterationsUsed,
    gradientNorm,
    xCorrection: currentDelta,
    xCorrected: currentXCorrected,
    finalLambda: damping.current(),
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
  residualsY: number[],
  delta: number[],
  wY: number[],
  wX: number[],
): number {
  const n = residualsY.length
  let sse = 0
  for (let i = 0; i < n; i++) {
    const wy = wY[i]!
    const wx = wX[i]!
    const r = residualsY[i]!
    const d = delta[i]!
    sse += wy * r * r
    if (wx === Infinity) {
      if (d !== 0) {
        // σx=0 但 δ≠0：数值错误（理论上应保持 0）
        // 惩罚为巨大值，让 trust region 拒绝此步
        sse += 1e30
      }
    } else {
      sse += wx * d * d
    }
  }
  return sse
}

