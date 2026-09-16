/**
 * trust-region - ρ 驱动阻尼策略子模块（聚合出口）
 * ---
 * 【子模块定位】
 * LM/ODR 主循环的步长控制（阻尼 λ 的升降）统一由本子模块供给：
 *   - 契约：DampingStrategy = init() + judge(rho, lambda)（见 types.ts）；
 *   - 主体：Nielsen 1999 自适应（createNielsenDamping，MINPACK 系事实标准，用户拍板选型）；
 *   - 兼容：classic 三段式（createClassicDamping，经典信赖域教材方案，纯转发兼容统一契约）；
 *   - 判据：增益比 ρ = 实际下降 / 预测下降（gain-ratio.ts 的 predictedReduction / gainRatio）。
 * ---
 * 【目录分工（一方法一文件）】
 * - nielsen.ts：Nielsen 1999 判据数学（纯函数）；
 * - classic.ts：classic 三段式判据数学（纯函数）+ 默认参数；
 * - gain-ratio.ts：增益比 ρ 计算工具；
 * - types.ts：共用契约类型 + 策略装配工厂；
 * - index.ts（本文件）：统一导出。
 * ---
 * 【主循环数据流（LM / ODR 同构）】
 *   外层开始 → lambda = damping.init()
 *   内层试探 → Δp = solve(JᵀWJ + λ·diag(JᵀWJ), JᵀWr)
 *            → predRed = predictedReduction(Δp, g, A 扁平化, p)
 *            → ρ = gainRatio(步前 SSE, 步后 SSE, predRed)
 *            → decision = damping.judge(ρ, λ)，λ = decision.lambda
 *            → decision.accept ? 提交新状态 : 继续收紧重试
 *   正规方程奇异（解不出 Δp）时按 ρ = -1 走拒绝路径收紧 λ。
 * ---
 * 【与旧 Marquardt 固定倍数策略的关系】
 * 旧 createMarquardtDamping（接受/拒绝事件驱动、固定倍数升降、不看 ρ）已舍弃：
 * 与 ρ 驱动契约不兼容，历史实现可查 git。
 */

// ==================== 统一契约与策略装配（types.ts） ====================
// 契约类型 + 策略配置类型
export type {
  DampingStrategy,
  StepDecision,
  NielsenDampingOptions,
  ClassicDampingOptions,
} from "./types.ts"
// 策略装配工厂：Nielsen 1999（主体，LM/ODR 默认）+ classic 三段式（兼容维护）
export { createNielsenDamping, createClassicDamping } from "./types.ts"

// ==================== 各方法文件（一方法一文件，纯函数数学） ====================
// Nielsen 1999 判据
export { nielsenJudge } from "./nielsen.ts"
// classic 三段式判据 + 默认参数
export { classicJudge, CLASSIC_DEFAULTS } from "./classic.ts"
export type { ClassicParams } from "./classic.ts"

// ==================== 判据工具（主循环计算 ρ 消费） ====================
export { predictedReduction, gainRatio } from "./gain-ratio.ts"
