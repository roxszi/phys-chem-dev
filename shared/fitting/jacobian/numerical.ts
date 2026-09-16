/**
 * 雅可比矩阵的[数值雅可比]实现
 * ---
 * - 用有限差分近似导数（用真实的 Δ 值代替解析的 d 微分值）。
 * - 该方法简单明了，不需要用户手写偏导公式，便于用数组遍历方法直接实现；
 * - 该方法的劣势是计算量大，遍历次数多，无法调用GPU性能。属于纯粹的JS实现。
 * ---
 * 本模块的值计算方法采用[中心差分法]：
 *   - `J[n][p] ≈ [f(p + hⱼ·eⱼ) − f(p − hⱼ·eⱼ)] / (2·hⱼ)`
 *   - 误差阶为 O(h²)，综合考虑了前向差分和后向差分，且步长 h 可以自适应。
 *   - 最优 h ≈ ε^(1/3) ≈ 6e-6（相比前向/后向差分，本方法最优 h 更大，则小值情况下的舍入误差更小）
 * ---
 * 本模块的内容：
 *   - 数据类型/接口 - NumericalJacobianInput（统一传参对象）/
 *     JacobianProvider（LM）/ ODRJacobianProvider（ODR）/ NumericalJacobianOptions
 *   - 工具函数（便于复用） - centralDiff 中心差分 / diffOverParams 算∂fᵢ/∂pⱼ / diffOverXData 算∂f/∂x
 *   - 具体实现 - lmNumericalJacobian（LM） / odrNumericalJacobian（ODR）
 * ---
 * 传参对象化设计（防错位）：主函数只收一个 input 对象（命名字段，顺序无关），
 * 新增传参只扩展接口不破坏调用点；字段形状由接口在编译期约束。
 */

// 数据类型（本模块内部文件，相对路径）
import type { ModelFunction, ParamValues, ParamNames } from "../types.ts"

// ================================ 数据类型/接口 ================================

/**
 * 数值雅可比的统一传参对象
 * - LM / ODR 主函数与注入接口共用同一形状（命名字段，顺序无关）
 */
export interface NumericalJacobianInput {
  /** 模型函数（纯函数：(xData, 全参数字典) => ys） */
  fn: ModelFunction
  /** 自变量数据（行主序：第 i 行 = 第 i 个样本的自变量向量） */
  xData: number[][]
  /** 当前全参数值（含固定参数） */
  params: ParamValues
  /** 自由参数名数组（顺序固定，与雅可比列对应） */
  paramNames: ParamNames
  /** 数值雅可比配置（可选） */
  options?: NumericalJacobianOptions
}

/**
 * LM 雅可比计算器（函数式注入点）
 * - 计算雅可比矩阵 J[i][j] = ∂fᵢ/∂pⱼ，形状 [n × p]（n 数据点数 × p 自由参数数）
 */
export type JacobianProvider = (
  /** 统一传参对象 */
  input: NumericalJacobianInput,
) => { jacobianBeta: number[][] }

/**
 * ODR 雅可比计算器（函数式注入点）
 * - 在 LM 基础上追加自变量方向的偏导 ∂f/∂x（ODR 迭代中 x 会被修正）
 */
export type ODRJacobianProvider = (
  /** 统一传参对象 */
  input: NumericalJacobianInput,
) => { jacobianBeta: number[][]; jacobianX: number[] }

/**
 * 数值雅可比方法的可选配置
 */
export interface NumericalJacobianOptions {
  /**
   * 参数典型尺度（可选）
   * - 跨尺度参数模型推荐提供。
   * - 例如 { A: 1e4, K: 1e-6 } 让不同参数使用不同绝对步长。
   */
  typicalValues?: Record<string, number>
  /**
   * 参数相对步长（默认 1e-6）
   * - 中心差分最优值约为 ε^(1/3) ≈ 6×10⁻⁶（ε 为机器精度），
   * - 工程上取 1e-6 比较稳。
   */
  relativeStepBeta?: number
  /**
   * x 的相对步长（默认 1e-6）
   * x 的步长与参数的步长独立，因为它们可能有不同的典型尺度。
   */
  relativeStepX?: number
}

/**
 * 校验数值雅可比配置（options 显式传入时逐字段检查）
 * @param options 配置对象
 */
function checkOptions(options: NumericalJacobianOptions): void {
  // 参数相对步长：必须为正有限数
  if (
    options.relativeStepBeta !== undefined
    && ((options.relativeStepBeta <= 0) || (!Number.isFinite(options.relativeStepBeta)))
  ) {
    throw new Error(`relativeStepBeta 必须为正有限数，当前为 ${ options.relativeStepBeta }`)
  }
  // x 相对步长：必须为正有限数
  if (
    options.relativeStepX !== undefined
    && ((options.relativeStepX <= 0) || (!Number.isFinite(options.relativeStepX)))
  ) {
    throw new Error(`relativeStepX 必须为正有限数，当前为 ${ options.relativeStepX }`)
  }
  // 典型尺度表：每个值必须为非负有限数（作为步长下限参考）
  if (options.typicalValues !== undefined) {
    for (const [name, value] of Object.entries(options.typicalValues)) {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`typicalValues[${ name }] 必须为非负有限数，当前为 ${ value }`)
      }
    }
  }
}

