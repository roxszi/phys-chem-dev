/**
 * Arrhenius 方程
 *
 *   k(T) = A · exp(−Eₐ / RT)
 *
 * 物化意义：反应速率常数 k 随温度 T 的变化关系。
 *   A：指前因子（频率因子）
 *   Eₐ：活化能（J/mol）
 *   R：气体常数 8.314 J/(mol·K)
 *
 * 学生实验流程：
 *   1. 在不同 T 下做动力学实验，得到一组 (T, k)
 *   2. 用 Arrhenius 拟合 (T, k)，得 A 和 Eₐ
 *
 * 线性化：ln k vs 1/T（slope = −Eₐ/R, intercept = ln A）
 */
import { defineEquationModel } from '../types.js'

/** 气体常数 R = 8.314 J/(mol·K) */
export const R_GAS = 8.314

/** Arrhenius 方程模型 */
export const arrhenius = defineEquationModel({
  id: 'thermo.arrhenius',
  name: 'Arrhenius 方程',
  description:
    '反应速率常数 k 随温度 T 的指数变化关系。Eₐ 反映反应的"能垒"。',
  formulaTex: 'k(T) = A \\cdot e^{-E_a / RT}',

  parameters: [
    {
      id: 'A',
      symbol: 'A',
      name: '指前因子',
      unit: '1/s',
      typicalRange: [1e3, 1e15],
      description: '指前因子（频率因子）',
    },
    {
      id: 'Ea',
      symbol: 'Eₐ',
      name: '活化能',
      unit: 'J/mol',
      typicalRange: [1e4, 3e5],
      description: '活化能',
    },
  ] as const,

  // 启发式初值：A 暂用 1e6；Ea 暂用 5e4
  initialParameters: (_T, _k) => ({
    A: { value: 1e6, isFixed: false },
    Ea: { value: 5e4, isFixed: false },
  }),

  model: (T, params) => {
    const A = params.A.value
    const Ea = params.Ea.value
    return T.map((Ti) => A * Math.exp(-Ea / (R_GAS * Ti)))
  },

  linearization: {
    transform: (T, k) => ({
      x: T.map((Ti) => 1 / Ti),
      y: k.map((ki) => Math.log(Math.max(ki, 1e-30))),
    }),
    slopeFromParams: (p) => -p['Ea']! / R_GAS,
    interceptFromParams: (p) => Math.log(Math.max(p['A']!, 1e-30)),
    xAxisLabel: '1/T (1/K)',
    yAxisLabel: 'ln k',
  },
})
