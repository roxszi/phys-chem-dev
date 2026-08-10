/**
 * math - 基础数学模块
 * 
 * @note 出于性能与耦合冗余考虑，该模块不应涉及数据验证，默认均为有效number类型
 */


/**
 * 求数组均值
 *
 * @param arr 输入数组
 */
export function mean(arr: number[]): number {
  /** 数组长度 */
  const n = arr.length
  // 数组长度校验
  if (n === 0) {
    throw new Error("[mean]: 数组为空")
  }
  /** 数组之和 */
  let sum = 0
  // 遍历求和
  for (let i = 0; i < n; i++) {
    sum += arr[i]!
  }
  /** 均值 */
  const average = sum / n
  // 返回均值
  return average
}


/**
 * 求决定系数 R² = 1 - SSE / SST
 *
 * 任意两个等长数组（y, yPred）即可计算。
 * @param yArr 观测值，即实际值
 * @param yPredArr 预测值，即拟合值
 */
export function rSquared(yArr: number[], yPredArr: number[]): number {
  /** 观测值数组长度 */
  const n = yArr.length
  if (yPredArr.length !== n) {
    throw new Error(`[rSquared]: 长度不匹配：yArr=${ n }, yPredArr=${ yPredArr.length }`)
  }
  /** 观测值均值 */
  const yMean = mean(yArr)
  /** SSE */
  let sse = 0
  /** SST */
  let sst = 0
  for (let i = 0; i < n; i++) {
    /** 残差 */
    const r = yArr[i]! - yPredArr[i]!
    sse += r * r
    /** y - y均值 */
    const dY = yArr[i]! - yMean
    sst += dY * dY
  }
  // 避免除零
  /** R² */
  const rSquared =
    (sst === 0)
      ? 1
      : (1 - sse / sst)
  return rSquared
}


/**
 * 均方根误差 RMSE = √(SSE / n)
 *
 * 此处除以 n 而非 dof（直观对应"平均残差"）。
 * @param yArr 观测值
 * @param yPredArr 预测值
 */
export function rmse(yArr: number[], yPredArr: number[]): number {
  const n = yArr.length
  if (yPredArr.length !== n) {
    throw new Error(`[rmse]: 长度不匹配：yArr=${ n }, yPredArr=${ yPredArr.length }`)
  }
  let sse = 0
  for (let i = 0; i < n; i++) {
    const r = yArr[i]! - yPredArr[i]!
    sse += r * r
  }
  return Math.sqrt(sse / n)
}


/**
 * 加权 SSE = Σ wᵢ·rᵢ²
 * 
 * Sum of Squared Errors，误差平方和。
 * 不传权重时退化为标准 SSE。
 * @param rArr 残差向量
 * @param weightArr 权重数组（与 rArr 等长）
 */
export function sse(rArr: number[], weightArr?: number[]): number {
  const n = rArr.length
  let s = 0
  if (weightArr) {
    if (weightArr.length !== n) {
      throw new Error(`[sse]: weightArr 长度 ${ weightArr.length } ≠ residualArr 长度 ${ n }`)
    }
    for (let i = 0; i < n; i++) {
      s += weightArr[i]! * rArr[i]! * rArr[i]!
    }
  } else {
    for (let i = 0; i < n; i++) {
      s += rArr[i]! * rArr[i]!
    }
  }
  return s
}


/**
 * 残差方差估计 σ² = SSE / max(dof, 1)
 *
 * 注：dof 计算 `n - p` 直接写在这里——不值得为单行减法做函数。
 * @param sse SSE
 * @param n 观测数
 * @param p 参数数
 */
export function sigma2(sse: number, n: number, p: number): number {
  return sse / Math.max(Math.max(n - p, 0), 1)
}


/**
 * 梯度无穷范数 = max_j |grad[j]|
 * @param grad 梯度向量
 */
export function gradientNorm(grad: number[]): number {
  let n = 0
  for (let j = 0; j < grad.length; j++) {
    const absV = Math.abs(grad[j]!)
    if (absV > n) n = absV
  }
  return n
}


/**
 * 残差 rArr = yArr - yPredArr
 *
 * @param yArr 观测值
 * @param yPredArr 预测值
 */
export function residuals(yArr: number[], yPredArr: number[]): number[] {
  if (yArr.length !== yPredArr.length) {
    throw new Error(`[residuals]: 长度不匹配：yArr = ${ yArr.length }, yPredArr = ${ yPredArr.length }`)
  }
  const n = yArr.length
  const rArr = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    rArr[i] = yArr[i]! - yPredArr[i]!
  }
  return rArr
}


// 中心差分原语：被 fitting/jacobian 复用
export { centralDiff } from "./finite-difference.ts"


// 元素级数值校验（复合条件）
export { isFinitePositive, isFiniteNonNegative } from "./validate.ts"
