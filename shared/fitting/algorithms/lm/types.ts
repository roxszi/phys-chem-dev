import type { FitResult } from '../../types.js'
import type { JacobianProvider } from '../../jacobian/types.js'
import type { LinearSolver } from '../../../base/linalg/solver/types.js'
import type { DampingStrategy, DampingOptions } from '../../damping/types.js'
import type { ConvergenceOptions } from '../../convergence/types.js'

/**
 * Levenberg-Marquardt 算法配置
 *
 * 所有字段都是可选的——不传任何配置也能用默认值跑起来。
 * 高级用户可以注入自定义的雅可比计算器、线性求解器、阻尼策略等。
 */
export interface LevenbergMarquardtOptions {
  /**
   * 最大外层迭代次数（默认 100）
   *
   * 每次外层迭代都重新计算雅可比矩阵。
   * 大多数简单问题 10~30 次就收敛，复杂模型可能需要 100+。
   */
  maxIterations?: number

  /**
   * 内层 λ 试探最大次数（默认 20）
   *
   * 每次外层迭代内，最多尝试调整 λ 多少次来寻找下降步。
   * 一般 5~10 次就够，20 是保守上限。
   */
  maxInnerIterations?: number

  // ── 可替换模块（依赖注入） ──

  /**
   * 雅可比计算器
   *
   * 默认：数值中心差分（自适应步长，relativeStep = 1e-6）
   * 可以替换为：解析雅可比 / tfjs 自动微分实现 / ...
   */
  jacobian?: JacobianProvider

  /**
   * 线性方程组求解器
   *
   * 默认：高斯消元（带主元）
   * 可以替换为：Cholesky / LU / QR / SVD / tfjs GPU 实现 / ...
   */
  solver?: LinearSolver

  /**
   * 阻尼策略
   *
   * 默认：Marquardt 1963 固定倍数策略
   * 可以替换为：Nielsen 2003 自适应策略 / 自定义 / ...
   *
   * 注意：不提供此参数时使用 dampingOptions 构造默认策略。
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
 *
 * finalLambda 是 LM 独有的（GN / TRF / BFGS 等没有阻尼因子），
 * 所以不污染通用 FitResult 接口，而是通过扩展类型携带。
 */
export interface LevenbergMarquardtResult extends FitResult {
  /** 最终阻尼因子 λ（LM 独有诊断） */
  finalLambda: number
}
