/**
 * fitting/ — 拟合算法与共享基础设施
 *
 * 依赖：
 * - base/：数组校验（validate.ts）
 * - numeric/：残差/SSE、中心差分原语、回归统计
 * - ml-matrix/：线性方程组求解器、矩阵求逆（ml-matrix 库语义封装，奇异返回 null）
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
export type {
  PredictFn,
  PredictFnODR,
  DataArray,
  ParamNames,
  IterationState,
  FitResult,
  FitFailureReason,
} from "./types.ts"

// 算法入口（通过 algorithms/ 集合入口 re-export，避免越级跳访问）
// 算法集合入口（algorithms/ 子目录聚合）
export {
  linearLeastSquares,
  levenbergMarquardt,
  orthogonalDistanceRegression,
  NumericalODRJacobian,
  createNumericalODRJacobian,
} from "./algorithms/index.ts"
export type {
  LinearLeastSquaresOptions,
  LinearLeastSquaresResult,
  LevenbergMarquardtOptions,
  LevenbergMarquardtResult,
  ODROptions,
  ODRResult,
  ODRJacobianProvider,
  NumericalODRJacobianOptions,
} from "./algorithms/index.ts"

// 拟合输入校验
export { validateInputs } from "./validate.ts"

// 正规方程构建 + 阻尼
export {
  buildWeightedNormalEquation,
  applyDamping,
} from "./normal-equation.ts"

// 最终统计量拼装
export { computeStatistics } from "./statistics.ts"
export type { StatisticsInput, StatisticsResult } from "./statistics.ts"

// 可替换模块：雅可比
export type { JacobianProvider, NumericalJacobianOptions } from "./jacobian.ts"
export {
  NumericalJacobian,
  createNumericalJacobian,
} from "./jacobian.ts"

// 可替换模块：收敛判据
export type { ConvergenceCheck, ConvergenceOptions } from "./convergence.ts"
export {
  DefaultConvergence,
  createDefaultConvergence,
} from "./convergence.ts"

// 可替换模块：阻尼策略
export type { DampingStrategy, DampingOptions } from "./damping.ts"
export {
  MarquardtDamping,
  createMarquardtDamping,
} from "./damping.ts"