// ================================ 具体实现 ================================

/**
 * 数值雅可比（LM 法）
 * - 只算参数方向的偏导 ∂fᵢ/∂pⱼ
 * @param input 统一传参对象（fn / xData / params / paramNames / options）
 * @returns { jacobianBeta }：[n × p] 雅可比矩阵
 */
export function lmNumericalJacobian(
  input: NumericalJacobianInput,
): { jacobianBeta: number[][] } {
  // 解构传参对象（命名字段，顺序无关）
  const { fn, xData, params, paramNames, options = {} } = input
  // 配置校验
  checkOptions(options)
  // 数据点数（由 xData 行数自带，无需单独传参）
  const n = xData.length
  // 初始化
  const typicalValues = options.typicalValues ?? {}
  const relativeStepBeta = options.relativeStepBeta ?? 1e-6
  // 参数方向差分
  const jacobianBeta = diffOverParams(
    fn,
    n,
    xData,
    params,
    paramNames,
    relativeStepBeta,
    typicalValues,
  )
  // 返回值
  return { jacobianBeta }
}

/**
 * 数值雅可比（ODR 法）
 * - 在 LM 基础上追加自变量方向偏导 ∂f/∂x
 * @param input 统一传参对象（fn / xData / params / paramNames / options）
 * @returns { jacobianBeta, jacobianX }：[n × p] 矩阵 + [n] 向量
 */
export function odrNumericalJacobian(
  input: NumericalJacobianInput,
): { jacobianBeta: number[][]; jacobianX: number[] } {
  // 解构传参对象（命名字段，顺序无关）
  const { fn, xData, params, paramNames, options = {} } = input
  // 配置校验
  checkOptions(options)
  // 数据点数
  const n = xData.length
  // 初始化
  const typicalValues = options.typicalValues ?? {}
  const relativeStepBeta = options.relativeStepBeta ?? 1e-6
  const relativeStepX = options.relativeStepX ?? 1e-6
  // 参数方向差分
  const jacobianBeta = diffOverParams(
    fn,
    n,
    xData,
    params,
    paramNames,
    relativeStepBeta,
    typicalValues,
  )
  // 自变量方向差分
  const jacobianX = diffOverXData(
    fn,
    n,
    xData,
    params,
    relativeStepX,
  )
  // 返回值
  return { jacobianBeta, jacobianX }
}

// ================================ 工具函数（便于复用） ================================

/**
 * 参数方向差分，计算 ∂fᵢ/∂pⱼ
 *   - 逐参数扰动（±h），中心差分，按列填充 [n × p] 矩阵
 *   - 只扰动 params、不动 xData——因此本差分对任意自变量维数 m 天然兼容
 * @param fn 模型函数
 * @param n 数据点数
 * @param xData 自变量数据集（行主序）
 * @param params 当前全参数值
 * @param paramNames 自由参数名数组
 * @param relativeStepBeta 参数相对步长
 * @param typicalValues 参数典型尺度表
 * @returns ∂fᵢ/∂pⱼ（[n × p]）
 */
export function diffOverParams(
  fn: ModelFunction,
  n: number,
  xData: number[][],
  params: ParamValues,
  paramNames: ParamNames,
  relativeStepBeta: number,
  typicalValues: Record<string, number>,
): number[][] {
  /** 待拟合的参数数量 */
  const p = paramNames.length
  // 初始化雅可比矩阵 [n × p]
  /** 雅可比矩阵 [n × p] */
  const jacobianBeta: number[][] = Array.from(
    // 初始化 n 行
    { length: n },
    // 每行初始化 p 个 0
    () => new Array<number>(p).fill(0),
  )
  /**
   * 参数试验值
   * 浅拷贝，不影响传入的 params
   */
  const paramsTrial: ParamValues = { ...params }
  // 遍历各参数
  for (let j = 0; j < p; j++) {
    /** 参数名 */
    const paramName = paramNames[j]!
    /** 参数值 */
    const paramValue = params[paramName]!
    /**
     * 自适应绝对步长
     * h = relativeStep × max(|pⱼ|, typicalValueⱼ, 1)
     */
    const h = relativeStepBeta * Math.max(
      Math.abs(paramValue),
      (typicalValues[paramName] ?? 0),
      1
    )
    // 前向扰动
    paramsTrial[paramName] = paramValue + h
    /** 前向扰动结果 */
    const yPlus = fn(xData, paramsTrial)
    // 后向扰动
    paramsTrial[paramName] = paramValue - h
    /** 后向扰动结果 */
    const yMinus = fn(xData, paramsTrial)
    // 恢复参数值，防止影响后续迭代
    paramsTrial[paramName] = paramValue
    // 第 j 列差分
    const diffs = centralDiff(yPlus, yMinus, h)
    // 遍历赋值
    for (let i = 0; i < n; i++) {
      jacobianBeta[i]![j] = diffs[i]!
    }
  }
  // 返回结果
  return jacobianBeta
}

