/**
 * 正规方程（Normal Equation）构建
 *
 * 这是 Gauss-Newton / Levenberg-Marquardt 类算法的核心数学结构：
 *
 *   (JᵀWJ) · Δp = JᵀWr
 *
 * 其中：
 *   JᵀWJ：p × p 矩阵，Hessian 的 Gauss-Newton 近似
 *   JᵀWr：p 维向量，负梯度的一半（∇S = -2·JᵀWr）
 *
 * LM 在 JᵀWJ 上加阻尼项：
 *   (JᵀWJ + λ·diag(JᵀWJ)) · Δp = JᵀWr    （Marquardt 改进形式）
 *
 * ODR 的正规方程不同（见 algorithms/odr/orthogonal-distance-regression.ts 内部），
 * 因为参数空间包含 (β, δ) 两部分。
 *
 * 设计原则：
 *   - 只保留 `buildWeightedNormalEquation` 单次遍历版本（最常用）
 *   - 无权重场景：调用方传 `new Array(n).fill(1)` 即可，无需额外"无权重版"
 *   - JᵀJ 和 Jᵀr 的单独版本（buildJtj / buildJtr 等）已删除——单次遍历版本
 *     把它们打包返回，分开调用反而要走两遍
 */
import type { Matrix } from "@shared/matrix/types.js"

/** 正规方程的两个组成部分 */
export interface NormalEquation {
  /** JᵀJ：p × p 对称矩阵（近似 Hessian） */
  jtj: Matrix
  /** Jᵀr：p 维向量（负梯度的一半） */
  jtr: number[]
}

/**
 * 单次遍历同时构建加权 JᵀJ 和 Jᵀr
 *
 * 数学公式：
 *   (JᵀWJ)[j][k] = Σᵢ wᵢ · J[i][j] · J[i][k]
 *   (JᵀWr)[j]   = Σᵢ wᵢ · J[i][j] · rᵢ
 *
 * 利用对称性只算下三角（k <= j），然后镜像填充上三角。
 *
 * @param jacobian n×p 雅可比矩阵
 * @param residuals 残差向量
 * @param weights 权重数组（与 n 等长；无权重场景传 `new Array(n).fill(1)`）
 */
export function buildWeightedNormalEquation(
  jacobian: number[][],
  residuals: number[],
  weights: number[],
): NormalEquation {
  const n = jacobian.length
  const p = jacobian[0]?.length ?? 0
  const jtj: Matrix = Array.from({ length: p }, () =>
    new Array<number>(p).fill(0),
  )
  const jtr = new Array<number>(p).fill(0)
  for (let i = 0; i < n; i++) {
    const J_i = jacobian[i]!
    const r_i = residuals[i]!
    const w = weights[i]!
    const wr = w * r_i
    for (let j = 0; j < p; j++) {
      const J_ij = J_i[j]!
      jtr[j]! += J_ij * wr
      for (let k = 0; k <= j; k++) {
        jtj[j]![k]! += w * J_ij * J_i[k]!
      }
    }
  }
  for (let j = 0; j < p; j++) {
    for (let k = j + 1; k < p; k++) {
      jtj[j]![k] = jtj[k]![j]!
    }
  }
  return { jtj, jtr }
}

/**
 * 应用 LM 阻尼：JᵀJ + λ·diag(JᵀJ)
 *
 * 即对 JᵀJ 的对角元素乘以 (1 + λ)，非对角元素不变。
 *
 * 这是 Marquardt 1963 改进形式（不是经典 λI）：
 *   - 经典 LM：JᵀJ + λI（所有方向均匀阻尼）
 *   - Marquardt：JᵀJ + λ·diag(JᵀJ)（按参数尺度自适应阻尼）
 *
 * Marquardt 形式对跨尺度参数模型（如 A=10⁴ 和 K=10⁻⁶ 同时拟合）更稳健。
 *
 * @param jtj JᵀJ 矩阵
 * @param lambda 阻尼因子
 * @returns 加阻尼后的新矩阵
 */
export function applyDamping(jtj: Matrix, lambda: number): Matrix {
  return jtj.map((row, j) =>
    row.map((val, k) => (j === k ? val * (1 + lambda) : val)),
  )
}