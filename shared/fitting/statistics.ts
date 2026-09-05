/**
 * 拟合统计层
 * 
 * 拼装 math/ + matrix/ 原语 + 拟合专属字段
 * 
 * 收敛后计算最终统计：R²、RMSE、协方差矩阵、参数标准误、梯度范数。
 * 
 * 这里的逻辑是"业务拼装"：
 *   - R² / RMSE 调 numeric/regression.ts（标量）
 *   - 协方差调 matrix/covariance.ts（涉及矩阵类型——不再由 numeric 提供）
 *   - 参数标准误 dict、Final Lambda 等"拟合专属字段"在此组装
 *
 * 依赖方向：
 *   - numeric/：标量聚合（不反向依赖 matrix）
 *   - ml-matrix/：矩阵运算（含基于 ml-matrix 的语义封装 covarianceFromM）
 *   - fitting/：拼装层
 */
import { Matrix } from "ml-matrix"
import type { PredictFn, ParamNames } from "./types.ts"
import { buildWeightedNormalEquation } from "./normal-equation.ts"
import {
  getRSquared,
  getRMSE,
  sigma2,
  gradientNorm,
  getInvertMatrix,
} from "@shared/math/index.ts"


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
  /** 协方差矩阵 Cov = σ² × (JᵀWJ)⁻¹（若 JᵀWJ 奇异 / 近奇异则为 null） */
  covariance: Matrix | null
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
  const r2 = getRSquared(yData, predicted)
  const rmseVal = getRMSE(yData, predicted)

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
  const covariance = covarianceFromM(jtj, sig2)

  // 参数标准误 = √Cov[j][j]
  const paramErrors: Record<string, number> = {}
  for (let j = 0; j < p; j++) {
    const variance = covariance !== null ? covariance.get(j, j) : 0
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

/**
 * 协方差矩阵
 * - Cov = σ² × M⁻¹
 * 
 * @param m p×p 矩阵（拟合场景通常为 JᵀWJ，Gauss-Newton 近似 Hessian）
 * @param sseSigmaSquared 残差方差估计sseSigmaSquared
 * @returns 协方差矩阵（新 Matrix）；M 奇异 / 近奇异返回 null
 */
export function covarianceFromM(m: Matrix, sseSigmaSquared: number): Matrix | null {
  const mInv = getInvertMatrix(m)
  if (!mInv) return null
  return Matrix.mul(mInv, sseSigmaSquared)
}
