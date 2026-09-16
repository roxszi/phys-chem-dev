/**
 * fitting/pre - 拟合前置处理
 * 内容：validateInputs 输入校验（校验类）+ sigmaToWeights σ→weights 变换（预处理类）
 * 另见同目录 data-shape.ts：原始数据结构 → xData / yData 的结构变换打样，
 * 供 equation 层实现拟合时消费。
 * ---
 * 运行时防线：算法入口泛型的键约束只在编译期存在，编译后消失；
 * 动态路径（fitEquation 合流 / UI 输入 / 脚本调用）组装的参数必须在拟合前专门校验一次。
 * 校验项（一次性合并检查，避免薄函数与重复遍历）：
 *   1. n > 0
 *   2. n > 自由参数数（否则无自由度）
 *   3. xData / yData 长度一致；xData 每行至少 1 个自变量分量
 *   4. paramNames 非空、不重复、每个元素 ∈ initialParams 的键（类型约束的运行时兜底）
 *   5. initialParams 全部键值有限（含固定参数——固定参数也必须是有效数值）
 *   6. fn(initialParams) 返回长度正确
 * 元素级有限性（xData / yData / pred）由下游算法在自己的循环里顺便做，
 * 避免单独的"批量校验"遍历。
 */

// 导入数值校验方法（跨模块，走 @shared 别名 + index.ts 唯一入口）
import { isFinitePositive } from "@shared/math/index.ts"
// 导入数据类型（本模块内部文件，相对路径）
import type { ParamValues, ParamNames, ModelFunction } from "../types.ts"


/**
 * 由标准差数组计算权重数组
 * - sigmaY → weights = 1/σ²（含长度与正性校验）
 * - LM / 线性最小二乘共用；ODR 因需保留 σ 本身（σx=0 → wx=∞ 语义）不使用此原语
 * @param sigmaY y 的标准差数组
 * @param n 数据点数（长度校验基准）
 * @param label 报错文案里的参数名前缀，默认 "sigmaY"
 */
export function sigmaToWeights(sigmaY: number[], n: number, label = "sigmaY"): number[] {
  // 长度校验
  if (sigmaY.length !== n) {
    throw new Error(`${ label } 长度 ${ sigmaY.length } ≠ 数据点数 ${ n }`)
  }
  /** 权重数组 */
  const weights = []
  // 遍历
  for (let i = 0; i < n; i++) {
    /** 标准差 */
    const sigma = sigmaY[i]!
    // 标准差校验
    isFinitePositive(sigma, `${ label }[${ i }]`)
    // 计算权重
    const weight = 1 / (sigma * sigma)
    weights.push(weight)
  }
  // 返回权重数组
  return weights
}


/**
 * 校验拟合输入，返回数据点数 n
 * @param xData 自变量数据（行主序：第 i 行 = 第 i 个样本的自变量向量）
 * @param yData 因变量数据
 * @param paramNames 自由参数名列表（必须是全参数键集合的子集）
 * @param initialParams 全参数初值字典（含固定参数）
 * @param fn 模型函数
 * @returns 数据点数 n
 */
export function validateInputs(
  xData: number[][],
  yData: number[],
  paramNames: ParamNames,
  initialParams: ParamValues,
  fn: ModelFunction,
): number {
  /** 数据长度（行数 = 样本数） */
  const n = xData.length
  // 1. 至少 1 个数据点
  if (n === 0) {
    throw new Error("xData / yData 为空")
  }
  // 2. 数据点数应 > 自由参数个数
  if (n <= paramNames.length) {
    throw new Error(
      `数据点数 ${ n } 必须 > 自由参数个数 ${ paramNames.length }（否则无自由度）`,
    )
  }
  // 3. xData / yData 长度一致（单行检查——不写函数）
  if (yData.length !== n) {
    throw new Error(`xData 与 yData 长度不匹配：${ n } vs ${ yData.length }`)
  }
  // 3.1 每行自变量向量至少 1 个分量（空行 = 模型函数无从取值）
  //     多自变量合法（列数不限），LM 把模型当黑盒天然支持；
  //     仅支持单自变量的算法（如 ODR）在自己的入口额外加“每行长度 = 1”守卫
  for (let i = 0; i < n; i++) {
    if (xData[i]!.length === 0) {
      throw new Error(`xData[${ i }] 是空向量，每个样本至少需要 1 个自变量分量`)
    }
  }
  // 4. paramNames：非空、不重复、每个元素必须在全参数字典里
  if (paramNames.length === 0) {
    throw new Error("paramNames 为空（至少保留一个自由参数参与拟合）")
  }
  const seen = new Set<string>()
  for (const name of paramNames) {
    if (!name) {
      throw new Error("paramNames 包含空字符串")
    }
    if (seen.has(name)) {
      throw new Error(`paramNames 包含重复项：${ name }`)
    }
    if (!(name in initialParams)) {
      throw new Error(`paramNames 中的 ${ name } 不在全参数字典 initialParams 里`)
    }
    seen.add(name)
  }
  // 5. 全参数字典：每个键值都必须是有限数（含固定参数）
  for (const name of Object.keys(initialParams)) {
    /** 参数的初始值 */
    const value = initialParams[name]
    if (!Number.isFinite(value)) {
      throw new Error(`initialParams[${ name }] 不是有限数：${ value }`)
    }
  }
  // 6. fn 返回长度正确（元素级有限性由下游循环顺便校验）
  /** 预测值 */
  const preds = fn(xData, initialParams)
  if (preds.length !== n) {
    throw new Error(
      `预测值长度 ${preds.length} ≠ 数据点数 ${ n }`,
    )
  }
  // 返回数据点数
  return n
}
