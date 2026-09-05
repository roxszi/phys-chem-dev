/**
 * 加权线性最小二乘（闭式解）
 * ---
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


import { Matrix } from "ml-matrix"
import { isFinitePositive, getInvertMatrix } from "@/shared/math/index.ts"

/**
 * 线性最小二乘的额外传参
 * - 目前主要就是 sigmaY（会转为权重）
 */
export interface LinearLeastSquaresOptions {
  /**
   * y 的标准差数组（内部自动转换为权重 w = 1/σ²）
   * - 例：若 y 的标准差都是 0.1，传 sigmaY = [0.1, 0.1, ...]。
   *   内部会用 weights = [100, 100, ...]
   * - 不传时退化为等权 OLS（等价于 sigmaY 全 1）。
   */
  sigmaY?: number[]
}

/**
 * 线性拟合结果
 */
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
  /** 残差 */
  residuals: number[]
  /** 预测值 */
  predicted: number[]
  /**
   * 协方差矩阵 2×2（ml-matrix Matrix）
   * - 元素访问：
   *   - `covariance.get(0, 0)` = var(slope)
   *   - `covariance.get(1, 1)` = var(intercept)
   *   - `covariance.get(0, 1)` = `covariance.get(1, 0)` = cov(slope, intercept)
   * - 注：n=2 时 dof = 0 → sigma² = NaN → covariance 全为 NaN。
   *   数学含义：两点定线，参数本身能算但方差"不可估计"。
   */
  covariance: Matrix
  /** 残差平方和 */
  sse: number
  /** 自由度 = n - 2 */
  dof: number
}


/**
 * 线性拟合-最小二乘法
 */
export function linearLeastSquares(
  xData: number[],
  yData: number[],
  options: LinearLeastSquaresOptions = {},
): LinearLeastSquaresResult {
  /** 数组长度 */
  const n = xData.length
  // x、y 长度匹配（单行检查——不写函数）
  if (yData.length !== n) {
    throw new Error(`[linearLeastSquares]：xData 与 yData 长度不匹配：${ n } vs ${ yData.length }`)
  }
  // 至少 2 个点
  if (n < 2) {
    throw new Error(`[linearLeastSquares]：线性拟合至少需要 2 个点（两点确定一条直线），当前 ${ n }`)
  }
  
  // ---------------- 权重 ----------------
  // sigmaY → weights = 1/σ²（单次循环同时校验 + 转换）
  const sigmaYArr = options.sigmaY
  /** 权重数组 */
  let weights: number[] | undefined
  // 若存在 sigmaY
  if (sigmaYArr) {
    // 长度校验
    if (sigmaYArr.length !== n) {
      throw new Error(`[linearLeastSquares]：sigmaY 长度 ${ sigmaYArr.length } ≠ 数据点数 ${ n }`)
    }
    // 通过校验，则将 sigmaY 转为权重
    weights = new Array<number>(n)
    for (let i = 0; i < n; i++) {
      /** sigmaY */
      const sigmaY = sigmaYArr[i]!
      // 校验：sigmaY 必须是正数
      isFinitePositive(sigmaY, `sigmaY[${ i }]`)
      // 通过校验，赋值权重 = 1/σ²
      weights[i] = 1 / (sigmaY * sigmaY)
    }
  }

  // ---------------- 正规方程 ----------------
  // 构造正规方程 (Xᵀ W X) · β = Xᵀ W y
  // 设计矩阵列：[1, x]
  // XᵀWX 是 2×2 矩阵：
  //   [Σwᵢ,     Σwᵢxᵢ   ]
  //   [Σwᵢxᵢ,   Σwᵢxᵢ²  ]
  // XᵀWy：
  //   [Σwᵢyᵢ, Σwᵢxᵢyᵢ]ᵀ

  // 初始化累加变量
  /** 权重w总和 sum of weight */
  let sw = 0
  /** w*x的加和 */
  let swx = 0
  /** w*x*x的加和 */
  let swxx = 0
  /** w*y的加和 */
  let swy = 0
  /** w*x*y的加和 */
  let swxy = 0
  // 循环累加
  // 若 weights 不存在
  if (!weights) {
    // 以权重为1，进行累加
    for (let i = 0; i < n; i++) {
      const x = xData[i]!
      const y = yData[i]!
      sw += 1
      swx += x
      swxx += x * x
      swy += y
      swxy += x * y
    }
  // 若 weights 存在
  } else {
    // 以权重进行累加
    for (let i = 0; i < n; i++) {
      const w = weights[i]!
      const x = xData[i]!
      const y = yData[i]!
      sw += w
      swx += w * x
      swxx += w * x * x
      swy += w * y
      swxy += w * x * y
    }
  }


  // 解正规方程
  /**
   * XᵀWX
   * - 2×2 矩阵：
   *   ```
   *   [Σwᵢ,   Σwᵢxᵢ ]
   *   [Σwᵢxᵢ, Σwᵢxᵢ²]
   *   ```
   */
  const XtWX = new Matrix([
    [sw, swx],
    [swx, swxx],
  ])
  /**
   * XᵀWy
   * ```
   * [Σwᵢyᵢ, Σwᵢxᵢyᵢ]ᵀ
   * ```
   */
  const XtWy: number[] = [swy, swxy]
  /** XᵀWX 的逆矩阵 */
  const XtWXInv = getInvertMatrix(XtWX)
  if (!XtWXInv) {
    throw new Error('设计矩阵奇异（所有 x 相同？）')
  }

  const beta = XtWXInv.mmul(Matrix.columnVector(XtWy)).to1DArray()
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
  const covariance = Matrix.mul(XtWXInv, sigma2)
  const interceptStdErr = Math.sqrt(Math.max(covariance.get(0, 0), 0))
  const slopeStdErr = Math.sqrt(Math.max(covariance.get(1, 1), 0))

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
