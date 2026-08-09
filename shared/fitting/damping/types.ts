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
