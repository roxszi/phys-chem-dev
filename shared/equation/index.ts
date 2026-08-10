/**
 * equation/ - 物化公式模型（EquationModel）
 *
 * 依赖：
 * - fitting/：PredictFn / PredictFnODR / levenbergMarquardt / orthogonalDistanceRegression
 * - 自有 types.ts：EquationModel schema
 *
 * 对外暴露：
 * - 标准公式模型schema及公式工厂函数
 * - 公式模型集合
 * - 一键拟合 fitEquation
 * 
 * 学生视角的极简入口：选择公式 → 录入数据 → fitEquation(eq, x, y) → 拿到结果。
 */

// 公式模型schema
export type {
  EquationModel,
  Parameter,
  LinearizationForm,
  LinearizationTransformResult,
} from "./types.ts"
// 公式模型工厂函数
export { defineEquationModel } from "./types.ts"

// equation ↔ fitting 桥接
export {
  bindModel,
  getParamNames,
  getInitialParams
} from "./bind.ts"

// 各类公式集

// 蔗糖水解动力学
export { sucroseHydrolysis } from "./sucrose-hydrolysis.ts"


// ==================== 一键拟合（便捷入口） ====================

import { bindModel, getParamNames, getInitialParams } from "./bind.ts"
import { levenbergMarquardt, orthogonalDistanceRegression } from "@shared/fitting/index.ts"
import type { EquationModel, Parameter } from "./types.ts"
import type { LevenbergMarquardtResult, ODRResult } from "@shared/fitting/index.ts"

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

  /** x 的标准差数组（仅 "odr" 算法有效；全为 0 或不传时退化为 LM） */
  sigmaX?: number[]
  /** y 的标准差数组（weights = 1/σ²） */
  sigmaY?: number[]
}

/** fitEquation 的返回结果（LM 或 ODR） */
export type FitEquationResult =
  | ({ algorithm: "lm" } & LevenbergMarquardtResult)
  | ({ algorithm: "odr" } & ODRResult)


/**
 * 一键拟合（便捷入口）
 * 
 * @param equation - 公式模型
 * @param xData - x 数据
 * @param yData - y 数据
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
    sigmaX,
    sigmaY
  } = options ?? {}
  
  const paramNames = getParamNames(equation)
  const initParams = getInitialParams(equation, xData, yData)

  if (algorithm === "lm") {
    const fn = bindModel(equation, xData)
    const r = levenbergMarquardt(fn, initParams, paramNames, xData, yData, {
      sigmaY,
    })
    return { algorithm: "lm", ...r }
  }

  // 默认 ODR（sigmaX 全 0 时自动退化为 LM）
  const r = orthogonalDistanceRegression(
    (x, p) => {
      const wrapped: Record<string, { value: number; isFixed: boolean }> = {}
      for (const [k, v] of Object.entries(p)) {
        wrapped[k] = { value: v, isFixed: false }
      }
      return equation.model(x, wrapped as never)
    },
    initParams,
    paramNames,
    xData,
    yData,
    { sigmaX, sigmaY },
  )
  return { algorithm: "odr", ...r }
}
