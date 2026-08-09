/**
 * bindModel：把 EquationModel 与具体 x 数据绑定成 PredictFn
 *
 * 用途：LM 算法的 PredictFn 签名是 `(params) => number[]`（x 通过闭包绑定）。
 * EquationModel 的 model 签名是 `(x, params) => number[]`（x 显式传递）。
 * bindModel 把两者桥接起来。
 *
 * ODR 算法不需要 bind（直接用 model 即可，因为 ODR 的 x 在迭代中变化）。
 */
import type { EquationModel } from './types.js'
import type { PredictFn } from '../fitting/types.js'

/**
 * 给定 EquationModel + x 数据，烘焙出 PredictFn（LM 用）
 * @param equation 公式模型
 * @param x 自变量数据（与 y 等长）
 * @returns PredictFn：接收参数字典，返回预测值数组
 */
export function bindModel(
  equation: EquationModel<readonly import('./types.js').Parameter<string>[]>,
  x: number[],
): PredictFn {
  return (params: Record<string, number>) => {
    // 把扁平数值包成 FittingParameters 形式（{value, isFixed}）
    const wrapped: Record<string, { value: number; isFixed: boolean }> = {}
    for (const [k, v] of Object.entries(params)) {
      wrapped[k] = { value: v, isFixed: false }
    }
    return equation.model(x, wrapped as never)
  }
}

/**
 * 提取参数名列表（按 parameters 数组顺序）
 *
 * 拟合器要求 paramNames 与初值数组的索引对应。
 */
export function getParamNames(
  equation: EquationModel<readonly import('./types.js').Parameter<string>[]>,
): string[] {
  return equation.parameters.map((p) => p.id)
}

/**
 * 从 equation 的 initialParameters 提取按顺序排列的初值
 *
 * 返回 Record<string, number> 形式（拟合器预期），且跳过 isFixed=true 的参数。
 *
 * @param equation 公式模型
 * @param x 自变量数据
 * @param y 因变量数据
 */
export function getInitialParams(
  equation: EquationModel<readonly import('./types.js').Parameter<string>[]>,
  x: number[],
  y: number[],
): Record<string, number> {
  const fitted = equation.initialParameters
    ? equation.initialParameters(x, y)
    : ({} as Record<string, { value: number; isFixed: boolean }>)

  const out: Record<string, number> = {}
  for (const p of equation.parameters) {
    const val = fitted[p.id]
    if (val && !val.isFixed) {
      out[p.id] = val.value
    } else if (val && val.isFixed) {
      // 定值参数也传入（拟合器锚定用，未来扩展点）
      out[p.id] = val.value
    }
  }
  return out
}
