/**
 * 基于矩阵的高阶数学函数（不依赖任何上层业务概念）
 *
 * 与 matrix/basic.ts 的区别：basic.ts 是"通用矩阵运算"（数乘、转置、乘法），
 * 这里是"以矩阵类型为输入的高阶函数"——仍然是纯数学。
 *
 * 不依赖任何拟合 / 公式业务概念。
 */
import type { Matrix } from "./types.js"
import { invertMatrix } from "./inverse.js"

/**
 * 协方差矩阵 Cov = σ² × M⁻¹
 *
 * 通用：M 是任意 p×p 矩阵。
 * 拟合场景里 M 通常为 JᵀJ（Gauss-Newton 近似 Hessian）。
 *
 * 此函数涉及矩阵求逆 → 它属于 matrix 模块而非 numeric 模块，
 * 因为它以矩阵类型为核心数据结构，不是标量聚合。
 *
 * @param m p×p 矩阵
 * @param sigma2 残差方差估计
 * @returns 协方差矩阵；M 奇异时返回 null
 */
export function covarianceFromM(m: Matrix, sigma2: number): Matrix | null {
  const mInv = invertMatrix(m)
  if (!mInv) return null
  return mInv.map((row) => row.map((v) => v * sigma2))
}