/**
 * 线性求解器子模块
 * ---
 * 通过雅可比矩阵得到的【局部】线性化信息，在本模块计算出步长Δ
 * 原理：
 *   雅可比矩阵本质上是将当前参数空间点 βₖ 的残差作一阶泰勒展开，由此得到：
 *       r(βₖ + Δ) ≈ r(βₖ) − J·Δ
 *   于是拟合最终目的“让残差平方和最小”在该近似下，变成一道纯线性方程的求解：
 *       min_Δ ‖J·Δ − r‖²
 *   线性求解器，即求解该线性方程组。
 *   注意：因为得到的线性化信息是【局部】的，因此得到的解只在 βₖ 点的邻域内近似成立。
 *   所以本模块的输出不是最优参数点，而是步长。
 *   对步长的判据，由trust-region阻尼/信赖域子模块负责。
 * ---
 * 线性求解器有三种常见实现：正规方程、QR 分解、奇异值分解
 *   1.  正规方程法（normal-equations）
 *       先形成 JᵀJ，再 Cholesky 分解，最后用矩阵逆求解。
 *       优点：最快最省，适合 GPU 路径；
 *       缺点：条件数平方恶化，病态时解不稳定。
 *   2.  QR 分解法（qr）
 *       直接对 J 进行 QR 分解，最后用矩阵逆求解。
 *       优点：条件数不恶化，病态时解稳定；
 *       缺点：计算量较大，不适合 GPU 路径。
 *   3.  奇异值分解法（svd）
 *       先对 J 进行奇异值分解，再对截断后的矩阵求解。
 *       优点：条件数不恶化，病态时解稳定；
 *       缺点：计算量较大，适合秩亏/最病态的兜底。
 *   本模块默认使用正规方程法。
 * ---
 *   条件数平方的含义：κ(J)=1e8 时 JᵀJ 达 1e16，双精度有效数字耗尽。
 *   这就是“参数多/病态时换 QR/SVD”的全部理由。
 * ---
 * 阻尼与三种解法的关系
 *   信赖域阻尼 (JᵀJ + λD)Δ = Jᵀr 的接入点在三种解法中并不对等：
 *   - normal-equations：λ 天然加在 JᵀJ 的对角线上（见该文件第二段）；
 *   - qr：分解的是 J 本身，无处加 λ，实现忽略 damping 参数；
 *   - svd：用奇异值截断代替阻尼，效果等价于最激进的“砍掉病态方向”。
 *   因此“需要强阻尼的拟合”应绑定 normal-equations 路径；
 *   qr/svd 的阻尼兜底交由外层 λ 策略与收敛判据协同。
 *   tfjs GPU 路径强制 normal-equations 的更深层原因：
 *   GPU 端归约直接产出 JᵀJ（小 IO），下载后的 A 已含阻尼，
 */

// 库导入
import { Matrix } from "ml-matrix"
import { getLuChecked } from "@shared/math/index.ts"

/** 线性方程组求解器接口 */
export interface LinearSolver {
  /**
   * 解 A · x = b
   * @returns 解向量；若 A 奇异 / 近奇异返回 null
   */
  solve(A: Matrix, b: number[]): number[] | null
}


/**
 * 高斯消元求解器（ml-matrix 部分主元 LU 路线）
 *
 * 数值稳定、适用范围广（不要求对称正定），是默认选择。
 */
export class GaussianEliminationSolver implements LinearSolver {
  solve(A: Matrix, b: number[]): number[] | null {
    if (A.isEmpty()) return []
    if (!A.isSquare()) {
      throw new Error(`系数矩阵必须是方阵：${A.rows}×${A.columns}`)
    }
    if (b.length !== A.rows) {
      throw new Error(`右端项长度 ${b.length} ≠ 矩阵维度 ${A.rows}`)
    }

    // 奇异 / 近奇异判定复用共享原语（阈值定义在 math/matrix.ts）
    const lu = getLuChecked(A)
    if (!lu) return null

    // LU 前代 + 回代由库完成：b 作为列向量右乘，结果按行展开
    return lu.solve(Matrix.columnVector(b)).to1DArray()
  }
}


/** 工厂函数：创建默认求解器 */
export function createGaussianEliminationSolver(): LinearSolver {
  return new GaussianEliminationSolver()
}
