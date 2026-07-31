/**
 * 线性代数基础工具
 *
 * 包括矩阵运算和线性方程组求解器。
 * 任何业务都能用（fitting 解正规方程、kinetics 解 ODE 等）。
 */

export { invertMatrix, scaleMatrix, getDiagonal, makeDiagonal } from './matrix.js'

export * from './solver/index.js'
