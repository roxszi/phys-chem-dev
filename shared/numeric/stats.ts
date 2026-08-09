/**
 * 通用数值统计原子函数
 *
 * 标量聚合：求和 / 加权求和 / 均值 / 方差 / 平方和。
 * 与数组校验无关，纯数字运算。
 */

/**
 * 元素求和
 * @param arr 输入数组
 */
export function sum(arr: number[]): number {
  let s = 0
  for (let i = 0; i < arr.length; i++) s += arr[i]!
  return s
}

/**
 * 加权求和 Σ wᵢ·xᵢ
 * @param arr 输入数组
 * @param weights 权重（与 arr 等长）
 */
export function weightedSum(arr: number[], weights: number[]): number {
  if (arr.length !== weights.length) {
    throw new Error(`weightedSum 长度不匹配：arr=${arr.length}, weights=${weights.length}`)
  }
  let s = 0
  for (let i = 0; i < arr.length; i++) s += weights[i]! * arr[i]!
  return s
}

/**
 * 算术均值
 * @param arr 输入数组
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) {
    throw new Error('mean: 数组为空')
  }
  return sum(arr) / arr.length
}

/**
 * 平方和 Σ xᵢ²
 * @param arr 输入数组
 */
export function sumOfSquares(arr: number[]): number {
  let s = 0
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]!
    s += v * v
  }
  return s
}

/**
 * 总体方差（除以 n）
 * @param arr 输入数组
 */
export function variance(arr: number[]): number {
  if (arr.length === 0) {
    throw new Error('variance: 数组为空')
  }
  const m = mean(arr)
  let s = 0
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i]! - m
    s += d * d
  }
  return s / arr.length
}
