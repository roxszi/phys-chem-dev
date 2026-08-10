/**
 * tfjs/ — tfjs 集成层（可选）
 * 
 * @note 目前没实现
 * 
 * 依赖：
 *   - fitting/：JacobianProvider / ODRJacobianProvider 接口
 *   - @tensorflow/tfjs-core 及三个 backend 包（external，按需动态加载）
 *
 * 对外暴露：tfjs 后端加载 + tfjs 兼容 ODR 雅可比（当前为占位，fallback 到数值差分）。
 *
 * 不依赖 Vue / 浏览器 API——纯 TypeScript，Node / 浏览器通用。
 */

// 后端加载与状态
export {
  ensureTFjsReady,
  disposeTFjsVariables,
  getStatus,
  getBackend,
  tf,
} from './loadTFjs.js'
export type { TfjsBackend, TfjsStatus } from './loadTFjs.js'

// ODR 雅可比（tfjs 兼容，当前 fallback）
export {
  TfjsODRJacobian,
  createTfjsODRJacobian,
} from './jacobian.js'
export type { TfjsODRJacobianOptions } from './jacobian.js'
