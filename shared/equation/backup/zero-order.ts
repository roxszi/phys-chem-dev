/**
 * 零级反应动力学
 *
 *   c(t) = c₀ − k·t
 *
 * 反应速率与浓度无关（如光催化 / 表面催化反应的某些区段）。
 * 浓度随时间线性下降。
 *
 * 线性化：c vs t 本身就是直线（slope = −k）
 */
import { defineEquationModel } from '../types.js'

/** 零级反应模型 */
export const zeroOrder = defineEquationModel({
  id: 'kinetics.zero-order',
  name: '零级反应动力学',
  description: '反应速率与浓度无关：dc/dt = -k',
  formulaTex: 'c(t) = c_0 - k \\cdot t',

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
      name: '零级速率常数',
      unit: 'mol/(L·s)',
      typicalRange: [1e-5, 1e-1],
      description: '零级速率常数',
    },
  ] as const,

  // 启发式初值：c₀ ≈ 第一个数据点；k ≈ (c₀ − c_final) / t_final
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
    return t.map((ti) => c0 - k * ti)
  },

  linearization: {
    transform: (t, c) => ({ x: t.slice(), y: c.slice() }),
    slopeFromParams: (p) => -p['k']!,
    interceptFromParams: (p) => p['c0']!,
    xAxisLabel: 't (s)',
    yAxisLabel: 'c (mol/L)',
  },
})
