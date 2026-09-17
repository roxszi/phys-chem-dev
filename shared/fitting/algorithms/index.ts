/**
 * fitting/algorithms/ - 拟合算法集合入口
 */

// 加权线性最小二乘（闭式解）
export { linearLeastSquares } from "./linear-least-squares.ts"
export type {
  LinearLeastSquaresInput,
  LinearLeastSquaresResult,
} from "./linear-least-squares.ts"

// Levenberg-Marquardt 非线性最小二乘
export { levenbergMarquardt } from "./levenberg-marquardt.ts"
export type {
  LevenbergMarquardtInput,
  LevenbergMarquardtOptions,
  LevenbergMarquardtResult,
} from "./levenberg-marquardt.ts"

// 正交距离回归（x 和 y 都有误差）
export { orthogonalDistanceRegression } from "./orthogonal-distance-regression.ts"
export type {
  ODRInput,
  ODROptions,
  ODRResult,
} from "./orthogonal-distance-regression.ts"
