/**
 * 雅可比矩阵的[数值雅可比]实现
 * ---
 * - 用有限差分近似导数（用真实的 Δ 值代替解析的 d 微分值）。
 * - 该方法简单明了，不需要用户手写偏导公式，便于用数组遍历方法直接实现；
 * - 该方法的劣势是计算量大，遍历次数多，无法调用GPU性能。属于纯粹的JS实现。
 * ---
 * 本模块目前提供的具体实现方法为[数值雅可比]方法，值计算方法采用[中心差分法]：
 *   - `J[n][p] ≈ [f(p + hⱼ·eⱼ) − f(p − hⱼ·eⱼ)] / (2·hⱼ)`
 *   - 其优势在于误差阶为 O(h²)，综合考虑了前向差分和后向差分，且步长 h 可以自适应。
 *   - 最优 h ≈ ε^(1/3) ≈ 6e-6（相比前向/后向差分，本方法最优 h 更大，则小值情况下的舍入误差更小）
 * ---
 * 本模块的内容：
 *   - 数据类型/接口 - JacobianProvider / NumericalJacobianOptions
 *   - 工具函数（便于复用） - centralDiff 中心差分 / diffOverParams 算∂f/∂x / diffOverXs 算∂fᵢ/∂pⱼ
 *   - 具体实现 - lmNumericalJacobian（LM） / odrNumericalJacobian（ODR）
 */

import type { ParamNames, EquationFunction } from "../types.ts"

// ================================ 数据类型/接口 ================================

/**
 * LM雅可比计算器
 * - 计算雅可比矩阵：∂fᵢ/∂pⱼ 形状为 [n × p] - n 行 p 列
 *                  ∂f/∂x 形状为 [n]
 * @param fn 预测函数
 * @param params 当前参数值
 * @param paramNames 参数名（顺序固定）
 * @param n 数据点数（fn 应返回 n 长度的向量）
 * @returns 雅可比矩阵。{ ∂fᵢ/∂pⱼ, ∂f/∂x }
 */
export type JacobianProvider = (
  /** 公式函数 */
  equationFunction: EquationFunction,
  /** 当前参数值 */
  params: Record<string, number>,
  /** 参数名数组（顺序固定） */
  paramNames: ParamNames,
  /** 数据点数 */
  n: number,
) => { jacobianBeta: number[][]; jacobianX?: number[] }


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


// ================================ 具体实现 ================================


// TODO
// options还没检查有效性
// // 相对步长校验：必须为正有限数
// if ((relativeStep <= 0) || (!Number.isFinite(relativeStep))) {
//   throw new Error(`relativeStep 必须为正有限数，当前为 ${ relativeStep }`)
// }


/**
 * 数值雅可比（LM法）
 */
export function lmNumericalJacobian(
  equationFunction: (xs: number[], params: Record<string, number>) => number[],
  n: number,
  xs: number[],
  params: Record<string, number>,
  paramNames: ParamNames,
  options: NumericalJacobianOptions = {}
) {
  // 初始化
  const typicalValues = options.typicalValues ?? {}
  const relativeStepBeta = options.relativeStepBeta ?? 1e-6
  // 参数方向差分（与 ODR 的 J_β 共用驱动逻辑）
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
 * 数值雅可比（ODR法）
 */
export function odrNumericalJacobian(
  equationFunction: (xs: number[], params: Record<string, number>) => number[],
  n: number,
  xs: number[],
  params: Record<string, number>,
  paramNames: ParamNames,
  options: NumericalJacobianOptions = {}
) {
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
 * @param equationFunction 公式
 * @param n 数据点数
 * @param xs 自变量数据集
 * @param params 当前参数值
 * @param paramNames 参数名数组
 * @param relativeStepBeta 参数相对步长（默认 1e-6）
 * @param typicalValues 参数典型尺度（可选）
 * @returns ∂fᵢ/∂pⱼ
 */
export function diffOverParams(
  equationFunction: (xs: number[], params: Record<string, number>) => number[],
  n: number,
  xs: number[],
  params: Record<string, number>,
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
  const paramsTrial: Record<string, number> = { ...params }
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
 * - 逐自变量扰动（±h），中心差分，填充 [n] 矩阵。
 * @param equationFunction 公式
 * @param n 数据点数
 * @param xs 自变量数组
 * @param params 当前参数值
 * @param relativeStepX 参数相对步长
 * @returns ∂f/∂x
 */
export function diffOverXs(
  equationFunction: (xs: number[], params: Record<string, number>) => number[],
  n: number,
  xs: number[],
  params: Record<string, number>,
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
