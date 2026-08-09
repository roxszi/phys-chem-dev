/**
 * 一级反应动力学（带平衡浓度）
 *
 *   c(t) = c∞ + (c₀ − c∞) · exp(−k·t)
 *
 * 适用：反应不完全的可逆体系，如乙酸乙酯皂化（皂化平衡）。
 * 学生实验中常见的"卡点"：不知道 c∞ 怎么测，需要本公式同时拟合 c∞。
 *
 * 线性化：ln[(c − c∞) / (c₀ − c∞)] vs t（slope = −k）
 *   变换需要 c∞，所以"先非线性拟合再线性化展示"是核心教学交互。
 */
import { defineEquationModel } from '../types.js'

/** 一级反应（带平衡浓度）模型 */
export const firstOrderEquilibrium = defineEquationModel({
  id: 'kinetics.first-order-equilibrium',
  name: '一级反应动力学（带平衡浓度）',
  description:
    '反应速率正比于 (c − c∞)：dc/dt = -k·(c − c∞)。适用于可逆反应或反应不完全的体系。',
  formulaTex: 'c(t) = c_{\\infty} + (c_0 - c_{\\infty}) \\cdot e^{-k t}',

  parameters: [
    {
      id: 'c0',
      symbol: 'c₀',
      name: '初始浓度',
      unit: 'mol/L',
      typicalRange: [0, 1],
      description: '初始浓度（t=0 时）',
    },
    {
      id: 'c_inf',
      symbol: 'c∞',
      name: '平衡浓度',
      unit: 'mol/L',
      typicalRange: [0, 1],
      description: '平衡浓度（t→∞ 时）',
    },
    {
      id: 'k',
      symbol: 'k',
      name: '一级速率常数',
      unit: '1/s',
      typicalRange: [1e-4, 1e-1],
      description: '一级速率常数',
    },
  ] as const,

  // 启发式初值：c₀ ≈ 第一个数据点；c∞ ≈ 最后 3 个点的均值；k 用 0.01
  initialParameters: (t, c) => {
    const c0 = c[0] ?? 0.1
    const lastFew = c.slice(-3)
    const cInf = lastFew.reduce((s, v) => s + v, 0) / Math.max(lastFew.length, 1)
    void t
    return {
      c0: { value: c0, isFixed: false },
      c_inf: { value: cInf, isFixed: false },
      k: { value: 0.01, isFixed: false },
    }
  },

  model: (t, params) => {
    const c0 = params.c0.value
    const cInf = params.c_inf.value
    const k = params.k.value
    return t.map((ti) => cInf + (c0 - cInf) * Math.exp(-k * ti))
  },

  linearization: {
    // 简化版：直接返回变换后的 x/y（不处理 skippedIndices——schema 暂时未暴露）
    transform: (t, c, p) => {
      const c0 = p['c0']!
      const cInf = p['c_inf']!
      const denom = c0 - cInf
      if (Math.abs(denom) < 1e-15) {
        return { x: [], y: [] }
      }
      const yLin: number[] = []
      const xLin: number[] = []
      const denomSign = denom > 0 ? 1 : -1
      for (let i = 0; i < c.length; i++) {
        const diff = c[i]! - cInf
        if (diff * denomSign > 0) {
          yLin.push(Math.log((diff * denomSign) / Math.abs(denom)))
          xLin.push(t[i]!)
        }
      }
      return { x: xLin, y: yLin }
    },
    slopeFromParams: (p) => -p['k']!,
    interceptFromParams: () => 0,
    xAxisLabel: 't (s)',
    yAxisLabel: 'ln[(c − c∞) / (c₀ − c∞)]',
  },
})
