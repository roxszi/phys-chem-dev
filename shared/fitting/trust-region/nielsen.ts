/**
 * trust-region - Nielsen 1999 自适应 λ 更新策略（nielsen.ts）
 * ---
 * 出处：Nielsen, H. B. "Damping parameter in Marquardt's method" (IMM, 1999)，
 * 是现代 LM 实现（MINPACK 系 / levenc 等）常见的事实标准调 λ 方案。
 * ---
 * 【与 classic 三段式的区别】
 * classic：ρ 分段后 λ 乘固定倍数，简单直观；
 * Nielsen：λ 的更新量本身随 ρ 连续变化——
 *   接受步：λ *= max(1/3, 1 − (2ρ−1)³)
 *     ρ → 1（预测很准）时 (2ρ−1)³ → 1，因子 → 0，λ 大幅缩小（放胆）；
 *     ρ 刚过 0（勉强接受）时 (2ρ−1)³ → −1，因子 → 2，λ 反而增大（接受但收紧）；
 *     因子下限 1/3：保证接受步 λ 至多缩到 1/3，不至于一步放太开。
 *   拒绝步：λ *= v，然后 v *= 2
 *     v 是"连续失败倍增系数"（初值 2）：连续拒绝时 λ 指数式收紧；
 *     一旦接受步成功，v 复位 2。
 * ---
 * 状态：v 需要跨迭代保持，由调用方（未来的 StepController 闭包）持有；
 * nielsenCreateState 提供初值。
 */

// 数据类型（模块内部文件，相对路径）
import type { StepDecision } from "./types.ts"

/**
 * λ 的数值护栏（与 classic.ts 同一档位）
 * - 过小：退化为纯 Gauss-Newton；过大：退化为纯最速下降
 */
const LAMBDA_MIN = 1e-12
const LAMBDA_MAX = 1e12

/**
 * 创建 Nielsen 策略的内部状态 v（连续失败倍增系数）
 * @returns 初值 2（Nielsen 1999 推荐值）
 */
export function nielsenCreateState(): number {
  return 2
}

/**
 * Nielsen 判据：依据增益比 ρ 决定接受/拒绝与 λ 的连续化更新
 * @param rho 增益比（实际下降 / 预测下降；预测不降时为 -1，见 gain-ratio.ts）
 * @param lambda 当前阻尼因子
 * @param v 当前失败倍增系数（nielsenCreateState 创建；调用方持有并在每步后更新为 nextV）
 * @returns decision 单步决策 + nextV 更新后的失败倍增系数
 */
export function nielsenJudge(
  rho: number,
  lambda: number,
  v: number,
): { decision: StepDecision; nextV: number } {
  if (rho > 0) {
    // 接受步：更新因子随 ρ 连续变化（见文件头说明），下限 1/3 托底
    const factor = Math.max(1 / 3, 1 - (2 * rho - 1) ** 3);
    return {
      // λ 缩小（ρ 高时缩得深），不低于 LAMBDA_MIN
      decision: { lambda: Math.max(lambda * factor, LAMBDA_MIN), accept: true },
      // 接受即复位失败计数器：连续拒绝的记忆清零
      nextV: 2,
    };
  }
  return {
    // 拒绝步：λ 乘当前失败倍增系数 v（连续拒绝时指数式收紧），封顶 LAMBDA_MAX
    decision: { lambda: Math.min(lambda * v, LAMBDA_MAX), accept: false },
    // 失败倍增：v 翻倍，下一次拒绝收得更紧
    nextV: v * 2,
  };
}
