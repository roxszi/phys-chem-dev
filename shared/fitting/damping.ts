/**
 * Marquardt 1963 固定倍数阻尼策略
 *
 * 简单稳定，是 LM 的默认选择。
 *
 * - 接受步长 → λ *= lambdaDown（默认 0.3）
 * - 拒绝步长 → λ *= lambdaUp（默认 5）
 * - λ 受 [lambdaMin, lambdaMax] 约束，防止数值溢出
 */

/**
 * LM 阻尼策略接口
 *
 * 阻尼因子 λ 控制 LM 在"最速下降"和"Gauss-Newton"之间的过渡：
 *   - λ 大：保守（接近最速下降），步长小但稳定
 *   - λ 小：激进（接近 GN），步长大但可能发散
 *
 * 策略：
 *   - MarquardtDamping（默认）：固定倍数升降（λ_up / λ_down）
 *   - NielsenDamping：基于增益比 ρ = (实际下降) / (预测下降) 的自适应策略
 */
export interface DampingStrategy {
  /** 当前阻尼因子 */
  current(): number
  /** 步长被接受（SSE 下降）→ 降 λ */
  onAccept(): void
  /** 步长被拒绝（SSE 上升）→ 升 λ */
  onReject(): void
}

export interface DampingOptions {
  /** 初始 λ（默认 1e-3） */
  lambdaInit?: number
  /** 接受时乘的因子（默认 0.3） */
  lambdaDown?: number
  /** 拒绝时乘的因子（默认 5） */
  lambdaUp?: number
  /** λ 上限（防止溢出，默认 1e12） */
  lambdaMax?: number
  /** λ 下限（防止退化，默认 1e-12） */
  lambdaMin?: number
}

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
