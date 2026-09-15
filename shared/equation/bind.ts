/**
 * 拟合任务编排层：把 EquationModel + 数据 + 参数输入态绑定为 fitting 层的直接输入
 *
 * 职责（唯一且薄）：
 *   1. 拆分自由 / 固定参数——isFixed=true 的参数从 paramNames 剔除、闭包绑定常量
 *   2. 提供绑定后的预测函数（fitting 层零感知 isFixed 存在）
 *   3. paramNames 只含自由参数：dof = n − 自由参数数，固定参数不消耗自由度（统计正确）
 */

import type { EquationModel, Parameter } from "./types.ts"

/** 不限定具体参数 id 的公式模型通用形态（bind 层无需感知具体 P） */
type AnyEquationModel = EquationModel<readonly Parameter<string>[]>

/** 绑定产物：fitting 层的直接输入 */
export interface FitBinding {
  /** 自由参数名（拟合器的 paramNames，只含参与迭代的参数） */
  paramNames: string[]
  /** 固定参数值映射（闭包常量） */
  fixedParams: Record<string, number>
  /** 绑定后的预测函数：入参只含自由参数值（LM 用，x 经闭包绑定） */
  predictFn: (freeParams: Record<string, number>) => number[]
  /** ODR 形式预测函数：x 显式传递（ODR 迭代中 x 会修正） */
  predictFnODR: (x: number[], freeParams: Record<string, number>) => number[]
}

/**
 * 把公式模型 + 数据 + 参数输入态绑定为拟合任务
 *
 * @param equation 公式模型
 * @param x 自变量数据（应为 preprocess 清洗后的数据）
 * @param inputs 参数输入态（键与 parameters 的 id 一致；isFixed 缺省视为 false）
 * @throws 参数缺失 / 非有限数值 / 全部参数被固定时抛错
 */
export function bindFitTask(
  equation: AnyEquationModel,
  x: number[],
  inputs: Record<string, { value: number; isFixed: boolean } | undefined>,
): FitBinding {
  const paramNames: string[] = []
  const fixedParams: Record<string, number> = {}

  for (const p of equation.parameters) {
    const input = inputs[p.id]
    if (!input || !Number.isFinite(input.value)) {
      throw new Error(`参数 ${p.id} 未提供有效数值`)
    }
    if (input.isFixed) {
      fixedParams[p.id] = input.value
    } else {
      paramNames.push(p.id)
    }
  }

  if (paramNames.length === 0) {
    throw new Error("所有参数均已固定，没有需要拟合的参数")
  }

  // 闭包绑定固定参数：free 透传 + fixed 常量合并，fitting 层只见扁平数值字典
  const predictFn = (free: Record<string, number>) =>
    equation.model(x, { ...fixedParams, ...free })
  const predictFnODR = (xArr: number[], free: Record<string, number>) =>
    equation.model(xArr, { ...fixedParams, ...free })

  return { paramNames, fixedParams, predictFn, predictFnODR }
}

/**
 * 提取参数名列表（按 parameters 数组顺序，含固定参数）
 * - 用于展示 / 遍历参数元信息；拟合器的 paramNames 应取 FitBinding.paramNames
 */
export function getParamNames(equation: AnyEquationModel): string[] {
  return equation.parameters.map((p) => p.id)
}
