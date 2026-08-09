/**
 * tfjs 后端加载（环境无关版）
 *
 * 与 phys-chem/frontend/composables/useTFjs.ts 同源，但去掉了 Vue 的依赖
 * （shallowRef / readonly），使其能在 Node 测试环境直接运行。
 *
 * 浏览器宿主可包装成 composable：参见 useTFjs.reference.ts（同目录）。
 *
 * 流程：
 *   1. tfjs-core 静态 import
 *   2. 计算引擎按环境动态加载：先检测 navigator.gpu / WebGL 上下文
 *   3. 优先级：webgpu > webgl > cpu
 *
 * Node 测试环境：强制使用 cpu backend（无 WebGL / WebGPU）
 */
import * as tf from '@tensorflow/tfjs-core'

export type TfjsBackend = 'webgpu' | 'webgl' | 'cpu'
export type TfjsStatus = 'idle' | 'loading' | 'ready' | 'error'

let _loadPromise: Promise<TfjsBackend> | null = null
let _status: TfjsStatus = 'idle'
let _backend: TfjsBackend | null = null

/** 状态访问器（浏览器宿主可包成 ref） */
export function getStatus(): TfjsStatus {
  return _status
}
export function getBackend(): TfjsBackend | null {
  return _backend
}

/** 检测 WebGPU */
function detectWebGPU(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { gpu?: unknown }).gpu
  )
}

/** 检测 WebGL */
function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** 列出可用后端（按优先级排序） */
function pickAvailableBackends(): TfjsBackend[] {
  const all: TfjsBackend[] = ['webgpu', 'webgl', 'cpu']
  const support: Record<TfjsBackend, boolean> = {
    webgpu: detectWebGPU(),
    webgl: detectWebGL(),
    cpu: true,
  }
  return all.filter((b) => support[b])
}

/** 加载指定 backend 包 */
async function loadBackend(backend: TfjsBackend): Promise<void> {
  try {
    switch (backend) {
      case 'webgpu':
        // WebGPU 包是 optional，未安装时静默跳过
        await import('@tensorflow/tfjs-backend-webgpu')
        break
      case 'webgl':
        await import('@tensorflow/tfjs-backend-webgl')
        break
      case 'cpu':
        await import('@tensorflow/tfjs-backend-cpu')
        break
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err)
    // 模块未安装（环境不支持）时返回 false，由上层切换备选
    if (msg.includes('Cannot find') || msg.includes('Failed to resolve')) {
      throw new Error(`optional module not installed: ${backend}`)
    }
    throw new Error(`[loadTFjs] 后端 "${backend}" 加载失败：\n${msg}`)
  }
}

/** 设置后端 */
async function tryBackend(backend: TfjsBackend): Promise<boolean> {
  try {
    await tf.setBackend(backend)
    await tf.ready()
    return tf.getBackend() === backend
  } catch {
    return false
  }
}

/** 主加载逻辑 */
async function doLoad(): Promise<TfjsBackend> {
  const available = pickAvailableBackends()
  if (available.length === 0) {
    _status = 'error'
    throw new Error('[loadTFjs] 没有可用后端')
  }

  for (const backend of available) {
    try {
      await loadBackend(backend)
      const ok = await tryBackend(backend)
      if (ok) {
        _backend = backend
        _status = 'ready'
        return backend
      }
    } catch (err) {
      console.warn(
        `[loadTFjs] 后端 "${backend}" 失败：\n${(err as Error).message}`,
      )
    }
  }
  _status = 'error'
  throw new Error('[loadTFjs] 所有后端都失败')
}

/** 幂等加载入口 */
export function ensureTFjsReady(): Promise<TfjsBackend> {
  if (_status === 'ready' && _backend) {
    return Promise.resolve(_backend)
  }
  if (_loadPromise) return _loadPromise
  _status = 'loading'
  _loadPromise = doLoad()
  return _loadPromise
}

/** 释放变量（浏览器场景防止内存泄漏） */
export function disposeTFjsVariables(): void {
  if (tf && _backend) {
    try {
      tf.disposeVariables()
    } catch {
      // 忽略
    }
  }
}

/** tfjs 命名空间导出（让其他模块共享同一个 tf 实例） */
export { tf }
