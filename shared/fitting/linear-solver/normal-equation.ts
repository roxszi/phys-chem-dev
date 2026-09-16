/**
 * 正规方程（Normal Equation）构建——拟合业务工具（normal-equation.ts）
 * ---
 * 这是 Gauss-Newton / Levenberg-Marquardt 类算法的核心数学结构：
 *   (JᵀWJ) · Δp = JᵀWr
 * 其中：
 *   JᵀWJ：p × p 矩阵，Hessian 的 Gauss-Newton 近似
 *   JᵀWr：p 维向量，负梯度的一半（∇S = -2·JᵀWr）
 *
 * LM 在 JᵀWJ 上加阻尼项：
 *   (JᵀWJ + λ·diag(JᵀWJ)) · Δp = JᵀWr    （Marquardt 改进形式）
 *
 * ODR 的正规方程不同（见 algorithms/orthogonal-distance-regression.ts 内部），
 * 因为参数空间包含 (β, δ) 两部分。
 *
 * 设计原则：
 *   - 只保留 `buildWeightedNormalEquation` 单一版本（最常用）；
 *   - 无权重场景：调用方传 `new Array(n).fill(1)` 即可，无需额外"无权重版"；
 *   - JᵀJ 和 Jᵀr 的单独版本（buildJtj / buildJtr 等）已删除——单一版本打包返回，分开调用反而要走两遍；
 *   - 本文件属于拟合业务工具层：基础矩阵操作走 @shared/math（自研 Matrix），
 *     拟合专属的归约 / 阻尼逻辑留在本文件。
 */

// 数据类型与基础矩阵操作（跨模块，走 @shared 别名 + index.ts 唯一入口）
import type { Matrix, Vector } from "@shared/math/index.ts"
import { createMatrix } from "@shared/math/index.ts"

/** 正规方程的两个组成部分 */
export interface NormalEquation {
  /** JᵀJ：p × p 对称矩阵（近似 Hessian，自研 Matrix，行主序） */
  jtj: Matrix
  /** Jᵀr：p 维向量（负梯度的一半） */
  jtr: Vector
}


/**
 * 同时构建加权 JᵀWJ 和 JᵀWr（√W 行缩放 + 单遍历归约）
 *
 * 数学公式：
 *   (JᵀWJ)[j][k] = Σᵢ wᵢ · J[i][j] · J[i][k]
 *   (JᵀWr)[j]   = Σᵢ wᵢ · J[i][j] · rᵢ
 *
 * 实现思路：√W 行缩放把加权问题退化成普通 gram——
 *   令 Jw = √W·J、rw = √w∘r，则 JwᵀJw = JᵀWJ、Jwᵀrw = JᵀWr；
 *   一次遍历数据行同时归约两个量：对每行缓存 rowK = √wᵢ·J[i] 与
 *   rwI = √wᵢ·rᵢ，内层只累加 A 上三角（对称性省一半乘法）。
 * 权重须非负（√w 定义域），负权重会得到 NaN。
 *
 * @param jacobian n×p 雅可比矩阵（Matrix 行主序扁平）
 * @param residuals 残差向量
 * @param weights 权重向量（与 n 等长且非负；无权重场景传全 1）
 */
export function buildWeightedNormalEquation(
  jacobian: Matrix,
  residuals: Vector,
  weights: Vector,
): NormalEquation {
  /** 数据点数 */
  const n = jacobian.rows
  /** 自由参数数（列数） */
  const p = jacobian.cols
  // 空模型（p = 0）防御：保持原返回契约（空矩阵 + 空向量），不进归约
  if (p === 0) return { jtj: createMatrix(0, 0), jtr: new Float64Array(0) }
  // 初始化归约目标：A 上三角（对称性）与 g
  const A = new Float64Array(p * p)
  const g = new Float64Array(p)
  /** 行缩放缓冲：rowK = √wᵢ·J[i]（每行复用，避免重复分配） */
  const rowK = new Float64Array(p)
  /** 雅可比扁平数据（行主序：第 i 行第 j 列 = data[i × p + j]） */
  const jData = jacobian.data
  // 逐数据行归约（缓存友好：一行数据只扫一遍）
  for (let i = 0; i < n; i++) {
    // √W 行缩放（与库路线同序：先缩放后累加）
    const s = Math.sqrt(weights[i]!)
    const base = i * p
    for (let k = 0; k < p; k++) {
      rowK[k] = jData[base + k]! * s
    }
    const rwI = s * residuals[i]!
    // 上三角累加：A[j][k] += rowK[j]·rowK[k]（j ≤ k），g[j] += rowK[j]·rwI
    for (let j = 0; j < p; j++) {
      const vj = rowK[j]!
      // 等效残差项（一阶量，每行每列累加一次）
      g[j]! += vj * rwI
      // 二阶量：上三角（对角含内）
      for (let k = j; k < p; k++) {
        A[j * p + k]! += vj * rowK[k]!
      }
    }
  }
  // 对称性镜像：A[j][k] = A[k][j]，把上三角复制到下三角
  // （Cholesky 只读下三角、LU 消元读全矩阵，镜像后两种求解路线都可用）
  for (let j = 0; j < p; j++) {
    for (let k = 0; k < j; k++) {
      A[j * p + k] = A[k * p + j]!
    }
  }
  return { jtj: { data: A, rows: p, cols: p }, jtr: g }
}


/**
 * 应用 LM 阻尼：JᵀJ + λ·diag(JᵀJ)（拟合业务工具）
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
  // 拷贝数据后对角逐元素加 λ·原对角值（数值路径与旧库实现
  // Matrix.add(JᵀJ, λ·diag(JᵀJ)) 逐元素等价）
  const data = Float64Array.from(jtj.data)
  const cols = jtj.cols
  for (let i = 0; i < jtj.rows; i++) {
    const idx = i * cols + i
    data[idx]! += lambda * jtj.data[idx]!
  }
  return { data, rows: jtj.rows, cols }
}
