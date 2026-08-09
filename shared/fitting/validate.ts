/**
 * 拟合输入校验（统一入口）
 *
 * 在拟合开始前校验所有输入，提前抛错避免迭代中数值异常。
 */
import type { PredictFn, DataArray, ParamNames } from './types.js'
import {
  validateSameLength,
  validateFiniteArray,
} from '../base/array-validation.js'

/**
 * 校验拟合输入，返回数据点数 n
 *
 * @param xData 自变量数组
 * @param yData 因变量数组
 * @param paramNames 参数名列表
 * @param initialParams 初始参数
 * @param fn 预测函数（接收参数字典，返回预测值数组）
 * @returns 数据点数 n
 */
export function validateInputs(
  xData: DataArray,
  yData: DataArray,
  paramNames: ParamNames,
  initialParams: Record<string, number>,
  fn: PredictFn,
): number {
  // 1. x, y 长度一致
  validateSameLength(xData, yData, 'xData', 'yData')

  const n = xData.length

  // 2. 至少 1 个数据点
  if (n === 0) {
    throw new Error('xData / yData 为空')
  }

  // 3. 数据点数 > 参数个数（否则不能拟合）
  if (n <= paramNames.length) {
    throw new Error(
      `数据点数 ${n} 必须 > 参数个数 ${paramNames.length}（否则无自由度）`,
    )
  }

  // 4. 数据有限
  validateFiniteArray(xData, 'xData')
  validateFiniteArray(yData, 'yData')

  // 5. 参数名不重复
  const seen = new Set<string>()
  for (const name of paramNames) {
    if (!name) throw new Error('paramNames 包含空字符串')
    if (seen.has(name)) throw new Error(`paramNames 包含重复项：${name}`)
    seen.add(name)
  }

  // 6. 初始参数齐全
  for (const name of paramNames) {
    const v = initialParams[name]
    if (v === undefined) {
      throw new Error(`initialParams 缺少参数：${name}`)
    }
    if (!Number.isFinite(v)) {
      throw new Error(`initialParams[${name}] 不是有限数：${v}`)
    }
  }

  // 7. fn 返回长度正确
  const pred = fn(initialParams)
  if (pred.length !== n) {
    throw new Error(
      `fn(initialParams) 返回长度 ${pred.length} ≠ 数据点数 ${n}`,
    )
  }
  validateFiniteArray(pred, 'fn(initialParams)')

  return n
}
