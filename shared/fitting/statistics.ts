/**
 * 拟合统计层——拼装 numeric/ 原语 + 拟合专属字段
 *
 * 收敛后计算最终统计：R²、RMSE、协方差矩阵、参数标准误、梯度范数。
 *
 * 这里的逻辑是"业务拼装"：
 *   - R² / RMSE 调 numeric/regression.ts
 *   - 协方差调 numeric/covarianceFromM
 *   - 参数标准误 dict、Final Lambda 等"拟合专属字段"在此组装
 */
import type { PredictFn, ParamNames } from './types.js'
import { buildWeightedNormalEquation } from './normal-equation.js'
import {
  rSquared,
  rmse,
  sigma2,
  covarianceFromM,
  gradientNorm,
} from '../numeric/regression.js'

export interface StatisticsInput {
  /** 预测函数 */
  fn: PredictFn
  /** 最终参数值 */
  params: Record<string, number>
  /** 参数名列表 */
  paramNames: ParamNames
  /** 因变量数据 */
  yData: number[]
  /** 最终残差向量 */
  residuals: number[]
  /** 最终加权 SSE */
  sse: number
  /** 最终参数处的雅可比矩阵 */
  jacobian: number[][]
  /** 权重（可选） */
  weights?: number[]
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
  /** 协方差矩阵 Cov = σ² × (JᵀWJ)⁻¹（若 JᵀWJ 奇异则返回空数组） */
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
 * 协方差矩阵公式：Cov = σ² × (JᵀWJ)⁻¹
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
  const { fn, params, paramNames, yData, residuals, sse, jacobian, weights } =
    input

  const n = yData.length
  const p = paramNames.length

  // 预测值
  const predicted = fn(params)

  // R² / RMSE（直接调用 numeric/ 原语）
  const r2 = rSquared(yData, predicted)
  const rmseVal = rmse(yData, predicted)

  // 自由度 & σ²
  const dofVal = n - p
  const sig2 = sigma2(sse, n, p)

  // 协方差 = σ² × (JᵀWJ)⁻¹
  // 重建 JᵀWJ（与权重一致）
  const { jtj, jtr } = weights
    ? buildWeightedNormalEquation(jacobian, residuals, weights)
    : buildWeightedNormalEquation(
        jacobian,
        residuals,
        new Array(n).fill(1),
      )
  const covInv = covarianceFromM(jtj, sig2)
  const covariance: number[][] = covInv ?? []

  // 参数标准误 = √Cov[j][j]
  const paramErrors: Record<string, number> = {}
  for (let j = 0; j < p; j++) {
    const variance = covariance.length > 0 ? (covariance[j]?.[j] ?? 0) : 0
    paramErrors[paramNames[j]!] = Math.sqrt(Math.max(variance, 0))
  }

  // 梯度无穷范数
  const gradNorm = gradientNorm(jtr)

  return {
    predicted,
    rSquared: r2,
    rmse: rmseVal,
    sigma2: sig2,
    covariance,
    paramErrors,
    gradientNorm: gradNorm,
    dof: dofVal,
  }
}
