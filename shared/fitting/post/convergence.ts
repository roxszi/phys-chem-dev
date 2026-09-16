/**
 * fitting/post - 拟合后置处理：convergence.ts（收敛判定）
 * ---
 * 默认收敛判据：三判据 OR 组合，任一满足即判定收敛：
 *   1. 参数相对变化 < paramTolerance
 *   2. 损失绝对值 < costTolerance，或相对首次记录的 SSE 下降到 costTolerance 倍
 *   3. 梯度无穷范数 < gradientTolerance
 * ---
 * 判据 1 的实现细节：
 *   用"每个参数的相对变化取最大值"（不是"最大绝对变化 / 最大参数值"），
 *   避免跨尺度参数相互掩盖（如 A=10⁴ 和 K=10⁻⁶ 同时拟合时，
 *   A 的微小变化可能掩盖 K 的大相对变化）。
 * ---
 * 判据 2 的相对形式（首次见到 SSE 时记录基准）解决加权场景：
 *   - 等权：SSE ~ O(1e-7)，绝对判据触发
 *   - 加权：weights = 1/σ²，σ=0.01 时 SSE 量级被放至 1e3+
 *     绝对判据永不触发，相对判据 `sse / sse0 < costTol` 兜底
 * ---
 * ⚠️ 跨多次拟合复用同一实例的注意事项：
 *   闭包内的 sseInitial 是有状态的（首次 check 后被缓存，永不自动清空）。
 *   把同一个收敛器实例传给多次拟合时，第二次的相对判据会基于第一次的初始 SSE——
 *   可能误判收敛或永不触发。解决：复用前调用 reset()；
 *   LM / ODR 内部每次都新建实例（默认安全），并在开始时防御性调一次 reset()。
 * ---
 * 实现形态：工厂函数 + 闭包持有状态（JS 语系 class 原型链有额外开销，
 * 状态放闭包、行为放对象字面量，类型约束交给 ConvergenceCheck 接口——编译期管形状，运行时零负担）。
 */

// 数据类型（本模块内部文件，相对路径）
import type { IterationState } from "../types.ts"
// 无穷范数原语（跨模块，走 @shared 别名 + index.ts 唯一入口）
import { getInfNorm } from "@shared/math/index.ts"

/**
 * 收敛判据接口
 *
 * 可替换模块。默认实现见 createDefaultConvergence 工厂。
 *
 * 实现可以是无状态的（仅基于当前 state 判断），
 * 也可以是有状态的（如默认实现缓存 sseInitial 做相对判据）。
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

/** 收敛判据的配置 */
export interface ConvergenceOptions {
  /** 参数相对变化阈值（默认 1e-8） */
  paramTolerance?: number
  /** 损失绝对值阈值（默认 1e-8） */
  costTolerance?: number
  /** 梯度无穷范数阈值（默认 1e-8） */
  gradientTolerance?: number
}

/**
 * 工厂函数：创建默认收敛判据（三判据 OR）
 * - 闭包持有 sseInitial 状态与三个阈值，无 class 原型链开销
 * @param options 配置（可选，全部有默认值）
 * @returns ConvergenceCheck 实例
 */
export function createDefaultConvergence(
  options: ConvergenceOptions = {},
): ConvergenceCheck {
  // ── 配置解析 + 边界校验（构造期一次性做完） ──
  /** 参数相对变化阈值 */
  const paramTol = options.paramTolerance ?? 1e-8
  /** 损失绝对值阈值 */
  const costTol = options.costTolerance ?? 1e-8
  /** 梯度无穷范数阈值 */
  const gradTol = options.gradientTolerance ?? 1e-8

  // 三个阈值都必须为正数（否则判据失真：0 会立刻触发，负数永不触发）
  if (paramTol <= 0) throw new Error(`paramTolerance 必须为正：${ paramTol }`)
  if (costTol <= 0) throw new Error(`costTolerance 必须为正：${ costTol }`)
  if (gradTol <= 0) throw new Error(`gradientTolerance 必须为正：${ gradTol }`)

  /** 首次 check 时记录的 SSE，用作相对判据基准（null = 尚未初始化） */
  let sseInitial: number | null = null

  return {
    /**
     * 重置内部缓存（sseInitial）
     * 跨多次拟合复用同一实例时，每次新拟合开始前必须调用
     */
    reset(): void {
      sseInitial = null
    },

    /** 三判据 OR：任一满足即收敛 */
    check(state: IterationState): boolean {
      // 首次调用时记录基准 SSE
      if (sseInitial === null) {
        sseInitial = state.sse
      }

      // 判据 1：每个参数的相对变化都小于阈值
      //   relⱼ = |Δpⱼ| / max(|pⱼ|, 1e-12)，取各参数最大值（防跨尺度掩盖）
      const { deltaP, params, paramNames } = state
      let maxRelChange = 0
      for (let j = 0; j < deltaP.length; j++) {
        const name = paramNames[j]!
        const pj = Math.abs(params[name] ?? 0)
        const rel = Math.abs(deltaP[j]!) / Math.max(pj, 1e-12)
        if (rel > maxRelChange) maxRelChange = rel
      }
      if (maxRelChange < paramTol) return true

      // 判据 2a：损失绝对值足够小（等权场景适用）
      if (state.sse < costTol) return true

      // 判据 2b：损失相对首次记录值下降到阈值倍（加权场景适用）
      //   首次 sseInitial 可能就是 0（完美初值），用 max 防 0 除
      if (sseInitial > 0 && state.sse / sseInitial < costTol) {
        return true
      }

      // 判据 3：梯度无穷范数足够小（math/vector.ts 原语）
      if (getInfNorm(state.gradient) < gradTol) return true

      // 三判据均未满足：未收敛
      return false
    },
  }
}
