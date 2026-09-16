/**
 * math/matrix - LU 分解族（lu.ts）
 * ---
 * 【算法】部分主元 Doolittle LU 分解：PA = LU。
 *   - 每列在下方元素中选绝对值最大者作主元（数值稳定的关键）；
 *   - L（单位下三角，对角 1 隐含不存）与 U（上三角）合并存进同一个
 *     Float64Array，节省一半内存；
 *   - 行交换记录在 piv 置换数组，求解时对 b 重排。
 * ---
 * 【奇异契约】精确奇异（主元 = 0）或近奇异（|主元| < SINGULAR_TOLERANCE）
 *   → 返回 null。阈值 SINGULAR_TOLERANCE 全项目唯一（types.ts）。
 * ---
 * 【消费面】
 *   - luSolve：线性方程组求解（linear-solver 的 LU 路线）
 *   - matrixInvert：矩阵求逆（LLS / 拟合协方差组装）
 */

// 数据类型（本目录内部文件，相对路径）
import type { Matrix, Vector } from "./types.ts"
import { SINGULAR_TOLERANCE } from "./types.ts"
import { createMatrix, matrixIsEmpty, matrixIsSquare } from "./construct.ts"

/**
 * LU 分解因子（部分主元，合并存储）
 */
export interface LuFactorization {
  /** 合并 LU：下三角 L（对角 1 隐含）+ 上三角 U，行主序扁平 */
  lu: Float64Array
  /** 行交换置换：piv[i] = 原第 piv[i] 行被换到了第 i 行 */
  piv: number[]
  /** 矩阵阶数 */
  n: number
}

/**
 * LU 部分主元分解 + 奇异检查
 * @param m 待分解方阵（调用方先自行处理空矩阵 / 非方阵）
 * @returns 分解因子；精确奇异 / 近奇异返回 null
 */
export function luDecomposeChecked(m: Matrix): LuFactorization | null {
  /** 阶数 */
  const n = m.rows
  /** 工作副本（原地分解，不修改 m） */
  const lu = Float64Array.from(m.data)
  /** 置换数组（初始为恒等置换） */
  const piv = Array.from({ length: n }, (_, i) => i)

  // 逐列消元
  for (let k = 0; k < n; k++) {
    // 列内选主元：|元素| 最大的行（部分主元策略）
    let maxRow = k
    let maxVal = Math.abs(lu[k * n + k]!)
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(lu[i * n + k]!)
      if (v > maxVal) {
        maxVal = v
        maxRow = i
      }
    }
    // 奇异契约：主元为 0（精确奇异）或 < 阈值（近奇异）→ null
    if (maxVal < SINGULAR_TOLERANCE) {
      return null
    }
    // 整行交换（含已算好的 L 部分）+ 置换记录
    if (maxRow !== k) {
      for (let j = 0; j < n; j++) {
        const t = lu[k * n + j]!
        lu[k * n + j] = lu[maxRow * n + j]!
        lu[maxRow * n + j] = t
      }
      const tp = piv[k]!
      piv[k] = piv[maxRow]!
      piv[maxRow] = tp
    }
    /** 本列主元 */
    const pivot = lu[k * n + k]!
    // 消元：第 k 列下方归零，消元乘数存进 L 的第 k 列
    for (let i = k + 1; i < n; i++) {
      const factor = lu[i * n + k]! / pivot
      lu[i * n + k] = factor
      // 行更新：U 部分（第 k+1 列起）减去 factor × 主元行
      for (let j = k + 1; j < n; j++) {
        lu[i * n + j]! -= factor * lu[k * n + j]!
      }
    }
  }
  return { lu, piv, n }
}

/**
 * 用 LU 因子解 A·x = b（b 先按置换重排，再前代 + 回代）
 * @param factor luDecomposeChecked 的产物
 * @param b 右端项（长度 = n）
 * @returns 解向量（长度 = n）
 */
export function luSolve(factor: LuFactorization, b: Vector): Vector {
  const { lu, piv, n } = factor
  // 1. 右端项按行交换重排：P·b
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = b[piv[i]!]!
  }
  // 2. 前代 L·y = P·b（L 对角 = 1，无需除法）
  for (let i = 0; i < n; i++) {
    let s = out[i]!
    for (let j = 0; j < i; j++) {
      s -= lu[i * n + j]! * out[j]!
    }
    out[i] = s
  }
  // 3. 回代 U·x = y
  for (let i = n - 1; i >= 0; i--) {
    let s = out[i]!
    for (let j = i + 1; j < n; j++) {
      s -= lu[i * n + j]! * out[j]!
    }
    out[i] = s / lu[i * n + i]!
  }
  return out
}

/**
 * 矩阵求逆（LU 路线：解 A·X = I，复用同一次分解）
 * - 空矩阵 → 0 × 0 空矩阵（与旧 getInvertMatrix 契约一致）
 * - 非方阵 → throw
 * - 奇异 / 近奇异 → null
 * @param m 待求逆方阵
 */
export function matrixInvert(m: Matrix): Matrix | null {
  // 空矩阵：直接返回 0 × 0
  if (matrixIsEmpty(m)) {
    return createMatrix(0, 0)
  }
  // 非方阵：报错
  if (!matrixIsSquare(m)) {
    throw new Error(`[matrixInvert]：仅支持方阵，当前 ${ m.rows } × ${ m.cols }`)
  }
  // 分解 + 奇异检查
  const factor = luDecomposeChecked(m)
  if (!factor) {
    return null
  }
  /** 逆矩阵（逐列求解后拼装） */
  const result = createMatrix(m.rows, m.rows)
  for (let j = 0; j < m.rows; j++) {
    // 单位列向量 e_j：解 A·x = e_j 得逆矩阵的第 j 列
    const e = new Float64Array(m.rows)
    e[j] = 1
    const x = luSolve(factor, e)
    for (let i = 0; i < m.rows; i++) {
      result.data[i * m.rows + j] = x[i]!
    }
  }
  return result
}
