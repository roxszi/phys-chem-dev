import type { PredictFn, ParamNames } from './types.js'
import { buildNormalEquation } from './normal-equation.js'
import { invertMatrix } from '../base/linalg/matrix.js'

/**
 * 拟合统计量计算
 *
 * 收敛后计算最终统计：R²、RMSE、协方差矩阵、参数标准误、梯度范数。
 *
 * 这些统计量适用于所有基于 SSE 的最小二乘算法（LM / GN / TRF）。
 * 线性最小二乘也可以用（其协方差公式相同，只是雅可比直接是设计矩阵 X）。
 */

export interface StatisticsInput {
  /** 预测函数 */
  fn: PredictFn
  /** 最终参数值 */
  params: Record<string, number>
  /** 参数名列表 */
  paramNames: ParamNames
  /** 自变量数据 */
  xData: number[]
  /** 因变量数据 */
  yData: number[]
  /** 最终残差向量 */
  residuals: number[]
  /** 最终 SSE */
  sse: number
  /** 最终参数处的雅可比矩阵（用于协方差和梯度计算） */
  jacobian: number[][]
}

export interface StatisticsResult {
  /** 预测值 y_pred = fn(params) */
  predicted: number[]
  /** 决定系数 R² = 1 - SS_res / SS_tot */
  rSquared: number
  /** 均方根误差 RMSE = √(SSE/n) */
  rmse: number
  /** 残差方差估计 σ² = SSE / (n - p) */
  sigma2: number
  /** 协方差矩阵 Cov = σ² × (JᵀJ)⁻¹（若 JᵀJ 奇异则返回空数组） */
  covariance: number[][]
  /** 参数标准误 SE(pⱼ) = √Cov[j][j] */
  paramErrors: Record<string, number>
  /** 梯度无穷范数（最终一阶条件诊断） */
  gradientNorm: number
  /** 自由度 */
  dof: number
}

/**
 * 计算拟合统计量
 *
 * 协方差矩阵公式：Cov = σ² × (JᵀJ)⁻¹
 *
 * 前提假设：
 *   1. 模型正确（残差是随机噪声，不是系统偏差）
 *   2. 残差接近线性（Gauss-Newton 近似有效）
 *   3. 残差独立同分布（无时间 / 空间相关性）
 *
 * 这三条假设任一不满足，协方差矩阵和参数标准误都不可信。
 * R² 和 RMSE 仍然有效（它们不依赖这些假设）。
 */
export function computeStatistics(input: StatisticsInput): StatisticsResult {
  const {
    fn,
    params,
    paramNames,
    xData,
    yData,
    residuals,
    sse,
    jacobian,
  } = input

  const n = xData.length
  const p = paramNames.length

  // 预测值
  const predicted = fn(params)

  // R² = 1 - SS_res / SS_tot
  let yMean = 0
  for (let i = 0; i < n; i++) yMean += yData[i]!
  yMean /= n

  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const dy = yData[i]! - yMean
    ssTot += dy * dy
  }
  // ssTot = 0（所有 y 相同）时 R² 退化为 1（无论模型如何）
  // 这是边界情况，通常意味着数据有问题（常数列）
  const rSquared = ssTot === 0 ? 1 : 1 - sse / ssTot

  // RMSE = √(SSE / n)
  const rmse = Math.sqrt(sse / n)

  // 自由度
  const dof = n - p

  // σ² = SSE / (n - p)
  const sigma2 = sse / Math.max(dof, 1)

  // 协方差 = σ² × (JᵀJ)⁻¹
  // 复用 normal-equation 的 buildNormalEquation（会同时算出 Jᵀr，
  // 这里只用 JᵀJ 和 Jᵀr，jtr 用来算梯度范数）
  const { jtj, jtr } = buildNormalEquation(jacobian, residuals)
  const jtjInv = invertMatrix(jtj)
  const covariance: number[][] = jtjInv
    ? jtjInv.map((row) => row.map((v) => v * sigma2))
    : []

  // 参数标准误 = √Cov[j][j]（Math.max 防止数值噪声导致负值）
  const paramErrors: Record<string, number> = {}
  for (let j = 0; j < p; j++) {
    const variance = covariance.length > 0 ? (covariance[j]?.[j] ?? 0) : 0
    paramErrors[paramNames[j]!] = Math.sqrt(Math.max(variance, 0))
  }

  // 梯度无穷范数 = max_j |(Jᵀr)[j]|
  let gradientNorm = 0
  for (let j = 0; j < p; j++) {
    const absG = Math.abs(jtr[j]!)
    if (absG > gradientNorm) gradientNorm = absG
  }

  return {
    predicted,
    rSquared,
    rmse,
    sigma2,
    covariance,
    paramErrors,
    gradientNorm,
    dof,
  }
}
