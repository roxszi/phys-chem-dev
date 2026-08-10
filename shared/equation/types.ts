/**
 * 公式模型（Equation Model）的统一 schema
 * 
 * 设计哲学：
 * - 公式与拟合算法解耦：同一个公式可以用多种算法拟合，包括但不限于：
 *   - L-M (Levenberg-Marquardt)
 *   - ODR (Orthogonal Distance Regression)
 *   - LinearLeastSquares 拟合
 * - 公式自带“经验”：
 *   - typicalRange - 典型范围（用于初值估计 + UI 限制）
 *   - linearization 提供“非线性拟合 → 线性化呈现”的变换
 * - UI 元信息：
 *   - description - 介绍
 *   - formulaTex - Tex 格式的公式
 *   - units - 单位
 * 
 * 与 fitting 层的接口：
 *   - model 函数签名与 PredictFnODR 一致（x 显式传递）
 *   - 用 bindModel(eq, x) 可以把 x 烘焙成 PredictFn（供 LM 调用）
 */


/**
 * 线性化变换的结果
 *
 * 不仅返回变换后的 (x', y') 数据点，还附带"被丢弃点"信息——
 * 让 UI 能明确告诉学生"第 N 个点因为 c < c∞ 无法线性化"，
 * 而不是让学生看到图上少几个点却不知道为什么。
 */
export interface LinearizationTransformResult {
  /** 变换后的 x 数据（仅含可线性化的点） */
  x: number[]
  /** 变换后的 y 数据（与 x 一一对应） */
  y: number[]
}

/**
 * 线性化形式（用于"非线性拟合 → 线性化呈现"）
 *
 * 注意：linearization 不参与拟合本身，仅用于 UI 呈现。
 *
 * params 用 Record<string, number> 宽索引签名——调用方按需取键 + 非空断言。
 * （曾经尝试用 LinearizationForm<P> 强类型泛型，但 TS 推断在 defineEquationModel
 * 字段层未传导 P，效果反而不如直接用宽索引。）
 */
export interface LinearizationForm {
  /**
   * 把 (x, y, params) 变换到线性空间 (x', y')
   * 
   * 例：一级反应 c = c0·exp(-kt)
   *   → x' = t, y' = ln(c)
   *   → 拟合参数 k = -slope
   */
  transform: (
    x: number[],
    y: number[],
    params: Record<string, number>,
  ) => LinearizationTransformResult

  /** 拟合参数 → 线性斜率（用于画拟合直线） */
  slopeFromParams: (params: Record<string, number>) => number

  /** 拟合参数 → 线性截距 */
  interceptFromParams: (params: Record<string, number>) => number

  /** 线性空间的坐标轴标签（UI 用） */
  xAxisLabel: string
  yAxisLabel: string
}


/**
 * 模型公式参数的元信息
 * 
 * 用于描述公式内的各参数，视图层、逻辑层皆可用
 * 把 id 专门独立为一个 string 泛型，用于与模型参数值耦合
 * @example
 * ```ts
 * // 1.  先导入 Parameter 数据类型
 * import { Parameter } from "equation/types.ts"
 * // 2.  声明数据，【务必记得】
 * const k: Parameter = {
 *   ...
 * } as const
 * // 3.  在【最后写上 `as const`】并删除数据类型
 * const k = {
 *   ...
 * } as const
 * // 4.  删除数据类型导入。现在 k 的类型是 `readonly Parameter<"k">`，一个以 "k" 为名的唯一的只读元组
 * ```
 */
export interface Parameter<P extends string = string> {
  /** 参数 ID，用于快速索引及程序内部使用 */
  id: P
  /** 参数符号（数学符号） */
  symbol: string
  /** 参数中文名 */
  name: string
  /** 单位（用于显示） */
  unit: string
  /** 典型范围（用于初值估计） */
  typicalRange?: [number, number]
  /** 描述 */
  description?: string
}


/**
 * 拟合用的模型参数数组
 * 
 * 用 Parameter 的 id 来构造耦合
 */
type FittingParameters<P extends readonly Parameter<string>[]> =
  Record<
    /** 键：绑定 Parameter 的 id */
    P[number]["id"],
    {
      /** 参数值 */
      value: number,
      /** 是否定值，默认 false */
      isFixed: boolean
    }
  >


/**
 * 公式模型
 * 
 * 泛型属性 P 继承 Parameter[] 约束，并作为具体的只读元组，这样可以将 Parameter.id 作为键集合，
 * 从而让 model 的 params 拥有精确的匹配耦合
 */
export interface EquationModel<P extends readonly Parameter[]> {
  /** 唯一 ID（程序标识，如 "first-order"） */
  id: string
  /** 中文名（如 "一级动力学"） */
  name: string
  /** 描述 / 介绍 */
  description: string
  /** 公式 LaTeX，便于渲染 */
  formulaTex?: string
  /** 参数定义 */
  parameters: P
  /** 数据验证 */
  validateData: (
    x: number[],
    y: number[]
  ) => [number, number][],
  /** 参数初始化 */
  initialParameters?: (
    x: number[],
    y: number[]
  ) => FittingParameters<P>
  /**
   * 模型函数（ODR 形式），本质就是由 x[] 经 params[] 变换到 y[] 的函数
   * 
   * @returns 因变量 Y[]，为数组
   * @note 必须是纯函数（无副作用）。
   */
  model: (
    /** 自变量 X[]，需为数组 */
    x: number[],
    /** 参数列表。 params 的键集合与 parameters 中的 id 一一对应 */
    params: FittingParameters<P>
  ) => number[]
  /** 线性化形式 */
  linearization?: LinearizationForm;
}


/**
 * 工厂函数：构造公式模型
 * 
 * 因为涉及到泛型，重写泛型类型以实现类型约束太过于冗余，因此以工厂函数进行封装，实现泛型复用
 * @param config 公式模型配置，类型与 EquationModel 完全一致
 * @returns 配置好的公式模型实例
 * @example
 * const model = defineEquationModel({
 *   id: 'first-order',
 *   parameters: [...] as const,
 *   model: (x, p) => x.map(t => p.k.value * t)
 * })
 */
export function defineEquationModel<const P extends readonly Parameter<string>[]>(
  config: EquationModel<P>
): EquationModel<P> {
  // 运行时直接返回配置对象
  return config as EquationModel<P>
}

