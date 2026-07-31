import type { ParamNames, PredictFn } from './types.js'
import {
  validateSameLength,
  validateMinLength,
  validateFiniteArray,
} from '../base/validate/arrays.js'

/**
 * 拟合输入校验
 *
 * 在拟合开始前一次性完成所有校验，避免运行时中途崩溃。
 * 所有错误都通过 throw 抛出，附带具体数值信息便于定位。
 *
 * 通用校验（数组长度、数值有限性）走 base/validate/arrays.ts，
 * 本文件只处理拟合特有的校验（参数名 / 初始猜测 / fn 返回长度等）。
 */

/**
 * 校验拟合输入，返回数据点数 n
 *
 * @throws 如果任何一项校验失败
 */
export function validateInputs(
  xData: number[],
  yData: number[],
  paramNames: ParamNames,
  initialParams: Record<string, number>,
  fn: PredictFn,
): number {
  const n = xData.length
  const p = paramNames.length

  // 通用校验（来自 base）
  validateSameLength(xData, yData, ['xData', 'yData'])
  validateMinLength(xData, 1, 'xData')
  validateFiniteArray(xData, 'xData')
  validateFiniteArray(yData, 'yData')

  // 拟合特有校验 1：数据点数 >= 参数个数（自由度判据）
  if (n < p) {
    throw new Error(
      `数据点数 (${n}) 不能少于参数个数 (${p})，否则系统欠定`,
    )
  }

  // 拟合特有校验 2：参数名非空且唯一
  const seen = new Set<string>()
  for (let j = 0; j < p; j++) {
    const name = paramNames[j]
    if (!name) {
      throw new Error(`paramNames[${j}] 是空字符串`)
    }
    if (seen.has(name)) {
      throw new Error(`paramNames 有重复：${name}`)
    }
    seen.add(name)
  }

  // 拟合特有校验 3：所有 paramNames 都存在于 initialParams
  for (const name of paramNames) {
    if (initialParams[name] === undefined) {
      throw new Error(`initialParams 缺少参数：${name}`)
    }
    if (!Number.isFinite(initialParams[name])) {
      throw new Error(
        `initialParams[${name}] 不是有限数：${initialParams[name]}`,
      )
    }
  }

  // 拟合特有校验 4：fn 返回长度正确（首次调用作为 sanity check）
  const predicted0 = fn(initialParams)
  if (predicted0.length !== n) {
    throw new Error(
      `fn 返回长度 ${predicted0.length} ≠ 数据点数 ${n}`,
    )
  }

  return n
}
