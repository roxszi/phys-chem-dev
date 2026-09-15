/**
 * 雅可比矩阵计算子模块
 * ---
 * 简介：
 * - 雅可比矩阵，即计算模型预测函数对参数的偏导数：`J[n][p] = ∂f/∂βⱼ`。式中，n为数据样本数，p为参数个数。
 * - 主流雅可比方法有3种：
 *   - 解析雅可比：用户手写解析公式，计算量小，但需要用户手动推导公式，且公式复杂时推导困难。
 *   - 自动微分：JS语系下，利用 tfjs-core 库自动求导，计算量小，且可实现 GPU 硬件加速。
 *   - 数值雅可比：
 * - 如果后续数据量变大，本模块要引入[自动微分]方法（应该会用 tfjs-core 库实现）
 */

// 数据类型
export type { JacobianProvider, NumericalJacobianOptions } from "./numerical.ts"

// 数值雅可比
export { lmNumericalJacobian, odrNumericalJacobian } from "./numerical.ts"
