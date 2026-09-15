/**
 * 拟合模块的核心类型定义
 */

// 导入 ml-matrix 的 Matrix 类型
import type { Matrix } from "ml-matrix"



/**
 * 数据数组
 * 语义标记，等价于 number[]
 */
export type DataArray = number[]


/**
 * 函数公式
 * - 原则上适用于任何显式公式
 * - 接受自变量X[]数组、参数字典，返回每个数据点的预测值。
 * @example
 * // 模型 y = A·exp(-k·t) + C
 * const fn: EquationFunction = (tArr, p) => tArr.map(t => p.A * Math.exp(-p.k * t) + p.C)
 */
export type EquationFunction = (
  /** 自变量 X[] */
  x: number[],
  /** 扁平参数字典（键与 parameters 的 id 一一对应） */
  params: Record<string, number>
) => number[]


/**
 * 参数名列表
 * - 顺序固定，与 deltaP 的索引对应
 */
export type ParamNames = string[]


/**
 * 单次迭代的状态快照
 * - 用于收敛判据、日志、调试。所有基于梯度的拟合算法
 * - LM / ODR 等都应产出这种结构
 */
export interface IterationState {
  /** 当前迭代次数（从 0 开始） */
  iteration: number
  /** 当前参数值 */
  params: Record<string, number>
  /** 参数名列表（与 deltaP 索引对应） */
  paramNames: ParamNames
  /** 当前残差向量 r = y - f(p) */
  residuals: number[]
  /** 当前加权 SSE */
  sse: number
  /** 本次迭代的参数更新量 Δp */
  deltaP: number[]
  /** 负梯度方向（LM/GN 里是 Jᵀr） */
  gradient: number[]
}


/**
 * 拟合结果
 * - 所有拟合算法的统一返回结构
 */
export interface FitResult {
  /** 最终参数值 */
  params: Record<string, number>
  /** 参数标准误（√Cov[j][j]） */
  paramErrors: Record<string, number>
  /** 决定系数 R² = 1 - SS_res / SS_tot */
  rSquared: number
  /** 均方根误差 RMSE = √(SSE / n) */
  rmse: number
  /** 加权残差平方和（收敛值） */
  sse: number
  /** 自由度 = n - p */
  dof: number
  /** 最终残差向量 */
  residuals: number[]
  /** 最终预测值 */
  predicted: number[]
  /** 协方差矩阵 Cov = σ²·(JᵀWJ)⁻¹（若正规方程矩阵奇异 / 近奇异则为 null） */
  covariance: Matrix | null
  /** 是否真正收敛 */
  isConverged: boolean
  /** 实际迭代次数（对线性最小二乘等闭式解算法为 1） */
  iterations: number
  /** 最终梯度无穷范数 */
  gradientNorm: number
}
