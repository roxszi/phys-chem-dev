/**
 * trust-region 阻尼/信赖域子模块（聚合出口）
 * ---
 * ⚠️ 本子模块处于"策略函数就位、编排接口未定"阶段：
 *   - classic / nielsen / gain-ratio 三个纯函数实现已就位；
 *   - 基于增益比 ρ 的 StepController 编排接口（本目录 types.ts）尚未定稿、未接主循环；
 *   - 当前 LM/ODR 主循环仍使用 ../damping.ts 的 Marquardt 固定倍数策略。
 * ---
 * TODO（批次 2.1）：在本注释区写明三种阻尼策略（Marquardt 固定倍数 /
 *   classic 三段式增益比 / Nielsen 自适应）的思路、流程、利弊，供拍板。
 * TODO（批次 2.2）：拍板后实现 StepController 编排并接入 LM/ODR 主循环。
 */

// 类型定义
export type {
  StepStrategy,
  StepControlOptions,
  StepDecision,
  StepController,
} from "./types.ts"

// classic 策略：三段式增益比判据
export { classicJudge, CLASSIC_DEFAULTS } from "./classic.ts"
export type { ClassicParams } from "./classic.ts"

// 增益比：预测下降量 + ρ 计算
export { predictedReduction, gainRatio } from "./gain-ratio.ts"

// Nielsen 策略：1999 自适应 λ 更新
export { nielsenCreateState, nielsenJudge } from "./nielsen.ts"
