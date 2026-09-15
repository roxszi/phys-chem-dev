/**
 * equation - 公式模块模型
 * ---
 * 1.  最核心的内容就是公式模型（EquationModel）
 */

// 类型：公式模型schema
export type {
  EquationModel,
  Parameter,
  EquationFunction,
  ParameterInputs,
  PreprocessResult
} from "./types.ts"
// 公式模型工厂函数
export { defineEquationModel } from "./types.ts"

// equation ↔ fitting 桥接（拟合任务编排：isFixed 拆分 / 闭包绑定）
export { bindFitTask, getParamNames } from "./bind.ts"
export type { FitBinding } from "./bind.ts"

// 各类公式集

// 蔗糖水解动力学
export { sucroseHydrolysis } from "./sucrose-hydrolysis.ts"


// ==================== 一键拟合（便捷入口） ====================

import { bindFitTask } from "./bind.ts"
import { levenbergMarquardt, orthogonalDistanceRegression } from "../fitting/index.ts"
import type { LevenbergMarquardtResult, ODRResult } from "../fitting/index.ts"
import type { EquationModel, Parameter } from "./types.ts"

/** fitEquation 选算法 */
export type FitEquationAlgorithm = "lm" | "odr"

/** fitEquation 的配置 */
export interface FitEquationOptions {
  /**
   * 算法选择（默认 "odr"）
   *
   * - "odr"：正交距离回归，σx 全 0 时自动退化为加权 LM
   * - "lm" ：Levenberg-Marquardt，只优化 y 残差
   */
  algorithm?: FitEquationAlgorithm

  /**
   * 用户 / UI 层的参数输入态（可整体省略）
   * - value：省略时取 preprocess 估值；isFixed：省略时取 Parameter.defaultFixed ?? false
   * - isFixed=true 的参数不参与迭代（闭包常量），且不消耗自由度
   */
  parameterInputs?: Record<string, { value: number; isFixed: boolean }>

  /** x 的标准差数组（仅 "odr" 算法有效；全为 0 或不传时退化为 LM）。长度对应清洗后的数据 */
  sigmaX?: number[]
  /** y 的标准差数组（weights = 1/σ²）。长度对应清洗后的数据 */
  sigmaY?: number[]
}

/** fitEquation 的返回结果（LM 或 ODR，附前处理元信息） */
export type FitEquationResult =
  | ({ algorithm: "lm"; effectiveX: number[]; effectiveY: number[]; indices: number[]; excluded: { index: number; x: number; y: number; reason: string }[] } & LevenbergMarquardtResult)
  | ({ algorithm: "odr"; effectiveX: number[]; effectiveY: number[]; indices: number[]; excluded: { index: number; x: number; y: number; reason: string }[] } & ODRResult)

/**
 * 一键拟合（便捷入口）
 *
 * 流程：preprocess（验证/排序/锚点分流/估初值）→ 参数输入合流 → 绑定拟合任务 → LM/ODR
 * - 原始数据只读；后续拟合只用 preprocess 数据包
 * - 返回值附 indices / excluded，调用方据此对齐图表（无需自行补偿错位）
 *
 * @param equation - 公式模型
 * @param xData - x 数据（原始）
 * @param yData - y 数据（原始）
 * @param options - 拟合配置对象
 */
export function fitEquation(
  equation: EquationModel<readonly Parameter<string>[]>,
  xData: number[],
  yData: number[],
  options?: FitEquationOptions,
): FitEquationResult {
  // 解构接收拟合配置参数
  const {
    algorithm = "odr",
    parameterInputs,
    sigmaX,
    sigmaY,
  } = options ?? {}

  // 1. 前处理：验证 → 排序 → 锚点分流 → 估初值（原始数据只读）
  const pre = equation.preprocess(xData, yData)

  // 2. 参数输入合流：UI 显式输入 > preprocess 估值；isFixed：UI 显式 > defaultFixed > false
  const inputs: Record<string, { value: number; isFixed: boolean }> = {}
  for (const p of equation.parameters) {
    const ui = parameterInputs?.[p.id]
    const value = ui?.value ?? pre.initialParams[p.id]
    const isFixed = ui?.isFixed ?? p.defaultFixed ?? false
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`参数 ${ p.id } 已固定但未提供有效数值`)
    }
    inputs[p.id] = { value, isFixed }
  }

  // 3. 绑定拟合任务：isFixed=true 的参数剔除出 paramNames、闭包绑定常量
  const binding = bindFitTask(equation, pre.x, inputs)

  // 4. 自由参数初值（固定参数不进拟合器）
  const initParams: Record<string, number> = {}
  for (const name of binding.paramNames) {
    initParams[name] = inputs[name]!.value
  }

  // 5. 拟合（sigmaX / sigmaY 长度对应清洗后的数据）
  if (algorithm === "lm") {
    const r = levenbergMarquardt(
      binding.predictFn,
      initParams,
      binding.paramNames,
      pre.x,
      pre.y,
      { sigmaY },
    )
    return {
      algorithm: "lm",
      ...r,
      effectiveX: pre.x,
      effectiveY: pre.y,
      indices: pre.indices,
      excluded: pre.excluded,
    }
  }

  // 默认 ODR（sigmaX 全 0 时自动退化为 LM）
  const r = orthogonalDistanceRegression(
    binding.predictFnODR,
    initParams,
    binding.paramNames,
    pre.x,
    pre.y,
    { sigmaX, sigmaY },
  )
  return {
    algorithm: "odr",
    ...r,
    effectiveX: pre.x,
    effectiveY: pre.y,
    indices: pre.indices,
    excluded: pre.excluded,
  }
}
