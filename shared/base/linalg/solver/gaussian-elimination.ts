import type { LinearSolver } from './types.js'

/**
 * 高斯消元法（带部分主元选取）
 *
 * 解 Ax = b。如果矩阵奇异（最大主元 < 1e-15），返回 null。
 *
 * 部分主元选取（partial pivoting）：
 *   每次消元前在当前列中找绝对值最大的行作为主元，
 *   通过行交换把它换到对角线位置。避免小主元带来的数值不稳定。
 *
 * 复杂度：O(n³)，对 p < 50 的小矩阵足够快。
 *
 * 注意：对于 LM 的正规方程 (JᵀJ + λD)，由于矩阵是对称正定的，
 * 更优选择是 Cholesky 分解（速度 2 倍）。本实现作为通用备选。
 */
export class GaussianEliminationSolver implements LinearSolver {
  solve(A: number[][], b: number[]): number[] | null {
    const n = b.length
    if (n === 0) return []
    if (A.length !== n || A[0]!.length !== n) {
      throw new Error(
        `矩阵维度不匹配：A 是 ${A.length}×${A[0]?.length}, b 是 ${n} 维`,
      )
    }

    // 创建副本避免修改原始数据（外部可能还要用 A）
    const a: number[][] = A.map((row) => [...row])
    const x: number[] = [...b]

    // ── 前向消元（带部分主元） ──
    for (let col = 0; col < n; col++) {
      // 在当前列 col 中，从行 col 到行 n-1 找绝对值最大的行
      let maxRow = col
      let maxVal = Math.abs(a[col]![col]!)
      for (let row = col + 1; row < n; row++) {
        const val = Math.abs(a[row]![col]!)
        if (val > maxVal) {
          maxRow = row
          maxVal = val
        }
      }

      // 主元太小，矩阵奇异
      if (maxVal < 1e-15) return null

      // 交换行
      if (maxRow !== col) {
        ;[a[col], a[maxRow]] = [a[maxRow]!, a[col]!]
        ;[x[col], x[maxRow]] = [x[maxRow]!, x[col]!]
      }

      // 用主元行消去下方所有行
      const pivot = a[col]![col]!
      for (let row = col + 1; row < n; row++) {
        const factor = a[row]![col]! / pivot
        if (factor === 0) continue

        a[row]![col] = 0
        for (let k = col + 1; k < n; k++) {
          a[row]![k]! -= factor * a[col]![k]!
        }
        x[row]! -= factor * x[col]!
      }
    }

    // ── 回代 ──
    const result = new Array<number>(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      let sum = x[i]!
      for (let j = i + 1; j < n; j++) {
        sum -= a[i]![j]! * result[j]!
      }
      result[i] = sum / a[i]![i]!
    }

    return result
  }
}

/** 工厂函数 */
export function createGaussianEliminationSolver(): LinearSolver {
  return new GaussianEliminationSolver()
}
