/**
 * Levenberg-Marquardt 非线性最小二乘
 *
 * 本目录职责：拟合非线性模型，**只优化 y 残差**（假设 x 精确无误差）。
 * 架构位置：fitting/algorithms 层，与 linear / ODR 并列。
 *
 * 对外暴露：
 *   - levenbergMarquardt：主函数（接受 sigmaY / weights 实现加权 LM）
 *   - LevenbergMarquardtOptions / LevenbergMarquardtResult：配置与返回类型
 *
 * 适用：
 *   - (t, c) 动力学数据：t 精确（计时器），c 有误差
 *   - (1/T, ln k) Arrhenius：1/T 精确（温度可控），ln k 有误差
 *   - 一般的 (x, y) 数据中 x 误差 << y 误差
 *
 * 不适用：x 也有显著误差时改用 ODR（见 ../odr/）。
 */
export { levenbergMarquardt } from './levenberg-marquardt.js'
export type { LevenbergMarquardtOptions, LevenbergMarquardtResult } from './types.js'
