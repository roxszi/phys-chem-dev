/**
 * 蔗糖水解动力学
 *
 * 测得物理量：α_t - t 时刻的旋光度
 *
 * 公式（非线性化）：
 *   (α_0 − α_∞) / (α_t − α_∞) = exp(kt)
 *   → α_t = (α_0 − α_∞) / exp(kt) + α_∞
 *
 * 公式（线性化）：
 *   ln(α_t − α_∞) = -kt + ln(α_0 − α_∞)
 *   → X = t, Y = ln(α_t − α_∞), slope = -k
 *
 * α_0：初始旋光度
 * α_∞：最终旋光度
 * k：速率常数
 */
import { defineEquationModel } from '../types.js'

/** 蔗糖水解动力学公式（折光法） */
export const sucroseHydrolysis = defineEquationModel({
  id: 'kinetics.first-order-equilibrium',
  name: '蔗糖水解动力学（折光法）',
  description: '蔗糖水解动力学（折光法）',
  formulaTex: '\\frac{\\alpha_0 - \\alpha_\\infty}{\\alpha_t - \\alpha_\\infty} = e^{kt}',

  parameters: [
    {
      id: 'aZero',
      symbol: 'α_0',
      name: '初始旋光度',
      unit: '',
      typicalRange: [0, 1],
      description: '初始旋光度',
    },
    {
      id: 'aMax',
      symbol: 'α_∞',
      name: '最终旋光度',
      unit: '',
      typicalRange: [0, 1],
      description: '最终旋光度',
    },
    {
      id: 'k',
      symbol: 'k',
      name: '速率常数',
      unit: 'min^-1',
      typicalRange: [0, 1],
      description: '速率常数',
    },
  ] as const,

  initialParameters: (_t, alpha) => {
    const aZero = alpha[0] ?? 0.1
    const lastFew = alpha.slice(-3)
    const aMax = lastFew.reduce((s, v) => s + v, 0) / Math.max(lastFew.length, 1)
    return {
      aZero: { value: aZero, isFixed: false },
      aMax: { value: aMax, isFixed: false },
      k: { value: 0.01, isFixed: false },
    }
  },

  model: (tArr, params) => {
    const aZero = params.aZero.value
    const aMax = params.aMax.value
    const k = params.k.value
    return tArr.map((t) => (aZero - aMax) / Math.exp(k * t) + aMax)
  },
})
