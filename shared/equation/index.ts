/**
 * equation - 公式模块
 * ---
 * 1.  最核心的内容就是公式（Equation）：参数元信息 + preprocess 前处理 + model 模型函数
 * 2.  模型函数与 fitting 层的 ModelFunction 契约同构，公式可直接交给拟合算法
 */

// 类型：公式 schema
export type {
  Equation,
  Parameter,
  ParameterInputs,
  PreprocessResult
} from "./types.ts"
// 公式工厂函数
export { defineEquation } from "./types.ts"

// 各类公式集

// 蔗糖水解动力学
export { sucroseHydrolysis } from "./sucrose-hydrolysis.ts"


// ==================== 一键拟合（便捷入口） ====================

// fitting 模块（跨模块，走 @shared 别名 + index.ts 唯一入口）
import type { ParamValues } from "@shared/fitting/index.ts"
import { levenbergMarquardt, orthogonalDistanceRegression } from "@shared/fitting/index.ts"
import type { LevenbergMarquardtResult, ODRResult } from "@shared/fitting/index.ts"
// equation 模块内部文件（相对路径）
import type { Equation, Parameter } from "./types.ts"

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
   * - isFixed=true 的参数不参与迭代（常量），且不消耗自由度
   */
  parameterInputs?: Record<string, { value: number; isFixed: boolean }>

  /** x 的标准差数组（仅 "odr" 算法有效；全为 0 或不传时退化为 LM）。长度对应清洗后的数据 */
  sigmaX?: number[]
  /** y 的标准差数组（weights = 1/σ²）。长度对应清洗后的数据 */
  sigmaY?: number[]
}

/** fitEquation 的返回结果（LM 或 ODR，附前处理元信息） */
export type FitEquationResult =
  | ({ algorithm: "lm"; effectiveX: number[][]; effectiveY: number[]; indices: number[]; excluded: { index: number; x: number; y: number; reason: string }[] } & LevenbergMarquardtResult)
  | ({ algorithm: "odr"; effectiveX: number[][]; effectiveY: number[]; indices: number[]; excluded: { index: number; x: number; y: number; reason: string }[] } & ODRResult)

/**
 * 一键拟合（便捷入口）
 *
 * 流程：preprocess（验证/排序/锚点分流/估初值）→ 参数输入合流（全参数字典 + 自由参数子集）→ LM/ODR
 * - 原始数据只读；后续拟合只用 preprocess 数据包
 * - equation.model 与 fitting 的 ModelFunction 契约同构，直接传入，零适配
 * - 返回值附 indices / excluded，调用方据此对齐图表（无需自行补偿错位）
 *
 * @param equation - 公式
 * @param xData - x 数据（原始；行主序：第 i 行 = 第 i 个样本的自变量向量，
 *                单变量业务可用 fitting/pre/data-shape 的 singleXToRows 包装）
 * @param yData - y 数据（原始）
 * @param options - 拟合配置对象
 */
export function fitEquation(
  equation: Equation<readonly Parameter<string>[]>,
  xData: number[][],
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

  // 2. 参数输入合流：
  //    initialParams（全参数字典）：UI 显式输入 > preprocess 估值
  //    paramNames（自由参数子集）：isFixed = UI 显式 > defaultFixed > false
  /** 全参数初值字典（含固定参数） */
  const initialParams: ParamValues = {}
  /** 自由参数名列表（参与迭代的子集） */
  const paramNames: string[] = []
  for (const p of equation.parameters) {
    const ui = parameterInputs?.[p.id]
    const value = ui?.value ?? pre.initialParams[p.id]
    // 参数值必须是有效数值（无论固定与否）
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`参数 ${ p.id } 未提供有效数值`)
    }
    initialParams[p.id] = value
    const isFixed = ui?.isFixed ?? p.defaultFixed ?? false
    if (!isFixed) {
      paramNames.push(p.id)
    }
  }
  // 至少保留一个自由参数
  if (paramNames.length === 0) {
    throw new Error("所有参数均已固定，没有需要拟合的参数")
  }

  // 3. 拟合（sigmaX / sigmaY 长度对应清洗后的数据）
  if (algorithm === "lm") {
    const r = levenbergMarquardt(
      equation.model,
      initialParams,
      paramNames,
      pre.xData,
      pre.yData,
      { sigmaY },
    )
    return {
      algorithm: "lm",
      ...r,
      effectiveX: pre.xData,
      effectiveY: pre.yData,
      indices: pre.indices,
      excluded: pre.excluded,
    }
  }

  // 默认 ODR（sigmaX 全 0 时自动退化为 LM）
  const r = orthogonalDistanceRegression(
    equation.model,
    initialParams,
    paramNames,
    pre.xData,
    pre.yData,
    { sigmaX, sigmaY },
  )
  return {
    algorithm: "odr",
    ...r,
    effectiveX: pre.xData,
    effectiveY: pre.yData,
    indices: pre.indices,
    excluded: pre.excluded,
  }
}
