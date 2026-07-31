/**
 * TensorFlow.js 浏览器端计算引擎的 composable 组合式函数
 * ---
 * 流程：
 * 1.  tfjs-core 静态 import
 * 2.  计算引擎按环境动态加载：先检测 navigator.gpu / WebGL 上下文，然后生成可用的计算环境
 * 3.  根据 webgpu > webgl > cpu 的优先级顺序，从可用的计算环境中下载 backend 包
 * ---
 * 设计思路：
 * - 模块级 singleton：多次调用 useTfjs() 共享同一个 backend 实例
 * - 状态机：'idle' → 'loading' → 'ready' | 'error'
 * ---
 * @note 必须通过 `pnpm i -D` 安装以下库：
 * - @tensorflow/tfjs-core
 * - @tensorflow/tfjs-backend-webgpu
 * - @tensorflow/tfjs-backend-webgl
 * - @tensorflow/tfjs-backend-cpu
 */

// 导入 tfjs-core
import * as tf from "@tensorflow/tfjs-core"

// ==== 类型定义 ====
/** tfjs 支持的计算引擎类型 */
export type TfjsBackend = "webgpu" | "webgl" | "cpu"
/** 加载状态机 */
export type TfjsStatus = "idle" | "loading" | "ready" | "error"

// === 本模块的私有状态对象 ===
/** TFjs 计算引擎的 Promise 对象 */
let _loadPromise: (Promise<TfjsBackend> | null) = null
/** 本模块 TFjs 加载状态 */
const _statusRef = shallowRef<TfjsStatus>("idle")
/** TFjs 计算引擎类型 */
const _backendRef = shallowRef<TfjsBackend | null>(null)


// === 宿主环境检测实现 ===


/**
 * 检测 WebGPU 支持
 * 要求 navigator.gpu 存在
 * 注意：仅检测 API 是否存在，**不**触发 GPU 设备请求（避免不必要的资源占用）
 */
function detectWebGPU(): boolean {
  return !!(
    typeof navigator !== "undefined"
      && (navigator as (Navigator & { gpu?: unknown })).gpu
  )
}


/**
 * 检测 WebGL 支持
 * 通过创建 canvas 上下文判断
 * 比 navigator.gpu 检测更"重"，但能确认 GPU 真的可用
 */
function detectWebGL(): boolean {
  // 没有 document 对象：直接返回 false
  if (typeof document === "undefined") return false
  // 用 canvas 检测
  try {
    const canvas = document.createElement("canvas")
    return !!(
      canvas.getContext("webgl2")
        || canvas.getContext("webgl")
    )
  } catch {
    return false
  }
}


/**
 * 综合环境检测结果，返回实际可用的后端列表
 * 顺序：webgpu > webgl > cpu
 */
function pickAvailableBackends(): TfjsBackend[] {
  /** 全部计算引擎 */
  const backends: TfjsBackend[] = ["webgpu", "webgl", "cpu"]
  /** 支持的计算引擎 */
  const support: Record<TfjsBackend, boolean> = {
    webgpu: detectWebGPU(),
    webgl: detectWebGL(),
    // cpu 总是"支持"
    cpu: true,
  }
  /** 可用的计算引擎 */
  const available: TfjsBackend[] = backends.filter((item) => support[item])
  return available
}


// === 按需加载 backend 包 ===


/**
 * 加载 backend 包
 */
async function loadBackend(backend: TfjsBackend): Promise<void> {
  try {
    // 以字符串字面量实现 vite 在 build/dev 时分析 import 路径
    switch (backend) {
      case "webgpu":
        await import("@tensorflow/tfjs-backend-webgpu")
        break
      case "webgl":
        await import("@tensorflow/tfjs-backend-webgl")
        break
      case "cpu":
        await import("@tensorflow/tfjs-backend-cpu")
        break
      default:
        throw new Error(`未知的计算引擎: ${ backend }`)
    }
  } catch (err) {
    throw new Error(
      `[useTfjs] 计算引擎 "${ backend }" 加载失败：\n`
        + (err as Error).message
    )
  }
}


