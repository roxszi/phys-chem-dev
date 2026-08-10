/**
 * 矩阵求逆（Gauss-Jordan 消元 + 部分主元选择）
 *
 * 返回 null 表示矩阵奇异（不可逆），调用方需处理。
 *
 * 算法：
 *   1. 拼接 [A | I]
 *   2. 对每列选主元（部分主元法，提高数值稳定性）
 *   3. 行变换把 A 部分化为单位矩阵，此时 I 部分变为 A⁻¹
 *   4. 若遇到主元为 0（列秩亏），返回 null
 */
import type { Matrix } from "./types.js"


/**
 * 矩阵求逆（高斯-约旦消元 + 部分主元）
 * @param matrix 待求逆方阵
 * @returns 逆矩阵；奇异时返回 null
 */
export function invertMatrix(matrix: Matrix): Matrix | null {
  const n = matrix.length
  if (n === 0) return []
  if (matrix[0]!.length !== n) {
    throw new Error(`invertMatrix 仅支持方阵，当前 ${n}×${matrix[0]!.length}`)
  }

  // 拼接增广矩阵 [A | I]
  const aug: Matrix = matrix.map((row, i) => {
    const identity = new Array<number>(n).fill(0)
    identity[i] = 1
    return [...row, ...identity]
  })

  // 前向消元 + 主元选择
  for (let col = 0; col < n; col++) {
    // 找主元（部分主元法：选绝对值最大的）
    let pivotRow = col
    let maxAbs = Math.abs(aug[col]![col]!)
    for (let row = col + 1; row < n; row++) {
      const abs = Math.abs(aug[row]![col]!)
      if (abs > maxAbs) {
        maxAbs = abs
        pivotRow = row
      }
    }

    // 主元太小 → 奇异
    if (maxAbs < 1e-14) return null

    // 交换行
    if (pivotRow !== col) {
      const tmp = aug[col]!
      aug[col] = aug[pivotRow]!
      aug[pivotRow] = tmp
    }

    // 归一化主元行
    const pivot = aug[col]![col]!
    for (let j = 0; j < 2 * n; j++) {
      aug[col]![j] = aug[col]![j]! / pivot
    }

    // 消去其他行
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row]![col]!
      if (factor === 0) continue
      for (let j = 0; j < 2 * n; j++) {
        aug[row]![j]! -= factor * aug[col]![j]!
      }
    }
  }

  // 提取右半部分作为逆矩阵
  return aug.map((row) => row.slice(n))
}
