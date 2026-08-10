/**
 * 数值校验
 */


/**
 * 校验标量为正有限数（> 0 且有限）
 *
 * 适用场景：σ_y（ODR/LM 中权重 w = 1/σ² 要求 σ > 0）、浓度、长度等
 * 物理量。不允许 NaN、Infinity、0、负数。
 *
 * @param v 待校验标量
 * @param name 错误信息中显示的名称
 */
export function isFinitePositive(v: number, name = "value"): void {
  if (!Number.isFinite(v) || v <= 0) {
    throw new Error(`${name} 必须为正有限数：${v}`)
  }
}


/**
 * 校验标量为非负有限数（≥ 0 且有限）
 *
 * 适用场景：σ_x（σ_x = 0 表示 x 精确无误差，ODR 退化为 LM）、时间、
 * 距离等。不允许 NaN、Infinity、负数；0 合法。
 *
 * @param v 待校验标量
 * @param name 错误信息中显示的名称
 */
export function isFiniteNonNegative(v: number, name = "value"): void {
  if (!Number.isFinite(v) || v < 0) {
    throw new Error(`${name} 必须为非负有限数：${v}`)
  }
}