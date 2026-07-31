/**
 * 拟合模块的核心类型定义
 *
 * 这些类型是拟合业务专属的，和 base 层（线性代数等）解耦。
 */

/**
 * 预测函数（用户的模型）
 *
 * 接受参数字典，返回每个数据点的预测值。
 * 这是拟合算法的"黑盒输入"，不关心用户怎么实现。
 */
export type PredictFn = (params: Record<string, number>) => number[]

/**
 * 数据数组别名（语义标记，等价于 number[]）
 *
 * 用 DataArray 表明"这是一组观测数据"而非任意数字数组，
 * 便于阅读。底层仍是 number[]。
 */
export type DataArray = number[]

/** 参数名列表（顺序固定，与 deltaP 的索引对应） */
export type ParamNames = string[]

/**
 * 单次迭代的状态快照
 *
 * 用于收敛判据、日志、调试。所有基于梯度的拟合算法
 * （LM / GN 等）都能产出这种结构。
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
  /** 当前 SSE = Σr² */
  sse: number
  /** 本次迭代的参数更新量 Δp */
  deltaP: number[]
  /** 负梯度方向（LM/GN 里是 Jᵀr） */
  gradient: number[]
}

/**
 * 拟合结果（所有最小二乘算法的统一返回结构）
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
  /** 残差平方和 */
  sse: number
  /** 自由度 = n - p */
  dof: number
  /** 最终残差向量 */
  residuals: number[]
  /** 最终预测值 */
  predicted: number[]
  /** 协方差矩阵（如果可用） */
  covariance: number[][]
  /** 是否真正收敛 */
  converged: boolean
  /** 实际迭代次数（对线性最小二乘等闭式解算法为 1） */
  iterations: number
  /** 最终梯度无穷范数 */
  gradientNorm: number
}

/**
 * 拟合失败的原因分类
 */
export type FitFailureReason =
  | 'max_iterations' // 达到最大迭代次数未收敛
  | 'no_accepted_step' // 内层试探全部失败
  | 'singular_matrix' // 正规方程矩阵奇异
  | 'invalid_input' // 输入校验失败
