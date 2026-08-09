/**
 * 拟合模块的核心类型定义
 *
 * 这些类型是拟合业务专属的，与 base 层（线性代数等）解耦。
 * 与 phys-chem 项目保持一致风格，便于未来回流。
 */

/**
 * 预测函数（用户的模型）
 *
 * 接受参数字典，返回每个数据点的预测值。
 * x 数据通过闭包绑定（见 equation/bindModel.ts），所以不在签名中。
 *
 * @example
 *   // 模型 y = A·exp(-k·t) + C
 *   const fn: PredictFn = (p) => tData.map(t => p.A * Math.exp(-p.k * t) + p.C)
 */
export type PredictFn = (params: Record<string, number>) => number[]

/**
 * 同时对 x 和 y 建模的预测函数（ODR 专用）
 *
 * 与 PredictFn 的区别：x 也可以作为参数被修正。
 * 这样 ODR 既能拟合原始非线性公式，又能在线性时退化为 York。
 */
export type PredictFnODR = (
  xCorrected: number[],
  params: Record<string, number>,
) => number[]

/** 数据数组别名（语义标记，等价于 number[]） */
export type DataArray = number[]

/** 参数名列表（顺序固定，与 deltaP 的索引对应） */
export type ParamNames = string[]

/**
 * 单次迭代的状态快照
 *
 * 用于收敛判据、日志、调试。所有基于梯度的拟合算法
 * （LM / ODR 等）都能产出这种结构。
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
  /** 加权残差平方和（收敛值） */
  sse: number
  /** 自由度 = n - p */
  dof: number
  /** 最终残差向量 */
  residuals: number[]
  /** 最终预测值 */
  predicted: number[]
  /** 协方差矩阵（若 JᵀJ 奇异则返回空数组） */
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
  | "max_iterations"     // 达到最大迭代次数未收敛
  | "no_accepted_step"   // 内层试探全部失败
  | "singular_matrix"    // 正规方程矩阵奇异
  | "invalid_input"      // 输入校验失败
