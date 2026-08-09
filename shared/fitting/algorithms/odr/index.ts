/**
 * ODR 算法入口
 *
 * 详见同目录 README.md。
 */
export { orthogonalDistanceRegression } from './orthogonal-distance-regression.js'
export type {
  ODROptions,
  ODRResult,
  ODRJacobianProvider,
} from './types.js'
export {
  NumericalODRJacobian,
  createNumericalODRJacobian,
} from './numerical-jacobian.js'
export type { NumericalODRJacobianOptions } from './numerical-jacobian.js'
