/**
 * 阻尼策略模块
 *
 * 本目录职责：控制 LM 类算法的阻尼因子 λ——
 *   - λ 大：接近最速下降（保守、稳定）
 *   - λ 小：接近 Gauss-Newton（激进、快）
 * 架构位置：fitting 层的"可替换模块"——LM / ODR 等算法通过依赖注入接收。
 *
 * 对外暴露：
 *   - DampingStrategy 接口（current / onAccept / onReject）
 *   - DampingOptions 配置
 *   - MarquardtDamping / createMarquardtDamping：Marquardt 1963 固定倍数策略（默认）
 *
 * 扩展点：未来可以加 NielsenDamping（基于增益比 ρ 的自适应）。
 */
export type { DampingStrategy, DampingOptions } from './types.ts'
export { MarquardtDamping, createMarquardtDamping } from './marquardt.ts'
