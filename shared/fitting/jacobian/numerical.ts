/**
 * 数值雅可比（中心差分 + 自适应步长）
 *
 * 数学公式：
 *   J[i][j] = ∂yᵢ/∂pⱼ ≈ [f(p + hⱼ·eⱼ) − f(p − hⱼ·eⱼ)] / (2·hⱼ)
 *
 * 自适应步长：
 *   hⱼ = relativeStep × max(|pⱼ|, typicalValueⱼ, 1)
 *
 * 中心差分 vs 前向差分：
 *   - 前向 O(h) 误差阶，最优 h ≈ √ε ≈ 1.5e-8
 *   - 中心 O(h²) 误差阶，最优 h ≈ ε^(1/3) ≈ 6e-6（更大，舍入误差更小）
 *
 * 自适应步长的必要性：
 *   固定步长对跨尺度参数（如 A=10⁴ 和 K=10⁻⁶ 同时拟合）几乎一定挂。
 *   每个参数按自己的尺度计算绝对步长才能稳健。
 */
import type { PredictFn, ParamNames } from '../types.js'
import type { JacobianProvider } from './types.js'
import { centralDiff } from '../../numeric/finite-difference.js'

export interface NumericalJacobianOptions {
  /**
   * 相对步长（默认 1e-6）
   *
   * 中心差分最优值约为 ε^(1/3) ≈ 6×10⁻⁶（ε 为机器精度），
   * 工程上取 1e-6 比较稳。
   */
  relativeStep?: number

  /**
   * 参数典型尺度（可选）
   *
   * 跨尺度参数模型推荐提供。
   * 例如 { A: 1e4, K: 1e-6 } 让不同参数使用不同绝对步长。
   */
  typicalValues?: Record<string, number>
}

/** 数值雅可比（中心差分 + 自适应步长） */
export class NumericalJacobian implements JacobianProvider {
  constructor(private readonly options: NumericalJacobianOptions = {}) {}

  compute(
    fn: PredictFn,
    params: Record<string, number>,
    paramNames: ParamNames,
    n: number,
  ): number[][] {
    const relativeStep = this.options.relativeStep ?? 1e-6
    const typicalValues = this.options.typicalValues ?? {}

    if (relativeStep <= 0 || !Number.isFinite(relativeStep)) {
      throw new Error(`relativeStep 必须为正有限数，当前为 ${relativeStep}`)
    }

    const p = paramNames.length
    if (p === 0) throw new Error('没有需要拟合的参数')

    // 初始化雅可比矩阵 [n × p]
    const jacobian: number[][] = Array.from({ length: n }, () =>
      new Array<number>(p).fill(0),
    )

    const paramsTrial: Record<string, number> = { ...params }

    for (let j = 0; j < p; j++) {
      const paramName = paramNames[j]
      if (!paramName) throw new Error(`paramNames[${j}] 不能为空字符串`)

      const paramValue = params[paramName]
      if (paramValue === undefined) {
        throw new Error(`参数 ${paramName} 不存在于 params`)
      }

      // 自适应绝对步长
      const scale = Math.max(
        Math.abs(paramValue),
        typicalValues[paramName] ?? 0,
        1,
      )
      const h = relativeStep * scale

      // 前向扰动
      paramsTrial[paramName] = paramValue + h
      const yPlus = fn(paramsTrial)
      if (yPlus.length !== n) {
        throw new Error(`fn(p + ${paramName}) 返回长度 ${yPlus.length} ≠ 预期 ${n}`)
      }

      // 后向扰动
      paramsTrial[paramName] = paramValue - h
      const yMinus = fn(paramsTrial)
      if (yMinus.length !== n) {
        throw new Error(`fn(p - ${paramName}) 返回长度 ${yMinus.length} ≠ 预期 ${n}`)
      }

      paramsTrial[paramName] = paramValue

      // 第 j 列差分（调 numeric/finite-difference 原语）
      const col = centralDiff(yPlus, yMinus, h)
      for (let i = 0; i < n; i++) {
        jacobian[i]![j] = col[i]!
      }
    }

    return jacobian
  }
}

/** 工厂函数：默认数值雅可比 */
export function createNumericalJacobian(
  options?: NumericalJacobianOptions,
): JacobianProvider {
  return new NumericalJacobian(options)
}
