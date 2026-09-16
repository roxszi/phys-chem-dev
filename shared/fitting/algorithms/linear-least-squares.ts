/**
 * 加权线性最小二乘（闭式解）
 * ---
 * 模型：y = slope · x + intercept（一元线性专用）
 * ---
 * ⚠️ 数据形态说明：本函数是一元线性回归的闭式特例工具（slope / intercept 语义
 * 与单自变量绑定），入参 xData 保持 number[] 标量数组，
 * 不进 fitting 的 number[][] 行主序契约；多元线性回归待真实业务出现时另立函数。
 * 若手头已是行主序形态，用 pre/data-shape.ts 的打样方式自行取分量即可。
 * ---
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


// 矩阵基础操作（跨模块，走 @shared 别名 + index.ts 唯一入口）
import {
  matrixInvert,
  matrixVecMul,
  matrixScalarMul,
  matrixGet,
  matrixFrom2D,
} from "@shared/math/index.ts"
import type { Matrix } from "@shared/math/index.ts"
// 正规方程构建（模块内部子目录，相对路径）
import { buildWeightedNormalEquation } from "../linear-solver/normal-equation.ts"
// σ→weights 预处理（前置处理子目录，相对路径）
import { sigmaToWeights } from "../pre/validate.ts"
// 向量契约（跨模块，走 @shared 别名 + index.ts 唯一入口）
import type { Vector } from "@shared/math/index.ts"

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
  /** 残差（Float64Array） */
  residuals: Vector
  /** 预测值（Float64Array） */
  predicted: Vector
  /**
   * 协方差矩阵 2×2（自研 Matrix，行主序；matrixGet 取元素）
   * - 元素访问：matrixGet(covariance, 0, 0) = var(slope)
   *   matrixGet(covariance, 1, 1) = var(intercept)
   *   matrixGet(covariance, 0, 1) = matrixGet(covariance, 1, 0) = cov(slope, intercept)
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
  // sigmaY → weights = 1/σ²（共享原语，含长度与正性校验）；y 入口宽容 → 内部 Vector
  const yVec = Float64Array.from(yData)
  const weights = options.sigmaY
    ? sigmaToWeights(options.sigmaY, n, "[linearLeastSquares]：sigmaY")
    : undefined

  // ---------------- 正规方程 ----------------
  // 构造正规方程 (Xᵀ W X) · β = Xᵀ W y，设计矩阵 X = [1, x]
  // gram 库路线：把 X 视作"雅可比"、y 视作"残差"，一次得 XᵀWX 与 XᵀWy
  const designX = matrixFrom2D(xData.map(x => [1, x]))
  const { jtj: XtWX, jtr: XtWy } = buildWeightedNormalEquation(
    designX,
    yVec,
    weights ?? new Float64Array(n).fill(1),
  )

  // 解正规方程：β = (XᵀWX)⁻¹ · XᵀWy（显式求逆：协方差复用同一个逆）
  /** XᵀWX 的逆矩阵 */
  const XtWXInv = matrixInvert(XtWX)
  if (!XtWXInv) {
    throw new Error('设计矩阵奇异（所有 x 相同？）')
  }

  const beta = matrixVecMul(XtWXInv, XtWy)
  const intercept = beta[0]!
  const slope = beta[1]!

  // 残差与 SSE
  const predicted = new Float64Array(n)
  const residuals = new Float64Array(n)
  let sse = 0
  let totalSS = 0

  // 加权均值（用于 R²）：sw = Σw = XᵀWX[0][0]，swy = Σw·y = XᵀWy[0]
  const yMean = XtWy[0]! / matrixGet(XtWX, 0, 0)

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
  const covariance = matrixScalarMul(XtWXInv, sigma2)
  const interceptStdErr = Math.sqrt(Math.max(matrixGet(covariance, 0, 0), 0))
  const slopeStdErr = Math.sqrt(Math.max(matrixGet(covariance, 1, 1), 0))

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
