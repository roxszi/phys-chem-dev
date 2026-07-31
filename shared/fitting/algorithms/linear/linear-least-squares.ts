import { validateSameLength, validateMinLength, validateFiniteArray } from '../../../base/validate/arrays.js'
import { invertMatrix } from '../../../base/linalg/matrix.js'
import type {
  LinearLeastSquaresOptions,
  LinearLeastSquaresResult,
} from './types.js'

/**
 * 线性最小二乘拟合 y = slope·x + intercept
 *
 * 核心公式（带截距）：
 *   slope     = Σ[(xᵢ-x̄)(yᵢ-ȳ)] / Σ[(xᵢ-x̄)²]
 *   intercept = ȳ - slope·x̄
 *
 * 过原点（fitIntercept=false）：
 *   slope = Σ(xᵢyᵢ) / Σ(xᵢ²)   （约束 intercept = 0）
 *   自由度 = n - 1（不是 n - 2）
 *
 * 与 LM 的关系：线性最小二乘是 LM 在 λ=0、模型线性时的闭式特例。
 * 单独保留是因为：
 *   1. 闭式解无迭代，比 LM 快 100~1000 倍
 *   2. 数值稳定性更好（无雅可比数值误差）
 *   3. 物化实验里大量场景是线性拟合（Beer-Lambert / Arrhenius 取对数 / 一级反应积分式）
 *
 * @param xData 自变量数组
 * @param yData 因变量数组
 * @param options 配置选项（全部可选）
 * @returns 拟合结果（含 slope / intercept / R² / 协方差 / 参数标准误）
 */
export function linearLeastSquares(
  xData: number[],
  yData: number[],
  options: LinearLeastSquaresOptions = {},
): LinearLeastSquaresResult {
  const { fitIntercept = true, computeStatistics = true } = options

  // ── 1. 通用校验 ────────────────────────────────────
  validateSameLength(xData, yData, ['xData', 'yData'])
  validateMinLength(xData, 2, 'xData')
  validateFiniteArray(xData, 'xData')
  validateFiniteArray(yData, 'yData')

  const n = xData.length
  if (n < 2) {
    throw new Error(`线性回归至少需要 2 个数据点，当前 ${n}`)
  }

  // ── 2. 计算斜率和截距 ──────────────────────────────
  let slope: number
  let intercept: number
  let denominator: number

  if (fitIntercept) {
    // 带截距：标准最小二乘
    let sumX = 0
    let sumY = 0
    for (let i = 0; i < n; i++) {
      sumX += xData[i]!
      sumY += yData[i]!
    }
    const meanX = sumX / n
    const meanY = sumY / n

    let numerator = 0
    denominator = 0
    for (let i = 0; i < n; i++) {
      const dx = xData[i]! - meanX
      numerator += dx * (yData[i]! - meanY)
      denominator += dx * dx
    }

    if (denominator === 0) {
      throw new Error('自变量方差为零（所有 x 相同），无法进行线性回归')
    }

    slope = numerator / denominator
    intercept = meanY - slope * meanX
  } else {
    // 过原点：y = slope·x
    let numerator = 0
    denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += xData[i]! * yData[i]!
      denominator += xData[i]! * xData[i]!
    }
    if (denominator === 0) {
      throw new Error('所有 x 都是 0，过原点回归无意义')
    }
    slope = numerator / denominator
    intercept = 0
  }

  // ── 3. 残差、预测值、SSE、SST ─────────────────────
  const predicted: number[] = new Array(n)
  const residuals: number[] = new Array(n)
  let sse = 0

  // SST 只在带截距时需要（过原点回归用未中心化的总平方和）
  let yMean = 0
  if (fitIntercept) {
    for (let i = 0; i < n; i++) yMean += yData[i]!
    yMean /= n
  }

  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const pred = slope * xData[i]! + intercept
    predicted[i] = pred
    const res = yData[i]! - pred
    residuals[i] = res
    sse += res * res
    if (fitIntercept) {
      const dy = yData[i]! - yMean
      ssTot += dy * dy
    } else {
      // 过原点：用 Σy² 作为总平方和（等价于和"y=0"比较）
      ssTot += yData[i]! * yData[i]!
    }
  }

  const rSquared = ssTot === 0 ? 1 : 1 - sse / ssTot
  const rmse = Math.sqrt(sse / n)

  // ── 4. 自由度 / σ² ────────────────────────────────
  // 带 intercept 时 p = 2，过原点时 p = 1
  const p = fitIntercept ? 2 : 1
  const dof = n - p
  if (dof < 0) {
    throw new Error(
      `数据点数 ${n} 少于参数个数 ${p}，系统欠定，无法估计误差`,
    )
  }
  const sigma2 = dof > 0 ? sse / dof : 0

  // ── 5. 协方差和参数标准误 ─────────────────────────
  // 线性回归的协方差：Cov = σ² × (XᵀX)⁻¹
  // 对 y = slope·x + intercept 的设计矩阵 X = [x | 1]：
  //   XᵀX = [[Σx², Σx], [Σx, n]]
  // 过原点：XᵀX = [Σx²]（标量）
  const params: Record<string, number> = { slope }
  if (fitIntercept) params['intercept'] = intercept

  const covariance: number[][] = []
  const paramErrors: Record<string, number> = { slope: 0 }
  if (fitIntercept) paramErrors['intercept'] = 0

  let gradientNorm = 0

  if (computeStatistics && dof > 0) {
    if (fitIntercept) {
      // 构造 XᵀX = [[Σx², Σx], [Σx, n]]
      let sumX = 0
      let sumX2 = 0
      for (let i = 0; i < n; i++) {
        sumX += xData[i]!
        sumX2 += xData[i]! * xData[i]!
      }
      const XtX: number[][] = [
        [sumX2, sumX],
        [sumX, n],
      ]
      const XtXInv = invertMatrix(XtX)
      if (XtXInv) {
        covariance[0] = [XtXInv[0]![0]! * sigma2, XtXInv[0]![1]! * sigma2]
        covariance[1] = [XtXInv[1]![0]! * sigma2, XtXInv[1]![1]! * sigma2]
        paramErrors['slope'] = Math.sqrt(Math.max(covariance[0]![0]!, 0))
        paramErrors['intercept'] = Math.sqrt(Math.max(covariance[1]![1]!, 0))
      }
    } else {
      // 过原点：Cov = σ² / Σx²（标量）
      covariance[0] = [sigma2 / denominator]
      paramErrors['slope'] = Math.sqrt(Math.max(covariance[0]![0]!, 0))
    }
  }

  // ── 6. 返回 ───────────────────────────────────────
  // 线性拟合无迭代，gradientNorm / converged / iterations 等字段
  // 仅为满足 FitResult 接口约束，便于和 LM 共用上层代码。

  return {
    params,
    paramErrors,
    rSquared,
    rmse,
    sse,
    dof,
    residuals,
    predicted,
    covariance,
    converged: true,
    iterations: 1,
    gradientNorm,
    // 扩展字段
    slope,
    intercept,
  }
}
