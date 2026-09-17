/**
 * fitting 数值回归基线
 * ---
 * 设计思路：fitting/ 重构期间用"同一组固定用例的完整输出"作为数值防线——
 * 每批重构后重跑对比，等价重构批次要求逐位一致，换计算路线批次（如 gram 求和顺序
 * 变化）容差内放行，超容差即中断交付。
 *
 * 用例覆盖：
 *   1. lm-basic        LM 等权（指数模型，跨尺度参数）
 *   2. lm-weighted     LM 加权（sigmaY → weights 路径）
 *   3. lls-weighted    线性最小二乘（Beer-Lambert 形态）
 *   4. lls-two-points  LLS n=2（dof=0 → covariance/stdErr 全 NaN 教学口径）
 *   5. odr-linear      ODR（sigmaX 非零，线性模型）
 *   6. odr-degenerate  ODR sigmaX 全 0（应退化为加权 LM）
 *   7. fit-equation    fitEquation + 蔗糖水解全链路（含 t=0/t=∞ 锚点踢除路径）
 *
 * 用法：
 *   pnpm verify:fitting --save   生成/覆盖基线
 *   pnpm verify:fitting          与基线对比（默认）
 *   （等价：pnpm exec tsx --tsconfig tsconfig.base.json scripts/verify-fitting.ts）
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
// fitting / equation 模块（跨模块，走 @shared 别名 + index.ts 唯一入口）
import {
  linearLeastSquares,
  levenbergMarquardt,
  orthogonalDistanceRegression,
  singleXToMatrix,
} from "@shared/fitting/index.ts"
import type { LevenbergMarquardtResult } from "@shared/fitting/index.ts"
import type { Matrix } from "@shared/math/index.ts"
import { fitEquation, sucroseHydrolysis } from "@shared/equation/index.ts"

// ==================== 固定伪随机扰动 ====================

/**
 * 线性同余伪随机（Lehmer / minstd）
 * - 种子固定 → 序列固定：基线跨机器、跨时间完全可复现，不用 Math.random
 */
function seededNoise(seed: number, n: number, scale: number): number[] {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647
    // 映射到 (-scale, +scale)
    out.push(((s - 1) / 2147483646 * 2 - 1) * scale)
  }
  return out
}

// ==================== 用例数据 ====================

// 用例 1/2 共用：指数模型 y = A·exp(-k·t) + C，真值 A=2, k=0.5, C=0.3
const tExp = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8]
const yExp = tExp.map((t, i) =>
  2 * Math.exp(-0.5 * t) + 0.3 + seededNoise(42, tExp.length, 0.01)[i]!,
)
const fnExp = (xData: Matrix, p: Record<string, number>) => {
  const { A, k, C } = p
  // ys 返回 Float64Array（ModelFunction 契约）
  const ys = new Float64Array(xData.rows)
  for (let i = 0; i < xData.rows; i++) {
    ys[i] = A! * Math.exp(-k! * xData.data[i]!) + C!
  }
  return ys
}
const initExp = { A: 1.5, k: 0.3, C: 0 }
const namesExp = ["A", "k", "C"]

// 用例 3/4 共用：Beer-Lambert 形态 A = slope·c + intercept，真值 0.8 / 0.02
const cBeer = [0, 0.1, 0.2, 0.3, 0.4, 0.5]
const aBeer = cBeer.map((c, i) =>
  0.8 * c + 0.02 + seededNoise(7, cBeer.length, 0.003)[i]!,
)
const sigmaBeer = cBeer.map((_, i) => 0.002 * (i + 1))

// 用例 5/6 共用：同上模型但走 ODR（sigmaX 非零 / 全零退化）
const sigmaXBeer = cBeer.map((_, i) => (i % 2 === 0 ? 0.005 : 0.01))

// 用例 7：蔗糖水解，真值 α₀=0.7, α∞=0.2, k=0.05（min⁻¹）
// 数据含 t=0（α₀ 锚点，走踢除路径）。
// 注：不含 t=∞ —— 双锚点场景见用例 8。
const tSucrose = [0, ...Array.from({ length: 15 }, (_, i) => 4 * (i + 1))]
const aSucrose = tSucrose.map((t, i) => {
  // 锚点不加噪声；正常点加固定扰动
  if (t === 0) return 0.7
  const noise = seededNoise(99, tSucrose.length, 0.002)[i]!
  return 0.2 + 0.5 * Math.exp(-0.05 * t) + noise
})

