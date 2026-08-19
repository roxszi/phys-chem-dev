/**
 * 算法注册表（Strategy + Registry 模式）
 *
 * 设计思路：
 *   - 所有算法通过 createXxx(tf) 工厂创建，闭包捕获 tf 实例
 *   - 注册表用 Map<string, Preprocessor> 存名字 → 算法实例
 *   - UI 通过 name 调用（'msc' / 'snv'），不直接 import 算法模块
 *   - 未来加 SG / DT / 导数等算法：写 createSG() + 注册即可，UI 无需改动
 */

import type { Preprocessor, TensorBackend } from '../lib/types.ts'
import { createMSC } from './msc.ts'
import { createSNV } from './snv.ts'

/** 算法名称常量 */
export const ALGORITHM_NAMES = {
  NONE: 'none',
  MSC: 'msc',
  SNV: 'snv',
} as const

export type AlgorithmName = (typeof ALGORITHM_NAMES)[keyof typeof ALGORITHM_NAMES]

/**
 * 创建并填充算法注册表
 *   必须在 initTfjs() 之后调用（需要 tf 实例）
 */
export function createAlgorithmRegistry(tf: TensorBackend): Map<AlgorithmName, Preprocessor> {
  const registry = new Map<AlgorithmName, Preprocessor>()

  // 'none' 是哨兵（不处理，原始数据直通）
  registry.set(ALGORITHM_NAMES.NONE, {
    name: 'NONE',
    apply: (dataset) => ({
      dataset,
      meta: { algorithm: 'NONE' },
    }),
  })

  registry.set(ALGORITHM_NAMES.MSC, createMSC(tf))
  registry.set(ALGORITHM_NAMES.SNV, createSNV(tf))

  return registry
}

/**
 * 显示名映射（UI 用）
 */
export const ALGORITHM_LABELS: Record<AlgorithmName, string> = {
  [ALGORITHM_NAMES.NONE]: '无（原始数据）',
  [ALGORITHM_NAMES.MSC]: 'MSC（多元散射校正）',
  [ALGORITHM_NAMES.SNV]: 'SNV（标准正态变换）',
}