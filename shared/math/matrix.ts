/** 
 * 矩阵的基础方法
 * ---
 * 此处完全继承 ml-matrix 矩阵库，是对其进行的二次封装
 */

// 导入 ml-matrix 库方法
import { Matrix, LuDecomposition } from "ml-matrix"

/** 奇异值阈值。主元绝对值低于此阈值视为奇异 */
const SINGULAR_TOLERANCE = 1e-14


/**
 * 矩阵求逆
 * - 依赖 ml-matrix 库的 LuDecomposition 方法（LU分解），并做了奇异 / 近奇异检查
 * @param matrix 待求逆方阵
 * @returns 逆矩阵（新 Matrix）；奇异 / 近奇异返回 null
 */
export function getInvertMatrix(matrix: Matrix): Matrix | null {
  // 如果是空矩阵
  if (matrix.isEmpty()) {
    // 直接返回一个 0×0 的空矩阵
    return new Matrix(0, 0)
  }
  // 如果矩阵不是方阵
  if (!matrix.isSquare()) {
    // 则报错
    throw new Error(`[invertMatrix]：仅支持方阵，当前 ${ matrix.rows } × ${ matrix.columns }`)
  }
  // 以LU分解方法处理矩阵
  /** LU分解实例 */
  const lu = new LuDecomposition(matrix)
  // 精确奇异检查（主元为 0）
  if (lu.isSingular()) {
    return null
  }
  // 近奇异检查（主元绝对值过小）
  for (const pivot of lu.upperTriangularMatrix.diag()) {
    if (Math.abs(pivot) < SINGULAR_TOLERANCE) {
      return null
    }
  }
  // 解 A·X = I，复用同一次分解（库的 inverse(A) 内部会再做一次 LU）
  /** 逆矩阵 */
  const invertMatrix = lu.solve(Matrix.eye(matrix.rows))
  // 返回结果
  return invertMatrix
}


/**
 * 拟合参数的协方差矩阵
 * - Cov = σ² × M⁻¹
 * - 注意：ml-matrix 自带的 covariance() 是"数据列间统计协方差"，与此完全不同
 * @param matrix p×p 矩阵（拟合场景通常为 JᵀWJ，Gauss-Newton 近似 Hessian）
 * @param sseSigmaSquared 残差的方差估计
 * @returns 协方差矩阵（新 Matrix）；M 奇异 / 近奇异返回 null
 */
export function getCovarianceMatrix(matrix: Matrix, sseSigmaSquared: number): Matrix | null {
  /** 逆矩阵 */
  const invertMatrix = getInvertMatrix(matrix)
  // 如果逆矩阵奇异 / 近奇异，则返回 null
  if (!invertMatrix) {
    return null
  }
  /** 协方差矩阵 */
  const covarianceMatrix = Matrix.mul(invertMatrix, sseSigmaSquared)
  // 返回结果
  return covarianceMatrix
}


