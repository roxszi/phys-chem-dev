/**
 * 加权线性最小二乘（闭式解）
 *
 * 本目录职责：拟合线性模型 y = slope·x + intercept，支持加权（WLS）。
 * 架构位置：fitting/algorithms 层，与 LM / ODR 并列——三者通过统一 FitResult 接口对外。
 *
 * 对外暴露：
 *   - linearLeastSquares：主函数（n≥2 即可，n=2 时标准误为 0）
 *   - LinearLeastSquaresOptions / LinearLeastSquaresResult：配置与返回类型
 *
 * 教学价值：
 *   - Beer-Lambert 校准曲线（A vs c）
 *   - Arrhenius 线性化（ln k vs 1/T）
 *   - 作为非线性公式 fitEquation 的 preFit（线性化变换后的初值估计）
 */
export { linearLeastSquares } from './linear-least-squares.js'
export type {
  LinearLeastSquaresOptions,
  LinearLeastSquaresResult,
} from './linear-least-squares.js'
