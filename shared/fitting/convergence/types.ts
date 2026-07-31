import type { IterationState } from '../types.js'

/**
 * 收敛判据接口
 *
 * 决定"什么时候可以停止迭代"。
 *
 * 常见判据（可组合使用）：
 *   1. 参数相对变化足够小（已经接近极值点）
 *   2. 损失绝对值足够小（模型完美拟合）
 *   3. 梯度无穷范数足够小（一阶必要条件）
 *
 * 通过接口化，可以自由组合判据、或为特定算法定制判据。
 */
export interface ConvergenceCheck {
  /**
   * 检查当前迭代状态是否满足收敛判据
   *
   * @param state 当前迭代的状态快照
   * @returns true 表示收敛
   */
  check(state: IterationState): boolean
}

/** 收敛判据配置 */
export interface ConvergenceOptions {
  /** 参数相对变化容差（默认 1e-8） */
  paramTolerance?: number
  /** 损失绝对值容差（默认 1e-8） */
  costTolerance?: number
  /** 梯度无穷范数容差（默认 1e-8） */
  gradientTolerance?: number
}
