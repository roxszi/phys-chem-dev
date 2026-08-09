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
import type { IterationState } from '../types.js'

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
