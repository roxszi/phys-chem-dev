/**
 * 雅可比计算器接口
 *
 * 雅可比矩阵 J[i][j] = ∂fᵢ/∂pⱼ 是 LM / ODR 算法的核心驱动信息。
 *
 * 实现选项（依赖注入）：
 *   - NumericalJacobian（默认）：数值中心差分，需要 2p 次 fn 调用
 *   - TfjsJacobian：tfjs 自动微分（tf.grads），适合复杂公式 / 批量计算
 *   - AnalyticalJacobian：用户提供解析偏导（最快，但需要手推）
 */
import type { PredictFn, ParamNames } from '../types.js'

export interface JacobianProvider {
  /**
   * 计算雅可比矩阵 [n × p]
   *
   * @param fn 预测函数
   * @param params 当前参数值
   * @param paramNames 参数名（顺序固定）
   * @param n 数据点数（fn 应返回 n 长度的向量）
   * @returns 雅可比矩阵 [n × p]，J[i][j] = ∂fᵢ/∂pⱼ
   */
  compute(
    fn: PredictFn,
    params: Record<string, number>,
    paramNames: ParamNames,
    n: number,
  ): number[][]
}
