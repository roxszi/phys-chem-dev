/**
 * ODR（正交距离回归）算法的配置与结果类型
 *
 * ODR 在 LM 基础上扩展：
 *   - LM 假设 x 精确，只优化 y 残差
 *   - ODR 同时优化 (x, y) 残差，最小化数据点到拟合曲线的"加权正交距离"
 *
 * 适用场景：
 *   - x, y 都有显著误差（如 Beer-Lambert 校准：c 配样误差 ≈ A 仪器误差）
 *   - 强非线性公式 + x 误差不可忽略
 *
 * 数学退化（重要！）：
 *   - σx → 0 时（w_x → ∞）退化为加权 LM
 *   - 模型对 x 不敏感（d = ∂f/∂x ≈ 0）退化为加权 LM
 *   - 模型线性 + σx > 0 时退化为 York 回归
 *
 * 详见同目录 README.md。
 */
import type { FitResult, PredictFnODR } from '../../types.js'
import type { LinearSolver } from '../../../matrix/solve.js'
import type { DampingStrategy, DampingOptions } from '../../damping/types.js'
import type { ConvergenceOptions } from '../../convergence/types.js'

/**
 * ODR 雅可比计算器接口
 *
 * 与 LM 的 JacobianProvider 不同，ODR 需要同时计算：
 *   - 对参数 β 的雅可比 J_β[i][j] = ∂f/∂βⱼ
 *   - 对自变量 x 的偏导 d[i] = ∂f/∂x
 *
 * 用户可以实现解析版（最快）或自动微分版（tfjs.grads）。
 */
export interface ODRJacobianProvider {
  /**
   * 同时计算 J_β 和 d
   *
   * @param fn 预测函数（ODR 形式，x 和 params 都显式传递）
   * @param xCorrected 修正后的 x（= x + δ）
   * @param params 当前参数
   * @param paramNames 参数名
   * @param n 数据点数
   */
  compute(
    fn: PredictFnODR,
    xCorrected: number[],
    params: Record<string, number>,
    paramNames: string[],
    n: number,
  ): { jBeta: number[][]; d: number[] }
}

/**
 * ODR 算法配置
 *
 * 所有不带 sigma 前缀的字段都是可选的；
 * sigmaX / sigmaY 控制是否启用 ODR（全为 0 时退化为 LM）。
 */
export interface ODROptions {
  /** x 的标准差数组（每点独立）。不传或全 0 时退化为 LM */
  sigmaX?: number[]
  /** y 的标准差数组（每点独立）。不传时默认全 1（等权） */
  sigmaY?: number[]

  /** 最大外层迭代次数（默认 100） */
  maxIterations?: number
  /** 内层 λ 试探最大次数（默认 20） */
  maxInnerIterations?: number

  // ── 可替换模块（依赖注入） ──

  /** 雅可比计算器（必须 ODRJacobianProvider） */
  jacobian?: ODRJacobianProvider

  /** 线性方程组求解器 */
  solver?: LinearSolver

  /** 阻尼策略 */
  damping?: DampingStrategy

  // ── 子模块的配置 ──

  /** 收敛判据配置 */
  convergence?: ConvergenceOptions

  /** 默认阻尼策略的配置 */
  dampingOptions?: DampingOptions
}

/**
 * ODR 拟合结果
 *
 * 在通用 FitResult 基础上增加 ODR 特有字段：
 *   - xCorrection：每个数据点的 x 修正量 δ_i
 *   - xCorrected：修正后的 x（= xData + xCorrection）
 */
export interface ODRResult extends FitResult {
  /** 每个数据点的 x 修正量 δ_i */
  xCorrection: number[]
  /** 修正后的 x（= xData + δ） */
  xCorrected: number[]
  /** 最终阻尼因子 λ */
  finalLambda: number
  /** 拟合模式（运行时判定） */
  mode: 'lm' | 'odr'
}
