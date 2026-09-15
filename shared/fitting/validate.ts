/**
 * 拟合输入校验
 * ---
 * - 在拟合开始前校验所有输入，提前抛错避免迭代中数值异常。
 * - 校验项（一次性合并检查，避免薄函数与重复遍历）：
 *   1.  n > 0
 *   2.  n > p（否则无自由度）
 *   3.  paramNames 不重复
 *   4.  initialParams 齐全且有限
 *   5.  fn(initialParams) 长度正确
 * ---
 * 元素级有限性校验（xData / yData / pred）由下游算法在自己的循环里顺便做，避免单独的"批量校验"遍历。
 */

// 导入数值校验方法
import { isFinitePositive } from "@shared/math/index.ts"
// 导入数据类型
import type { PredictFn, DataArray, ParamNames, EquationFunction } from "./types.ts"


/**
 * 由标准差数组计算权重数组
 * - sigmaY → weights = 1/σ²（含长度与正性校验）
 * - LM / 线性最小二乘共用；ODR 因需保留 σ 本身（σx=0 → wx=∞ 语义）不使用此原语
 * @param sigmaY y 的标准差数组
 * @param n 数据点数（长度校验基准）
 * @param label 报错文案里的参数名前缀，默认 "sigmaY"
 */
export function sigmaToWeights(sigmaY: number[], n: number, label = "sigmaY"): number[] {
  // 长度校验
  if (sigmaY.length !== n) {
    throw new Error(`${ label } 长度 ${ sigmaY.length } ≠ 数据点数 ${ n }`)
  }
  /** 权重数组 */
  const weights = []
  // 遍历
  for (let i = 0; i < n; i++) {
    /** 标准差 */
    const sigma = sigmaY[i]!
    // 标准差校验
    isFinitePositive(sigma, `${ label }[${ i }]`)
    // 计算权重
    const weight = 1 / (sigma * sigma)
    weights.push(weight)
  }
  // 返回权重数组
  return weights
}


/**
 * 校验拟合输入，返回数据点数 n
 * @param xData 自变量数组
 * @param yData 因变量数组
 * @param paramNames 参数名列表
 * @param initialParams 初始参数
 * @param fn 预测函数（接收参数字典，返回预测值数组）
 * @returns 数据点数 n
 */
export function validateInputs(
  xData: DataArray,
  yData: DataArray,
  paramNames: ParamNames,
  initialParams: Record<string, number>,
  fn: EquationFunction,
): number {
  /** 数据长度 */
  const n = xData.length
  // 1. 至少 1 个数据点
  if (n === 0) {
    throw new Error("xData / yData 为空")
  }
  // 2. 数据点数应 > 参数个数
  if (n <= paramNames.length) {
    throw new Error(
      `数据点数 ${ n } 必须 > 参数个数 ${ paramNames.length }（否则无自由度）`,
    )
  }
  // 3. xData / yData 长度一致（单行检查——不写函数）
  if (yData.length !== n) {
    throw new Error(`xData 与 yData 长度不匹配：${ n } vs ${ yData.length }`)
  }
  // 4. 参数名不能重复
  const seen = new Set<string>()
  for (const name of paramNames) {
    if (!name) {
      throw new Error("paramNames 包含空字符串")
    }
    if (seen.has(name)) {
      throw new Error(`paramNames 包含重复项：${ name }`)
    }
    seen.add(name)
  }
  // 5. 初始参数齐全且有限
  for (const name of paramNames) {
    /** 参数的初始值 */
    const value = initialParams[name]
    if (value === undefined) {
      throw new Error(`initialParams 缺少参数：${ name }`)
    }
    if (!Number.isFinite(value)) {
      throw new Error(`initialParams[${ name }] 不是有限数：${ value }`)
    }
  }
  // 6. fn 返回长度正确（元素级有限性由下游循环顺便校验）
  /** 预测值 */
  const preds = fn(xData, initialParams)
  if (preds.length !== n) {
    throw new Error(
      `预测值长度 ${preds.length} ≠ 数据点数 ${ n }`,
    )
  }
  // 返回数据点数
  return n
}
