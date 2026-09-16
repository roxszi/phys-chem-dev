/**
 * 蔗糖水解动力学
 *
 * 直接测得的物理量：
 * - X：t[] - 时间 t
 * - Y：α_t[] - t 时刻下的旋光度 α_t
 *
 * 锚点观测（性质是"参数直接观测"而非拟合数据点，preprocess 中先消费为初值再分流进 excluded）：
 * - t = 0：α₀ = α(0)，初始旋光度锚点
 * - t = ∞：α∞ = α(∞)，反应达平衡时刻的旋光度锚点
 *
 * 公式（非线性化）：
 * (α_0 - α_∞) / (α_t - α_∞) = exp(kt)
 * ((α_0 - α_∞) / exp(kt)) + α_∞ = α_t
 * - α_0：初始旋光度
 * - α_∞：最终旋光度
 * - k：速率常数
 *
 * 公式（线性化）：
 * ln(α_t - α_∞) = -kt + ln(α_0 - α_∞)
 * - X：t
 * - Y：ln(α_t - α_∞)
 * - 斜率：- k
 */

// 导入公式构建的工厂函数（模块内部文件，相对路径）
import { defineEquation } from "./types.ts"
import type { PreprocessResult } from "./types.ts"
// 导入基础公式（跨模块，走 @shared 别名 + index.ts 唯一入口）
import { getMean } from "@shared/math/index.ts"

/** 公式参数 */
const parameters = [
  {
    id: "alphaInitial", symbol: "α_0", name: "初始旋光度", unit: "",
    typicalRange: [0, 1] as [number, number], description: "初始旋光度"
  },
  {
    id: "alphaEquilibrium", symbol: "α_∞", name: "最终旋光度", unit: "",
    typicalRange: [0, 1] as [number, number], description: "最终旋光度"
  },
  {
    id: "k", symbol: "k", name: "速率常数", unit: "min^-1",
    typicalRange: [0, 1] as [number, number], description: "速率常数"
  },
] as const


