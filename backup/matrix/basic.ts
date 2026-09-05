/**
 * 矩阵基础运算
 * 
 * 每个函数返回新矩阵，不修改输入。
 * 性能权衡：对物化实验教学场景（n < 1000, p < 10），CPU 实现足够。
 * 高维 / 大数据场景可得换 typed array 实现。
 */
import type { Matrix, Vector } from "./types.js"


/**
 * 矩阵数乘（返回新矩阵）
 * @param matrix 输入矩阵
 * @param factor 标量因子
 */
export function scaleMatrix(matrix: Matrix, factor: number): Matrix {
  return matrix.map((row) => (
    row.map((v) => v * factor)
  ))
}


/**
 * 矩阵转置
 * @param matrix 输入矩阵
 */
export function transposeMatrix(matrix: Matrix): Matrix {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const result: Matrix = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  )
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j]![i] = matrix[i]![j] ?? 0
    }
  }
  return result
}


/**
 * 矩阵 × 向量
 * @param matrix n×p 矩阵
 * @param vec p 维向量
 */
export function matVec(matrix: Matrix, vec: Vector): Vector {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (vec.length !== cols) {
    throw new Error(
      `matVec 维度不匹配：矩阵 ${rows}×${cols}，向量 ${vec.length}`,
    )
  }
  const result = new Array<number>(rows).fill(0)
  for (let i = 0; i < rows; i++) {
    let s = 0
    const row = matrix[i]!
    for (let j = 0; j < cols; j++) s += row[j]! * vec[j]!
    result[i] = s
  }
  return result
}


/**
 * 矩阵 × 矩阵
 * @param a 左矩阵
 * @param b 右矩阵
 */
export function matMat(a: Matrix, b: Matrix): Matrix {
  const rowsA = a.length
  const colsA = a[0]?.length ?? 0
  const colsB = b[0]?.length ?? 0
  if (b.length !== colsA) {
    throw new Error(
      `matMat 维度不匹配：A ${rowsA}×${colsA}，B ${b.length}×${colsB}`,
    )
  }
  const result: Matrix = Array.from({ length: rowsA }, () =>
    new Array<number>(colsB).fill(0),
  )
  for (let i = 0; i < rowsA; i++) {
    for (let k = 0; k < colsA; k++) {
      const a_ik = a[i]![k]!
      if (a_ik === 0) continue
      for (let j = 0; j < colsB; j++) {
        result[i]![j]! += a_ik * b[k]![j]!
      }
    }
  }
  return result
}
