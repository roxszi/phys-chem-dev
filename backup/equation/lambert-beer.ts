/**
 * 数据拟合
 * 
 * 本实验原始数据是 α - t
 * 
 */

import {
  fitEquation,
  firstOrderEquilibrium,
  orthogonalDistanceRegression,
} from "@/shared/fitting/index.ts"

import type {
  EquationModel,
  LinearizationForm
} from "@/shared/fitting/index.ts"


/** 公式 */
const beerLambert: EquationModel = {
  
  // id
  id: 'spectro.beer-lambert',
  // 名称
  name: 'Beer-Lambert 定律',
  // 分类
  category: 'spectro',

  /** 模型预测：A = ε · b · c（ODR 形式：x 显式） */
  model: (c, p) => c.map((ci) => p.epsilon * p.b * ci),

  /** 参数定义：UI 渲染 + 初值范围约束的元信息 */
  parameters: [
    {
      name: 'epsilon',
      symbol: 'ε',
      unit: 'L/(mol·cm)',
      typicalRange: [10, 10000],
      description: '摩尔吸光系数',
    },
    {
      name: 'b',
      symbol: 'b',
      unit: 'cm',
      typicalRange: [0.1, 10],
      description: '光程（比色皿宽度）',
    },
  ],

  /** 自动初值：首点斜率法估 ε·b，再假设 b=1 反求 ε */
  initialGuess: (_c, a) => {
    // 用首段斜率估 (ε·b)
    const slope = (a[1]! - a[0]!)
    const bGuess = 1.0          // 假设 1 cm 比色皿
    return { epsilon: slope / bGuess, b: bGuess }
  },

  formulaTex: 'A = \\varepsilon \\cdot b \\cdot c',
  description: 'Beer-Lambert 定律：吸光度与浓度成正比，适用于稀溶液。',
  assumptions: ['单色光', '稀溶液（无粒子散射）', '无化学平衡/缔合'],
}

