import type { StepControlOptions, StepController } from './types';
import { classicJudge, CLASSIC_DEFAULTS, type ClassicParams } from './classic';
import { nielsenJudge, nielsenCreateState } from './nielsen';

export function createStepController(
  opts: Partial<StepControlOptions> = {}
): StepController {
  const strategy = opts.strategy ?? 'classic';

  if (strategy === 'nielsen') {
    return {
      init: () => opts.lambdaInit ?? 1e-3,
      judge(rho, lambda) {
        // v 存在控制器闭包里，fit 外部永远看不见
        let v = nielsenCreateState();
        return { /* ← 错：这样每轮重置了 */ };
      },
    };
  }
  // ...
}
