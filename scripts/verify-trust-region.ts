/**
 * trust-region 阻尼策略验证（批次 2 防线）
 * ---
 * 验证三件事：
 *   1. Nielsen 判据的单元行为（典型 ρ 下的 λ 更新因子是否符合 Nielsen 1999 公式）
 *   2. 双策略交叉收敛：同一用例分别用 Nielsen / classic 跑，最终 SSE 应一致到
 *      收敛容差量级——证明两条路径收敛到同一极值点、新契约实现数值稳定
 *   3. 工厂校验行为（非法 lambdaInit / classic 阈值须构造期报错）
 * 用法：pnpm exec tsx --tsconfig tsconfig.base.json scripts/verify-trust-region.ts
 */
import {
  levenbergMarquardt,
  createNielsenDamping,
  createClassicDamping,
  nielsenJudge,
  classicJudge,
  CLASSIC_DEFAULTS,
  singleXToRows,
} from "@shared/fitting/index.ts"

// ==================== 1. Nielsen 判据单元行为 ====================

console.log("── 1. Nielsen 判据单元行为（λ0 = 1e-3）──")
/** 典型 ρ 取样点（覆盖：预测完美 / 良好 / 中性 / 勉强 / 极小 / 拒绝） */
const rhoSamples = [1, 0.75, 0.5, 0.25, 1e-9, -1]
for (const rho of rhoSamples) {
  const { decision, nextV } = nielsenJudge(rho, 1e-3, 2)
  const factor = decision.lambda / 1e-3
  console.log(
    `  ρ = ${ rho.toFixed(6).padStart(8) } → accept = ${ String(decision.accept).padEnd(5) }`
    + `，λ/λ0 = ${ factor.toFixed(6) }，nextV = ${ nextV }`,
  )
}
// 公式对照：接受步 factor = max(1/3, 1 − (2ρ−1)³)；拒绝步 factor = v（v 翻倍）
//   ρ = 1    → factor = 1/3（预测完美，放胆）
//   ρ = 0.5  → factor = 1（中性，λ 不动）
//   ρ = 0+   → factor → 2（勉强接受但收紧）
//   ρ < 0    → 拒绝，λ *= v = 2，v → 4

// ==================== 2. 双策略交叉收敛 ====================

// 用例与 verify-fitting 的 lm-basic 相同：y = A·exp(−k·t) + C，真值 A=2, k=0.5, C=0.3
function seededNoise(seed: number, n: number, scale: number): number[] {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647
    out.push(((s - 1) / 2147483646 * 2 - 1) * scale)
  }
  return out
}
const tExp = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8]
const yExp = tExp.map((t, i) =>
  2 * Math.exp(-0.5 * t) + 0.3 + seededNoise(42, tExp.length, 0.01)[i]!,
)
const fnExp = (xData: number[][], p: Record<string, number>) => {
  const { A, k, C } = p
  // ys 返回 Float64Array（ModelFunction 契约）
  const ys = new Float64Array(xData.length)
  for (let i = 0; i < xData.length; i++) {
    ys[i] = A! * Math.exp(-k! * xData[i]![0]!) + C!
  }
  return ys
}
const xRows = singleXToRows(tExp)

console.log("\n── 2. 双策略交叉收敛（lm-basic 用例）──")
const results = {
  nielsen: levenbergMarquardt(fnExp, { A: 1.5, k: 0.3, C: 0 }, ["A", "k", "C"], xRows, yExp),
  classic: levenbergMarquardt(
    fnExp, { A: 1.5, k: 0.3, C: 0 }, ["A", "k", "C"], xRows, yExp,
    { damping: createClassicDamping() },
  ),
}
for (const [name, r] of Object.entries(results)) {
  console.log(
    `  ${ name.padEnd(8) } SSE = ${ r.sse.toExponential(10) }，`
    + `iters = ${ r.iterations }，isConverged = ${ r.isConverged }，λ_final = ${ r.finalLambda.toExponential(3) }`,
  )
}
const sseDiff = Math.abs(results.nielsen.sse - results.classic.sse)
const sseRel = sseDiff / results.nielsen.sse
console.log(`  SSE 相对差 = ${ sseRel.toExponential(3) }（应在 1e-8 以内：同一极值点）`)
if (sseRel > 1e-8) {
  throw new Error(`双策略 SSE 相对差 ${ sseRel } 超过 1e-8，收敛异常`)
}

// ==================== 3. 工厂校验行为 ====================

console.log("\n── 3. 工厂校验行为 ──")
function expectThrow(name: string, make: () => unknown): void {
  try {
    make()
    throw new Error(`【验证脚本缺陷】${ name } 未按预期抛错`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("验证脚本缺陷")) throw e
    console.log(`  ${ name } → 正确抛错：${ msg }`)
  }
}
expectThrow("Nielsen lambdaInit = -1", () => createNielsenDamping({ lambdaInit: -1 }))
expectThrow("Nielsen lambdaInit = 1e15", () => createNielsenDamping({ lambdaInit: 1e15 }))
expectThrow("classic rhoGood ≤ rhoBad", () => createClassicDamping({ rhoGood: 0.5, rhoBad: 0.6 }))
expectThrow("classic shrink ≥ 1", () => createClassicDamping({ shrink: 1 }))
// classic 判据三段式快速抽查（与 CLASSIC_DEFAULTS 对照）
const c1 = classicJudge(0.9, 1e-3, CLASSIC_DEFAULTS)
const c2 = classicJudge(1e-9, 1e-3, CLASSIC_DEFAULTS)
const c3 = classicJudge(0.5, 1e-3, CLASSIC_DEFAULTS)
console.log(
  `  classicJudge 抽查：ρ=0.9 → accept=${ c1.accept } λ×${ (c1.lambda / 1e-3).toFixed(3) }；`
  + `ρ=1e-9 → accept=${ c2.accept } λ×${ (c2.lambda / 1e-3).toFixed(1) }；`
  + `ρ=0.5（中间带）→ accept=${ c3.accept } λ 不变=${ c3.lambda === 1e-3 }`,
)

console.log("\n【verify-trust-region】全部通过")
