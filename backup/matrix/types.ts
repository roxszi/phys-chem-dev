/**
 * 矩阵 / 向量类型定义
 *
 * 设计原则：纯类型 + 工厂函数，不附加任何业务知识。
 * 数值类型选用 number（非 Float32Array）以保持业务接口简洁。
 */

/** 矩阵（p × q 数值数组） */
export type Matrix = number[][]

/** 向量（p 维数值数组） */
export type Vector = number[]


/**
 * 构造 n × n 单位矩阵
 * @param n 维度
 */
export function identityMatrix(n: number): Matrix {
  const m: Matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) m[i]![i] = 1
  return m
}


/**
 * 从矩阵取对角元素为向量
 * @param matrix 输入矩阵
 */
export function getDiagonal(matrix: Matrix): Vector {
  const n = matrix.length
  const diag = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) diag[i] = matrix[i]![i] ?? 0
  return diag
}


/**
 * 由向量构造对角矩阵
 * @param vec 对角元素
 */
export function makeDiagonal(vec: Vector): Matrix {
  const n = vec.length
  const m: Matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) m[i]![i] = vec[i] ?? 0
  return m
}
