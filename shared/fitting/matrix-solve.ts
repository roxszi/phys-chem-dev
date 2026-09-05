/**
 * 线性方程组求解器（ml-matrix LU 实现）
 *
 * LinearSolver 是 LM / ODR 的依赖注入点（可替换为 QR / SVD 等实现）。
 * 类型约定：矩阵参数用 ml-matrix Matrix；向量参数与返回值用 number[]
 * （库惯例：diag() / getRow() 等同样返回 number[]）。
 *
 * 奇异契约：与 inverse.ts 一致——isSingular（精确零）+ 1e-14 主元容差，奇异返回 null。
 */
import { LuDecomposition, Matrix } from "ml-matrix"

/** 主元绝对值低于此阈值视为奇异 */
const SINGULAR_TOLERANCE = 1e-14


/** 线性方程组求解器接口 */
export interface LinearSolver {
  /**
   * 解 A · x = b
   * @returns 解向量；若 A 奇异 / 近奇异返回 null
   */
  solve(A: Matrix, b: number[]): number[] | null
}


/**
 * 高斯消元求解器（ml-matrix 部分主元 LU 路线）
 *
 * 数值稳定、适用范围广（不要求对称正定），是默认选择。
 */
export class GaussianEliminationSolver implements LinearSolver {
  solve(A: Matrix, b: number[]): number[] | null {
    if (A.isEmpty()) return []
    if (!A.isSquare()) {
      throw new Error(`系数矩阵必须是方阵：${A.rows}×${A.columns}`)
    }
    if (b.length !== A.rows) {
      throw new Error(`右端项长度 ${b.length} ≠ 矩阵维度 ${A.rows}`)
    }

    const lu = new LuDecomposition(A)

    // 精确奇异 + 近奇异（1e-14 容差）都返回 null
    if (lu.isSingular()) return null
    for (const pivot of lu.upperTriangularMatrix.diag()) {
      if (Math.abs(pivot) < SINGULAR_TOLERANCE) return null
    }

    // LU 前代 + 回代由库完成：b 作为列向量右乘，结果按行展开
    return lu.solve(Matrix.columnVector(b)).to1DArray()
  }
}


/** 工厂函数：创建默认求解器 */
export function createGaussianEliminationSolver(): LinearSolver {
  return new GaussianEliminationSolver()
}
