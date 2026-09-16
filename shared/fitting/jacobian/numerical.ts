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
 *   - 数据类型/接口 - JacobianProvider（LM）/ ODRJacobianProvider（ODR）/ NumericalJacobianOptions
 *   - 工具函数（便于复用） - centralDiff 中心差分 / diffOverParams 算∂fᵢ/∂pⱼ / diffOverXs 算∂f/∂x
 *   - 具体实现 - lmNumericalJacobian（LM） / odrNumericalJacobian（ODR）
 */

import type { ModelFunction, ParamValues, ParamNames } from "../types.ts"

// ================================ 数据类型/接口 ================================

/**
 * LM 雅可比计算器（函数式注入点）
 * - 计算雅可比矩阵 J[i][j] = ∂fᵢ/∂pⱼ，形状 [n × p]（n 数据点数 × p 自由参数数）
 * @param equationFunction 模型函数
 * @param xs 自变量数据
 * @param params 当前全参数值
 * @param paramNames 自由参数名数组（顺序固定，与雅可比列对应）
 * @param options 数值雅可比配置
 * @returns 雅可比矩阵数据包（LM 只需参数方向）
 */
export type JacobianProvider = (
  /** 模型函数 */
  equationFunction: ModelFunction,
  /** 自变量数据 */
  xs: number[],
  /** 当前全参数值 */
  params: ParamValues,
  /** 自由参数名数组（顺序固定） */
  paramNames: ParamNames,
  /** 配置（可选） */
  options?: NumericalJacobianOptions,
) => { jacobianBeta: number[][] }

/**
 * ODR 雅可比计算器（函数式注入点）
 * - 在 LM 基础上追加自变量方向的偏导 ∂f/∂x（ODR 迭代中 x 会被修正）
 */
export type ODRJacobianProvider = (
  /** 模型函数 */
  equationFunction: ModelFunction,
  /** 自变量数据（ODR 场景为当前修正值 x + δ） */
  xs: number[],
  /** 当前全参数值 */
  params: ParamValues,
  /** 自由参数名数组（顺序固定） */
  paramNames: ParamNames,
  /** 配置（可选） */
  options?: NumericalJacobianOptions,
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
 * @param equationFunction 模型函数
 * @param xs 自变量数据
 * @param params 当前全参数值
 * @param paramNames 自由参数名数组（顺序固定）
 * @param options 配置（可选）
 * @returns { jacobianBeta }：[n × p] 雅可比矩阵
 */
export function lmNumericalJacobian(
  equationFunction: ModelFunction,
  xs: number[],
  params: ParamValues,
  paramNames: ParamNames,
  options: NumericalJacobianOptions = {}
) {
  // 配置校验
  checkOptions(options)
  // 数据点数（由 xs 自带，无需单独传参）
  const n = xs.length
  // 初始化
  const typicalValues = options.typicalValues ?? {}
  const relativeStepBeta = options.relativeStepBeta ?? 1e-6
  // 参数方向差分
  const jacobianBeta = diffOverParams(
    equationFunction,
    n,
    xs,
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
 * @param equationFunction 模型函数
 * @param xs 自变量数据（ODR 场景为当前修正值 x + δ）
 * @param params 当前全参数值
 * @param paramNames 自由参数名数组（顺序固定）
 * @param options 配置（可选）
 * @returns { jacobianBeta, jacobianX }：[n × p] 矩阵 + [n] 向量
 */
export function odrNumericalJacobian(
  equationFunction: ModelFunction,
  xs: number[],
  params: ParamValues,
  paramNames: ParamNames,
  options: NumericalJacobianOptions = {}
) {
  // 配置校验
  checkOptions(options)
  // 数据点数
  const n = xs.length
  // 初始化
  const typicalValues = options.typicalValues ?? {}
  const relativeStepBeta = options.relativeStepBeta ?? 1e-6
  const relativeStepX = options.relativeStepX ?? 1e-6
  // 参数方向差分
  const jacobianBeta = diffOverParams(
    equationFunction,
    n,
    xs,
    params,
    paramNames,
    relativeStepBeta,
    typicalValues,
  )
  // 自变量方向差分
  const jacobianX = diffOverXs(
    equationFunction,
    n,
    xs,
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
 * @param equationFunction 模型函数
 * @param n 数据点数
 * @param xs 自变量数据集
 * @param params 当前全参数值
 * @param paramNames 自由参数名数组
 * @param relativeStepBeta 参数相对步长
 * @param typicalValues 参数典型尺度表
 * @returns ∂fᵢ/∂pⱼ（[n × p]）
 */
export function diffOverParams(
  equationFunction: ModelFunction,
  n: number,
  xs: number[],
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
    const yPlus = equationFunction(xs, paramsTrial)
    // 后向扰动
    paramsTrial[paramName] = paramValue - h
    /** 后向扰动结果 */
    const yMinus = equationFunction(xs, paramsTrial)
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
 * 自变量方向差分，计算 ∂f/∂x
 * - 逐自变量扰动（±h），中心差分，填充 [n] 向量。
 * - 逐点单独求值：对点态显式公式（各数据点独立计算）语义正确
 * @param equationFunction 模型函数
 * @param n 数据点数
 * @param xs 自变量数组
 * @param params 当前全参数值
 * @param relativeStepX 自变量相对步长
 * @returns ∂f/∂x（[n]）
 */
export function diffOverXs(
  equationFunction: ModelFunction,
  n: number,
  xs: number[],
  params: ParamValues,
  relativeStepX: number,
): number[] {
  /** 差分向量/数组 */
  const jacobianX = new Array<number>(n).fill(0)
  /** 扰动用的自变量 */
  let xTrial: number
  // 遍历n个数据点
  for (let i = 0; i < n; i++) {
    // 接参数
    const xi = xs[i]!
    // 自变量相对步长
    const h = relativeStepX * Math.max(Math.abs(xi), 1)
    // 前向扰动
    xTrial = xi + h
    const yPlus = equationFunction([xTrial], params)
    // 后向扰动
    xTrial = xi - h
    const yMinus = equationFunction([xTrial], params)
    // 填充差分向量
    jacobianX[i] = (yPlus[0]! - yMinus[0]!) / (2 * h)
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
