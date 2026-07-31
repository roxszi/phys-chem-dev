/**
 * 线性方程组求解器接口
 *
 * 解 Ax = b。
 *
 * 实现可以是：
 *   - 高斯消元（带主元）
 *   - Cholesky 分解（A 对称正定时最优）
 *   - LU / QR / SVD 分解
 *   - GPU 加速版本（如 tfjs 实现）
 */

export interface LinearSolver {
  /**
   * 解 Ax = b
   *
   * @param A 系数矩阵（n × n）
   * @param b 右侧向量（n 维）
   * @returns 解向量 x；若矩阵奇异返回 null
   */
  solve(A: number[][], b: number[]): number[] | null
}

/**
 * 对称正定矩阵专用求解器接口（如 Cholesky）
 *
 * 标记接口：实现此接口的求解器要求传入的 A 一定是对称正定的，
 * 可以利用这个性质做更快的分解（如 Cholesky 比 LU 快 2 倍）。
 */
export interface SymmetricPositiveDefiniteSolver extends LinearSolver {
  readonly kind: 'spd'
}
