/**
 * base/ — 通用小工具集合（杂项）
 *
 * 架构层级：Tier 0 — 通用
 *
 * 依赖：
 *   - 无（纯标准库）
 *
 * 对外暴露：纯函数式数组校验原语，没有任何业务上下文。
 *
 * 扩展约定：等到本目录内某一类工具成规模，再独立成上一级目录。
 */

/**
 * 数组校验：长度一致 / 最小长度 / 元素有限
 */
// 数组长度一致性校验
export {
  validateSameLength,
  validateMinLength,
  validateFiniteArray,
} from './array-validation.js'
