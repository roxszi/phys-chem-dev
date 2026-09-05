/**
 * 数值校验
 */


/**
 * 正有限数校验
 * - 大于0且有限
 * - 不允许 NaN、Infinity、0、负数
 */
export function isFinitePositive(value: number, name?: string) {
  if ((!Number.isFinite(value)) || (value <= 0)) {
    throw new Error(`[isFinitePositive]：${ name ?? value } 必须为正有限数，目前为 ${ value }`)
  }
  return true
}


/**
 * 非负有限数校验（≥ 0 且有限）
 * - ≥ 0 且有限
 * - 不允许 NaN、Infinity、负数
 * - 0 合法
 */
export function isFiniteNonNegative(value: number, name?: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`[isFiniteNonNegative]：${ name ?? value } 必须为非负有限数，目前为 ${ value }`)
  }
  return true
}
