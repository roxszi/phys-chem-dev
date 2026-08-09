/**
 * 一级反应动力学（理想）
 *
 *   c(t) = c₀ · exp(−k·t)
 *
 * 适用：蔗糖水解、过氧化氢分解（催化剂量恒定）等。
 *
 * 线性化：ln c vs t（slope = −k）
 *
 * 注意：本公式假设反应完全（c∞ = 0）。
 * 若反应不完全（如乙酸乙酯皂化有可逆部分），用 first-order-equilibrium。
 */
import { defineEquationModel } from '../types.js'

/** 一级反应动力学模型 */
export const firstOrder = defineEquationModel({
  id: 'kinetics.first-order',
  name: '一级反应动力学',
  description: '反应速率与浓度一次方成正比：dc/dt = -k·c',
  formulaTex: 'c(t) = c_0 \\cdot e^{-k t}',

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
      name: '一级速率常数',
      unit: '1/s',
      typicalRange: [1e-4, 1e-1],
      description: '一级速率常数',
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
    return t.map((ti) => c0 * Math.exp(-k * ti))
  },

  linearization: {
    transform: (t, c) => ({
      x: t.slice(),
      y: c.map((ci) => Math.log(Math.max(ci, 1e-15))),
    }),
    slopeFromParams: (p) => -p['k']!,
    interceptFromParams: (p) => Math.log(Math.max(p['c0']!, 1e-15)),
    xAxisLabel: 't (s)',
    yAxisLabel: 'ln c',
  },
})
