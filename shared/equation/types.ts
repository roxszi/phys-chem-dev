/**
 * 公式（Equation）的统一类型声明及工厂函数
 * ---
 * 设计哲学：
 * - 公式与拟合算法解耦：公式只描述"是什么"，拟合算法只管"怎么拟合"；
 *   同一个公式可以用多种算法拟合（LM / ODR / 未来的其他算法）
 * - 模型函数统一为 ModelFunction（显式接收 xs 与全参数字典），
 *   与 fitting 层的模型契约同构——equation.model 可直接传给拟合算法
 * - isFixed 是"拟合编排"语义（参不参与迭代），不属于模型函数签名；
 *   它的默认值由公式定义者经 Parameter.defaultFixed 给出，
 *   用户/UI 覆盖值经 ParameterInputs 传入，在编排层（fitEquation）合流
 * - 数据清洗（验证 / 排序 / 锚点识别 / 踢点）与初值估计合并为 preprocess
 *   一个纯函数：原始数据只读，踢点进 excluded 记录，索引经 indices 保留
 */

// 导入 tfjs 数据类型（tfModel 自动微分预留）
type TF = typeof import("@tensorflow/tfjs-core")

// 桥梁契约类型（跨模块，走 @shared 别名 + index.ts 唯一入口；定义在 fitting 侧，编译后零运行时依赖）
import type { DataArray, ModelFunction, ParamValues } from "@shared/fitting/index.ts"


/**
 * 模型公式参数的元信息
 * - 用于描述公式内的各参数，视图层、逻辑层皆可用
 * - 把 id 专门独立为一个 string 泛型，用于与模型参数值耦合
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
  /**
   * 是否默认固定（公式定义者建议的默认状态）
   * - true：典型使用场景下为给定条件常量（如实验温度 T），默认锁定不参与迭代
   * - 缺省 false：待拟合参数
   * - UI 层生成参数表单时以此铺底勾选态，用户可改
   */
  defaultFixed?: boolean
  /** 典型范围（初值估计及交互时约束用户填入初始值用） */
  typicalRange?: [number, number]
  /** 描述 */
  description?: string
}


/**
 * 拟合前处理的输出数据包
 * - preprocess 的唯一产物：拟合流程后续全部使用此包内的数据
 * - 索引不丢失：xData[i] 来自原始数据的第 indices[i] 行
 * - 被剔除的点（锚点观测 / 非法点）进 excluded 并带原因，UI 可据此展示
 */
export interface PreprocessResult<P extends readonly Parameter[]> {
  /** 进拟合的 x（行主序设计矩阵：rows = 样本数，cols = 自变量分量数；已排序、已剔除锚点与非法点） */
  xData: DataArray
  /** 进拟合的 y（与 xData 一一对应） */
  yData: number[]
  /** 原始索引映射：xData[i] 来自原始数据的第 indices[i] 行 */
  indices: number[]
  /** 未参与拟合的点（锚点观测、非法点），带原因 */
  excluded: { index: number; x: number; y: number; reason: string }[]
  /** 初始参数值（键集合与 parameters 的 id 一一对应） */
  initialParams: ParamValues<P[number]["id"]>
}


/**
 * 公式模型（Equation）
 * - 泛型属性 P 继承 Parameter[] 约束，并作为具体的只读元组，
 *   使 model 的 params 拥有精确的键耦合（Record<P[id], number>）
 */
export interface Equation<P extends readonly Parameter[]> {
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
   * 拟合前处理（纯函数，禁止修改入参数组）
   *   - 验证 → 排序 → 识别锚点 / 非法点 → 估初值 → 分流
   *   - 锚点（如蔗糖水解的 t=0 → α₀、t=∞ → α∞）先消费为初值再进 excluded，
   *     特殊"哨兵值"（Infinity 等）不得进入返回的 x
   *   - fitEquation 保证调用本方法；后续拟合只用返回的数据包
   *   - rawX 与返回的 xData 同形状（行主序设计矩阵；原始数据入模前先用
   *     pre/data-shape 打样工具完成 number[] → n×1 设计矩阵包装）
   */
  preprocess: (rawX: DataArray, rawY: number[]) => PreprocessResult<P>
  /**
   * 模型函数（纯函数）
   * - 非线性形式：xData（行主序）经扁平 params 变换到 ys
   * - params 形状与 fitting 层一致（全参数值字典），键精确耦合
   * - 类型直接引用 fitting 层的 ModelFunction 契约，公式可直接交给拟合算法
   */
  model: ModelFunction<P[number]["id"]>
  /**
   * tf张量化的模型函数
   * - 用于自动微分 auto-diff 实现（fitting/jacobian/tfjs-auto-diff，待实现）
   * - xData 与 model 同形状（行主序设计矩阵；tf.tensor2d(xData.data, [rows, cols]) 一步进计算图）
   */
  tfModel?: (
    /** TensorFlow 运行环境 */
    tf: TF,
    /** 自变量数据（行主序设计矩阵） */
    xData: DataArray,
    /** 扁平参数字典（键与 parameters 的 id 一一对应） */
    params: ParamValues<P[number]["id"]>
  ) => number[]
  /**
   * 线性化
   */
  linearization?: (
    x: number[],
    y: number[],
    params: ParamValues<P[number]["id"]>,
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
 * 用户 / UI 层的参数输入态
 * - isFixed 语义在此层表达（"这个参数参与不参与迭代"），不进 model 签名
 * - 编排层（fitEquation）将其拆分为：全参数字典 initialParams
 *   与自由参数子集 paramNames（fitting 层零感知 isFixed）
 */
export type ParameterInputs<P extends readonly Parameter[]> = Record<
  P[number]["id"],
  { value: number; isFixed: boolean }
>


/**
 * 工厂函数：构造公式
 *
 * 因为涉及到泛型，重写泛型类型以实现类型约束太过于冗余，因此以工厂函数进行封装，实现泛型复用
 * @param config 公式配置，类型与 Equation 完全一致
 * @returns 配置好的公式实例
 * @example
 * const model = defineEquation({
 *   id: 'first-order',
 *   parameters: [...] as const,
 *   preprocess: (x, y) => ({ xData: { data: Float64Array.from(x.data), rows: x.rows, cols: x.cols }, yData: y, indices: [], excluded: [], initialParams: { k: 0.1 } }),
 *   model: (xData, p) => { const ys = new Float64Array(xData.rows); for (let i = 0; i < xData.rows; i++) ys[i] = p.k * xData.data[i]!; return ys }
 * })
 */
export function defineEquation<const P extends readonly Parameter<string>[]>(
  config: Equation<P>
): Equation<P> {
  // 运行时直接返回配置对象
  return config as Equation<P>
}
