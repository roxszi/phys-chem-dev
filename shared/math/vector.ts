/**
 * 向量的基础方法
 * ---
 * 这里的向量是 1 维数组 number[]
 */

/**
 * 无穷范数
 * - ‖v‖∞ = maxᵢ |vᵢ|
 * - 无穷范数：即向量或矩阵元素绝对值的最大值或行和最大值，用于衡量其“最大幅度”
 * - 典型用途：拟合收敛判定的梯度无穷范数（JᵀWr 的最大分量绝对值）
 * @param v 向量
 * @returns 最大分量绝对值；空向量为 0
 */
export function getInfNorm(v: number[]): number {
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
