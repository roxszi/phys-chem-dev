import type { DampingStrategy, DampingOptions } from './types.js'

/**
 * Marquardt 1963 固定倍数阻尼策略
 *
 * 最朴素的 LM λ 调整：
 *   - 接受步长（SSE 下降）：λ *= lambdaDown（默认 ×0.1，变激进）
 *   - 拒绝步长（SSE 上升）：λ *= lambdaUp（默认 ×10，变保守）
 *
 * 上下限保护：
 *   - λ 下限（默认 1e-12）：防止 λ 降到 0 后无路可升
 *   - λ 上限（默认 1e12）：防止 λ 膨胀到浮点溢出（病态模型）
 *
 * 现代替代方案：Nielsen 2003 基于 gain ratio 的自适应策略
 * （收敛更快，但实现复杂）。本策略作为默认实现，足够大多数场景。
 */
export class MarquardtDamping implements DampingStrategy {
  private lambda: number
  private readonly lambdaUp: number
  private readonly lambdaDown: number
  private readonly lambdaMin: number
  private readonly lambdaMax: number

  constructor(options: DampingOptions = {}) {
    this.lambda = options.lambdaInit ?? 1e-3
    this.lambdaUp = options.lambdaUp ?? 10
    this.lambdaDown = options.lambdaDown ?? 0.1
    this.lambdaMin = options.lambdaMin ?? 1e-12
    this.lambdaMax = options.lambdaMax ?? 1e12

    // 合法性校验
    if (this.lambda <= 0 || !Number.isFinite(this.lambda)) {
      throw new Error(`lambdaInit 必须为正有限数：${this.lambda}`)
    }
    if (this.lambdaUp <= 1) {
      throw new Error(`lambdaUp 必须大于 1：${this.lambdaUp}`)
    }
    if (this.lambdaDown >= 1 || this.lambdaDown <= 0) {
      throw new Error(`lambdaDown 必须在 (0, 1) 区间：${this.lambdaDown}`)
    }
    if (this.lambdaMin >= this.lambdaMax) {
      throw new Error(
        `lambdaMin (${this.lambdaMin}) 必须小于 lambdaMax (${this.lambdaMax})`,
      )
    }
  }

  current(): number {
    return this.lambda
  }

  onAccept(): number {
    this.lambda = Math.max(this.lambda * this.lambdaDown, this.lambdaMin)
    return this.lambda
  }

  onReject(): number {
    this.lambda = Math.min(this.lambda * this.lambdaUp, this.lambdaMax)
    return this.lambda
  }
}

/** 工厂函数 */
export function createMarquardtDamping(
  options?: DampingOptions,
): DampingStrategy {
  return new MarquardtDamping(options)
}
