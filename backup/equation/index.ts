/**
 * equation/backup/ — 化学公式集（备份）
 *
 * 依赖：
 *   - equation/types.ts：EquationModel schema
 *
 * 对外暴露：本目录下的全部公式模型
 */

// 零级反应
export { zeroOrder } from './zero-order.js'

// 一级反应（理想）
export { firstOrder } from './first-order.js'

// 一级反应（带平衡浓度）
export { firstOrderEquilibrium } from './first-order-equilibrium.js'

// 二级反应
export { secondOrder } from './second-order.js'

// 蔗糖水解（折光法）
export { sucroseHydrolysis } from './sucrose-hydrolysis.js'

// 阿伦尼乌斯方程
export { arrhenius } from './arrhenius.js'