/**
 * 设置计算引擎
 * 
 * 返回 true 表示成功，false 表示失败
 */
async function tryBackend(backend: TfjsBackend): Promise<boolean> {
  try {
    // 设置 backend
    await tf.setBackend(backend)
    // 等待 tfjs 初始化完成
    await tf.ready()
    // 检查当前 backend 是否设置成功
    return (tf.getBackend() === backend)
  } catch {
    return false
  }
}


// === 加载逻辑 ===


/**
 * 加载逻辑
 * 
 * 根据 webgpu > webgl > cpu 的优先级顺序，从可用的计算环境中下载 backend 包
 */
async function doLoad() {
  // 状态机："idle" → "loading"
  _statusRef.value = "loading"
  /** 可用计算引擎 */
  const availableBackends = pickAvailableBackends()
  // 如果没有可用的计算引擎
  if (availableBackends.length === 0) {
    // 报错
    _statusRef.value = "error"
    throw new Error("[TensorFlow.js] 没有可用计算引擎")
  }
  // 开始加载
  forEachLoad: for (const backend of availableBackends) {
    // 阶段 1：加载 backend 包
    try {
      await loadBackend(backend)
    } catch (err) {
      console.warn(
        `[TensorFlow.js] 计算引擎 "${ backend }" 加载失败：\n`
          + (err as Error).message
      )
      // 继续下一个循环循环
      continue forEachLoad
    }
    // 阶段 2：设置计算引擎
    try {
      const isOK = await tryBackend(backend)
      // 如果切换成功
      if (isOK) {
        // 赋值
        _backendRef.value = backend
        _statusRef.value = "ready"
        // 返回当前计算引擎
        return backend
      }
    } catch (err) {
      console.warn(
        `[TensorFlow.js] 计算引擎 "${ backend }" 设置失败：\n`
          + (err as Error).message
      )
    }
  }
  // 如果所有计算引擎都失败
  _statusRef.value = "error"
  throw new Error("[TensorFlow.js] 没有可用计算引擎")
}


// === Composable 主体 ===

/**
 * 获取 tfjs 计算环境访问句柄
 * 
 * @example
 * ```ts
 * const { TFjsStatus, TFjsEngine, ensureTFjsReady, disposeTFjsVariables } = useTFjs()
 * onMounted(() => ensureTFjsReady())
 * ```
 */
export function useTFjs() {

  /**
   * 确保加载完成
   * 
   * 幂等：多次调用复用同一 Promise。
   * 内部会先做宿主环境预检测，再决定下载哪些 backend 包。
   */
  function ensureReady(): Promise<TfjsBackend> {
    // 如果已经加载完成
    if (_statusRef.value === "ready" && _backendRef.value) {
      // 直接返回当前计算引擎
      return Promise.resolve(_backendRef.value)
    }
    // 如果正在加载，即存在 _loadPromise
    if (_loadPromise) {
      // 直接返回当前 Promise
      return _loadPromise
    }
    // 开始加载
    _loadPromise = doLoad()
    return _loadPromise
  }

  /**
   * 释放当前计算引擎的变量内存
   */
  function disposeVariables(): void {
    // 如果 tf 和计算引擎都存在
    if (tf && _backendRef.value) {
      // 释放当前计算引擎的变量内存，但保留 tfjs 模块
      try {
        tf.disposeVariables()
      } catch {
        /* 忽略清理错误 */
      }
    }
  }

  // 返回 composables 内容
  return {
    /** tf 本体 */
    tf: tf,
    /** 状态机："idle" | "loading" | "ready" | "error"，外部只读 */
    TFjsStatus: readonly(_statusRef),
    /** 当前激活的后端："webgpu" | "webgl" | "cpu" | null，外部只读 */
    TFjsEngine: readonly(_backendRef),
    /** 触发加载。幂等 */
    ensureTFjsReady: ensureReady,
    /** 释放当前资源 */
    disposeTFjsVariables: disposeVariables,
  }
}
