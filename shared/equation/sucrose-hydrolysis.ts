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
import { defineEquationModel } from '../equation-back/types.js'


/** 公式参数 */
const parameters = [
  {
    id:"aZero", symbol: "α_0", name: "初始旋光度", unit:"",
    typicalRange: [0, 1] as [number, number], description: "初始旋光度"
  },
  {
    id: "aMax", symbol: "α_∞", name: "最终旋光度", unit:"",
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
  // 模型公式
  model: (tArr, params) => {
    // 接参数
    const {
      aZero: { value: aZeroValue },
      aMax: { value: aMaxValue },
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
  }
})
