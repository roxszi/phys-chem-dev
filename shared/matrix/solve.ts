/**
 * 线性方程组求解器
 *
 * 通用接口 LinearSolver + 默认实现 GaussianEliminationSolver。
 * 高斯消元带部分主元，数值稳定且适用面广（不要求对称正定）。
 *
 * 算法：
 *   1. 拼接增广矩阵 [A | b]
 *   2. 前向消元：每列选最大主元 → 上三角
 *   3. 回代：从最后一行往上解出 x
 */
import type { Matrix, Vector } from './types.js'

/** 线性方程组求解器接口 */
export interface LinearSolver {
  /**
   * 解 A · x = b
   * @returns 解向量；若 A 奇异返回 null
   */
  solve(A: Matrix, b: Vector): Vector | null
}

/**
 * 高斯消元求解器（带部分主元法）
 *
 * 数值稳定、适用范围广（不要求对称正定），是默认选择。
 */
export class GaussianEliminationSolver implements LinearSolver {
  solve(A: Matrix, b: Vector): Vector | null {
    const n = A.length
    if (n === 0) return []
    if (A[0]!.length !== n) {
      throw new Error(`系数矩阵必须是方阵：${n}×${A[0]!.length}`)
    }
    if (b.length !== n) {
      throw new Error(`右端项长度 ${b.length} ≠ 矩阵维度 ${n}`)
    }

    // 拼接增广矩阵（深拷贝，不污染输入）
    const aug: Matrix = A.map((row, i) => [...row, b[i]!])

    // 前向消元
    for (let col = 0; col < n; col++) {
      // 部分主元法
      let pivotRow = col
      let maxAbs = Math.abs(aug[col]![col]!)
      for (let row = col + 1; row < n; row++) {
        const abs = Math.abs(aug[row]![col]!)
        if (abs > maxAbs) {
          maxAbs = abs
          pivotRow = row
        }
      }

      if (maxAbs < 1e-14) return null // 奇异

      if (pivotRow !== col) {
        const tmp = aug[col]!
        aug[col] = aug[pivotRow]!
        aug[pivotRow] = tmp
      }

      const pivot = aug[col]![col]!
      for (let row = col + 1; row < n; row++) {
        const factor = aug[row]![col]! / pivot
        if (factor === 0) continue
        for (let j = col; j <= n; j++) {
          aug[row]![j]! -= factor * aug[col]![j]!
        }
      }
    }

    // 回代
    const x = new Array<number>(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      let s = aug[i]![n]!
      for (let j = i + 1; j < n; j++) {
        s -= aug[i]![j]! * x[j]!
      }
      const diag = aug[i]![i]!
      if (Math.abs(diag) < 1e-14) return null
      x[i] = s / diag
    }

    return x
  }
}

/** 工厂函数：创建默认高斯消元求解器 */
export function createGaussianEliminationSolver(): LinearSolver {
  return new GaussianEliminationSolver()
}
