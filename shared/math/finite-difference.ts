/**
 * 有限差分原语
 *
 * 中心差分通用函数：(f(p+h) - f(p-h)) / (2h)
 *
 * 用途：被 fitting/jacobian 和 fitting/algorithms/odr/numerical-jacobian 共用。
 * 抽象：callers 自己负责构造扰动 + 两次 fn 调用；
 *      本函数只做"减法 + 除法 + 错误检查"。
 *
 * 为什么放在 numeric/ 而非 fitting/：
 *   中心差分是数学原语，与"参数"或"x"无关。
 *   fitting/jacobian 决定扰动谁（参数），numerical-jacobian 决定扰动谁（参数 + x）。
 *   它们都用同一个减法原语。
 */


/**
 * 中心差分：计算 (f(p+h) - f(p-h)) / (2h)
 *
 * @param yPlus f(p+h) 的查询结果
 * @param yMinus f(p-h) 的查询结果
 * @param h 步长（必须为正有限数）
 * @returns 差分向量（与 yPlus/yMinus 等长）
 */
export function centralDiff(yPlus: number[], yMinus: number[], h: number): number[] {
  if (h <= 0 || !Number.isFinite(h)) {
    throw new Error(`h 必须为正有限数：${h}`)
  }
  const n = yPlus.length
  if (yMinus.length !== n) {
    throw new Error(`centralDiff: yPlus 长度 ${n} ≠ yMinus 长度 ${yMinus.length}`)
  }
  const result = new Array<number>(n)
  const denom = 2 * h
  for (let i = 0; i < n; i++) {
    result[i] = (yPlus[i]! - yMinus[i]!) / denom
  }
  return result
}
