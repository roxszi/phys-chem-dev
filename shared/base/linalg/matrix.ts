/**
 * 通用矩阵运算工具
 *
 * 不依赖任何外部线性代数库，纯 TypeScript 实现。
 * 适用于小矩阵（p < 100）。大矩阵场景建议换成专门的线性代数库。
 */

/**
 * 矩阵求逆（高斯-约旦消元法）
 *
 * @param matrix 方阵 A
 * @returns 逆矩阵 A⁻¹；若矩阵奇异返回 null
 */
export function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length
  if (n === 0) return []
  if (matrix[0]!.length !== n) {
    throw new Error(
      `invertMatrix 要求方阵，得到 ${n}×${matrix[0]!.length}`,
    )
  }

  // 构造增广矩阵 [A | I]
  const augmented: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ])

  for (let col = 0; col < n; col++) {
    // 部分主元选取
    let maxRow = col
    let maxVal = Math.abs(augmented[col]![col]!)
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(augmented[row]![col]!)
      if (val > maxVal) {
        maxRow = row
        maxVal = val
      }
    }

    if (maxVal < 1e-15) return null

    if (maxRow !== col) {
      ;[augmented[col], augmented[maxRow]] = [
        augmented[maxRow]!,
        augmented[col]!,
      ]
    }

    // 归一化主元行
    const pivot = augmented[col]![col]!
    for (let j = 0; j < 2 * n; j++) {
      augmented[col]![j]! /= pivot
    }

    // 消去其他行
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = augmented[row]![col]!
      if (factor === 0) continue
      for (let j = 0; j < 2 * n; j++) {
        augmented[row]![j]! -= factor * augmented[col]![j]!
      }
    }
  }

  return augmented.map((row) => row.slice(n))
}

/**
 * 矩阵 × 标量
 *
 * 不修改原矩阵，返回新矩阵。
 */
export function scaleMatrix(matrix: number[][], scalar: number): number[][] {
  return matrix.map((row) => row.map((v) => v * scalar))
}

/**
 * 提取矩阵的对角元素
 */
export function getDiagonal(matrix: number[][]): number[] {
  const n = Math.min(matrix.length, matrix[0]?.length ?? 0)
  const diag = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    diag[i] = matrix[i]![i]!
  }
  return diag
}

/**
 * 构造对角矩阵
 */
export function makeDiagonal(values: number[]): number[][] {
  const n = values.length
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  )
  for (let i = 0; i < n; i++) {
    matrix[i]![i] = values[i]!
  }
  return matrix
}