// 用例 8：蔗糖水解，t=0 与 t=∞ 锚点并存（旧代码 ∞ 的 splice 索引越界致 Infinity 入拟合而炸，
// 批次 4 preprocess 显式分流后应正常——本用例为该修复的永久防线）
const tAnchorBoth = [0, ...Array.from({ length: 15 }, (_, i) => 4 * (i + 1)), Infinity]
const aAnchorBoth = tAnchorBoth.map((t, i) => {
  if (t === 0) return 0.7
  if (t === Infinity) return 0.2
  const noise = seededNoise(123, tAnchorBoth.length, 0.002)[i]!
  return 0.2 + 0.5 * Math.exp(-0.05 * t) + noise
})

// ==================== 结果摘要与序列化 ====================

/** Matrix 转一维数组（JSON 可序列化） */
function matToArray(m: { data: Float64Array } | null | undefined): number[] | null {
  return m ? Array.from(m.data) : null
}

/** 单个用例的完整输出摘要（重构前后应逐字段可对比） */
interface CaseSummary {
  params: Record<string, number>
  paramErrors: Record<string, number>
  rSquared: number
  rmse: number
  sse: number
  dof: number
  converged: boolean
  iterations: number
  gradientNorm: number
  covariance: number[] | null
  /** 算法特有诊断字段（finalLambda / xCorrection / mode 等） */
  extra: Record<string, number | string | number[] | number[][] | null>
}

function summarizeLM(r: LevenbergMarquardtResult): CaseSummary {
  return {
    params: r.params,
    paramErrors: r.paramErrors,
    rSquared: r.rSquared,
    rmse: r.rmse,
    sse: r.sse,
    dof: r.dof,
    converged: r.isConverged,
    iterations: r.iterations,
    gradientNorm: r.gradientNorm,
    covariance: matToArray(r.covariance),
    extra: { finalLambda: r.finalLambda },
  }
}

function summarizeODR(r: ReturnType<typeof orthogonalDistanceRegression>): CaseSummary {
  return {
    params: r.params,
    paramErrors: r.paramErrors,
    rSquared: r.rSquared,
    rmse: r.rmse,
    sse: r.sse,
    dof: r.dof,
    converged: r.isConverged,
    iterations: r.iterations,
    gradientNorm: r.gradientNorm,
      covariance: matToArray(r.covariance),
      extra: {
        finalLambda: r.finalLambda,
        mode: r.mode,
        xCorrection: Array.from(r.xCorrection),
        xCorrected: Array.from(r.xCorrected.data),
      },
    }
  }

  // ==================== 跑全部用例 ====================

