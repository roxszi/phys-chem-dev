/**
 * math - 基础数学模块
 * ---
 * 主要包括：
 * - array - 各类数组方法
 * - matrix - 矩阵相关方法（继承自ml-matrix库的二次封装）
 * - validate - 各类数值有效性校验
 * @note 出于性能与耦合冗余考虑，该模块不应涉及数据验证，默认均为有效number类型
 */

// 导出数组相关函数
export {
  sortArr,
} from "./array.ts"

// 导出基础统计相关函数
export {
  getSum,
  getMean,
  getMedian,
  getMAD,
  getPercentile,
  getRSquared,
  getRMSE,
  getREArr,
  getSSE,
  getSSESigmaSquared,
} from "./statistics.ts"

// 导出矩阵相关函数
export {
  getInvertMatrix,
  getCovarianceMatrix,
} from "./matrix.ts"

// 导出数值校验函数
export {
  isFinitePositive,
  isFiniteNonNegative
} from "./validate.ts"



/**
 * 残差方差估计 σ² = SSE / max(dof, 1)
 *
 * 注：dof 计算 `n - p` 直接写在这里——不值得为单行减法做函数。
 * @param sse SSE
 * @param n 观测数
 * @param p 参数数
 */
export function sigma2(sse: number, n: number, p: number): number {
  return sse / Math.max(Math.max(n - p, 0), 1)
}


/**
 * 梯度无穷范数 = max_j |grad[j]|
 * @param grad 梯度向量
 */
export function gradientNorm(grad: number[]): number {
  let n = 0
  for (let j = 0; j < grad.length; j++) {
    const absV = Math.abs(grad[j]!)
    if (absV > n) n = absV
  }
  return n
}



