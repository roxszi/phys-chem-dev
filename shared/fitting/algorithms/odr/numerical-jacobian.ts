/**
 * ODR 数值雅可比（中心差分 + 自适应步长）
 *
 * 同时计算：
 *   - J_β[i][j] = ∂f/∂βⱼ ：对参数的偏导（用于 LM 增广系统的 β 部分）
 *   - d[i]     = ∂f/∂x   ：对自变量的偏导（用于 δ 回代和 Schur 补）
 *
 * 数值公式（中心差分）：
 *   J_β[i][j] ≈ [f(x, β + hⱼeⱼ) − f(x, β − hⱼeⱼ)] / (2hⱼ)
 *   d[i]      ≈ [f(x + hₓe, β) − f(x − hₓe, β)] / (2hₓ)
 *
 * 复用 numeric/finite-difference.ts 的 centralDiff 原语，
 * 但循环结构与 NumericalJacobian 不同（既要扰动参数，也要扰动 x）。
 *
 * 总成本：
 *   - J_β：2p 次 fn 调用（每次 fn 内部通常 O(n)）→ O(p·n)
 *   - d：每个 x_i 单独扰动，n 次循环 × 2 次 fn × O(n) = O(n²)
 *   - 合计主导项：O(n² + p·n)
 *
 * n² 来自 d 的逐点扰动——教学场景 n < 1000 完全够用，
 * 但仪器连续采样（n ~ 1e4+）时会显著变慢。
 * 高维场景的优化路径：
 *   1. 解析偏导：在 EquationModel 增加 modelDerivativeX?: (x, p) => number[]
 *   2. tfjs 自动微分：用 tf.grads 替代数值差分
 */
import type { PredictFnODR } from '../../types.js'
import type { ODRJacobianProvider } from './types.js'
import { centralDiff } from '../../../math/finite-difference.js'

export interface NumericalODRJacobianOptions {
  /**
   * 参数相对步长（默认 1e-6）
   */
  relativeStep?: number
  /**
   * x 的相对步长（默认 1e-6）
   *
   * 注意：x 的步长与参数的步长独立，因为它们可能有不同的典型尺度。
   */
  relativeStepX?: number
  /** 参数典型尺度（跨尺度参数模型推荐提供） */
  typicalValues?: Record<string, number>
}

/** ODR 数值雅可比（中心差分 + 自适应步长，对参数 + x） */
export class NumericalODRJacobian implements ODRJacobianProvider {
  constructor(
    private readonly options: NumericalODRJacobianOptions = {},
  ) {}

  compute(
    fn: PredictFnODR,
    xCorrected: number[],
    params: Record<string, number>,
    paramNames: string[],
    n: number,
  ): { jBeta: number[][]; d: number[] } {
    const relativeStep = this.options.relativeStep ?? 1e-6
    const relativeStepX = this.options.relativeStepX ?? 1e-6
    const typicalValues = this.options.typicalValues ?? {}

    if (relativeStep <= 0 || !Number.isFinite(relativeStep)) {
      throw new Error(`relativeStep 必须为正有限数：${relativeStep}`)
    }
    if (relativeStepX <= 0 || !Number.isFinite(relativeStepX)) {
      throw new Error(`relativeStepX 必须为正有限数：${relativeStepX}`)
    }

    const p = paramNames.length
    if (p === 0) throw new Error('没有需要拟合的参数')

    // ── 第 1 步：计算 J_β[i][j]（对参数的偏导） ──
    const jBeta: number[][] = Array.from({ length: n }, () =>
      new Array<number>(p).fill(0),
    )

    const paramsTrial: Record<string, number> = { ...params }

    for (let j = 0; j < p; j++) {
      const paramName = paramNames[j]!
      if (!paramName) throw new Error(`paramNames[${j}] 为空字符串`)
      const paramValue = params[paramName]
      if (paramValue === undefined) {
        throw new Error(`参数 ${paramName} 不存在于 params`)
      }

      const scale = Math.max(
        Math.abs(paramValue),
        typicalValues[paramName] ?? 0,
        1,
      )
      const h = relativeStep * scale

      paramsTrial[paramName] = paramValue + h
      const yPlus = fn(xCorrected, paramsTrial)
      if (yPlus.length !== n) {
        throw new Error(`fn(β+${paramName}) 返回长度 ${yPlus.length} ≠ ${n}`)
      }

      paramsTrial[paramName] = paramValue - h
      const yMinus = fn(xCorrected, paramsTrial)
      if (yMinus.length !== n) {
        throw new Error(`fn(β-${paramName}) 返回长度 ${yMinus.length} ≠ ${n}`)
      }

      paramsTrial[paramName] = paramValue

      // 第 j 列差分（调 numeric/finite-difference 原语）
      const col = centralDiff(yPlus, yMinus, h)
      for (let i = 0; i < n; i++) {
        jBeta[i]![j] = col[i]!
      }
    }

    // ── 第 2 步：计算 d[i]（对 x 的偏导） ──
    // 对每个 x_i 单独扰动。批量扰动也可（向量化），但 JS 数组循环即可。
    const d = new Array<number>(n).fill(0)
    const xTrial = xCorrected.slice()

    for (let i = 0; i < n; i++) {
      const xi = xCorrected[i]!
      const h = relativeStepX * Math.max(Math.abs(xi), 1)

      xTrial[i] = xi + h
      const yPlus = fn(xTrial, params)
      if (yPlus.length !== n) {
        throw new Error(`fn(x+${i}) 返回长度 ${yPlus.length} ≠ ${n}`)
      }

      xTrial[i] = xi - h
      const yMinus = fn(xTrial, params)
      if (yMinus.length !== n) {
        throw new Error(`fn(x-${i}) 返回长度 ${yMinus.length} ≠ ${n}`)
      }

      xTrial[i] = xi

      // 同样是中心差分，但只取第 i 个分量
      const col = centralDiff(yPlus, yMinus, h)
      d[i] = col[i]!
    }

    return { jBeta, d }
  }
}

/** 工厂函数：默认 ODR 数值雅可比 */
export function createNumericalODRJacobian(
  options?: NumericalODRJacobianOptions,
): ODRJacobianProvider {
  return new NumericalODRJacobian(options)
}
