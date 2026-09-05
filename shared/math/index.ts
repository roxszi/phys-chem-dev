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

