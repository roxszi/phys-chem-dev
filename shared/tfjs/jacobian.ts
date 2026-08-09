/**
 * 基于 tfjs 的 ODR 雅可比计算器（占位接口）
 *
 * ────────────────────────────────────────────────────────────────────
 * 当前实现：直接复用 NumericalODRJacobian（中心差分 + 自适应步长）
 *
 * 真正的自动微分（tf.grads）实现需要：
 *   1. EquationModel.model 支持 tensor 输入（当前签名是 number[]）
 *   2. 或者用户提供独立的 tensor 化 model 函数
 *
 * 这是后续工程化的工作项。当前先用数值差分保证 demo 可跑。
 * ────────────────────────────────────────────────────────────────────
 *
 * 价值：本类暴露的接口与 NumericalODRJacobian 一致，
 * 未来替换为真正的 tfjs 自动微分实现时，业务代码无需改动。
 *
 * 用法：
 *   ```typescript
 *   import { orthogonalDistanceRegression } from '@/fitting/algorithms/odr'
 *   import { createTfjsODRJacobian } from '@/tfjs/tfjs-jacobian'
 *
 *   const result = orthogonalDistanceRegression(fn, init, names, x, y, {
 *     sigmaX, sigmaY,
 *     jacobian: createTfjsODRJacobian(),
 *   })
 *   ```
 */
import type { PredictFnODR } from '../fitting/types.js'
import type { ODRJacobianProvider } from '../fitting/algorithms/odr/types.js'
import {
  NumericalODRJacobian,
  type NumericalODRJacobianOptions,
} from '../fitting/algorithms/odr/numerical-jacobian.js'

/** TfjsODRJacobian 的配置（与 NumericalODRJacobianOptions 一致） */
export type TfjsODRJacobianOptions = NumericalODRJacobianOptions

/**
 * tfjs 兼容的 ODR 雅可比
 *
 * 当前内部直接复用 NumericalODRJacobian（数值差分）。
 * 未来扩展为真正的 tfjs.grads 自动微分时，业务代码无需改动。
 */
export class TfjsODRJacobian implements ODRJacobianProvider {
  private readonly fallback: NumericalODRJacobian

  constructor(options: TfjsODRJacobianOptions = {}) {
    this.fallback = new NumericalODRJacobian(options)
  }

  compute(
    fn: PredictFnODR,
    xCorrected: number[],
    params: Record<string, number>,
    paramNames: string[],
    n: number,
  ): { jBeta: number[][]; d: number[] } {
    // TODO: 检测 tfjs 后端可用 + model 支持 tensor → 走 tf.grads
    // 当前直接用 fallback（与 NumericalODRJacobian 行为一致）
    return this.fallback.compute(fn, xCorrected, params, paramNames, n)
  }
}

/** 工厂函数 */
export function createTfjsODRJacobian(
  options?: TfjsODRJacobianOptions,
): ODRJacobianProvider {
  return new TfjsODRJacobian(options)
}
