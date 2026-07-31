import type { FitResult } from '../../types.js'

/**
 * 线性最小二乘配置
 *
 * 线性拟合是闭式解，没有迭代，配置项很少：
 *   - 是否计算截距（false 时强制 intercept = 0，过原点拟合）
 *   - 是否计算协方差 / 参数标准误（性能敏感场景可关）
 */
export interface LinearLeastSquaresOptions {
  /**
   * 是否拟合截距（默认 true）
   *
   * true  ：y = slope·x + intercept（一般线性回归）
   * false ：y = slope·x            （过原点回归，自由度 = n - 1）
   *
   * 过原点回归在物化实验里常见，比如：
   *   - Beer-Lambert 定律 A = ε·b·c（吸光度 vs 浓度，理论截距为 0）
   *   - 一级反应速率方程积分形式特定变换后
   */
  fitIntercept?: boolean

  /**
   * 是否计算协方差和参数标准误（默认 true）
   *
   * false 时返回结果里 covariance 为空数组、paramErrors 全为 0。
   * 适用于只需要 slope/intercept + R² 的高频调用场景（如 bootstrap 拟合万次）。
   */
  computeStatistics?: boolean
}

/**
 * 线性拟合结果
 *
 * 继承 FitResult 以便和 LM 等算法共用接口；但线性拟合的特有字段
 * （slope / intercept）通过扩展类型携带，不污染通用接口。
 *
 * 注意：
 *   - params 用 { slope, intercept } 两个键（fitIntercept=false 时只有 slope）
 *   - iterations 永远是 1（闭式解，无迭代）
 *   - converged 永远是 true（除非抛错，否则不会失败）
 *   - finalLambda / dampingStrategy 等 LM 专属字段不在此接口
 */
export interface LinearLeastSquaresResult extends FitResult {
  /** 斜率 */
  slope: number
  /** 截距（fitIntercept=false 时为 0） */
  intercept: number
}