/**
 * 自变量方向差分，计算 ∂f/∂x（批量版）
 * ---
 * 设计思路：
 * - 旧版对每个数据点单独调用 2 次模型函数（共 2n 次），每次只求 1 个点的值；
 *   模型函数本就支持整表求值，逐点调用浪费了批量化能力（n 大时函数调用与
 *   数组分配的开销线性放大）。
 * - 批量版构造两张整表：xPlus（第 i 行 = xᵢ + hᵢ）与 xMinus（第 i 行 = xᵢ − hᵢ），
 *   各调 1 次模型函数（共 2 次），再逐点做中心差分，2n 次模型调用降为 2 次。
 * - 步长逐行独立：hᵢ = relativeStepX × max(|xᵢ|, 1)（相对步长自适应各点量级，
 *   与参数差分同思路），因此扰动表必须逐行写各自的 hᵢ，不能共用一个 h。
 * ---
 * 点态假设（批量化的正确性前提）：
 * - 要求每个数据点的预测值只依赖该点自己的 x（物理显式公式 y = f(x; p) 天然满足）；
 * - 若未来出现依赖整表的非点态模型（平滑 / 卷积类），本函数须回退逐点差分。
 * ---
 * ⚠️ 单自变量专用（对每行唯一分量 row[0] 扰动；ODR 当前仅支持 m = 1，
 *   多自变量的 ∂f/∂x 推广为 [n × m] 矩阵，待真实业务出现再扩展）
 * @param fn 模型函数
 * @param n 数据点数
 * @param xData 自变量数据（行主序，每行 1 个分量）
 * @param params 当前全参数值
 * @param relativeStepX 自变量相对步长
 * @returns ∂f/∂x（[n]）
 */
export function diffOverXData(
  fn: ModelFunction,
  n: number,
  xData: number[][],
  params: ParamValues,
  relativeStepX: number,
): number[] {
  /** 逐行步长表（hᵢ 各点独立，差分时分母必须用各自的 hᵢ） */
  const steps = new Array<number>(n).fill(0)
  /** 前向扰动整表：第 i 行 = [xᵢ + hᵢ] */
  const xPlus: number[][] = new Array(n)
  /** 后向扰动整表：第 i 行 = [xᵢ − hᵢ] */
  const xMinus: number[][] = new Array(n)
  // 一次遍历同时生成步长表与两张扰动表
  for (let i = 0; i < n; i++) {
    // 本样本的自变量分量（单自变量：每行唯一分量）
    const xi = xData[i]![0]!
    // 自变量相对步长（逐行独立）
    const h = relativeStepX * Math.max(Math.abs(xi), 1)
    steps[i] = h
    xPlus[i] = [xi + h]
    xMinus[i] = [xi - h]
  }
  // 整表各求值 1 次（2n 次模型调用降为 2 次）
  const yPlus = fn(xPlus, params)
  const yMinus = fn(xMinus, params)
  // 长度守卫：模型函数必须整表返回 n 个预测值
  if (yPlus.length !== n || yMinus.length !== n) {
    throw new Error(
      `diffOverXData: 模型函数返回长度 ${ yPlus.length }/${ yMinus.length } ≠ 数据点数 ${ n }`,
    )
  }
  /** 差分结果 ∂f/∂x（[n]） */
  const jacobianX = new Array<number>(n).fill(0)
  // 逐点中心差分（分母用各自的 hᵢ）
  for (let i = 0; i < n; i++) {
    jacobianX[i] = (yPlus[i]! - yMinus[i]!) / (2 * steps[i]!)
  }
  // 返回结果
  return jacobianX
}

/**
 * 中心差分的具体实现
 * - (f(p+h) - f(p-h)) / (2h)
 * @param yPlus f(p+h) 的查询结果
 * @param yMinus f(p-h) 的查询结果
 * @param h 步长（必须为正有限数）
 * @returns 差分向量（与 yPlus/yMinus 等长）
 */
export function centralDiff(yPlus: number[], yMinus: number[], h: number): number[] {
  // 参数校验
  if (h <= 0 || !Number.isFinite(h)) {
    throw new Error(`h 必须为正有限数：${ h }`)
  }
  /** 数据量 */
  const n = yPlus.length
  // yPlus / yMinus 长度一致性校验
  if (yMinus.length !== n) {
    throw new Error(`centralDiff: yPlus 长度 ${ n } ≠ yMinus 长度 ${ yMinus.length }`)
  }
  /** 差分向量 */
  const diffs = new Array<number>(n).fill(0)
  /** 差分步长：2h */
  const denom = 2 * h
  // 遍历计算
  for (let i = 0; i < n; i++) {
    // 差分向量
    diffs[i] = (yPlus[i]! - yMinus[i]!) / denom
  }
  // 返回结果
  return diffs
}
