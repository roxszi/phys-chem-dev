/**
 * 默认收敛判据：三判据 OR 组合
 *
 * 任一判据满足即判定收敛：
 *   1. 参数相对变化 < paramTolerance
 *   2. 损失绝对值 < costTolerance，或相对首次记录的 SSE 下降到 costTolerance 倍
 *   3. 梯度无穷范数 < gradientTolerance
 *
 * 判据 1 的实现细节：
 *   用"每个参数的相对变化取最大值"（不是"最大绝对变化 / 最大参数值"），
 *   避免跨尺度参数相互掩盖（如 A=10⁴ 和 K=10⁻⁶ 同时拟合时，
 *   A 的微小变化可能掩盖 K 的大相对变化）。
 *
 * 判据 2 的相对形式（首次见到 SSE 时记录基准）解决加权场景：
 *   - 等权：SSE ~ O(1e-7)，绝对判据触发
 *   - 加权：weights = 1/σ²，σ=0.01 时 SSE 量级被放至 1e3+
 *     绝对判据永不触发，相对判据 `sse / sse0 < costTol` 兜底
 *
 * ⚠️ 跨多次拟合复用同一实例的注意事项：
 *   sseInitial 是有状态的（首次 check 后被缓存，永不自动清空）。
 *   如果你把同一个 DefaultConvergence 实例传给多次拟合，第二次的相对判据
 *   会基于第一次的初始 SSE——可能误判收敛或永不触发。
 *
 *   解决：
 *     - LM / ODR 内部每次都新建实例（默认安全）
 *     - 高级用户复用实例前必须调 `reset()`
 */
import type { IterationState } from "./types.js"

/**
 * 收敛判据接口
 *
 * 可替换模块。默认实现见 default.ts（三判据 OR 组合）。
 *
 * 实现可以是无状态的（仅基于当前 state 判断），
 * 也可以是有状态的（如 DefaultConvergence 缓存 sseInitial 做相对判据）。
 *
 * 有状态的实现**必须实现 reset()**——
 * 跨多次拟合复用同一实例时，调用 reset() 清空内部缓存，否则基准会污染。
 */

export interface ConvergenceCheck {
  /** 检查当前迭代状态是否满足收敛条件 */
  check(state: IterationState): boolean

  /**
   * 重置内部状态（可选）
   *
   * 跨多次拟合复用同一实例时必须调用，避免上一次拟合的状态污染下一次。
   *
   * 无状态实现可以不实现（留空或抛"不支持"）；有状态实现必须正确清空。
   *
   * LM / ODR 等主循环即使内部每次都新建实例，也应当在开始时调一次
   * `convergenceCheck.reset?.()`——为将来允许外部传入实例留扩展点。
   */
  reset?(): void
}

export interface ConvergenceOptions {
  /** 参数相对变化阈值（默认 1e-8） */
  paramTolerance?: number
  /** 损失绝对值阈值（默认 1e-8） */
  costTolerance?: number
  /** 梯度无穷范数阈值（默认 1e-8） */
  gradientTolerance?: number
}



export class DefaultConvergence implements ConvergenceCheck {
  private readonly paramTol: number
  private readonly costTol: number
  private readonly gradTol: number
  /** 首次 check 时记录的 SSE，用作相对判据基准（null = 尚未初始化） */
  private sseInitial: number | null = null

  constructor(options: ConvergenceOptions = {}) {
    this.paramTol = options.paramTolerance ?? 1e-8
    this.costTol = options.costTolerance ?? 1e-8
    this.gradTol = options.gradientTolerance ?? 1e-8

    if (this.paramTol <= 0) throw new Error(`paramTolerance 必须为正：${this.paramTol}`)
    if (this.costTol <= 0) throw new Error(`costTolerance 必须为正：${this.costTol}`)
    if (this.gradTol <= 0) throw new Error(`gradientTolerance 必须为正：${this.gradTol}`)
  }

  /**
   * 重置内部缓存（sseInitial）
   *
   * 跨多次拟合复用同一实例时，每次新拟合开始前必须调用。
   */
  reset(): void {
    this.sseInitial = null
  }

  check(state: IterationState): boolean {
    // 首次调用时记录基准 SSE
    if (this.sseInitial === null) {
      this.sseInitial = state.sse
    }

    // 判据 1：每个参数的相对变化都小于阈值
    const { deltaP, params, paramNames } = state
    let maxRelChange = 0
    for (let j = 0; j < deltaP.length; j++) {
      const name = paramNames[j]!
      const pj = Math.abs(params[name] ?? 0)
      const rel = Math.abs(deltaP[j]!) / Math.max(pj, 1e-12)
      if (rel > maxRelChange) maxRelChange = rel
    }
    if (maxRelChange < this.paramTol) return true

    // 判据 2a：损失绝对值足够小（等权场景适用）
    if (state.sse < this.costTol) return true

    // 判据 2b：损失相对首次记录值下降到阈值倍（加权场景适用）
    //   首次 sseInitial 可能就是 0（完美初值），用 max 防 0 除
    if (this.sseInitial > 0 && state.sse / this.sseInitial < this.costTol) {
      return true
    }

    // 判据 3：梯度无穷范数足够小
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
