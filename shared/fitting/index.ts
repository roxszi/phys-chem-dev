/**
 * fitting/ - 数据拟合模块
 * - 拟合算法与共享基础设施
 * - 适用于任何显式拟合问题（线性 / 非线性 / ODR / errors-in-variables）
 * ---
 * 拟合流水线：
 * 1.  validate.ts - 输入校验
 * 2.  内部迭代循环：
 *     2.1 jacobian\ - 计算雅可比矩阵
 *     2.2 normal-equation.ts - 正规方程构建与阻尼施加
 *     2.3 damping.ts - 阻尼策略（λ 升降试探）
 *     2.4 convergence.ts - 收敛判定
 * 3.  statistics.ts - 收尾：最终统计拼装（R² / RMSE / 协方差 / 参数误差）
 * 
 * 工具：matrix-solve.ts 线性方程组求解（被迭代环节调用，依赖注入点）
 * 工具：linear-solver.ts 线性方程组求解（被迭代环节调用，依赖注入点）
 * 
 * ---
 * 依赖：
 * math/（标量统计、矩阵求逆 / 协方差、无穷范数、数值校验）
 * ---
 * 对外暴露：
 * - 与"模型"完全解耦的拟合算法入口
 * - 接收纯函数（PredictFn）作为模型。
 * ---
 * 扩展模块：
 * - 三个拟合算法（按复杂度递增，见 algorithms/）：
 *   - linearLeastSquares：闭式加权线性最小二乘
 *   - levenbergMarquardt：非线性 + 只 y 残差
 *   - orthogonalDistanceRegression：非线性 + (x, y) 都有误差
 * ---
 * 可替换模块（依赖注入）：
 *   JacobianProvider / ConvergenceCheck / DampingStrategy / LinearSolver
 */

// 核心类型
export type {
  PredictFn,
  PredictFnODR,
  DataArray,
  ParamNames,
  IterationState,
  FitResult,
} from "./types.ts"

// 算法集合入口（algorithms/ 子目录聚合）
export {
  linearLeastSquares,
  levenbergMarquardt,
  orthogonalDistanceRegression,
} from "./algorithms/index.ts"
export type {
  LinearLeastSquaresOptions,
  LinearLeastSquaresResult,
  LevenbergMarquardtOptions,
  LevenbergMarquardtResult,
  ODROptions,
  ODRResult,
} from "./algorithms/index.ts"

// 拟合输入校验
export { validateInputs } from "./validate.ts"

// 正规方程构建 + 阻尼
export {
  buildWeightedNormalEquation,
  applyDamping,
} from "./linear-solver/normal-equation.ts"

// 最终统计量拼装
export { computeStatistics } from "./statistics.ts"
export type { StatisticsInput, StatisticsResult } from "./statistics.ts"

// 可替换模块：雅可比（LM / ODR 接口与数值实现，全项目唯一）
export type {
  JacobianProvider,
  ODRJacobianProvider,
  NumericalJacobianOptions,
  NumericalODRJacobianOptions,
} from "./jacobian.ts"
export {
  NumericalJacobian,
  createNumericalJacobian,
  NumericalODRJacobian,
  createNumericalODRJacobian,
  centralDiff,
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
