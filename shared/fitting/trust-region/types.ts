/**
 * trust-region 阻尼/信赖域子模块的类型定义
 * ---
 * 【核心概念：信赖域（trust region）】
 * LM 每轮解出的步长 Δp 是"线性近似下的最优步长"，但线性近似只在当前点附近成立。
 * 阻尼因子 λ 就是这个"可信邻域"的半径旋钮：λ 大 → 邻域小、步子保守；
 * λ 小 → 邻域大、步子激进。
 * "信赖域方法"就是根据每一步的实际效果（增益比 ρ，见 gain-ratio.ts）动态旋动旋钮：
 * 预测兑现就放大邻域（降 λ），预测失真就缩小邻域（升 λ）。
 * ---
 * 【数据流】
 * 主循环算出增益比 ρ → judge(rho, lambda) 给出 { accept, 新 λ } → 主循环执行接受/拒绝。
 */

/** 迭代策略 */
export type StepStrategy = "classic" | "nielsen"

/** 迭代控制设置项 */
export interface StepControlOptions {
  /** 迭代策略 */
  strategy: StepStrategy
  /** 初始阻尼 λ */
  lambdaInit?: number
  /** ρ ≥ rhoGood：接受该步并缩小 λ（classic 用） */
  rhoGood?: number
  /** ρ < rhoBad：拒绝该步并放大 λ（classic 用） */
  rhoBad?: number
  /** classic 策略的缩放系数（接受步 λ 缩小倍数） */
  shrink?: number
  /** classic 策略的放大系数（拒绝步 λ 放大倍数） */
  grow?: number
}

/** 单步决策：是否接受该步 + 下一轮使用的阻尼因子 */
export interface StepDecision {
  /** 下一轮使用的阻尼因子 λ */
  lambda: number
  /** 是否接受该步 */
  accept: boolean
}

/**
 * 步长控制器（编排接口，待批次 2.2 拍板后接入主循环）
 * - 工厂函数 createStepController 按策略返回本接口的闭包实现
 */
export interface StepController {
  /**
   * 每次 fit 开始时调用：复位内部状态（Nielsen 的 v 等），返回初始 λ。
   * 之所以需要它：控制器闭包里带状态，一个 fitter 若被多次调用 fit，
   * 不复位会把上次的策略状态泄漏进本次拟合。
   */
  init(): number
  /** 依据增益比 ρ 与当前 λ，决定是否接受该步、并给出新的 λ */
  judge(rho: number, lambda: number): StepDecision
}