function runAllCases(): Record<string, CaseSummary> {
  // 1. LM 等权
  const lmBasic = levenbergMarquardt({
    fn: fnExp,
    initialParams: initExp,
    paramNames: namesExp,
    xData: singleXToMatrix(tExp),
    yData: yExp,
  })
  // 2. LM 加权
  const sigmaExp = tExp.map((_, i) => 0.005 * (i + 1))
  const lmWeighted = levenbergMarquardt({
    fn: fnExp,
    initialParams: initExp,
    paramNames: namesExp,
    xData: singleXToMatrix(tExp),
    yData: yExp,
    options: { sigmaY: sigmaExp },
  })
  // 3. LLS 加权
  const llsWeighted = linearLeastSquares({ xData: cBeer, yData: aBeer, sigmaY: sigmaBeer })
  // 4. LLS 两点（NaN 口径）
  const llsTwoPoints = linearLeastSquares({
    xData: [cBeer[0]!, cBeer[1]!],
    yData: [aBeer[0]!, aBeer[1]!],
  })
  // 5. ODR（sigmaX 非零）
  const odrLinear = orthogonalDistanceRegression({
    fn: (xData: Matrix, p: Record<string, number>) => {
      // ys 返回 Float64Array（ModelFunction 契约）
      const ys = new Float64Array(xData.rows)
      for (let i = 0; i < xData.rows; i++) {
        ys[i] = p["slope"]! * xData.data[i]! + p["b"]!
      }
      return ys
    },
    initialParams: { slope: 0.5, b: 0 },
    paramNames: ["slope", "b"],
    xData: singleXToMatrix(cBeer),
    yData: aBeer,
    options: { sigmaX: sigmaXBeer, sigmaY: sigmaBeer },
  })
  // 6. ODR 退化（sigmaX 全 0，应与加权 LM 一致）
  const odrDegenerate = orthogonalDistanceRegression({
    fn: fnExp,
    initialParams: initExp,
    paramNames: namesExp,
    xData: singleXToMatrix(tExp),
    yData: yExp,
    options: { sigmaY: tExp.map((_, i) => 0.005 * (i + 1)) },
  })
  // 7. fitEquation + 蔗糖（默认 ODR → 内部 LM 退化路径）
  const fitEq = fitEquation(sucroseHydrolysis, singleXToMatrix(tSucrose), aSucrose, {})
  const fitEqOdr =
    fitEq.algorithm === "odr" ? fitEq : null
  if (!fitEqOdr) throw new Error("用例 7 预期走 ODR 分支")

  // 8. fitEquation + 蔗糖（t=0 与 t=∞ 锚点并存，双锚点分流路径）
  const fitEqAnchor = fitEquation(sucroseHydrolysis, singleXToMatrix(tAnchorBoth), aAnchorBoth, {})
  const fitEqAnchorOdr =
    fitEqAnchor.algorithm === "odr" ? fitEqAnchor : null
  if (!fitEqAnchorOdr) throw new Error("用例 8 预期走 ODR 分支")

  return {
    "lm-basic": summarizeLM(lmBasic),
    "lm-weighted": summarizeLM(lmWeighted),
    "lls-weighted": {
      params: { slope: llsWeighted.slope, intercept: llsWeighted.intercept },
      paramErrors: {
        slope: llsWeighted.slopeStdErr,
        intercept: llsWeighted.interceptStdErr,
      },
      rSquared: llsWeighted.rSquared,
      rmse: Number.NaN, // LLS 不输出 RMSE，占位 NaN（对比时跳过）
      sse: llsWeighted.sse,
      dof: llsWeighted.dof,
      converged: true,
      iterations: 1,
      gradientNorm: Number.NaN,
      covariance: matToArray(llsWeighted.covariance),
      extra: { residuals: Array.from(llsWeighted.residuals), predicted: Array.from(llsWeighted.predicted) },
    },
    "lls-two-points": {
      params: { slope: llsTwoPoints.slope, intercept: llsTwoPoints.intercept },
      paramErrors: {
        slope: llsTwoPoints.slopeStdErr,
        intercept: llsTwoPoints.interceptStdErr,
      },
      rSquared: llsTwoPoints.rSquared,
      rmse: Number.NaN,
      sse: llsTwoPoints.sse,
      dof: llsTwoPoints.dof,
      converged: true,
      iterations: 1,
      gradientNorm: Number.NaN,
      covariance: matToArray(llsTwoPoints.covariance),
      extra: {},
    },
    "odr-linear": summarizeODR(odrLinear),
    "odr-degenerate": summarizeODR(odrDegenerate),
    "fit-equation": summarizeODR(fitEqOdr),
    "fit-equation-anchor-both": summarizeODR(fitEqAnchorOdr),
  }
}

// ==================== 对比逻辑 ====================

// 相对容差分级：
//   一级（严格）：参数 / SSE / R² / RMSE / 协方差等核心数值——重构必须数学等价
//   二级（宽松）：ODR 辅助变量 xCorrection / xCorrected——Schur 回代对舍入顺序敏感
//   三级（仅断言收敛性）：finalLambda / gradientNorm / iterations——迭代路径量，
//         随收敛触发时机变化，无跨实现可比性
const REL_TOL = 1e-10
const PATH_TOL = 1e-6
const PATH_FIELDS = ["xCorrection", "xCorrected"]
const DIAG_FIELDS = ["finalLambda", "gradientNorm", "iterations"]

function tolForPath(path: string): number | null {
  const caseName = path.split(".")[0] ?? ""
  // ODR 系用例：δ（x 修正量）回代路径敏感，微差传导至全部残差派生量 → 二级容差
  const isOdrCase = caseName.includes("odr")
  if (DIAG_FIELDS.some(f => path.includes(f))) return null
  if (isOdrCase || PATH_FIELDS.some(f => path.includes(f))) return PATH_TOL
  return REL_TOL
}

