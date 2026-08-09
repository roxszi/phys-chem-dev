/**
 * numeric/ — 通用数值统计与回归原语
 *
 * 架构层级：Tier 0 — 通用
 *
 * 依赖：
 *   - matrix/：协方差原语依赖矩阵求逆
 *   - 标准库
 *
 * 对外暴露：与拟合算法解耦的通用数值函数。拟合层（fitting/）在此之上扩展。
 */

// 标量聚合：求和 / 加权求和 / 均值 / 方差 / 平方和
// 标量聚合
export { sum, weightedSum, mean, sumOfSquares, variance } from './stats.js'

// 残差 + SSE（加权 / 不加权）
// 残差与 SSE
export { residuals, sse, residualsAndSse } from './residual.js'

// 回归统计：R² / RMSE / 协方差 / 自由度 / 梯度范数
// 回归统计通用原语
export {
  rSquared,
  rmse,
  dof,
  sigma2,
  covarianceFromM,
  gradientNorm,
} from './regression.js'

// 中心差分原语：被 fitting/jacobian 复用
// 中心差分原语
export { centralDiff } from './finite-difference.js'
