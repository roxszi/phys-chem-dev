import type {
  PredictFn,
  DataArray,
  IterationState,
} from '../../types.js'
import { validateInputs } from '../../validate.js'
import { computeResiduals, computeSSE } from '../../residual.js'
import { buildNormalEquation, applyDamping } from '../../normal-equation.js'
import { createNumericalJacobian } from '../../jacobian/numerical.js'
import { createGaussianEliminationSolver } from '../../../base/linalg/solver/gaussian-elimination.js'
import { createMarquardtDamping } from '../../damping/marquardt.js'
import { createDefaultConvergence } from '../../convergence/default.js'
import { computeStatistics } from '../../statistics.js'
import type { LevenbergMarquardtOptions, LevenbergMarquardtResult } from './types.js'

/**
 * Levenberg-Marquardt 非线性最小二乘拟合
 *
 * 算法详解见同目录 README.md。
 *
 * @param fn 预测函数 (params) => predicted[]
 * @param initialParams 初始参数猜测值
 * @param paramNames 参数名列表（顺序固定）
 * @param xData 自变量数组
 * @param yData 因变量数组
 * @param options 配置选项（全部可选）
 * @returns 拟合结果（参数、误差、R²、协方差、收敛信息等）
 */
export function levenbergMarquardt(
  fn: PredictFn,
  initialParams: Record<string, number>,
  paramNames: string[],
  xData: DataArray,
  yData: DataArray,
  options: LevenbergMarquardtOptions = {},
): LevenbergMarquardtResult {
  // ── 1. 解析配置 + 构造默认模块 ─────────────────────
  const {
    maxIterations = 100,
    maxInnerIterations = 20,
    jacobian = createNumericalJacobian(),
    solver = createGaussianEliminationSolver(),
    damping = createMarquardtDamping(options.dampingOptions),
    convergence: convOptions,
  } = options

  const convergenceCheck = createDefaultConvergence(convOptions)

  // ── 2. 输入校验 ─────────────────────────────────
  const n = validateInputs(xData, yData, paramNames, initialParams, fn)
  const p = paramNames.length

  // ── 3. 状态初始化 ───────────────────────────────
  let currentParams: Record<string, number> = { ...initialParams }
  let currentResiduals = computeResiduals(fn, yData, currentParams)
  let currentSSE = computeSSE(currentResiduals)

  let converged = false
  let iterationsUsed = 0

  // ── 4. 主迭代循环 ───────────────────────────────
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    iterationsUsed++

    // 4.1 计算雅可比矩阵
    const J = jacobian.compute(fn, currentParams, paramNames, n)

    // 4.2 构建正规方程 (JᵀJ, Jᵀr)
    const { jtj, jtr } = buildNormalEquation(J, currentResiduals)

    // 4.3 内层循环：λ 试探
    let accepted = false
    for (let inner = 0; inner < maxInnerIterations; inner++) {
      // 4.3.1 应用阻尼：A = JᵀJ + λ·diag(JᵀJ)
      const A = applyDamping(jtj, damping.current())

      // 4.3.2 解正规方程 (JᵀJ + λD) Δp = Jᵀr
      const deltaP = solver.solve(A, jtr)
      if (!deltaP) {
        // 矩阵奇异，升 λ 重试
        damping.onReject()
        continue
      }

      // 4.3.3 试探新参数：trial = current + Δp
      const trialParams: Record<string, number> = { ...currentParams }
      for (let j = 0; j < p; j++) {
        const name = paramNames[j]!
        trialParams[name] = currentParams[name]! + deltaP[j]!
      }

      // 4.3.4 评估试探结果
      const trialResiduals = computeResiduals(fn, yData, trialParams)
      const trialSSE = computeSSE(trialResiduals)

      // 4.3.5 接受 / 拒绝
      if (trialSSE < currentSSE) {
        // 接受：更新状态 + 降 λ + 检查收敛
        currentParams = trialParams
        currentResiduals = trialResiduals
        currentSSE = trialSSE
        damping.onAccept()
        accepted = true

        const state: IterationState = {
          iteration,
          params: currentParams,
          paramNames,
          residuals: currentResiduals,
          sse: currentSSE,
          deltaP,
          gradient: jtr,
        }

        if (convergenceCheck.check(state)) {
          converged = true
        }
        break
      } else {
        // 拒绝：升 λ 继续试探
        damping.onReject()
      }
    }

    // 4.4 检查外层退出条件
    if (converged || !accepted) break
  }

  // ── 5. 计算最终统计量 ───────────────────────────
  // 在最终参数处重新算一次雅可比，用于协方差和梯度诊断。
  // （主循环里最后一次的雅可比对应"接受前"的参数，与最终参数不一致。）
  const finalJacobian = jacobian.compute(fn, currentParams, paramNames, n)
  const stats = computeStatistics({
    fn,
    params: currentParams,
    paramNames,
    xData,
    yData,
    residuals: currentResiduals,
    sse: currentSSE,
    jacobian: finalJacobian,
  })

  return {
    params: currentParams,
    paramErrors: stats.paramErrors,
    rSquared: stats.rSquared,
    rmse: stats.rmse,
    sse: currentSSE,
    dof: stats.dof,
    residuals: currentResiduals,
    predicted: stats.predicted,
    covariance: stats.covariance,
    converged,
    iterations: iterationsUsed,
    finalLambda: damping.current(),
    gradientNorm: stats.gradientNorm,
  }
}
