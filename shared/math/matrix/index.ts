/**
 * math/matrix - 基础稠密矩阵子模块（聚合出口）
 * ---
 * 【定位】只放基础的、业务无关的矩阵操作（自研，Float64Array 行主序）；
 * 拟合业务的矩阵操作（加权正规方程、阻尼、协方差组装）在 fitting\ 的
 * 具体业务 ts 文件里。ml-matrix 库已移除。
 * ---
 * 【目录分工】
 * - types.ts：Matrix 契约 + 全项目唯一奇异阈值；
 * - construct.ts：构造与元素访问 / 形状谓词；
 * - arithmetic.ts：标量乘 / 矩阵×向量；
 * - lu.ts：部分主元 LU 分解 + 奇异检查 + 求解 + 求逆；
 * - cholesky.ts：对称正定的 Cholesky 分解 + 求解（GPU 收尾预留）；
 * - index.ts（本文件）：统一导出。
 */

// ==================== 契约类型 ====================
export type { Matrix, Vector } from "./types.ts"
export { SINGULAR_TOLERANCE } from "./types.ts"

// ==================== 构造与访问 ====================
export {
  createMatrix,
  matrixFrom2D,
  matrixGet,
  matrixSet,
  matrixIsSquare,
  matrixIsEmpty,
  matrixTo2D,
} from "./construct.ts"

// ==================== 算术运算 ====================
export { matrixScalarMul, matrixVecMul } from "./arithmetic.ts"

// ==================== LU 分解族 ====================
export { luDecomposeChecked, luSolve, matrixInvert } from "./lu.ts"
export type { LuFactorization } from "./lu.ts"

// ==================== 向量原语 ====================
export { getInfNorm } from "./vector.ts"

// ==================== Cholesky 分解族 ====================
export {
  choleskyDecomposeInPlace,
  choleskySolve,
  DIAGONAL_FLOOR,
} from "./cholesky.ts"
