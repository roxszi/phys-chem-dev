/**
 * fitting/ - 数据拟合模块
 * - 拟合算法与共享基础设施
 * - 适用于任何显式拟合问题（线性 / 非线性 / ODR / errors-in-variables）
 * ---
 * 对模型的唯一契约 = ModelFunction 纯函数 + ParamNames 自由参数名 + ParamValues 全参数字典，
 * 与模型来源（equation 层公式 / 手写函数）完全解耦。
 * ---
 * 拟合流水线（各步骤独立模块、接口规范、实现多样）：
 * 1.  validate.ts - 输入校验（paramNames 子集约束的运行时兜底 / 全字典有限性 / n > p）
 * 2.  内部迭代循环：
 *     2.1 jacobian\        - 雅可比矩阵（numerical 中心差分；tfjs-auto-diff 待实现）
 *     2.2 linear-solver\   - 正规方程构建 + 线性求解（高斯消元；Cholesky / QR / SVD 待扩展）
 *     2.3 damping.ts       - 阻尼策略（λ 升降试探；trust-region\ 的 ρ 驱动策略待接入）
 *     2.4 convergence.ts   - 收敛判定（三判据 OR）
 * 3.  statistics.ts - 收尾：最终统计拼装（R² / RMSE / 协方差 / 参数误差）
 * ---
 * 依赖：
 * math/（标量统计、矩阵求逆 / 协方差、无穷范数、数值校验）
 * ---
 * 对外暴露：
 * - 桥梁契约类型：ParamValues / ModelFunction / ParamNames（equation 层 import type 引用）
 * - 与"模型"完全解耦的拟合算法入口（接收纯函数作为模型）
 * ---
 * 拟合算法（按复杂度递增，见 algorithms/）：
 *   - linearLeastSquares：闭式加权线性最小二乘
 *   - levenbergMarquardt：非线性 + 只 y 残差
 *   - orthogonalDistanceRegression：非线性 + (x, y) 都有误差
 * ---
 * 可替换模块（依赖注入）：
 *   JacobianProvider / ConvergenceCheck / DampingStrategy / LinearSolver
 */

// ==================== 桥梁契约类型 ====================
export type {
  ParamValues,
  ModelFunction,
  ParamNames,
  IterationState,
  FitResult,
} from "./types.ts"

// ==================== 算法集合入口（algorithms/ 子目录聚合） ====================
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

// ==================== 拟合输入校验 ====================
export { validateInputs, sigmaToWeights } from "./validate.ts"

// ==================== 正规方程构建 + 阻尼 ====================
export {
  buildWeightedNormalEquation,
  applyDamping,
} from "./linear-solver/normal-equation.ts"

// ==================== 线性求解器（依赖注入点） ====================
export type { LinearSolver } from "./linear-solver/index.ts"
export { createGaussianEliminationSolver } from "./linear-solver/index.ts"

// ==================== 最终统计量拼装 ====================
export { computeStatistics, computeParamErrors } from "./statistics.ts"
export type { StatisticsInput, StatisticsResult } from "./statistics.ts"

// ==================== 可替换模块：雅可比（LM / ODR 接口与数值实现，全项目唯一） ====================
export type {
  JacobianProvider,
  ODRJacobianProvider,
  NumericalJacobianOptions,
} from "./jacobian/index.ts"
export {
  lmNumericalJacobian,
  odrNumericalJacobian,
} from "./jacobian/index.ts"

// ==================== 可替换模块：收敛判据 ====================
export type { ConvergenceCheck, ConvergenceOptions } from "./convergence.ts"
export {
  DefaultConvergence,
  createDefaultConvergence,
} from "./convergence.ts"

// ==================== 可替换模块：阻尼策略 ====================
export type { DampingStrategy, DampingOptions } from "./damping.ts"
export {
  MarquardtDamping,
  createMarquardtDamping,
} from "./damping.ts"
