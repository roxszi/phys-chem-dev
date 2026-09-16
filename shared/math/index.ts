/**
 * math - 基础数学模块
 * ---
 * 主要包括：
 * - array - 各类数组方法
 * - matrix - 基础稠密矩阵（自研，Float64Array 行主序；构造/访问/算术/LU/Cholesky）
 * - validate - 各类数值有效性校验
 * @note 出于性能与耦合冗余考虑，该模块不应涉及数据验证，默认均为有效number类型
 */

// 导出数组相关函数
export {
  sortArr,
} from "./array.ts"

// 导出基础统计相关函数
export {
  getSum,
  getMean,
  getMedian,
  getMAD,
  getPercentile,
  getRSquared,
  getRMSE,
  getREArr,
  getSSE,
  getSSESigmaSquared,
} from "./statistics.ts"

// 导出矩阵相关函数（基础稠密矩阵子模块，自研实现）
export {
  createMatrix,
  matrixFrom2D,
  matrixGet,
  matrixSet,
  matrixIsSquare,
  matrixIsEmpty,
  matrixTo2D,
  matrixScalarMul,
  matrixVecMul,
  luDecomposeChecked,
  luSolve,
  matrixInvert,
  choleskyDecomposeInPlace,
  choleskySolve,
  DIAGONAL_FLOOR,
  SINGULAR_TOLERANCE,
} from "./matrix/index.ts"
export type { Matrix, LuFactorization } from "./matrix/index.ts"

// 导出向量相关函数（归拢进矩阵子模块，线性代数统一出口）
export {
  getInfNorm,
} from "./matrix/index.ts"
export type { Vector } from "./matrix/index.ts"

// 导出数值校验函数
export {
  isFinitePositive,
  isFiniteNonNegative
} from "./validate.ts"

