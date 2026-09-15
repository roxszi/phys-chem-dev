// nielsen.ts —— Nielsen 1999 的 λ 更新，带内部状态 v
import type { StepDecision } from './types';

const LAMBDA_MIN = 1e-12, LAMBDA_MAX = 1e12;

/**
 * 接受步：λ *= max(1/3, 1 − (2ρ−1)³)，v 复位为 2
 * 拒绝步：λ *= v，然后 v *= 2（连续失败时 λ 指数式收紧）
 */
export function nielsenCreateState(): number { return 2; }

export function nielsenJudge(rho: number, lambda: number, v: number): {
  decision: StepDecision; nextV: number;
} {
  if (rho > 0) {
    const factor = Math.max(1 / 3, 1 - (2 * rho - 1) ** 3);
    return {
      decision: { lambda: Math.max(lambda * factor, LAMBDA_MIN), accept: true },
      nextV: 2,
    };
  }
  return {
    decision: { lambda: Math.min(lambda * v, LAMBDA_MAX), accept: false },
    nextV: v * 2,
  };
}
