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

// 矩阵 / 向量类型 + 单位矩阵 / 对角构造
// 矩阵类型与对角构造
export type { Matrix, Vector } from './types.js'
export { identityMatrix, getDiagonal, makeDiagonal } from './types.js'

// 矩阵数乘 / 转置 / 矩阵×向量 / 矩阵×矩阵
// 数乘与转置
export { scaleMatrix, transposeMatrix } from './basic.js'
// 矩阵×向量 / 矩阵×矩阵
export { matVec, matMat } from './basic.js'

// 矩阵求逆（Gauss-Jordan + 部分主元）
// 矩阵求逆
export { invertMatrix } from './inverse.js'

// 线性方程组求解器接口 + 默认高斯消元实现
// 线性方程组求解器与默认实现
export type { LinearSolver } from './solve.js'
export {
  GaussianEliminationSolver,
  createGaussianEliminationSolver,
} from './solve.js'
