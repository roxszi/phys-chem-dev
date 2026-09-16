// classic.ts
import type { StepDecision } from './types.ts';

export interface ClassicParams {
  rhoGood: number; rhoBad: number; shrink: number; grow: number;
}

export const CLASSIC_DEFAULTS: ClassicParams = {
  rhoGood: 0.75,
  rhoBad: 1e-4,
  shrink: 1 / 3,
  grow: 5,
};

const LAMBDA_MIN = 1e-12, LAMBDA_MAX = 1e12;

export function classicJudge(rho: number, lambda: number, p: ClassicParams): StepDecision {
  if (rho >= p.rhoGood)  // 线性近似很准：接受，放胆
    return { lambda: Math.max(lambda * p.shrink, LAMBDA_MIN), accept: true };
  if (rho < p.rhoBad)    // 线性近似失效：拒绝，收紧
    return { lambda: Math.min(lambda * p.grow, LAMBDA_MAX), accept: false };
  return { lambda, accept: rho > 0 };  // 中间地带：接受但 λ 不动
}
