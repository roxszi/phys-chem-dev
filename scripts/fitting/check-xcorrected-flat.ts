/**
 * 一次性核对：DataArray=Matrix 迁移后 xCorrected 数值一致性
 * - 基线里 xCorrected 是 number[][]（[[x],[x]…]），当前实现是 Matrix → 序列化为 number[]（[x,x…]）
 * - 本脚本把基线二维摊平，与当前值逐位（bit 级，用 === 严格相等）比对
 * - 全等则本次迁移数值零漂移，仅表示形式变化，可安全重生成基线
 */
import { readFileSync } from "node:fs"
// fitting / equation 模块（跨模块，走 @shared 别名 + index.ts 唯一入口）
import { orthogonalDistanceRegression, singleXToMatrix } from "@shared/fitting/index.ts"
import { fitEquation, sucroseHydrolysis } from "@shared/equation/index.ts"

interface CaseSummary {
  extra: { xCorrected?: number[] | number[][] }
}

/** 基线文件 */
const baseline = JSON.parse(
  readFileSync(new URL("./baseline-fitting.json", import.meta.url), "utf8"),
) as { cases: Record<string, CaseSummary> }

/** ODR 系用例与当前实现的复现参数（与 verify-fitting.ts 用例 5/6/7/8 完全一致） */
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

const cBeer = [0, 0.1, 0.2, 0.3, 0.4, 0.5]
const aBeer = cBeer.map((c, i) => 0.8 * c + 0.02 + seededNoise(7, cBeer.length, 0.003)[i]!)
const sigmaBeer = cBeer.map((_, i) => 0.002 * (i + 1))
const sigmaXBeer = cBeer.map((_, i) => (i % 2 === 0 ? 0.005 : 0.01))

const tSucrose = [0, ...Array.from({ length: 15 }, (_, i) => 4 * (i + 1))]
const aSucrose = tSucrose.map((t, i) => {
  if (t === 0) return 0.7
  const noise = seededNoise(99, tSucrose.length, 0.002)[i]!
  return 0.2 + 0.5 * Math.exp(-0.05 * t) + noise
})
const tAnchorBoth = [0, ...Array.from({ length: 15 }, (_, i) => 4 * (i + 1)), Infinity]
const aAnchorBoth = tAnchorBoth.map((t, i) => {
  if (t === 0) return 0.7
  if (t === Infinity) return 0.2
  const noise = seededNoise(123, tAnchorBoth.length, 0.002)[i]!
  return 0.2 + 0.5 * Math.exp(-0.05 * t) + noise
})

/** 当前实现的 ODR 系用例（xCorrected 取 Matrix.data 扁平数组） */
const current: Record<string, number[]> = {
  "odr-linear": (() => {
    const r = orthogonalDistanceRegression({
      fn: (xData, p) => {
        const ys = new Float64Array(xData.rows)
        for (let i = 0; i < xData.rows; i++) ys[i] = p["slope"]! * xData.data[i]! + p["b"]!
        return ys
      },
      initialParams: { slope: 0.5, b: 0 },
      paramNames: ["slope", "b"],
      xData: singleXToMatrix(cBeer),
      yData: aBeer,
      options: { sigmaX: sigmaXBeer, sigmaY: sigmaBeer },
    })
    return Array.from(r.xCorrected.data)
  })(),
  "fit-equation": (() => {
    const r = fitEquation(sucroseHydrolysis, singleXToMatrix(tSucrose), aSucrose, {})
    if (r.algorithm !== "odr") throw new Error("预期 ODR 分支")
    return Array.from(r.xCorrected.data)
  })(),
  "fit-equation-anchor-both": (() => {
    const r = fitEquation(sucroseHydrolysis, singleXToMatrix(tAnchorBoth), aAnchorBoth, {})
    if (r.algorithm !== "odr") throw new Error("预期 ODR 分支")
    return Array.from(r.xCorrected.data)
  })(),
}

// 逐用例：基线二维摊平 vs 当前扁平，bit 级全等比对
let mismatch = 0
for (const [name, flat] of Object.entries(current)) {
  const base = baseline.cases[name]?.extra?.xCorrected
  if (!Array.isArray(base) || !Array.isArray(base[0])) {
    console.error(`${name}: 基线 xCorrected 不是二维数组形态，核对逻辑失效`)
    mismatch++
    continue
  }
  const flatBase = (base as number[][]).map(row => row[0])
  if (flatBase.length !== flat.length) {
    console.error(`${name}: 长度不一致 ${flatBase.length} vs ${flat.length}`)
    mismatch++
    continue
  }
  for (let i = 0; i < flat.length; i++) {
    // bit 级全等（NaN 视为相等）
    const same = flatBase[i] === flat[i] || (Number.isNaN(flatBase[i]!) && Number.isNaN(flat[i]!))
    if (!same) {
      console.error(`${name}[${i}]: ${flatBase[i]} vs ${flat[i]}`)
      mismatch++
    }
  }
  console.log(`${name}: ${flat.length} 个元素 bit 级全等 ✓`)
}

// odr-degenerate 用例与 verify-fitting 共用 tExp/yExp（fnExp 模型），补齐核对
const tExp = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8]
const yExp = tExp.map((t, i) => 2 * Math.exp(-0.5 * t) + 0.3 + seededNoise(42, tExp.length, 0.01)[i]!)
const baseDeg = baseline.cases["odr-degenerate"]?.extra?.xCorrected as number[][] | undefined
const rDeg = orthogonalDistanceRegression({
  fn: (xData, p) => {
    const { A, k, C } = p
    const ys = new Float64Array(xData.rows)
    for (let i = 0; i < xData.rows; i++) ys[i] = A! * Math.exp(-k! * xData.data[i]!) + C!
    return ys
  },
  initialParams: { A: 1.5, k: 0.3, C: 0 },
  paramNames: ["A", "k", "C"],
  xData: singleXToMatrix(tExp),
  yData: yExp,
  options: { sigmaY: tExp.map((_, i) => 0.005 * (i + 1)) },
})
const flatDeg = Array.from(rDeg.xCorrected.data)
const flatDegBase = (baseDeg ?? []).map(row => row[0])
let degOk = flatDegBase.length === flatDeg.length
for (let i = 0; i < flatDeg.length && degOk; i++) {
  if (flatDegBase[i] !== flatDeg[i]) {
    console.error(`odr-degenerate[${i}]: ${flatDegBase[i]} vs ${flatDeg[i]}`)
    degOk = false
  }
}
if (degOk) console.log(`odr-degenerate: ${flatDeg.length} 个元素 bit 级全等 ✓`)
else mismatch++

if (mismatch > 0) {
  console.error(`\n核对失败：${mismatch} 处数值不一致，禁止重生成基线`)
  process.exit(1)
}
console.log("\n全部 ODR 系用例 xCorrected 数值 bit 级一致（仅表示形式二维→扁平）→ 可安全重生成基线")
