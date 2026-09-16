/**
 * 线性求解器子模块
 * ---
 * 通过雅可比矩阵得到的【局部】线性化信息，在本模块计算出步长Δ
 * 原理：
 *   雅可比矩阵本质上是将当前参数空间点 βₖ 的残差作一阶泰勒展开，由此得到：
 *       r(βₖ + Δ) ≈ r(βₖ) − J·Δ
 *   于是拟合最终目的"让残差平方和最小"在该近似下，变成一道纯线性方程的求解：
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
 *   这就是"参数多/病态时换 QR/SVD"的全部理由。
 * ---
 * 阻尼与三种解法的关系
 *   信赖域阻尼 (JᵀJ + λD)Δ = Jᵀr 的接入点在三种解法中并不对等：
 *   - normal-equations：λ 天然加在 JᵀJ 的对角线上（见该文件第二段）；
 *   - qr：分解的是 J 本身，无处加 λ，实现忽略 damping 参数；
 *   - svd：用奇异值截断代替阻尼，效果等价于最激进的"砍掉病态方向"。
 *   因此"需要强阻尼的拟合"应绑定 normal-equations 路径；
 *   qr/svd 的阻尼兜底交由外层 λ 策略与收敛判据协同。
 *   tfjs GPU 路径强制 normal-equations 的更深层原因：
 *   GPU 端归约直接产出 JᵀJ（小 IO），下载后的 A 已含阻尼，
 * ---
 * 【求解器实现（自研矩阵，见 math/matrix/）】
 *   - createGaussianEliminationSolver：部分主元 LU（默认；奇异/近奇异 → null 契约）
 *   - createCholeskySolver：对称正定快路径（复用 math/matrix/cholesky.ts；
 *     非正定压 floor 给保守大步，不返回 null——语义差异见工厂注释）
 */

// 数据类型（跨模块，走 @shared 别名 + index.ts 唯一入口）
import type { Matrix, Vector } from "@shared/math/index.ts"
import {
  luDecomposeChecked,
  luSolve,
  choleskyDecomposeInPlace,
  choleskySolve,
  matrixIsEmpty,
  matrixIsSquare,
} from "@shared/math/index.ts"

/** 线性方程组求解器接口 */
export interface LinearSolver {
  /**
   * 解 A · x = b
   * @returns 解向量；若 A 奇异 / 近奇异返回 null
   */
  solve(A: Matrix, b: Vector): Vector | null
}


/**
 * 工厂函数：创建高斯消元求解器（自研部分主元 LU 路线，默认求解器）
 * - 返回对象字面量（solve 为无状态纯函数，闭包零开销；无 class 原型链）
 * - 数值稳定、适用范围广（不要求对称正定），是默认选择
 */
export function createGaussianEliminationSolver(): LinearSolver {
  return {
    /**
     * 解 A · x = b
     * @param A 系数矩阵（p × p 方阵）
     * @param b 右端项（长度 p）
     * @returns 解向量；若 A 奇异 / 近奇异返回 null
     */
    solve(A: Matrix, b: Vector): Vector | null {
      // 空矩阵：空模型直接返回空解
      if (matrixIsEmpty(A)) return new Float64Array(0)
      // 形状防御：正规方程必须是方阵，右端项长度必须与维度一致
      if (!matrixIsSquare(A)) {
        throw new Error(`系数矩阵必须是方阵：${ A.rows }×${ A.cols }`)
      }
      if (b.length !== A.rows) {
        throw new Error(`右端项长度 ${ b.length } ≠ 矩阵维度 ${ A.rows }`)
      }

      // LU 部分主元分解 + 奇异检查（阈值 SINGULAR_TOLERANCE 全项目唯一）
      const factor = luDecomposeChecked(A)
      if (!factor) return null

      // LU 前代 + 回代
      return luSolve(factor, b)
    },
  }
}

/**
 * 工厂函数：创建 Cholesky 求解器（对称正定快路径，计算量为 LU 的一半）
 * ---
 * ⚠️ 与 LU 路线的语义差异：本路线不返回 null——非正定（λ=0 且 J 秩亏才可能）
 * 时压 DIAGONAL_FLOOR 给"保守大步长"，交由外层 ρ 判据拒绝并升 λ。
 * 这符合信赖域框架的容错设计（详见 math/matrix/cholesky.ts 文件头）。
 * ---
 * 预留：tfjs GPU 路径在 GPU 上归约出 A 后，下载的 .data 直接进
 * choleskyDecomposeInPlace，收尾共用 choleskySolve（CPU 微秒级）。
 */
export function createCholeskySolver(): LinearSolver {
  return {
    /**
     * 解 A · x = b
     * @param A 对称正定系数矩阵（p × p，如阻尼后的正规方程）
     * @param b 右端项（长度 p）
     * @returns 解向量（永不返回 null）
     */
    solve(A: Matrix, b: Vector): Vector | null {
      // 空矩阵：空模型直接返回空解
      if (matrixIsEmpty(A)) return new Float64Array(0)
      // 形状防御
      if (!matrixIsSquare(A)) {
        throw new Error(`系数矩阵必须是方阵：${ A.rows }×${ A.cols }`)
      }
      if (b.length !== A.rows) {
        throw new Error(`右端项长度 ${ b.length } ≠ 矩阵维度 ${ A.rows }`)
      }

      const n = A.rows
      // Cholesky 原地分解（拷贝一份，不修改调用方的 A）
      const work = Float64Array.from(A.data)
      choleskyDecomposeInPlace(work, n)
      // 前代 + 回代（拷贝一份 b，防实现内部写右端项）
      const g = Float64Array.from(b)
      const out = new Float64Array(n)
      choleskySolve(work, g, n, out)
      return out
    },
  }
}
