import type { PredictFn } from './types.js'

/**
 * 残差与损失函数计算（最小二乘专属）
 *
 * 残差定义：rᵢ = yᵢ - fᵢ(p)（observation minus prediction）
 * 损失函数：S = Σrᵢ²（残差平方和 SSE）
 *
 * 残差符号约定会影响后续 Jᵀr 的符号——
 * 因为 ∂rᵢ/∂pⱼ = -∂fᵢ/∂pⱼ，所以梯度 ∇S = -2·Jᵀr，
 * 最终 Gauss-Newton 步是 (JᵀJ) Δp = Jᵀr（正号，负负得正）。
 */

/**
 * 计算残差 r = y - fn(params)
 *
 * @throws 如果 fn 返回长度不匹配
 */
export function computeResiduals(
  fn: PredictFn,
  yData: number[],
  params: Record<string, number>,
): number[] {
  const predicted = fn(params)
  if (predicted.length !== yData.length) {
    throw new Error(
      `fn 返回长度 ${predicted.length} ≠ yData 长度 ${yData.length}`,
    )
  }
  const residuals = new Array<number>(yData.length)
  for (let i = 0; i < yData.length; i++) {
    residuals[i] = yData[i]! - predicted[i]!
  }
  return residuals
}

/**
 * 计算残差平方和 SSE = Σrᵢ²
 *
 * 避免用 reduce + 箭头函数（V8 优化不如手写循环稳定）。
 */
export function computeSSE(residuals: number[]): number {
  let sse = 0
  for (let i = 0; i < residuals.length; i++) {
    const r = residuals[i]!
    sse += r * r
  }
  return sse
}

/**
 * 同时计算残差和 SSE（节省一次 fn 评估的场合）
 */
export function computeResidualsAndSSE(
  fn: PredictFn,
  yData: number[],
  params: Record<string, number>,
): { residuals: number[]; sse: number } {
  const residuals = computeResiduals(fn, yData, params)
  return { residuals, sse: computeSSE(residuals) }
}
