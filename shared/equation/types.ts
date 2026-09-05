/**
 * 公式模型（Equation Model）的统一类型声明及工厂函数
 * ---
 * 设计哲学：
 * - 公式与拟合算法解耦，同一个公式可以用多种算法拟合
 * - 公式的参数自带“经验”：
 *   - typicalRange - 典型范围（用于初值估计 + UI限制）
 *   - linearization - 提供“非线性 → 线性化”的呈现变换，此处方便框死固定的某种线性化形式
 * - UI元信息：
 *   - description - 介绍
 *   - formulaTex - Tex 格式的公式
 *   - units - 单位
 */


/**
 * 模型公式参数的元信息
 * - 用于描述公式内的各参数，视图层、逻辑层皆可用
 * - 把 id 专门独立为一个 string 泛型，用于与模型参数值耦合
 * @example
 * ```ts
 * // 1.  先导入 Parameter 数据类型
 * import { Parameter } from "equation/index.ts"
 * // 2.  声明数据，【务必记得】
 * const k: Parameter = {
 *   ...
 * }
 * // 3.  在【最后写上 `as const`】并删除数据类型
 * const k = {
 *   ...
 * } as const
 * // 4.  删除数据类型导入。现在 k 的类型是 `readonly Parameter<"k">`，一个以 "k" 为名的唯一的只读元组
 * ```
 */
export interface Parameter<P extends string = string> {
  /** 参数 ID，用于快速索引及程序内部使用，一般是符号symbol的简化 */
  id: P
  /** 参数符号，可以是字符串的各类复杂罗马/希腊语符号 */
  symbol: string
  /** 参数中文名 */
  name: string
  /** 单位 */
  unit: string
  /** 典型范围（初值估计及交互时约束用户填入初始值用） */
  typicalRange?: [number, number]
  /** 描述 */
  description?: string
}


/**
 * 拟合用的模型参数数组
 * - 用 Parameter 的 id 来构造耦合：
 * - 泛型属性 P 继承 Parameter[] 约束，并作为具体的只读元组，这样可以将 Parameter.id 作为键集合，
 *   从而让 model 的 params 拥有精确的匹配耦合
 */
type FittingParameters<P extends readonly Parameter[]> =
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
 * 公式模型（Equation Model）
 * - 泛型属性 P 继承 Parameter[] 约束，并作为具体的只读元组，这样可以将 Parameter.id 作为键集合，
 *   从而让 model 的 params 拥有精确的匹配耦合
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
  /**
   * 数据验证
   * 1.  验证数据合法性
   * 2.  必要的数据过滤
   * 3.  数据排序（可选）
   * 4.  其他操作
   * @returns [x, y, i][]，其中 i 为数据原始索引（若重新排序或踢除数据了，则 i 相当重要）
   */
  validateData: (
    x: number[],
    y: number[]
  ) => [number, number, number][],
  /**
   * 参数初始化
   * - 由 X[] 和 Y[] 估算出参数的初始值
   * @returns 参数列表。 params 的键集合与 parameters 中的 id 一一对应
   */
  initialParameters?: (
    x: number[],
    y: number[]
  ) => FittingParameters<P>
  /**
   * 模型函数
   * - 非线性形式，本质就是由 x[] 经 params[] 变换到 y[] 的函数
   * @returns 因变量 Y[]，为数组
   * @note 必须是纯函数（无副作用）
   */
  model: (
    /** 自变量 X[]，需为数组 */
    x: number[],
    /** 参数列表。 params 的键集合与 parameters 中的 id 一一对应 */
    params: FittingParameters<P>
  ) => number[]
  /**
   * 线性化
   */
  linearization?: (
    x: number[],
    y: number[],
    params: FittingParameters<P>,
  ) => {
    /** 线性空间的X轴标签 */
    xLabel: string
    /** 变换后的 x 数据（仅含可线性化的点） */
    x: number[]
    /** 线性空间的Y轴标签 */
    yLabel: string
    /** 变换后的 y 数据（与 x 一一对应） */
    y: number[]
    /** 斜率 */
    slope: number
    /** 截距 */
    intercept: number
  }
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

