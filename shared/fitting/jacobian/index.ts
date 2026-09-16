/**
 * 雅可比矩阵计算子模块
 * ---
 * 简介：
 * - 雅可比矩阵，即计算模型预测函数对参数的偏导数：`J[n][p] = ∂f/∂βⱼ`。式中，n为数据样本数，p为参数个数。
 * - 主流雅可比方法有3种：
 *   - 解析雅可比：用户手写解析公式，计算量小，但需要用户手动推导公式，且公式复杂时推导困难。
 *   - 自动微分：JS语系下，利用 tfjs-core 库自动求导，计算量小，且可实现 GPU 硬件加速（见 tfjs-auto-diff.ts，待实现）。
 *   - 数值雅可比：有限差分近似，简单通用，无需手推公式；纯 JS 实现，无法 GPU 加速（见 numerical.ts）。
 */

// 数据类型
export type {
  JacobianProvider,
  ODRJacobianProvider,
  NumericalJacobianOptions,
} from "./numerical.ts"

// 数值雅可比
export { lmNumericalJacobian, odrNumericalJacobian } from "./numerical.ts"
