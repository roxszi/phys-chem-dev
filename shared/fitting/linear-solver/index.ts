/**
 * 线性求解器子模块
 * ---
 * 通过雅可比矩阵（公式雅克比）得到的【局部】线性化信息，在本模块计算出步长Δ
 * 原理：
 * - 雅可比矩阵本质上是将当前参数空间（参数向量）β 的模型/公式输出（预测值/拟合值）作一阶泰勒展开：
 *       J[n, p] = ∂fₙ/∂βₚ
 *       Jᵣ[n, p] = ∂rₙ/∂βₚ
 *       Jᵣ = −J
 *       Jᵣ[i][j] = ∂rᵢ/∂βⱼ
 *       注*：具体见 jacobian\ 模块。
 * - 雅可比矩阵 Jᵣ 作为残差 r 的泰勒展开，则有对于微小的参数向量变化 δ，有：
 *       r(βₖ + δ) ≈ r(βₖ) + (∂rₙ/∂βₚ)·δ ≈ r(βₖ) + Jᵣ·δ
 *   式中，βₖ 为某次迭代 k 时的当次状态下的参数向量 β。
 *   式中，r 和 δ 是向量，J 是矩阵。
 *   为了让残差平方和最小，即 ‖r(βₖ)‖² 最小。或者可以说，让下一次迭代得到的 ‖r(βₖ + δ)‖² 最小，即：
 *       min ‖r(βₖ) + Jᵣ·δ‖²
 *   本子模块作为“线性求解器”，即求解该线性方程组。
 * - 解 min ‖r(βₖ) + Jᵣ·δ‖²：
 *   向量平方即向量点积，即：
 *         ‖r(βₖ) + Jᵣ·δ‖² 简写为：‖r + J·δ‖²
 *       = (r + J·δ)ᵀ · (r + J·δ)                      // 向量平方即向量点积
 *       = (rᵀ + (J·δ)ᵀ) · (r + J·δ)                   // 转置法则：转置穿透矩阵加法
 *       = (rᵀ + δᵀ·Jᵀ) · (r + J·δ)                    // 转置法则：转置穿透矩阵乘法
 *       = rᵀ·r + rᵀ·(J·δ) + δᵀ·Jᵀ·r + δᵀ·Jᵀ·J·δ       // 分配律
 *       = rᵀ·r + rᵀ·(J·δ) + (J·δ)ᵀ·r + δᵀ·(Jᵀ·J)·δ    // 转换成比较好分析的形式
 *   式中：
 *     - 项 rᵀ·r = ‖r‖²，向量点积即向量平方，这是一个与 δ 无关的常数/标量
 *     - 项 rᵀ·(J·δ) 与 (J·δ)ᵀ·r 两者为转置关系，且这两项的计算结果为标量，标量的内部转置，最终结果等于其自身。因此：
 *       rᵀ·(J·δ) + (J·δ)ᵀ·r = 2·rᵀ·(J·δ) = 2·(J·δ)ᵀ·r
 *     - 项 (J·δ)ᵀ·J·δ 是 `J·δ` 和它的转置相乘，同理，该项相当于 ‖J·δ‖²。
 *     - 因此，上式可进一步变为：
 *         ‖r‖² + 2·rᵀ·J·δ + ‖J·δ‖²     // δ 表示
 *         ‖r‖² + 2·δᵀ·Jᵀ·r + ‖δᵀ·Jᵀ‖²    // δᵀ 表示
 *       这两式是等价的，因为在代码世界的矩阵乘法中，并不考虑向量是行向量还是列向量，两者没有区别。
 *       这两式均为 `常数 + 一次项 + 二次项` 的形式，即 `c + b·x + a·x²` 的矩阵版。
 *   令 S = ‖r‖² + 2·rᵀ·(J·δ) + ‖J·δ‖²（或等于 δᵀ 表示），则：
 *        dS/dδᵀ = 2·Jᵀ·r + 2·(Jᵀ·J)·δ    // “量纲”等于δ
 *      这是一个向量。其在代码世界等价于：
 *        dS/dδ = 2·rᵀ·J + 2·δᵀ·(Jᵀ·J)    // “量纲”等于δᵀ
 *      注1*：矩阵世界的行/列（“形状”）类似物理世界的“量纲”，上式的结果不再是标量，则式中两项的“量纲”（形状）得一致。
 *      注2*：积分/微分，“量纲”仍然是检查公式正确性的好工具。
 *      注3*：用 dS/dδᵀ 来进行接下来的推导。
 *   S 作为平方和，其天生是开口向上的函数。要让 S 最小，即让 dS/dδᵀ = 0，则：
 *        0 = 2·Jᵀ·r + 2·(Jᵀ·J)·δ
 *          = 2·Jᵀ·(r + J·δ)      // 分配律
 *       => r + J·δ == 0
 *       => J·δ = -r              // ★
 *       => Jᵀ·J·δ = -Jᵀ·r
 *   线性求解器，就是求解这个 `J·δ = -r` 里的 δ。
 * - 注意：因为得到的线性化信息是【局部】的，因此得到的解只在 βₖ 点的邻域内近似成立。
 *   所以本模块求得的 δ 输出不是最优参数点，而是“线性模型下的理论最优解”。
 *   理论不等于实际，实际最优解需要用阻尼（damping）来修正，得到迭代用的步长。
 *   对步长的判据，由trust-region信任域/阻尼/信赖域子模块负责。
 * ---
 * 线性求解器有三种常见实现：正规方程、QR 分解、奇异值分解
 *   1.  正规方程法（normal-equations）
 *       先形成 Jᵀ·J，再 Cholesky 分解，最后用矩阵逆求解。
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