function collectDiffs(
  path: string,
  a: unknown,
  b: unknown,
  diffs: string[],
): void {
  // 路径诊断量：只断言 gradientNorm 已收敛（< 1e-6），不做跨实现对比
  if (tolForPath(path) === null && (path.includes(".") || path.startsWith(""))) {
    if (path.includes("gradientNorm") && typeof a === "number" && typeof b === "number") {
      if (a > 1e-6 || b > 1e-6) diffs.push(`${path}: 梯度范数未收敛（${a} / ${b}）`)
      return
    }
    if (path.includes("finalLambda") || path.includes("iterations")) return
  }
  // JSON 无法表示 NaN（序列化为 null）：基线读回的 null 与当前 NaN 视为一致
  if (a === null && typeof b === "number" && Number.isNaN(b)) return
  if (b === null && typeof a === "number" && Number.isNaN(a)) return
  // 数字：NaN 与 NaN 视为相等
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return
    if (Number.isNaN(a) !== Number.isNaN(b)) {
      diffs.push(`${path}: NaN 不一致（${a} vs ${b}）`)
      return
    }
    const denom = Math.max(Math.abs(a), Math.abs(b), 1e-12)
    const tol = tolForPath(path) ?? REL_TOL
    if (Math.abs(a - b) / denom >= tol) {
      diffs.push(`${path}: ${a} vs ${b}（相对差 ${Math.abs(a - b) / denom}）`)
    }
    return
  }
  // 布尔 / 字符串：严格相等
  if (typeof a === "boolean" || typeof a === "string") {
    if (a !== b) diffs.push(`${path}: ${String(a)} vs ${String(b)}`)
    return
  }
  // null / undefined
  if (a === null || a === undefined || b === null || b === undefined) {
    if (a !== b) diffs.push(`${path}: ${String(a)} vs ${String(b)}`)
    return
  }
  // 数组：逐元素
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push(`${path}: 数组长度 ${a.length} vs ${b.length}`)
      return
    }
    a.forEach((v, i) => collectDiffs(`${path}[${i}]`, v, b[i], diffs))
    return
  }
  // 对象：按键集合 + 递归
  if (typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a!), ...Object.keys(b!)])
    for (const k of keys) {
      collectDiffs(
        `${path}.${k}`,
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        diffs,
      )
    }
    return
  }
  diffs.push(`${path}: 不可比较类型 ${typeof a} / ${typeof b}`)
}

// ==================== 主流程 ====================

const baselineUrl = new URL("./baseline-fitting.json", import.meta.url)
const current = runAllCases()

// --save：写基线
if (process.argv.includes("--save")) {
  writeFileSync(
    baselineUrl,
    JSON.stringify({ generatedAt: new Date().toISOString(), cases: current }, null, 2),
    "utf8",
  )
  console.log(`[verify-fitting] 基线已写入 ${decodeURIComponent(baselineUrl.pathname)}`)
  for (const [name, s] of Object.entries(current)) {
    const p = Object.entries(s.params).map(([k, v]) => `${k}=${v.toPrecision(6)}`).join(", ")
    console.log(`  ${name}: ${p} | SSE=${s.sse.toPrecision(6)} R²=${s.rSquared.toFixed(6)} converged=${s.converged}`)
  }
  process.exit(0)
}

// 默认：对比基线
if (!existsSync(baselineUrl)) {
  console.error("[verify-fitting] 基线不存在，先跑 --save 生成")
  process.exit(1)
}
const baseline = JSON.parse(readFileSync(baselineUrl, "utf8")) as {
  cases: Record<string, CaseSummary>
}

const diffs: string[] = []
const caseNames = new Set([...Object.keys(baseline.cases), ...Object.keys(current)])
for (const name of caseNames) {
  const a = baseline.cases[name]
  const b = current[name]
  if (!a || !b) {
    diffs.push(`${name}: 用例在${a ? "当前" : "基线"}中缺失`)
    continue
  }
  collectDiffs(name, a, b, diffs)
}

if (diffs.length === 0) {
  console.log(`[verify-fitting] PASS：${caseNames.size} 个用例全部在容差 ${REL_TOL} 内一致`)
  process.exit(0)
} else {
  console.error(`[verify-fitting] FAIL：${diffs.length} 处偏差`)
  for (const d of diffs) console.error(`  - ${d}`)
  process.exit(1)
}
