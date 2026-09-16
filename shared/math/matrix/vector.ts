/**
 * math/matrix - 向量原语（vector.ts）
 * ---
 * 向量类型即 Float64Array（见 types.ts 的 Vector 契约）。
 * 本文件只放业务无关的向量基础操作；拟合专属的向量归约
 * （加权正规方程、SSE 组装等）留在 fitting\ 的业务文件里。
 */

// 数据类型（本目录内部文件，相对路径）
import type { Vector } from "./types.ts"

/**
 * 无穷范数
 * - ‖v‖∞ = maxᵢ |vᵢ|
 * - 无穷范数：即向量或矩阵元素绝对值的最大值或行和最大值，用于衡量其"最大幅度"
 * - 典型用途：拟合收敛判定的梯度无穷范数（JᵀWr 的最大分量绝对值）
 * @param v 向量
 * @returns 最大分量绝对值；空向量为 0
 */
export function getInfNorm(v: Vector): number {
  /** 范数 */
  let norm = 0
  // 遍历向量
  for (let i = 0; i < v.length; i++) {
    /** 元素绝对值 */
    const absV = Math.abs(v[i]!)
    // 更新最大值
    if (absV > norm) {
      norm = absV
    }
  }
  // 返回结果
  return norm
}
