/**
 * 拟合模块公共 API
 *
 * 总览见 ./README.md。
 */

// 核心类型
export type {
  PredictFn,
  DataArray,
  ParamNames,
  IterationState,
  FitResult,
  FitFailureReason,
} from './types.js'

// ── 算法层 ──────────────────────────────────────────

// Levenberg-Marquardt（非线性最小二乘）
export { levenbergMarquardt } from './algorithms/lm/index.js'
export type {
  LevenbergMarquardtOptions,
  LevenbergMarquardtResult,
} from './algorithms/lm/index.js'

// 线性最小二乘（y = slope·x + intercept 闭式解）
export { linearLeastSquares } from './algorithms/linear/index.js'
export type { LinearLeastSquaresOptions, LinearLeastSquaresResult } from './algorithms/linear/index.js'

// ── 拟合内部共享模块（高级用户可以自己组装 / 替换） ──────────

// 基础设施：校验 / 残差 / 正规方程 / 统计量
export { validateInputs } from './validate.js'
export { computeResiduals, computeSSE, computeResidualsAndSSE } from './residual.js'
export {
  buildNormalEquation,
  buildJtj,
  buildJtr,
  applyDamping,
} from './normal-equation.js'
export { computeStatistics } from './statistics.js'
export type { StatisticsInput, StatisticsResult } from './statistics.js'

// 可替换模块：雅可比
export type { JacobianProvider } from './jacobian/types.js'
export {
  NumericalJacobian,
  createNumericalJacobian,
} from './jacobian/numerical.js'
export type { NumericalJacobianOptions } from './jacobian/numerical.js'

// 可替换模块：收敛判据
export type { ConvergenceCheck, ConvergenceOptions } from './convergence/types.js'
export { DefaultConvergence, createDefaultConvergence } from './convergence/default.js'

// 可替换模块：阻尼策略（LM 专用）
export type { DampingStrategy, DampingOptions } from './damping/types.js'
export { MarquardtDamping, createMarquardtDamping } from './damping/marquardt.js'

// ── 通用工具从 base 层 re-export（使用者无需关心路径） ──────

// 线性方程组求解器
export type {
  LinearSolver,
  SymmetricPositiveDefiniteSolver,
} from '../base/linalg/solver/types.js'
export {
  GaussianEliminationSolver,
  createGaussianEliminationSolver,
} from '../base/linalg/solver/gaussian-elimination.js'

// 矩阵运算
export {
  invertMatrix,
  scaleMatrix,
  getDiagonal,
  makeDiagonal,
} from '../base/linalg/matrix.js'

// 通用校验
export {
  validateSameLength,
  validateMinLength,
  validateFiniteArray,
} from '../base/validate/arrays.js'

// 未来扩展（占位，未实现）
// export { gaussNewton } from './algorithms/gauss-newton/index.js'
// export { trustRegionReflective } from './algorithms/trust-region-reflective/index.js'
// export { orthogonalDistanceRegression } from './algorithms/odr/index.js'
