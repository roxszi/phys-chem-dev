/**
 * 阻尼/信赖域子模块的类型定义
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
  /** classic 策略的缩放系数 */
  shrink?: number
  grow?: number
}

export interface StepDecision {
  lambda: number;
  accept: boolean;
}

export interface StepController {
  /**
   * 每次 fit 开始时调用：复位内部状态（Nielsen 的 v 等），返回初始 λ。
   * 之所以需要它：控制器闭包里带状态，一个 fitter 若被多次调用 fit，
   * 不复位会把上次的策略状态泄漏进本次拟合。
   */
  init(): number;
  /** 依据增益比 ρ 与当前 λ，决定是否接受该步、并给出新的 λ */
  judge(rho: number, lambda: number): StepDecision;
}
