/**
 * 二级反应动力学
 *
 *   1/c(t) = 1/c₀ + k·t
 *   即 c(t) = c₀ / (1 + c₀·k·t)
 *
 * 适用：乙酸乙酯皂化（理想）、酯化反应等。
 *
 * 线性化：1/c vs t（slope = k）
 */
import { defineEquationModel } from '../types.js'

/** 二级反应动力学模型 */
export const secondOrder = defineEquationModel({
  id: 'kinetics.second-order',
  name: '二级反应动力学',
  description: '反应速率与浓度二次方成正比：dc/dt = -k·c²',
  formulaTex: '\\frac{1}{c(t)} = \\frac{1}{c_0} + k \\cdot t',

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
      id: 'k',
      symbol: 'k',
      name: '二级速率常数',
      unit: 'L/(mol·s)',
      typicalRange: [1e-3, 1],
      description: '二级速率常数',
    },
  ] as const,

  // 启发式初值：c₀ ≈ 第一个数据点；k 暂用 0.01
  initialParameters: (_t, c) => {
    const c0 = c[0] ?? 0.1
    return {
      c0: { value: c0, isFixed: false },
      k: { value: 0.01, isFixed: false },
    }
  },

  model: (t, params) => {
    const c0 = params.c0.value
    const k = params.k.value
    return t.map((ti) => c0 / (1 + c0 * k * ti))
  },

  linearization: {
    transform: (t, c) => ({
      x: t.slice(),
      y: c.map((ci) => 1 / Math.max(ci, 1e-15)),
    }),
    slopeFromParams: (p) => p['k']!,
    interceptFromParams: (p) => 1 / Math.max(p['c0']!, 1e-15),
    xAxisLabel: 't (s)',
    yAxisLabel: '1/c (L/mol)',
  },
})
