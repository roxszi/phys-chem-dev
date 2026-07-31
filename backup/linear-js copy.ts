/**
 * 线性拟合 - JS实现
 * 使用最小二乘法拟合
 */

/** 线性拟合结果的数据类型 */
interface LinearFittingResult {
  /** 斜率 */
  slope: number
  /** 截距 */
  intercept: number
  /** 决定系数 R² */
  rSquared: number
  /** 残差数组 */
  residuals: number[]
  /** 预测值数组 */
  predicted: number[]
}

/**
 * 执行线性最小二乘法拟合 y = slope * x + intercept
 * 
 * 核心公式：
 *   slope = Σ[(xi-x̄)(yi-ȳ)] / Σ[(xi-x̄)²]
 *   intercept = ȳ - slope * x̄
 *   R² = 1 - SSR / SST
 * 
 * @param xData 自变量数组
 * @param yData 因变量数组
 * @returns 拟合结果（斜率、截距、R²、残差、预测值）
 * @throws 当 xData 和 yData 长度不一致，或少于2个点，或自变量方差为零时，抛出错误
 */
export function linearFitting(
  xData: number[],
  yData: number[],
): LinearFittingResult {

  /** 数据样本量 */
  const n = xData.length
  if (n < 2) {
    throw new Error("线性回归至少需要2个数据点")
  }
  if (n !== yData.length) {
    throw new Error("自变量和因变量的数量不一致")
  }

  // 计算 x 和 y 的均值
  let sumX = 0
  let sumY = 0
  for (let i = 0; i < n; i++) {
    sumX += xData[i]!
    sumY += yData[i]!
  }
  /** X均值 */
  const meanX = sumX / n
  /** Y均值 */
  const meanY = sumY / n

  // slope = Σ[(xi-x̄)(yi-ȳ)] / Σ[(xi-x̄)²]
  /** 分子，Σ[(xi-x̄)(yi-ȳ)] */
  let numerator = 0
  /** 分母，Σ[(xi-x̄)²] */
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    /** (xi-x̄) */
    const dx = xData[i]! - meanX
    numerator += dx * (yData[i]! - meanY)
    denominator += dx * dx
  }

  // 防止除零（所有 x 相同的情况）
  if (denominator === 0) {
    throw new Error("自变量方差为零，无法进行线性回归")
  }

  /** 斜率 slope */
  const slope = numerator / denominator
  /** 截距 intercept = ȳ - slope * x̄ */
  const intercept = meanY - slope * meanX

  // 计算预测值、残差、R²
  /** 预测值数组 */
  const predicted: number[] = new Array(n)
  /** 残差数组 */
  const residuals: number[] = new Array(n)

  /** 残差平方和 SSR = Σ(res²) */
  let ssRes = 0
  /** 总平方和 SST = Σ[(yi-ȳ)²] */
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    /** 预测值 */
    const pred = slope * xData[i]! + intercept
    predicted[i] = pred
    /** 残差 */
    const res = yData[i]! - pred
    residuals[i] = res
    // SSR = Σ(res²)
    ssRes += res * res
    // SST = Σ[(yi-ȳ)²]
    ssTot += (yData[i]! - meanY) ** 2
  }

  /** R² = 1 - SSR / SST */
  const rSquared =
    (ssTot === 0)
      ? 1
      : (1 - ssRes / ssTot)

  // 返回结果
  return { slope, intercept, rSquared, residuals, predicted }
}
