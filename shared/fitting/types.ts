/**
 * fitting - 核心类型定义（equation ↔ fitting 的桥梁契约层）
 * ---
 * 三个桥梁契约（equation 与 fitting 共用；定义在 fitting 侧，equation 以 import type 引用，
 * 编译后零运行时依赖）：
 *   - ParamValues   参数值字典：全部参数（含固定参数）的扁平键值对，不含任何元信息
 *   - ModelFunction 模型纯函数：(xs, params) => ys，显式接收自变量数组
 *   - ParamNames    自由参数名列表
 * 命名口径：Equation 指公式实体（equation 层独有）；Model 指模型函数；Param 指参数。
 * ---
 * 参数的两分语义（fitting 层的原生能力，不再需要外部绑定层）：
 *   - 全参数：initialParams 字典的全部键（可拟合的 + 固定不动的），即 fn 的 params 形状
 *   - 自由参数：paramNames 列出的子集，迭代中唯一被更新的部分；
 *     自由度 dof = n − paramNames.length，固定参数不消耗自由度
 * ---
 * 依赖：ml-matrix（仅 covariance 字段的 Matrix 类型；自研矩阵落地后移除）
 */

// 导入 ml-matrix 的 Matrix 类型（仅作 covariance 字段类型）
import type { Matrix } from "ml-matrix"

/**
 * 参数值字典（桥梁契约）
 * - 扁平 Record：键 = 参数 id，值 = 参数当前值
 * - P 缺省 string 时即"任意键字典"（运行时动态合流场景）；
 *   给出字符串字面量联合时获得编译期键检查
 */
export type ParamValues<P extends string = string> = Record<P, number>

/**
 * 模型纯函数（桥梁契约）
 * - 显式接收自变量数组 xs 与全参数字典 params，返回逐点预测值 ys
 * - 与 equation 层的公式函数同构：equation.model 可直接作为本类型传入
 * - 纯函数约定：不修改入参，同一输入必得同一输出
 */
export type ModelFunction<P extends string = string> = (
  /** 自变量数组 */
  xs: number[],
  /** 全参数值字典（键与公式参数 id 一致，含固定参数） */
  params: ParamValues<P>,
) => number[]

/**
 * 自由参数名列表
 * - 顺序固定：与雅可比的列、Δp、协方差矩阵的行列索引一一对应
 * - 语义为"全参数的子集"：每个元素必须属于全参数键集合
 *   （编译期约束见各算法入口的泛型签名；运行时兜底见 validate.ts）
 */
export type ParamNames = readonly string[]

/**
 * 数据数组
 * 语义标记，等价于 number[]
 */
export type DataArray = number[]

/**
 * 单次迭代的状态快照
 * - 用于收敛判据、日志、调试；基于梯度的拟合算法（LM / ODR 等）都应产出此结构
 */
export interface IterationState {
  /** 当前迭代次数（从 0 开始） */
  iteration: number
  /** 当前全参数值字典（含固定参数；固定参数的值在迭代中保持不变） */
  params: ParamValues
  /** 自由参数名列表（与 deltaP 的索引一一对应） */
  paramNames: ParamNames
  /** 当前残差向量 r = y − f(p) */
  residuals: number[]
  /** 当前加权 SSE */
  sse: number
  /** 本次迭代的自由参数更新量 Δp（与 paramNames 的索引一一对应） */
  deltaP: number[]
  /** 负梯度方向（LM / Gauss-Newton 里是 JᵀWr） */
  gradient: number[]
}

/**
 * 拟合结果（所有拟合算法的统一返回结构）
 */
export interface FitResult {
  /** 最终全参数值字典（含固定参数——固定参数取其输入值） */
  params: ParamValues
  /**
   * 参数标准误（√Cov[j][j]）
   * - 只含自由参数键：固定参数不参与迭代，无统计误差可估
   */
  paramErrors: ParamValues
  /** 决定系数 R² = 1 − SS_res / SS_tot */
  rSquared: number
  /** 均方根误差 RMSE = √(SSE / n) */
  rmse: number
  /** 加权残差平方和（收敛值） */
  sse: number
  /** 自由度 = n − 自由参数数 */
  dof: number
  /** 最终残差向量 */
  residuals: number[]
  /** 最终预测值 */
  predicted: number[]
  /**
   * 协方差矩阵 Cov = σ²·(JᵀWJ)⁻¹
   * - p×p（p 为自由参数数），行 / 列顺序与自由参数 paramNames 一一对应
   * - 正规方程矩阵奇异 / 近奇异时为 null
   */
  covariance: Matrix | null
  /** 是否真正收敛 */
  isConverged: boolean
  /** 实际迭代次数（对线性最小二乘等闭式解算法为 1） */
  iterations: number
  /** 最终梯度无穷范数 */
  gradientNorm: number
}
