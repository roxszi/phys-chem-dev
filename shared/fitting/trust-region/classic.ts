/**
 * trust-region - classic 三段式增益比策略（classic.ts）
 * ---
 * 【它解决什么问题】
 * LM 每轮解出的 Δp 是"线性近似下的最优步长"，但线性近似只在当前点附近成立。
 * 需要一把尺子衡量"这一步走出去，线性预测还准不准"——这把尺子就是增益比 ρ：
 *   ρ = 实际 SSE 下降量 / 预测 SSE 下降量
 * 本策略按 ρ 所在区间三分处置（"三段式"名称的由来）：
 *   ① ρ ≥ rhoGood（默认 0.75）：线性近似很准 → 接受步子，且 λ 缩小（下轮更大胆）
 *   ② ρ < rhoBad （默认 1e-4） ：预测完全失真 → 拒绝步子，λ 放大（下轮更保守）
 *   ③ 中间地带：步子确实在下降（ρ > 0）但不完美 → 接受，λ 不动
 * ---
 * 与 Marquardt 固定倍数策略（damping.ts）的区别：
 *   固定倍数策略只看"SSE 有没有降"，不看"降得值不值"；
 *   classic 策略额外用 ρ 区分"降得漂亮"与"降得勉强"，
 *   勉强够格的步不再触发激进降 λ，收敛后期更平稳。
 */

// 数据类型（模块内部文件，相对路径）
import type { StepDecision } from "./types.ts"

/** classic 策略的可调参数 */
export interface ClassicParams {
  /** ρ ≥ rhoGood：接受该步并缩小 λ */
  rhoGood: number
  /** ρ < rhoBad：拒绝该步并放大 λ */
  rhoBad: number
  /** 接受步 λ 的缩小系数（如 1/3） */
  shrink: number
  /** 拒绝步 λ 的放大系数（如 5） */
  grow: number
}

/** classic 策略默认参数（数值优化文献常用取值） */
export const CLASSIC_DEFAULTS: ClassicParams = {
  rhoGood: 0.75,
  rhoBad: 1e-4,
  shrink: 1 / 3,
  grow: 5,
}

/**
 * λ 的数值护栏
 * - 过小：退化为纯 Gauss-Newton（激进，可能发散）
 * - 过大：退化为纯最速下降（保守，寸步难行）
 */
const LAMBDA_MIN = 1e-12
const LAMBDA_MAX = 1e12

/**
 * classic 三段式判据：依据增益比 ρ 决定接受/拒绝与 λ 的升降
 * @param rho 增益比（实际下降 / 预测下降；预测不降时为 -1，见 gain-ratio.ts）
 * @param lambda 当前阻尼因子
 * @param p 策略参数（一般传 CLASSIC_DEFAULTS，也可自定义）
 * @returns 决策：accept 是否接受该步；lambda 下一轮使用的阻尼因子
 */
export function classicJudge(rho: number, lambda: number, p: ClassicParams): StepDecision {
  // 第一段：ρ ≥ rhoGood → 线性近似很准，接受步子并缩小 λ（放胆）
  //   Math.max 托底：λ 不低于 LAMBDA_MIN
  if (rho >= p.rhoGood)
    return { lambda: Math.max(lambda * p.shrink, LAMBDA_MIN), accept: true }
  // 第二段：ρ < rhoBad → 线性近似失效，拒绝步子并放大 λ（收紧）
  //   Math.min 封顶：λ 不高于 LAMBDA_MAX
  //   （ρ = -1 即"预测不降"的情形也落在本段，必然被拒绝）
  if (rho < p.rhoBad)
    return { lambda: Math.min(lambda * p.grow, LAMBDA_MAX), accept: false }
  // 第三段（中间地带）：步子真实下降（ρ > 0）但不完美 → 接受，λ 保持不变
  //   accept: rho > 0 是防御性写法，保证任何 ρ 输入都有确定行为
  return { lambda, accept: rho > 0 }
}
