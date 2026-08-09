/**
 * fitting/ — 拟合算法与共享基础设施
 *
 * 架构层级：Tier 1 — 数值方法
 *
 * 依赖：
 *   - base/：数组校验（validate.ts）
 *   - numeric/：残差/SSE、中心差分原语、回归统计
 *   - matrix/：线性方程组求解器、矩阵求逆
 *
 * 对外暴露：与"模型"完全解耦的拟合算法入口；接收纯函数（PredictFn）作为模型。
 * 适用于任何最小二乘问题（线性 / 非线性 / ODR / errors-in-variables）。
 *
 * 三个拟合算法（按复杂度递增）：
 *   - linearLeastSquares：闭式加权线性最小二乘
 *   - levenbergMarquardt：非线性 + 只 y 残差
 *   - orthogonalDistanceRegression：非线性 + (x, y) 都有误差
 *
 * 扩展点（依赖注入）：
 *   - JacobianProvider / ConvergeCheck / DampingStrategy / LinearSolver 都可替换
 */

// 核心类型
// 核心类型
export type {
  PredictFn,
  PredictFnODR,
  DataArray,
  ParamNames,
  IterationState,
  FitResult,
  FitFailureReason,
} from './types.js'

// 算法入口
// 加权线性最小二乘（闭式）
export { linearLeastSquares } from './algorithms/linear/index.js'
export type {
  LinearLeastSquaresOptions,
  LinearLeastSquaresResult,
} from './algorithms/linear/index.js'

// Levenberg-Marquardt（非线性 + 只 y 残差）
// Levenberg-Marquardt
export { levenbergMarquardt } from './algorithms/lm/index.js'
export type {
  LevenbergMarquardtOptions,
  LevenbergMarquardtResult,
} from './algorithms/lm/index.js'

// 正交距离回归（非线性 + (x, y) 残差）
// 正交距离回归
export { orthogonalDistanceRegression } from './algorithms/odr/index.js'
export type {
  ODROptions,
  ODRResult,
  ODRJacobianProvider,
  NumericalODRJacobianOptions,
} from './algorithms/odr/index.js'
export {
  NumericalODRJacobian,
  createNumericalODRJacobian,
} from './algorithms/odr/index.js'

// 输入校验
// 拟合输入校验
export { validateInputs } from './validate.js'

// 正规方程构建 + 阻尼
// 正规方程构建 + 阻尼
export {
  buildJtj,
  buildJtr,
  buildWeightedJtj,
  buildWeightedJtr,
  buildWeightedNormalEquation,
  buildNormalEquation,
  applyDamping,
} from './normal-equation.js'

// 最终统计量拼装
// 拟合统计量拼装
export { computeStatistics } from './statistics.js'
export type { StatisticsInput, StatisticsResult } from './statistics.js'

// 可替换模块：雅可比
// 数值雅可比
export type { JacobianProvider } from './jacobian/types.js'
export {
  NumericalJacobian,
  createNumericalJacobian,
} from './jacobian/numerical.js'
export type { NumericalJacobianOptions } from './jacobian/numerical.js'

// 可替换模块：收敛判据
// 收敛判据
export type { ConvergenceCheck, ConvergenceOptions } from './convergence/types.js'
export {
  DefaultConvergence,
  createDefaultConvergence,
} from './convergence/default.js'

// 可替换模块：阻尼策略
// 阻尼策略
export type { DampingStrategy, DampingOptions } from './damping/types.js'
export {
  MarquardtDamping,
  createMarquardtDamping,
} from './damping/marquardt.js'
