/**
 * 残差与 SSE 通用计算
 *
 * 与拟合算法解耦：只接收 y、yPred、可选权重。
 * 任何最小二乘问题（线性 / 非线性 / ODR）的统计层都可复用。
 */

/**
 * 残差向量 r = y - yPred
 * @param y 观测值
 * @param yPred 预测值
 */
export function residuals(y: number[], yPred: number[]): number[] {
  if (y.length !== yPred.length) {
    throw new Error(`residuals 长度不匹配：y=${y.length}, yPred=${yPred.length}`)
  }
  const n = y.length
  const r = new Array<number>(n)
  for (let i = 0; i < n; i++) r[i] = y[i]! - yPred[i]!
  return r
}

/**
 * 加权 SSE = Σ wᵢ·rᵢ²
 * 不传权重时退化为标准 SSE。
 * @param r 残差向量
 * @param weights 权重数组（与 r 等长）
 */
export function sse(r: number[], weights?: number[]): number {
  const n = r.length
  let s = 0
  if (weights) {
    if (weights.length !== n) {
      throw new Error(`sse: weights 长度 ${weights.length} ≠ residuals 长度 ${n}`)
    }
    for (let i = 0; i < n; i++) s += weights[i]! * r[i]! * r[i]!
  } else {
    for (let i = 0; i < n; i++) s += r[i]! * r[i]!
  }
  return s
}

/**
 * 一次计算残差 + SSE（合并成一次遍历）
 *
 * @param y 观测值
 * @param yPred 预测值
 * @param weights 可选权重
 */
export function residualsAndSse(
  y: number[],
  yPred: number[],
  weights?: number[],
): { r: number[]; sse: number } {
  const n = y.length
  if (yPred.length !== n) {
    throw new Error(`residualsAndSse 长度不匹配：y=${n}, yPred=${yPred.length}`)
  }
  if (weights && weights.length !== n) {
    throw new Error(`residualsAndSse: weights 长度 ${weights.length} ≠ ${n}`)
  }
  const r = new Array<number>(n)
  let s = 0
  for (let i = 0; i < n; i++) {
    const ri = y[i]! - yPred[i]!
    r[i] = ri
    const w = weights ? weights[i]! : 1
    s += w * ri * ri
  }
  return { r, sse: s }
}