/** 蔗糖水解动力学公式 */
export const sucroseHydrolysis = defineEquation({
  id: "kinetics.first-order-equilibrium",
  name: "蔗糖水解动力学（折光法）",
  description: "蔗糖水解动力学（折光法）",
  formulaTex: "\\frac{\\alpha_0 - \\alpha_\\infty}{\\alpha_t - \\alpha_\\infty} = e^{kt}",
  parameters: parameters,

  // ==================== 拟合前处理（纯函数） ====================
  // 验证 → 排序 → 识别锚点（t=0 / t=∞）→ 估初值 → 分流
  // 原始数组只读：所有剔除都发生在新建的数组上，原始数据零污染
  // rawX 行主序：单自变量，每行唯一分量是时间 t
  preprocess: (rawX, rawY): PreprocessResult<typeof parameters> => {
    /** 数据长度（行数 = 样本数） */
    const n = rawX.length
    // 检查数据量
    if (n < 4) {
      throw new Error("数据量不足")
    }
    // 检查 rawX 和 rawY 的长度是否一致
    if (rawY.length !== n) {
      throw new Error("t 和 α 的数据长度不一致")
    }
    // 合并 + 验证（深拷贝到新数组，不动原始数组）
    /** [t, α, 原始索引][] */
    const dataAoa: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      /** t（取每行唯一分量） */
      const t = Number(rawX[i]![0])
      // t 不能是 NaN、不能是负值（Infinity 是合法锚点）
      if (isNaN(t) || t < 0) {
        throw new Error(`第 ${ i + 1 } 行 t 数据有误`)
      }
      /** α */
      const a = Number(rawY[i])
      if (isNaN(a)) {
        throw new Error(`第 ${ i + 1 } 行 α 数据有误`)
      }
      dataAoa.push([t, a, i])
    }
    // 按 t 升序排序
    dataAoa.sort((a, b) => a[0] - b[0])

    /** 未参与拟合的点记录 */
    const excluded: PreprocessResult<typeof parameters>["excluded"] = []

    // ======================== α_0 初值 + t=0 锚点分流 ========================
    /** α_0 */
    let alphaInitial: number
    if (dataAoa[0]![0] === 0) {
      // t=0 的 α 就是 α_0 的直接观测
      alphaInitial = dataAoa[0]![1]
      excluded.push({
        index: dataAoa[0]![2],
        x: 0,
        y: dataAoa[0]![1],
        reason: "t=0 锚点：直接作 α_0 观测，不参与拟合",
      })
      dataAoa.shift()
    } else {
      // 无 t=0 数据：用前两个值做差值插值估算 α_0
      const [t1, a1] = dataAoa[0]!
      const [t2, a2] = dataAoa[1]!
      const slope = (a2 - a1) / (t2 - t1)
      alphaInitial = a1 - slope * t1
    }

    // ======================== α_∞ 初值 + t=∞ 锚点分流 ========================
    /** α_∞ */
    let alphaEquilibrium: number
    /** 当前最后一个数据（t=∞ 锚点若存在必在排序末尾） */
    const last = dataAoa[dataAoa.length - 1]!
    if (last[0] === Infinity) {
      // t=∞ 的 α 就是 α_∞ 的直接观测
      alphaEquilibrium = last[1]
      excluded.push({
        index: last[2],
        x: Infinity,
        y: last[1],
        reason: "t=∞ 锚点：直接作 α_∞ 观测，不参与拟合",
      })
      dataAoa.pop()
    } else {
      // 无 t=∞ 数据：用后两个值做差值插值估算 α_∞
      const [tLast, aLast] = last
      const [tSecondLast, aSecondLast] = dataAoa[dataAoa.length - 2]!
      const slope = (aLast - aSecondLast) / (tLast - tSecondLast)
      alphaEquilibrium = aLast + slope * (tLast - tSecondLast)
    }

    // ======================== k 初值 ========================
    // ln(α_t - α_∞) = -kt + ln(α_0 - α_∞)  =>  k = ln[(α_0 - α_∞)/(α_t - α_∞)] / t
    // 逐点计算后取平均
    /** (α_0 - α_∞) */
    const aDuration = alphaInitial - alphaEquilibrium
    /** kArr */
    const kArr: number[] = []
    for (const [t, a] of dataAoa) {
      /** k */
      const k = Math.log(aDuration / (a - alphaEquilibrium)) / t
      if (isNaN(k)) {
        console.warn(`时间为 ${ t } 的数据有问题`)
        continue
      }
      kArr.push(k)
    }
    /** k均值 */
    const kMean = getMean(kArr)
    // 检查k均值是否有效（不能是NaN）
    if (isNaN(kMean)) {
      throw new Error("k初始化失败")
    }

    // ======================== 拟合数据集（正常点） ========================
    /** 进拟合的 x（行主序：单自变量，每行 [t]） */
    const xData: number[][] = []
    /** 进拟合的 y */
    const yData: number[] = []
    /** 原始索引映射 */
    const indices: number[] = []
    for (const [t, a, i] of dataAoa) {
      xData.push([t])
      yData.push(a)
      indices.push(i)
    }

    return {
      xData,
      yData,
      indices,
      excluded,
      initialParams: {
        alphaInitial,
        alphaEquilibrium,
        k: kMean,
      },
    }
  },

  // ==================== 模型公式（纯函数，扁平参数） ====================
  // xData 行主序：单自变量，每行唯一分量是时间 t
  // ys 返回 Float64Array（ModelFunction 契约）：预分配填充，热路径零转换
  model: (xData, params) => {
    // 接参数（扁平字典）
    const { alphaInitial, alphaEquilibrium, k } = params
    // 检查参数是否初始化
    if (alphaInitial === undefined || alphaEquilibrium === undefined || k === undefined) {
      throw new Error("公式参数没有初始化")
    }
    // 预分配结果向量
    const atArr = new Float64Array(xData.length)
    // 逐行计算（取自变量分量 t）
    for (let i = 0; i < xData.length; i++) {
      // 公式本体：
      // (α_0 - α_∞) / (α_t - α_∞) = exp(kt)
      // =>  α_t = ((α_0 - α_∞) / exp(kt)) + α_∞
      atArr[i] = ((alphaInitial - alphaEquilibrium) / Math.exp(k * xData[i]![0]!)) + alphaEquilibrium
    }
    // 返回结果
    return atArr
  },

})
