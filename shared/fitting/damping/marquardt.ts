/**
 * Marquardt 1963 固定倍数阻尼策略
 *
 * 简单稳定，是 LM 的默认选择。
 *
 * - 接受步长 → λ *= lambdaDown（默认 0.3）
 * - 拒绝步长 → λ *= lambdaUp（默认 5）
 * - λ 受 [lambdaMin, lambdaMax] 约束，防止数值溢出
 */
import type { DampingStrategy, DampingOptions } from './types.js'

export class MarquardtDamping implements DampingStrategy {
  private lambda: number

  constructor(options: DampingOptions = {}) {
    const lambdaInit = options.lambdaInit ?? 1e-3
    this.lambdaDown = options.lambdaDown ?? 0.3
    this.lambdaUp = options.lambdaUp ?? 5
    this.lambdaMax = options.lambdaMax ?? 1e12
    this.lambdaMin = options.lambdaMin ?? 1e-12

    // ── 完整边界校验 ──
    if (lambdaInit <= 0 || !Number.isFinite(lambdaInit)) {
      throw new Error(`lambdaInit 必须为正有限数：${lambdaInit}`)
    }
    if (this.lambdaDown <= 0 || this.lambdaDown >= 1) {
      throw new Error(`lambdaDown 必须在 (0, 1) 区间：${this.lambdaDown}`)
    }
    if (this.lambdaUp <= 1 || !Number.isFinite(this.lambdaUp)) {
      throw new Error(`lambdaUp 必须为 > 1 的有限数：${this.lambdaUp}`)
    }
    if (this.lambdaMin <= 0 || !Number.isFinite(this.lambdaMin)) {
      throw new Error(`lambdaMin 必须为正有限数：${this.lambdaMin}`)
    }
    if (this.lambdaMax <= this.lambdaMin) {
      throw new Error(
        `lambdaMax(${this.lambdaMax}) 必须 > lambdaMin(${this.lambdaMin})`,
      )
    }
    if (lambdaInit < this.lambdaMin || lambdaInit > this.lambdaMax) {
      throw new Error(
        `lambdaInit(${lambdaInit}) 必须在 [${this.lambdaMin}, ${this.lambdaMax}] 内`,
      )
    }

    this.lambda = lambdaInit
  }

  private readonly lambdaDown: number
  private readonly lambdaUp: number
  private readonly lambdaMax: number
  private readonly lambdaMin: number

  current(): number {
    return this.lambda
  }

  onAccept(): void {
    this.lambda = Math.max(this.lambdaMin, this.lambda * this.lambdaDown)
  }

  onReject(): void {
    this.lambda = Math.min(this.lambdaMax, this.lambda * this.lambdaUp)
  }
}

/** 工厂函数 */
export function createMarquardtDamping(
  options?: DampingOptions,
): DampingStrategy {
  return new MarquardtDamping(options)
}
