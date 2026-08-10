/**
 * LM 算法配置与结果类型
 */
import type { LinearSolver } from "@shared/matrix/index.ts"
import type {
  FitResult,
  JacobianProvider,
  DampingStrategy, DampingOptions,
  ConvergenceOptions
} from "@shared/fitting/index.ts"

/**
 * Levenberg-Marquardt 算法配置
 *
 * 所有字段都是可选的——不传任何配置也能用默认值跑起来。
 * 高级用户可以注入自定义的雅可比计算器、线性求解器、阻尼策略等。
 */
export interface LevenbergMarquardtOptions {
  /** 最大外层迭代次数（默认 100） */
  maxIterations?: number
  /** 内层 λ 试探最大次数（默认 20） */
  maxInnerIterations?: number

  /**
   * y 的标准差数组（与 weights 二选一）
   * 
   * 内部转换为 weights = 1/σ²，用于加权正规方程。
   * 与 weights 同时给出时，weights 优先。
   */
  sigmaY?: number[]

  /**
   * 直接指定权重数组（与 sigmaY 二选一，优先级高于 sigmaY）
   *
   * 正比于 1/σ²。若你的权重已经是 1/σ² 形式，用此字段；
   * 若是 σ 形式，用 sigmaY 字段（内部会转换）。
   */
  weights?: number[]

  // ── 可替换模块（依赖注入） ──

  /** 雅可比计算器（默认：数值中心差分） */
  jacobian?: JacobianProvider

  /** 线性方程组求解器（默认：高斯消元） */
  solver?: LinearSolver

  /**
   * 阻尼策略（默认：Marquardt 1963）
   *
   * 同时提供 damping 和 dampingOptions 时，damping 优先。
   */
  damping?: DampingStrategy

  // ── 子模块的配置 ──

  /** 收敛判据配置 */
  convergence?: ConvergenceOptions

  /** 默认阻尼策略的配置（仅当未提供 damping 时生效） */
  dampingOptions?: DampingOptions
}

/**
 * LM 拟合结果（在通用 FitResult 基础上增加 LM 特有诊断字段）
 */
export interface LevenbergMarquardtResult extends FitResult {
  /** 最终阻尼因子 λ（LM 独有诊断） */
  finalLambda: number
}
