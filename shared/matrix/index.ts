/**
 * matrix/ — 纯线性代数
 *
 * 架构层级：Tier 0 — 通用
 *
 * 依赖：
 *   - 无（纯标准库）
 *
 * 对外暴露：矩阵 / 向量基础运算 + 求逆 + 线性方程组求解器。
 * 数值稳定优先于极致性能。
 */

// 矩阵 / 向量类型
export type { Matrix, Vector } from "./types.ts"

// 单位矩阵 / 对角构造
export { identityMatrix, getDiagonal, makeDiagonal } from "./types.ts"

// 矩阵数乘 / 转置 / 矩阵×向量 / 矩阵×矩阵
export { scaleMatrix, transposeMatrix, matVec, matMat } from "./basic.ts"

// 矩阵求逆（Gauss-Jordan + 部分主元）
export { invertMatrix } from "./inverse.ts"

// 协方差矩阵 = σ² × M⁻¹（基于矩阵类型的高阶函数，原属 numeric，现迁至 matrix）
export { covarianceFromM } from "./covariance.ts"

// 线性方程组求解器接口 + 默认高斯消元实现
export type { LinearSolver } from "./solve.ts"
export {
  GaussianEliminationSolver,
  createGaussianEliminationSolver,
} from "./solve.ts"
