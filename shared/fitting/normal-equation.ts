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
 *   - 只保留 `buildWeightedNormalEquation` 单一版本（最常用），内部走
 *     ml-matrix：√W 行缩放 + 增广 gram，(√W·J)ᵀ(√W·J) = JᵀWJ
 *   - 无权重场景：调用方传 `new Array(n).fill(1)` 即可，无需额外"无权重版"
 *   - JᵀJ 和 Jᵀr 的单独版本（buildJtj / buildJtr 等）已删除——单一版本
 *     把它们打包返回，分开调用反而要走两遍
 *   - 雅可比入参保持 number[][]（依赖注入接口，tfjs 实现不绑定 ml-matrix）；
 *     产出的 jtj 用 ml-matrix Matrix（后续参与求逆 / 阻尼等库运算）
 */

// 导入 ml-matrix 库
import { Matrix } from "ml-matrix"

/** 正规方程的两个组成部分 */
export interface NormalEquation {
  /** JᵀJ：p × p 对称矩阵（近似 Hessian，ml-matrix Matrix） */
  jtj: Matrix
  /** Jᵀr：p 维向量（负梯度的一半） */
  jtr: number[]
}

/**
 * 同时构建加权 JᵀWJ 和 JᵀWr（ml-matrix 库路线）
 *
 * 数学公式：
 *   (JᵀWJ)[j][k] = Σᵢ wᵢ · J[i][j] · J[i][k]
 *   (JᵀWr)[j]   = Σᵢ wᵢ · J[i][j] · rᵢ
 *
 * 实现思路：√W 行缩放把加权问题退化成普通 gram——
 *   令 Jw = √W·J，则 JwᵀJw = JᵀWJ；再把 rw = √w∘r 作为增广列拼上，
 *   一次 gram()（内部只算上三角再镜像）同时得到两个量。
 * 权重须非负（√w 定义域），负权重会得到 NaN。
 *
 * @param jacobian n×p 雅可比矩阵
 * @param residuals 残差向量
 * @param weights 权重数组（与 n 等长且非负；无权重场景传 `new Array(n).fill(1)`）
 */
export function buildWeightedNormalEquation(
  jacobian: number[][],
  residuals: number[],
  weights: number[],
): NormalEquation {
  const n = jacobian.length
  const p = jacobian[0]?.length ?? 0
  // 空模型（p = 0）防御：保持原返回契约（空矩阵 + 空向量），不进 gram
  if (p === 0) return { jtj: new Matrix(0, 0), jtr: [] }
  // √W 行缩放副本：Jw = √W·J，则 JwᵀJw = JᵀWJ（拷贝构造，不动调用方 number[][]）
  const Jw = new Matrix(jacobian)
  const rw = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const s = Math.sqrt(weights[i]!)
    Jw.mulRow(i, s) // 原地行缩放：第 i 行乘 √wᵢ
    rw[i] = s * residuals[i]!
  }
  // 增广 [Jw | rw]，一次 gram 同时得到 JᵀWJ 与 JᵀWr
  Jw.addColumn(rw)
  const g = Jw.gram() // (p+1)×(p+1)，内部只算上三角再镜像
  return {
    jtj: g.subMatrix(0, p - 1, 0, p - 1),
    jtr: g.getColumn(p).slice(0, p), // 末位是 Σwᵢrᵢ²，弃
  }
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
 * @returns 加阻尼后的新矩阵（不修改入参）
 */
export function applyDamping(jtj: Matrix, lambda: number): Matrix {
  // JᵀJ + λ·diag(JᵀJ)：diag 由实例 diag()（取对角向量）+ 静态 Matrix.diag（构造对角阵）拼出，
  // mul/add 均为静态方法返回新矩阵，不修改入参
  return Matrix.add(jtj, Matrix.diag(jtj.diag()).mul(lambda))
}