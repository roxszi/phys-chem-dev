/**
 * 统计分析相关方法
 * ---
 * - 数组均值、数组方差等等
 * - 此处只涉及基础的js实现，不涉及矩阵等复杂运算
 */


/**
 * 数组加和
 */
export function getSum(arr: number[]): number {
  /** 数组长度 */
  const n = arr.length
  // 数组长度校验
  if (n === 0) {
    throw new Error("[sum]: 数组为空")
  }
  /** 数组之和 */
  let sum = 0
  // 遍历求和
  for (let i = 0; i < n; i++) {
    sum += arr[i]!
  }
  // 返回加和
  return sum
}


/**
 * 数组均值
 * - 有说法称average包含mean（算术平均）、median（中位数）、mode（众数）等具体方法。所以这里直接用mean表示均值
 */
export function getMean(arr: number[]): number {
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
 * 从已排序的数组中获取中位数
 * - 会根据长度奇偶性取中间值或中间两值的平均
 * @param sortedArr 已排序的数组
 */
export function getMedian(sortedArr: number[]): number {
  /** 数组长度 */
  const n = sortedArr.length
  if (n === 0) {
    throw new Error("[median]: 数组为空")
  }
  /** 中间位次 */
  const midIndex = n / 2
  // 如果长度为偶数，则取中间两值的平均
  if ((midIndex % 1) === 0) {
    return ((sortedArr[midIndex - 1]! + sortedArr[midIndex]!) / 2)
  // 如果长度为奇数，则直接取中间值
  } else {
    return sortedArr[Math.floor(midIndex)]!
  }
}


/**
 * 数组的中位绝对偏差（MAD）
 * - MAD = median(|x_i - median(x)|)
 * - 正态分布下，σ ≈ 1.4826 × MAD。
 * @param sortedArr 已排序的数组
 */
export function getMAD(sortedArr: number[]): { MAD: number; median: number } {
  /** 中位数 */
  const median = getMedian(sortedArr)
  /** 绝对偏差数组 */
  const deviationArr: number[] = []
  // 计算绝对偏差
  for (const value of sortedArr) {
    deviationArr.push(Math.abs(value - median))
  }
  /** 排序 */
  deviationArr.sort((a, b) => a - b)
  /** MAD */
  const MAD = getMedian(deviationArr)
  // 返回 MAD 和中位数
  return { MAD: MAD, median: median }
}


/**
 * 计算数组指定分位数值
 * - 对于分位 index 不是整数的情况，使用线性插值法
 * @param sortedArr 已排序的数组
 * @param percentage 百分位数（0-100）
 */
export function getPercentile(sortedArr: number[], percentage: number): number {
  /** 数组长度 */
  const n = sortedArr.length
  if (n === 0) {
    throw new Error("[getPercentile]: 数组为空")
  }
  /** 索引真值（可能为小数） */
  const index = (percentage / 100) * (n - 1)
  /** 小于索引的最大整数值 */
  const lowIndex = Math.floor(index)
  /** 大于索引的最小整数值 */
  const highIndex = Math.ceil(index)
  // 如果索引是整数，则直接返回对应值
  if (lowIndex === highIndex) {
    return sortedArr[index]!
  // 如果索引不是整数，则使用线性插值法
  } else {
    const value =
      (sortedArr[highIndex]! - sortedArr[lowIndex]!)
        / (highIndex - lowIndex)
        * (index - lowIndex)
        + sortedArr[lowIndex]!
    return value
  }
}


/**
 * 决定系数
 * - R² = 1 - SSE / SST
 * - 任意两个等长数组（y, yPred）即可计算。
 * @param yArr 观测值，即实际值
 * @param yPredArr 预测值，即拟合值
 */
export function getRSquared(yArr: number[], yPredArr: number[]): number {
  /** 观测值数组长度 */
  const n = yArr.length
  if (yPredArr.length !== n) {
    throw new Error(`[rSquared]: 长度不匹配：yArr=${ n }, yPredArr=${ yPredArr.length }`)
  }
  /** 观测值均值 */
  const yMean = getMean(yArr)
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
 * 均方根误差
 * - RMSE = √(SSE / n)
 * - 此处除以 n 而非 dof（直观对应"平均残差"）。
 * @param yArr 观测值
 * @param yPredArr 预测值
 */
export function getRMSE(yArr: number[], yPredArr: number[]): number {
  const n = yArr.length
  if (yPredArr.length !== n) {
    throw new Error(`[getRMSE]: 长度不匹配：yArr=${ n }, yPredArr=${ yPredArr.length }`)
  }
  let sse = 0
  for (let i = 0; i < n; i++) {
    const r = yArr[i]! - yPredArr[i]!
    sse += r * r
  }
  return Math.sqrt(sse / n)
}


/**
 * 残差数组
 * - residual error array
 * - REArr = [yArri - yPredArri]
 * @param yArr 观测值
 * @param yPredArr 预测值
 */
export function getREArr(yArr: number[], yPredArr: number[]): number[] {
  /** 数组长度 */
  const n = yArr.length
  // 长度验证
  if (yArr.length !== yPredArr.length) {
    throw new Error(`[getREArr]: 长度不匹配：yArr = ${ yArr.length }, yPredArr = ${ yPredArr.length }`)
  }
  /** 残差数组 */
  const reArr = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    reArr[i] = yArr[i]! - yPredArr[i]!
  }
  return reArr
}


/**
 * 加权SSE
 * - SSE = Σ wᵢ·rᵢ²
 * - Sum of Squared Errors，误差平方和。
 * - 不传权重时退化为标准 SSE。
 * @param reArr 残差数组
 * @param weightArr 权重数组（与 reArr 等长）
 */
export function getSSE(reArr: number[], weightArr?: number[]): number {
  /** 数组长度 */
  const n = reArr.length
  /** SSE */
  let sse = 0
  // 权重数组存在时
  if (weightArr) {
    // 长度校验
    if (weightArr.length !== n) {
      throw new Error(`[sse]: weightArr 长度 ${ weightArr.length } ≠ residualArr 长度 ${ n }`)
    }
    // 遍历求和得到加权SSE
    for (let i = 0; i < n; i++) {
      sse += weightArr[i]! * reArr[i]! * reArr[i]!
    }
  // 权重数组不存在时
  } else {
    // 遍历求和得到标准SSE
    for (let i = 0; i < n; i++) {
      sse += reArr[i]! * reArr[i]!
    }
  }
  return sse
}


/**
 * 残差SSE的方差估计
 * - σ² = SSE / max(dof, 1)
 * - dof = n - p，自由度
 * @param sse SSE
 * @param n 观测数
 * @param p 参数数
 */
export function getSSESigmaSquared(sse: number, n: number, p: number): number {
  const dof = n - p
  const sigmaSquared = sse / Math.max(dof, 1)
  return sigmaSquared
}
