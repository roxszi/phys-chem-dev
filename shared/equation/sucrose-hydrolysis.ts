/**
 * 蔗糖水解动力学
 * 
 * 直接测得的物理量：
 * - X：t[] - 时间 t
 * - Y：α_t[] - t 时刻下的旋光度 α_t
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

// 导入公式构建的工厂函数
import { defineEquationModel } from "./types.js"
// 导入基础公式
import { mean } from "@/shared/math/index.js"

/** 公式参数 */
const parameters = [
  {
    id: "alphaInitial", symbol: "α_0", name: "初始旋光度", unit:"",
    typicalRange: [0, 1] as [number, number], description: "初始旋光度"
  },
  {
    id: "alphaEquilibrium", symbol: "α_∞", name: "最终旋光度", unit:"",
    typicalRange: [0, 1] as [number, number], description: "最终旋光度"
  },
  {
    id: "k", symbol: "k", name: "速率常数", unit: "min^-1",
    typicalRange: [0, 1] as [number, number], description: "速率常数"
  },
] as const


/** 蔗糖水解动力学公式 */
export const sucroseHydrolysis = defineEquationModel({
  id: "kinetics.first-order-equilibrium",
  name: "蔗糖水解动力学（折光法）",
  description: "蔗糖水解动力学（折光法）",
  formulaTex: "\\frac{\\alpha_0 - \\alpha_\\infty}{\\alpha_t - \\alpha_\\infty} = e^{kt}",
  parameters: parameters,

  // 数据验证
  validateData: (tArr, aArr) => {
    /** 数据长度 */
    const n = tArr.length
    // 检查数据量
    if (n < 4) {
      throw new Error("数据量不足")
    }
    // 检查tArr和aArr的长度是否一致
    if (aArr.length !== n) {
      throw new Error("t 和 α 的数据长度不一致")
    }
    // 合并为AOA二维数组（深拷贝）
    /** dataAoa二维数组，[t, α, i][] */
    const dataAoa = new Array<[number, number, number]>(n)
    // 遍历验证 + 赋值
    for (let i = 0; i < n; i++) {
      /** t */
      const t = Number(tArr[i])
      // 检查t是否有效（不能是NaN，不能是负值）
      if (isNaN(t) || t < 0) {
        throw new Error(`第 ${ i + 1 } 行 t 数据有误`)
      }
      /** α */
      const a = Number(aArr[i])
      // 检查α是否有效（不能是NaN）
      if (isNaN(a)) {
        throw new Error(`第 ${ i + 1 } 行 α 数据有误`)
      }
      // 赋值
      dataAoa[i] = [t, a, i]
    }
    // 按t从小到大排序
    dataAoa.sort((a, b) => a[0] - b[0])
    // 返回结果
    return dataAoa
  },

  // 参数初始化
  initialParameters: (tArr, aArr) => {
    // 先验证数据，并获取AOA二维数组
    /** AOA二维数组，[t, a, i][] */
    const dataAoaSorted = sucroseHydrolysis.validateData(tArr, aArr)
    
    // ======================== 初始化 aZero（α_∞） ========================
    // 如果 t0 为 0，则第一个值就是 α_0；否则，用前两个值做差值计算得到 α_0
    /** α_0 */
    let alphaInitial: number
    // 如果 t0 为 0，则第一个值就是 α_0
    if (dataAoaSorted[0]![0] === 0) {
      // 赋值
      alphaInitial = dataAoaSorted[0]![1]
      // 删除 0 时刻数据
      const splicedIndex = dataAoaSorted[0]![2]
      tArr.splice(splicedIndex, 1)
      aArr.splice(splicedIndex, 1)
      dataAoaSorted.shift()
    // 否则，用前两个值做差值计算
    } else {
      // 取前两个数据
      const [t1, a1] = dataAoaSorted[0]!
      const [t2, a2] = dataAoaSorted[1]!
      // 计算斜率
      const slope = (a2 - a1) / (t2 - t1)
      // 插值法计算α_0
      alphaInitial = a1 - slope * t1
    }

    // ======================== 初始化 aMax（α_∞） ========================
    // 如果最后一个 t 为 infinte，则最后一组数据就是 α_∞；否则，用后两个值做差值计算
    /** α_∞ */
    let alphaEquilibrium: number
    // 取后两个数据
    const dataAoaSortedLastIndex = dataAoaSorted.length - 1
    const [tLast, aLast] = dataAoaSorted[dataAoaSortedLastIndex]!
    // 如果最后一个 t 为 infinte，则最后一组数据就是 α_∞
    if (tLast === Infinity) {
      // 赋值
      alphaEquilibrium = aLast
      // 从原始数组里删除 infinte 时刻数据
      const splicedIndex = dataAoaSorted[dataAoaSortedLastIndex]![2]
      tArr.splice(splicedIndex, 1)
      aArr.splice(splicedIndex, 1)
      dataAoaSorted.pop()
    // 否则，用后两个值做差值计算
    } else {
      // 倒数第二组数据
      const [tSecondLast, aSecondLast] = dataAoaSorted[dataAoaSortedLastIndex - 1]!
      // 计算斜率
      const slope = (aLast - aSecondLast) / (tLast - tSecondLast)
      // 插值法计算α_∞
      alphaEquilibrium = aLast + slope * (tLast - tSecondLast)
    }
    // ======================== 初始化 k ========================
    // ln(α_t - α_∞) = -kt + ln(α_0 - α_∞)
    //   => k = ln[(α_0 - α_∞)/(α_t - α_∞)] / t
    // 先遍历计算，再求平均
    /** kArr */
    const kArr = []
    /** (α_0 - α_∞) */
    const aDuration = alphaInitial - alphaEquilibrium
    // 遍历计算
    forEachData: for (let i = 0; i < dataAoaSorted.length; i++) {
      // 取数据
      const [t, a] = dataAoaSorted[i]!
      /** k */
      const k = Math.log(aDuration / (a - alphaEquilibrium)) / t
      // 检查k是否有效（不能是NaN）
      if (isNaN(k)) {
        console.warn(`时间为 ${ t } 的数据有问题`)
        continue forEachData
      }
      // 赋值
      kArr.push(k)
    }
    /** k均值 */
    const kMean = mean(kArr)
    // 检查k均值是否有效（不能是NaN）
    if (isNaN(kMean)) {
      throw new Error("k初始化失败")
    }
    // 返回结果
    return {
      alphaInitial: { value: alphaInitial, isFixed: false },
      alphaEquilibrium: { value: alphaEquilibrium, isFixed: false },
      k: { value: kMean, isFixed: false },
    }
  },

  // 模型公式
  model: (tArr, params) => {
    // 接参数
    const {
      alphaInitial: { value: aZeroValue },
      alphaEquilibrium: { value: aMaxValue },
      k: { value: kValue }
    } = params
    // 检查参数是否初始化
    if (!aZeroValue || !aMaxValue || !kValue) {
      throw new Error("公式参数没有初始化")
    }
    // 计算结果
    const atArr = tArr.map((t) => (
      // 公式本体：
      // (α_0 - α_∞) / (α_t - α_∞) = exp(kt)
      // =>  α_t = ((α_0 - α_∞) / exp(kt)) + α_∞
      ((aZeroValue - aMaxValue) / Math.exp(kValue * t)) + aMaxValue
    ))
    // 返回结果
    return atArr
  },

})
