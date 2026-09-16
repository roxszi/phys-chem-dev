/**
 * math/matrix - 矩阵构造与元素访问（construct.ts）
 * ---
 * Matrix 的生命周期入口：从二维数组 / 尺寸规格创建矩阵，
 * 以及元素级 get / set 与形状谓词。全部为基础操作，无业务语义。
 */

// 数据类型（本目录内部文件，相对路径）
import type { Matrix } from "./types.ts"

/**
 * 创建 rows × cols 的全 0 矩阵
 * @param rows 行数（非负整数）
 * @param cols 列数（非负整数）
 */
export function createMatrix(rows: number, cols: number): Matrix {
  return { data: new Float64Array(rows * cols), rows, cols }
}

/**
 * 从二维数组构造（行主序嵌套 → 扁平存储，深拷贝）
 * - 空数组（[]）→ 0 × 0 空矩阵
 * - 锯齿数组（各行长度不一致）→ throw
 * @param source 行主序嵌套数组
 */
export function matrixFrom2D(source: number[][]): Matrix {
  /** 行数（空数组 → 0 行） */
  const rows = source.length
  if (rows === 0) return createMatrix(0, 0)
  // 列数以首行为准，逐行校验长度一致
  const cols = source[0]!.length
  const data = new Float64Array(rows * cols)
  for (let i = 0; i < rows; i++) {
    const row = source[i]!
    if (row.length !== cols) {
      throw new Error(
        `matrixFrom2D：锯齿数组（第 ${ i } 行长度 ${ row.length } ≠ 首行 ${ cols }）`,
      )
    }
    for (let j = 0; j < cols; j++) {
      data[i * cols + j] = row[j]!
    }
  }
  return { data, rows, cols }
}

/**
 * 读元素 m[i][j]
 * @param m 矩阵
 * @param i 行号（0 起）
 * @param j 列号（0 起）
 */
export function matrixGet(m: Matrix, i: number, j: number): number {
  return m.data[i * m.cols + j]!
}

/**
 * 写元素 m[i][j] = v（原地修改）
 */
export function matrixSet(m: Matrix, i: number, j: number, v: number): void {
  m.data[i * m.cols + j] = v
}

/** 是否方阵（rows === cols） */
export function matrixIsSquare(m: Matrix): boolean {
  return m.rows === m.cols
}

/** 是否空矩阵（任一维度为 0） */
export function matrixIsEmpty(m: Matrix): boolean {
  return m.rows === 0 || m.cols === 0
}

/**
 * 转二维数组（行主序嵌套深拷贝；调试 / 序列化用，热路径不消费）
 */
export function matrixTo2D(m: Matrix): number[][] {
  const out: number[][] = Array.from({ length: m.rows }, () => new Array<number>(m.cols).fill(0))
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      out[i]![j] = m.data[i * m.cols + j]!
    }
  }
  return out
}
