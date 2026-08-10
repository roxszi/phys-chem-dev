/**
 * fitting/algorithms/ — 拟合算法集合入口
 *
 * 架构层级：Tier 1 — 拟合层子目录
 *
 * 依赖：
 *   - algorithms/linear：加权闭式线性最小二乘
 *   - algorithms/lm：Levenberg-Marquardt 非线性
 *   - algorithms/odr：正交距离回归（x、y 都有误差）
 *
 * 对外暴露：三个算法入口 + 它们的配置/结果类型 + 数值雅可比实现。
 * 本目录无自身逻辑——纯转发，避免外部从子目录深跳访问。
 */

// 加权线性最小二乘（闭式解）
// 加权闭式线性最小二乘
export { linearLeastSquares } from './linear/index.js'
export type {
  LinearLeastSquaresOptions,
  LinearLeastSquaresResult,
} from './linear/index.js'

// Levenberg-Marquardt 非线性最小二乘
// Levenberg-Marquardt 非线性
export { levenbergMarquardt } from './lm/index.js'
export type {
  LevenbergMarquardtOptions,
  LevenbergMarquardtResult,
} from './lm/index.js'

// 正交距离回归（x 和 y 都有误差）
// 正交距离回归
export { orthogonalDistanceRegression } from './odr/index.js'
export type {
  ODROptions,
  ODRResult,
  ODRJacobianProvider,
  NumericalODRJacobianOptions,
} from './odr/index.js'
export {
  NumericalODRJacobian,
  createNumericalODRJacobian,
} from './odr/index.js'