import type { IterationState } from '../types.js'
import type { ConvergenceCheck, ConvergenceOptions } from './types.js'

/**
 * 默认收敛判据：三判据 OR 组合
 *
 * 任一判据满足即判定收敛：
 *   1. 参数相对变化 < paramTolerance
 *   2. 损失绝对值 < costTolerance
 *   3. 梯度无穷范数 < gradientTolerance
 *
 * 注意判据 1 的实现细节：
 *   用"每个参数的相对变化取最大值"（不是"最大绝对变化 / 最大参数值"），
 *   避免跨尺度参数相互掩盖（如 A=10⁴ 和 K=10⁻⁶ 同时拟合时，
 *   A 的微小变化可能掩盖 K 的大相对变化）。
 */
export class DefaultConvergence implements ConvergenceCheck {
  private readonly paramTol: number
  private readonly costTol: number
  private readonly gradTol: number

  constructor(options: ConvergenceOptions = {}) {
    this.paramTol = options.paramTolerance ?? 1e-8
    this.costTol = options.costTolerance ?? 1e-8
    this.gradTol = options.gradientTolerance ?? 1e-8

    // 合法性校验
    if (this.paramTol <= 0) throw new Error(`paramTolerance 必须为正：${this.paramTol}`)
    if (this.costTol <= 0) throw new Error(`costTolerance 必须为正：${this.costTol}`)
    if (this.gradTol <= 0) throw new Error(`gradientTolerance 必须为正：${this.gradTol}`)
  }

  check(state: IterationState): boolean {
    // 判据 1：每个参数的相对变化都小于阈值
    //
    // 公式：max_j |Δpⱼ| / max(|pⱼ|, 1e-12)
    //
    // 分母用 max(|pⱼ|, 1e-12) 防止 pⱼ = 0 时除零。
    const { deltaP, params, paramNames } = state
    let maxRelChange = 0
    for (let j = 0; j < deltaP.length; j++) {
      const name = paramNames[j]!
      const pj = Math.abs(params[name] ?? 0)
      const rel = Math.abs(deltaP[j]!) / Math.max(pj, 1e-12)
      if (rel > maxRelChange) maxRelChange = rel
    }
    if (maxRelChange < this.paramTol) return true

    // 判据 2：损失绝对值足够小（模型完美拟合）
    if (state.sse < this.costTol) return true

    // 判据 3：梯度无穷范数足够小（一阶必要条件：极值点梯度为零）
    let gradNorm = 0
    for (let j = 0; j < state.gradient.length; j++) {
      const absG = Math.abs(state.gradient[j]!)
      if (absG > gradNorm) gradNorm = absG
    }
    if (gradNorm < this.gradTol) return true

    return false
  }
}

/** 工厂函数 */
export function createDefaultConvergence(
  options?: ConvergenceOptions,
): ConvergenceCheck {
  return new DefaultConvergence(options)
}
