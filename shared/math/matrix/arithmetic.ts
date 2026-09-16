/**
 * math/matrix - 矩阵算术运算（arithmetic.ts）
 * ---
 * 只实现项目实际消费的算术子集：标量乘（协方差组装 σ²·M⁻¹）
 * 与矩阵 × 向量（闭式解 β = M⁻¹·b）。
 */

// 数据类型（本目录内部文件，相对路径）
import type { Matrix, Vector } from "./types.ts"

/**
 * 标量乘（新矩阵）：k · M
 * @param m 矩阵
 * @param k 标量乘数
 * @returns 新 Matrix（不修改 m）
 */
export function matrixScalarMul(m: Matrix, k: number): Matrix {
  /** 结果数据（逐元素乘 k） */
  const data = new Float64Array(m.data.length)
  for (let i = 0; i < data.length; i++) {
    data[i] = m.data[i]! * k
  }
  return { data, rows: m.rows, cols: m.cols }
}

/**
 * 矩阵 × 向量（列向量右乘）：y = M·v
 * @param m 矩阵（rows × cols）
 * @param v 向量（长度 = cols）
 * @returns 结果向量（长度 = rows）
 */
export function matrixVecMul(m: Matrix, v: Vector): Vector {
  // 形状防御：向量长度必须等于列数
  if (v.length !== m.cols) {
    throw new Error(`matrixVecMul：向量长度 ${ v.length } ≠ 矩阵列数 ${ m.cols }`)
  }
  /** 结果向量 */
  const out = new Float64Array(m.rows)
  // 逐行点积（行主序下第 i 行数据连续，缓存友好）
  for (let i = 0; i < m.rows; i++) {
    let s = 0
    const base = i * m.cols
    for (let j = 0; j < m.cols; j++) {
      s += m.data[base + j]! * v[j]!
    }
    out[i] = s
  }
  return out
}
