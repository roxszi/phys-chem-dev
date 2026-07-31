/**
 * 正规方程（Normal Equation）构建（最小二乘专属）
 *
 * 这是 Gauss-Newton / Levenberg-Marquardt 类算法的核心数学结构：
 *
 *   (JᵀJ) · Δp = Jᵀr
 *
 * 其中：
 *   JᵀJ：p × p 矩阵，Hessian 的 Gauss-Newton 近似
 *   Jᵀr：p 维向量，负梯度的一半（∇S = -2·Jᵀr）
 *
 * LM 在 JᵀJ 上加阻尼项：
 *   (JᵀJ + λ·diag(JᵀJ)) · Δp = Jᵀr    （Marquardt 改进形式）
 */

/** 正规方程的两个组成部分 */
export interface NormalEquation {
  /** JᵀJ：p × p 对称矩阵（近似 Hessian） */
  jtj: number[][]
  /** Jᵀr：p 维向量（负梯度的一半） */
  jtr: number[]
}

/**
 * 从雅可比矩阵构建 JᵀJ（p × p 对称矩阵）
 *
 * 数学公式：(JᵀJ)[j][k] = Σᵢ J[i][j] · J[i][k]
 *
 * 利用对称性只算下三角（k <= j），然后镜像填充上三角。
 * 省一半计算，且保证矩阵严格对称。
 */
export function buildJtj(jacobian: number[][]): number[][] {
  const n = jacobian.length
  const p = jacobian[0]?.length ?? 0

  const jtj: number[][] = Array.from({ length: p }, () =>
    new Array<number>(p).fill(0),
  )

  for (let i = 0; i < n; i++) {
    const J_i = jacobian[i]!
    for (let j = 0; j < p; j++) {
      const J_ij = J_i[j]!
      for (let k = 0; k <= j; k++) {
        jtj[j]![k]! += J_ij * J_i[k]!
      }
    }
  }

  // 对称填充
  for (let j = 0; j < p; j++) {
    for (let k = j + 1; k < p; k++) {
      jtj[j]![k] = jtj[k]![j]!
    }
  }

  return jtj
}

/**
 * 从雅可比矩阵和残差构建 Jᵀr（p 维向量）
 *
 * 数学公式：(Jᵀr)[j] = Σᵢ J[i][j] · rᵢ
 */
export function buildJtr(jacobian: number[][], residuals: number[]): number[] {
  const n = jacobian.length
  const p = jacobian[0]?.length ?? 0

  const jtr = new Array<number>(p).fill(0)
  for (let i = 0; i < n; i++) {
    const J_i = jacobian[i]!
    const r_i = residuals[i]!
    for (let j = 0; j < p; j++) {
      jtr[j]! += J_i[j]! * r_i
    }
  }

  return jtr
}

/**
 * 同时构建 JᵀJ 和 Jᵀr（合并成一次遍历）
 *
 * 对热缓存更友好，比分别调用 buildJtj + buildJtr 更快。
 */
export function buildNormalEquation(
  jacobian: number[][],
  residuals: number[],
): NormalEquation {
  const n = jacobian.length
  const p = jacobian[0]?.length ?? 0

  const jtj: number[][] = Array.from({ length: p }, () =>
    new Array<number>(p).fill(0),
  )
  const jtr = new Array<number>(p).fill(0)

  for (let i = 0; i < n; i++) {
    const J_i = jacobian[i]!
    const r_i = residuals[i]!
    for (let j = 0; j < p; j++) {
      const J_ij = J_i[j]!
      jtr[j]! += J_ij * r_i
      for (let k = 0; k <= j; k++) {
        jtj[j]![k]! += J_ij * J_i[k]!
      }
    }
  }

  // 对称填充
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
 * 不修改原矩阵，返回新矩阵。
 */
export function applyDamping(jtj: number[][], lambda: number): number[][] {
  return jtj.map((row, j) =>
    row.map((val, k) => (j === k ? val * (1 + lambda) : val)),
  )
}
