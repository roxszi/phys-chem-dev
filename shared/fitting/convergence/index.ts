/**
 * 收敛判据模块
 *
 * 本目录职责：判断迭代算法是否已收敛（参数 / SSE / 梯度三判据）。
 * 架构位置：fitting 层的"可替换模块"——LM / ODR 等算法通过依赖注入接收。
 *
 * 对外暴露：
 *   - ConvergenceCheck 接口（check(state) => boolean）
 *   - ConvergenceOptions 配置
 *   - DefaultConvergence / createDefaultConvergence：默认三判据 OR 实现
 *     （含加权场景的相对 SSE 判据——见 default.ts 注释）
 *
 * 扩展点：未来可以加 RelativeConvergence（纯相对判据）、MaxIterationsConvergence（只看迭代数）。
 */
export type { ConvergenceCheck, ConvergenceOptions } from './types.js'
export { DefaultConvergence, createDefaultConvergence } from './default.js'
