/**
 * 雅可比计算器模块
 *
 * 本目录职责：计算模型预测函数对参数的偏导数 J[i][j] = ∂f/∂βⱼ。
 * 架构位置：fitting 层的"可替换模块"——LM / ODR 等算法通过依赖注入接收。
 *
 * 对外暴露：
 *   - JacobianProvider 接口（compute(fn, params, paramNames, n) => J 矩阵）
 *   - NumericalJacobian / createNumericalJacobian：默认实现（中心差分 + 自适应步长）
 *
 * 扩展点：未来可以加 AnalyticalJacobian（用户手写解析偏导）、TfjsJacobian（自动微分）。
 */
export type { JacobianProvider } from './types.js'
export {
  NumericalJacobian,
  createNumericalJacobian,
} from './numerical.js'
export type { NumericalJacobianOptions } from './numerical.js'
