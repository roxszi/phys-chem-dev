/**
 * 验证：ml-matrix 库版（√W 行缩放 + 增广 gram）与现有手动单次遍历版
 * 在 JᵀWJ / JᵀWr 上是否数值等价。
 *
 * 数学映射：
 *   令 Jw = √W·J（逐行乘 √wᵢ），rw = √w∘r，则
 *   JwᵀJw = JᵀWJ；Jwᵀrw = JᵀWr。
 *   把 rw 作为增广列拼到 Jw 右侧，一次 gram() 同时得到两个量。
 */
import { Matrix } from "ml-matrix"
import { buildWeightedNormalEquation } from "../shared/fitting/normal-equation"

// 固定种子伪随机，保证可复现
let seed = 42
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

const n = 60
const p = 5
const J: number[][] = Array.from({ length: n }, () =>
  Array.from({ length: p }, () => rand() * 2 - 1),
)
const r: number[] = Array.from({ length: n }, () => rand() * 10 - 5)
const w: number[] = Array.from({ length: n }, () => rand() * 9 + 0.5)

// ---- 现有手动版（基线）----
const manual = buildWeightedNormalEquation(J, r, w)

// ---- 库版：√W 行缩放 + 增广 gram，一次调用同时得到 jtj 与 jtr ----
function buildViaGram(jacobian: number[][], residuals: number[], weights: number[]) {
  const n = jacobian.length
  const p = jacobian[0]?.length ?? 0
  const Jw = new Matrix(jacobian) // 拷贝构造，不动调用方的 number[][]
  const rw = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const s = Math.sqrt(weights[i]!)
    Jw.mulRow(i, s) // 原地行缩放：第 i 行乘 √wᵢ
    rw[i] = s * residuals[i]!
  }
  Jw.addColumn(rw) // 增广 [Jw | rw]
  const g = Jw.gram() // (p+1)×(p+1)，内部只算上三角再镜像
  return {
    jtj: g.subMatrix(0, p - 1, 0, p - 1), // 左上 p×p = JᵀWJ
    jtr: g.getColumn(p).slice(0, p), // 最后一列前 p 个 = JᵀWr（第 p 个是 Σwᵢrᵢ²，弃）
  }
}

const lib = buildViaGram(J, r, w)

// ---- 逐元素对比 ----
let maxErr = 0
for (let i = 0; i < p; i++) {
  for (let k = 0; k < p; k++) {
    maxErr = Math.max(maxErr, Math.abs(manual.jtj.get(i, k) - lib.jtj.get(i, k)))
  }
  maxErr = Math.max(maxErr, Math.abs(manual.jtr[i]! - lib.jtr[i]!))
}
console.log("返回类型一致（均为 Matrix）:", manual.jtj.constructor.name === lib.jtj.constructor.name)
console.log("最大绝对误差:", maxErr.toExponential(2))
console.log(maxErr < 1e-9 ? "PASS" : "FAIL")

// ---- 顺带性能抽样（微秒级，仅量级参考）----
const N = 2000
const t0 = performance.now()
for (let k = 0; k < N; k++) buildWeightedNormalEquation(J, r, w)
const t1 = performance.now()
for (let k = 0; k < N; k++) buildViaGram(J, r, w)
const t2 = performance.now()
console.log(
  `手动版 ${(t1 - t0).toFixed(1)}ms / 库版 ${(t2 - t1).toFixed(1)}ms（各 ${N} 次，n=${n}, p=${p}）`,
)
