/**
 * 加权线性最小二乘（闭式解）
 *
 * 模型：y = slope · x + intercept
 *
 * 加权闭式公式：
 *   令 X = [1, x]（n×2 设计矩阵），W = diag(wᵢ)，wᵢ = 1/σ_yᵢ²
 *   β = (Xᵀ W X)⁻¹ Xᵀ W y
 *
 * 不传 sigmaY 时退化为标准 OLS（等权）。
 *
 * 用途：
 *   1. 直接拟合线性数据（Beer-Lambert 校准曲线、Arrhenius 线性化）
 *   2. 作为非线性公式的 preFit（线性化变换后的快速初值估计）
 *   3. 作为 ODR 的退化对照（σx=0 时 ODR 应给出相同结果）
 */
import { invertMatrix } from '../../../matrix/inverse.js'
import { matVec } from '../../../matrix/basic.js'
import { isFinitePositive } from '../../../math/validate.js'

export interface LinearLeastSquaresOptions {
  /**
   * y 的标准差数组 σ_y（内部自动转换为权重 w = 1/σ²）
   *
   * 与 LM / ODR 的 sigmaY 字段语义一致——业务层直接传"标准差"，
   * 不需要自己算 1/σ²。
   *
   * 例：若 y 的标准差都是 0.1，传 sigmaY = [0.1, 0.1, ...]
   *   内部会用 weights = [100, 100, ...]
   *
   * 不传时退化为等权 OLS（等价于 sigmaY 全 1）。
   */
  sigmaY?: number[]
}

export interface LinearLeastSquaresResult {
  /** 斜率 */
  slope: number
  /** 截距 */
  intercept: number
  /** 斜率标准误（n=2 时为 NaN，含义见下方 covariance 注释） */
  slopeStdErr: number
  /** 截距标准误（n=2 时为 NaN，含义见下方 covariance 注释） */
  interceptStdErr: number
  /** R² */
  rSquared: number
  /** 残差向量 */
  residuals: number[]
  /** 预测值 */
  predicted: number[]
  /**
   * 协方差矩阵 2×2
   *
   * 行列顺序固定为 `[intercept, slope]`（与设计矩阵 X = [1, x] 列序一致）：
   *   - `covariance[0][0]` = var(intercept)
   *   - `covariance[1][1]` = var(slope)
   *   - `covariance[0][1]` = `covariance[1][0]` = cov(intercept, slope)
   *
   * 与 numpy.polyfit / scipy.linregress 的 `[slope, intercept]` 顺序**相反**——
   * 这是教学版（intercept 在前，因为模型写作 `y = intercept + slope·x`）。
   * 若要与其他库互操作，请用 `slopeStdErr` / `interceptStdErr` 字段而非矩阵。
   *
   * n=2 时 dof=0 → sigma²=NaN → covariance 全为 NaN
   * （数学含义：两点定线，参数本身能算但方差"不可估计"，不是 0）。
   */
  covariance: number[][]
  /** 残差平方和 */
  sse: number
  /** 自由度 = n - 2 */
  dof: number
}

export function linearLeastSquares(
  xData: number[],
  yData: number[],
  options: LinearLeastSquaresOptions = {},
): LinearLeastSquaresResult {
  // x、y 长度匹配（单行检查——不写函数）
  if (yData.length !== xData.length) {
    throw new Error(`xData 与 yData 长度不匹配：${xData.length} vs ${yData.length}`)
  }

  const n = xData.length
  if (n < 2) throw new Error(`线性拟合至少需要 2 个点（两点确定一条直线），当前 ${n}`)

  // sigmaY → weights = 1/σ²（单次循环同时校验 + 转换）
  const sigmaYArr = options.sigmaY
  let weights: number[] | undefined
  if (sigmaYArr) {
    if (sigmaYArr.length !== n) {
      throw new Error(`sigmaY 长度 ${sigmaYArr.length} ≠ 数据点数 ${n}`)
    }
    weights = new Array<number>(n)
    for (let i = 0; i < n; i++) {
      const s = sigmaYArr[i]!
      isFinitePositive(s, `sigmaY[${i}]`)
      weights[i] = 1 / (s * s)
    }
  }

  // 构造正规方程 (Xᵀ W X) · β = Xᵀ W y
  // 设计矩阵列：[1, x]
  // XᵀWX 是 2×2 矩阵：
  //   [Σwᵢ,     Σwᵢxᵢ   ]
  //   [Σwᵢxᵢ,   Σwᵢxᵢ²  ]
  // XᵀWy：
  //   [Σwᵢyᵢ, Σwᵢxᵢyᵢ]ᵀ

  let sw = 0
  let swx = 0
  let swxx = 0
  let swy = 0
  let swxy = 0

  for (let i = 0; i < n; i++) {
    const w = weights ? weights[i]! : 1
    const x = xData[i]!
    const y = yData[i]!
    sw += w
    swx += w * x
    swxx += w * x * x
    swy += w * y
    swxy += w * x * y
  }

  const XtWX: number[][] = [
    [sw, swx],
    [swx, swxx],
  ]
  const XtWy: number[] = [swy, swxy]

  const XtWXInv = invertMatrix(XtWX)
  if (!XtWXInv) {
    throw new Error('设计矩阵奇异（所有 x 相同？）')
  }

  const beta = matVec(XtWXInv, XtWy)
  const intercept = beta[0]!
  const slope = beta[1]!

  // 残差与 SSE
  const predicted = new Array<number>(n)
  const residuals = new Array<number>(n)
  let sse = 0
  let totalSS = 0

  // 加权均值（用于 R²）
  const yMean = swy / sw

  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xData[i]!
    predicted[i] = pred
    const r = yData[i]! - pred
    residuals[i] = r
    const w = weights ? weights[i]! : 1
    sse += w * r * r
    const dy = yData[i]! - yMean
    totalSS += w * dy * dy
  }

  const dof = n - 2
  // n=2 时 dof=0 → sigma²="不可估计"（数学上不存在）
  // 用 NaN 而非 0——避免误导学生以为"两点拟合参数完全精确"
  // UI 应渲染为 "—" 或 "不可估"，提示学生"两点不够，要测更多点"
  const sigma2 = dof > 0 ? sse / dof : NaN

  // 协方差矩阵 = σ² × (XᵀWX)⁻¹
  // n=2 时 sigma²=NaN → covariance / stdErr 全为 NaN
  const covariance = XtWXInv.map((row) => row.map((v) => v * sigma2))
  const interceptStdErr = Math.sqrt(Math.max(covariance[0]![0]!, 0))
  const slopeStdErr = Math.sqrt(Math.max(covariance[1]![1]!, 0))

  // R²：n=2 时两点必在线上，sse=0、totalSS>0，R²=1
  // 若 totalSS=0（所有 y 相等）则约定 R²=1
  const rSquared = totalSS === 0 ? 1 : 1 - sse / totalSS

  return {
    slope,
    intercept,
    slopeStdErr,
    interceptStdErr,
    rSquared,
    residuals,
    predicted,
    covariance,
    sse,
    dof,
  }
}
