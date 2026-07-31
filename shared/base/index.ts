/**
 * base 模块公共 API
 *
 * 跨业务共享的最基础工具（线性代数、校验等）。
 * 详见 ./README.md。
 */

// 线性代数
export {
  invertMatrix,
  scaleMatrix,
  getDiagonal,
  makeDiagonal,
} from './linalg/matrix.js'

export type {
  LinearSolver,
  SymmetricPositiveDefiniteSolver,
} from './linalg/solver/types.js'
export {
  GaussianEliminationSolver,
  createGaussianEliminationSolver,
} from './linalg/solver/gaussian-elimination.js'

// 通用校验
export {
  validateSameLength,
  validateFiniteArray,
  validateMinLength,
} from './validate/arrays.js'
