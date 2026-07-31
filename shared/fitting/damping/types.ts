/**
 * 阻尼策略接口（LM 类算法专用）
 *
 * 控制阻尼因子 λ 的演化：接受步长时降 λ（变激进），
 * 拒绝步长时升 λ（变保守）。
 *
 * 实现可以是：
 *   - Marquardt 1963：固定倍数上调 / 下调
 *   - Nielsen 2003：基于 gain ratio ρ 的自适应调整
 *   - 自定义策略
 *
 * 注意：纯 Gauss-Newton（无阻尼）不需要此模块。
 */
export interface DampingStrategy {
  /** 当前 λ 值 */
  current(): number

  /** 接受步长后调用，返回新 λ */
  onAccept(): number

  /** 拒绝步长后调用，返回新 λ */
  onReject(): number
}

/** 阻尼策略配置 */
export interface DampingOptions {
  /** 初始 λ（默认 1e-3） */
  lambdaInit?: number
  /** 拒绝时 λ 上调倍数（默认 10） */
  lambdaUp?: number
  /** 接受时 λ 下调倍数（默认 0.1） */
  lambdaDown?: number
  /** λ 下限（默认 1e-12） */
  lambdaMin?: number
  /** λ 上限（默认 1e12） */
  lambdaMax?: number
}
