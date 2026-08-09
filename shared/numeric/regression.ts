/**
 * 回归统计通用原语
 *
 * R² / RMSE / 协方差 / 自由度 / 梯度范数——仅依赖通用数学概念（残差、方差、JᵀJ）。
 * 不依赖任何拟合算法（LM / ODR / 牛顿法等）的专有概念。
 *
 * fitting/statistics.ts 把这些原语拼装成 FitResult 字段。
 */
import type { Matrix } from '../matrix/types.js'
import { invertMatrix } from '../matrix/inverse.js'
import { mean } from './stats.js'

/**
 * 决定系数 R² = 1 - SSE / SST
 *
 * 通用：任意两个等长数组（y, yPred）即可计算。
 * @param y 观测值
 * @param yPred 预测值
 */
export function rSquared(y: number[], yPred: number[]): number {
  const n = y.length
  if (yPred.length !== n) {
    throw new Error(`rSquared 长度不匹配：y=${n}, yPred=${yPred.length}`)
  }
  const yMean = mean(y)
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const r = y[i]! - yPred[i]!
    ssRes += r * r
    const dy = y[i]! - yMean
    ssTot += dy * dy
  }
  return ssTot === 0 ? 1 : 1 - ssRes / ssTot
}

/**
 * 均方根误差 RMSE = √(SSE / n)
 *
 * 教学版：除以 n 而非 dof（直观对应"平均残差"）。
 * @param y 观测值
 * @param yPred 预测值
 */
export function rmse(y: number[], yPred: number[]): number {
  const n = y.length
  if (yPred.length !== n) {
    throw new Error(`rmse 长度不匹配：y=${n}, yPred=${yPred.length}`)
  }
  let sse = 0
  for (let i = 0; i < n; i++) {
    const r = y[i]! - yPred[i]!
    sse += r * r
  }
  return Math.sqrt(sse / n)
}

/**
 * 自由度 dof = n - p
 * @param n 观测数
 * @param p 参数数
 */
export function dof(n: number, p: number): number {
  return n - p
}

/**
 * 残差方差估计 σ² = SSE / max(dof, 1)
 * @param sse SSE
 * @param n 观测数
 * @param p 参数数
 */
export function sigma2(sse: number, n: number, p: number): number {
  return sse / Math.max(Math.max(n - p, 0), 1)
}

/**
 * 协方差矩阵 Cov = σ² × M⁻¹
 *
 * 通用：M 是任意 p×p 矩阵。
 * 拟合场景里 M 通常为 JᵀJ（Gauss-Newton 近似 Hessian）。
 *
 * @param m p×p 矩阵
 * @param sigma2 残差方差估计
 * @returns 协方差矩阵；M 奇异时返回 null
 */
export function covarianceFromM(m: Matrix, sigma2: number): Matrix | null {
  const mInv = invertMatrix(m)
  if (!mInv) return null
  return mInv.map((row) => row.map((v) => v * sigma2))
}

/**
 * 梯度无穷范数 = max_j |grad[j]|
 * @param grad 梯度向量
 */
export function gradientNorm(grad: number[]): number {
  let n = 0
  for (let j = 0; j < grad.length; j++) {
    const absV = Math.abs(grad[j]!)
    if (absV > n) n = absV
  }
  return n
}
