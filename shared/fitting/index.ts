/**
 * fitting/ - 数据拟合模块（唯一对外出口）
 * ---
 * 跨模块消费一律从本文件导入（@shared/fitting/index.ts）；
 * types.ts 等内部文件不对外，仅向本文件聚合。
 * ---
 * 对模型的唯一契约 = ModelFunction 纯函数（xData: number[][] 行主序 + ParamValues 全参数字典）
 * + ParamNames 自由参数名，与模型来源（equation 层公式 / 手写函数）完全解耦。
 * 多自变量天然支持：LM 把模型当黑盒；ODR / 线性最小二乘当前限单自变量（入口有守卫）。
 * ---
 * 拟合流水线（各步骤独立模块、接口规范、实现多样）：
 * 1. pre\        - 前置处理：输入校验 + σ→weights + 数据结构变换打样（data-shape）
 * 2. 内部迭代循环：
 *    2.1 jacobian\      - 雅可比矩阵（numerical 中心差分；tfjs-auto-diff 待实现）
 *    2.2 linear-solver\ - 正规方程构建 + 线性求解（高斯消元；Cholesky / QR / SVD 待扩展）
 *    2.3 trust-region\ - ρ 驱动阻尼策略（Nielsen 1999 主体；classic 三段式兼容）
 *    2.4 post\convergence.ts - 收敛判定（三判据 OR）
 * 3. post\statistics.ts - 后置处理：最终统计拼装（R² / RMSE / 协方差 / 参数误差）
 * ---
 * 依赖：
 * math/（标量统计、矩阵求逆 / 协方差、无穷范数、数值校验）
 * ---
 * 拟合算法（按复杂度递增，见 algorithms/）：
 *   - linearLeastSquares：闭式加权线性最小二乘（一元专用）
 *   - levenbergMarquardt：非线性 + 只 y 残差
 *   - orthogonalDistanceRegression：非线性 + (x, y) 都有误差
 * ---
 * 可替换模块（依赖注入）：
 *   JacobianProvider / ConvergenceCheck / DampingStrategy / LinearSolver
 * （实现均为工厂函数 + 闭包，无 class；接口形状编译期约束，运行时零原型链开销）
 */

// ==================== 桥梁契约类型 ====================
export type {
  ParamValues,
  ModelFunction,
  ParamNames,
  DataArray,
  IterationState,
  FitResult,
} from "./types.ts"

// ==================== 前置处理（pre/） ====================
// 输入校验 + σ→weights 预处理
export { validateInputs, sigmaToWeights } from "./pre/validate.ts"
// 数据结构变换打样（原始数据 → xData / yData，equation 层消费）
export { pointListToXY, singleXToRows } from "./pre/data-shape.ts"

// ==================== 正规方程构建 + 阻尼 ====================
export {
  buildWeightedNormalEquation,
  applyDamping,
} from "./linear-solver/normal-equation.ts"

// ==================== 线性求解器（依赖注入点） ====================
export type { LinearSolver } from "./linear-solver/index.ts"
export { createGaussianEliminationSolver } from "./linear-solver/index.ts"

// ==================== 后置处理（post/） ====================
// 收敛判据
export type { ConvergenceCheck, ConvergenceOptions } from "./post/convergence.ts"
export { createDefaultConvergence } from "./post/convergence.ts"
// 最终统计量拼装
export { computeStatistics, computeParamErrors } from "./post/statistics.ts"
export type { StatisticsInput, StatisticsResult } from "./post/statistics.ts"

// ==================== 阻尼策略（迭代中，trust-region/ ρ 驱动） ====================
export type {
  DampingStrategy,
  StepDecision,
  NielsenDampingOptions,
  ClassicDampingOptions,
} from "./trust-region/index.ts"
export {
  createNielsenDamping,
  createClassicDamping,
  nielsenJudge,
  classicJudge,
  CLASSIC_DEFAULTS,
  predictedReduction,
  gainRatio,
} from "./trust-region/index.ts"

// ==================== 可替换模块：雅可比（LM / ODR 接口与数值实现，全项目唯一） ====================
export type {
  JacobianProvider,
  ODRJacobianProvider,
  NumericalJacobianInput,
  NumericalJacobianOptions,
} from "./jacobian/index.ts"
export {
  lmNumericalJacobian,
  odrNumericalJacobian,
} from "./jacobian/index.ts"

// ==================== 拟合算法集合（algorithms/ 子目录聚合） ====================
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
