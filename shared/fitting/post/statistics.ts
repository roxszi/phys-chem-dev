/**
 * fitting/post - 拟合后置处理：statistics.ts（收尾统计拼装）
 * ---
 * 收敛后计算最终统计：R²、RMSE、协方差矩阵、参数标准误、梯度范数。
 * 属"业务拼装"层——标量统计（R² / RMSE / σ²）调 math/statistics.ts 原语，
 * 矩阵基础操作调 math/matrix 原语，本文件只负责组装拟合专属字段
 * （协方差组装 Cov = σ²·M⁻¹ 是拟合专属语义，作业务工具函数留在本文件底部）。
 * ---
 * 依赖方向：math/（标量与矩阵原语）← fitting/post/statistics.ts（拼装），不反向依赖。
 */
import type { Matrix, Vector } from "@shared/math/index.ts"
// 数据类型（本模块内部文件，相对路径）
import type { DataArray, ModelFunction, ParamValues, ParamNames } from "../types.ts"
// 正规方程构建（模块内部子目录，相对路径）
import { buildWeightedNormalEquation } from "../linear-solver/normal-equation.ts"
// math 原语（跨模块，走 @shared 别名 + index.ts 唯一入口）
import {
  getRSquared,
  getRMSE,
  getSSESigmaSquared,
  matrixInvert,
  matrixScalarMul,
  matrixGet,
  getInfNorm,
} from "@shared/math/index.ts"


export interface StatisticsInput {
  /** 模型函数（与拟合主循环使用的同一函数引用） */
  fn: ModelFunction
  /** 自变量数据（与拟合主循环使用的同一矩阵——ODR 场景应传修正后的 x） */
  xData: DataArray
  /** 最终全参数值（含固定参数） */
  params: ParamValues
  /** 自由参数名列表（协方差矩阵的行列顺序与之对应） */
  paramNames: ParamNames
  /** 因变量数据 */
  yData: Vector
  /** 最终残差向量 */
  residuals: Vector
  /** 最终加权 SSE */
  sse: number
  /** 最终参数处的雅可比矩阵（n × p，p 为自由参数数） */
  jacobian: Matrix
  /** 权重（可选；不传按等权 1 处理） */
  weights?: Vector
}

export interface StatisticsResult {
  /** 预测值 y_pred = fn(xData, params) */
  predicted: Vector
  /** 决定系数 R² = 1 - SS_res / SS_tot */
  rSquared: number
  /** 均方根误差 RMSE = √(SSE/n) */
  rmse: number
  /** 残差方差估计 σ² = SSE / (n - p) */
  sigma2: number
  /** 协方差矩阵 Cov = σ² × (JᵀWJ)⁻¹（若 JᵀWJ 奇异 / 近奇异则为 null） */
  covariance: Matrix | null
  /** 参数标准误 SE(pⱼ) = √Cov[j][j]（只含自由参数键） */
  paramErrors: ParamValues
  /** 梯度无穷范数（最终一阶条件诊断） */
  gradientNorm: number
  /** 自由度 */
  dof: number
}

/**
 * 从协方差矩阵提取参数标准误（LM / ODR 共用）
 * - SE(pⱼ) = √Cov[j][j]；协方差不可得（null）时为 0
 * @param covariance 协方差矩阵（可为 null）
 * @param paramNames 自由参数名（顺序与协方差对角元索引对应）
 */
export function computeParamErrors(
  covariance: Matrix | null,
  paramNames: ParamNames,
): ParamValues {
  const paramErrors: ParamValues = {}
  for (let j = 0; j < paramNames.length; j++) {
    const variance = covariance !== null ? matrixGet(covariance, j, j) : 0
    paramErrors[paramNames[j]!] = Math.sqrt(Math.max(variance, 0))
  }
  return paramErrors
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
  const { fn, xData, params, paramNames, yData, residuals, sse, jacobian, weights } =
    input

  const n = yData.length
  const p = paramNames.length

  // 预测值
  const predicted = fn(xData, params)

  // R² / RMSE（math/statistics.ts 原语）
  const r2 = getRSquared(yData, predicted)
  const rmseVal = getRMSE(yData, predicted)

  // 自由度 & σ²
  const dofVal = n - p
  const sig2 = getSSESigmaSquared(sse, n, p)

  // 协方差 = σ² × (JᵀWJ)⁻¹（本文件底部业务工具；无权重场景等权 1）
  const w = weights ?? new Float64Array(n).fill(1)
  const { jtj, jtr } = buildWeightedNormalEquation(jacobian, residuals, w)
  const covariance = getCovarianceMatrix(jtj, sig2)

  // 参数标准误 = √Cov[j][j]（共享原语）
  const paramErrors = computeParamErrors(covariance, paramNames)

  // 梯度无穷范数（math/vector.ts 原语）
  const gradNorm = getInfNorm(jtr)

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

// ==================== 拟合业务工具（仅本模块与 ODR 消费） ====================

/**
 * 拟合参数的协方差矩阵：Cov = σ² × M⁻¹（拟合专属语义，业务工具函数）
 * - M 通常为 JᵀWJ（Gauss-Newton 近似 Hessian）
 * - 注意：ml-matrix 库自带的 covariance() 是"数据列间统计协方差"，与此完全不同
 *   （该库已移除，此注释保留语义澄清）
 * @param matrix p×p 矩阵（拟合场景通常为 JᵀWJ）
 * @param sseSigmaSquared 残差的方差估计
 * @returns 协方差矩阵（新 Matrix）；M 奇异 / 近奇异返回 null
 */
export function getCovarianceMatrix(
  matrix: Matrix,
  sseSigmaSquared: number,
): Matrix | null {
  // 求逆（奇异 / 近奇异 → null 透传）
  const invertMatrix = matrixInvert(matrix)
  if (!invertMatrix) {
    return null
  }
  // Cov = σ² × M⁻¹（标量乘新矩阵）
  return matrixScalarMul(invertMatrix, sseSigmaSquared)
}
