import type { PredictFn, ParamNames } from '../types.js'

/**
 * 雅可比计算器接口
 *
 * 雅可比矩阵 J[i][j] = ∂fᵢ/∂pⱼ，描述预测函数对参数的局部灵敏度。
 *
 * 实现可以是：
 *   - 数值差分（中心差分 / 前向差分）
 *   - 解析公式（用户提供 ∂f/∂p 的闭式表达）
 *   - 自动微分（如 tfjs 的 gradient）
 *
 * 通过这个接口，主算法不依赖具体实现，可自由替换。
 *
 * 注意：本接口当前是"拟合特化"形式（参数用 Record<string, number> 而非数组）。
 * 如果未来 base 层或其他业务需要雅可比，可以提取一个更通用的接口到 base。
 */
export interface JacobianProvider {
  /**
   * 计算雅可比矩阵
   *
   * @param fn 预测函数
   * @param params 当前参数值
   * @param paramNames 参数名列表（决定列的顺序）
   * @param n 数据点数（决定行数）
   * @returns 雅可比矩阵 [n × p]
   */
  compute(
    fn: PredictFn,
    params: Record<string, number>,
    paramNames: ParamNames,
    n: number,
  ): number[][]
}
