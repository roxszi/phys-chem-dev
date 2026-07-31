/**
 * OpenCV.js (wasm) 浏览器端计算引擎的 composable 组合式函数
 * ---
 * 流程：
 * 1.  宿主环境预检测：SIMD (WebAssembly SIMD)；pthreads (SharedArrayBuffer / crossOriginIsolated)
 * 2.  功能指定：profile（"min" | "all"），min 适用于各生产环境；all 适用于开发环境。默认 min
 * 3.  根据 1 和 2 确定具体构建产物。并以 ES Module 动态 import 具体版本的 opencv.js
 *     （因为 Emscripten 已经做了 minify 处理，所以用 `@vite-ignore` 注释，不进行 vite 打包编译产物）
 * 4.  opencv.js 内部 fetch 同目录的 opencv_js.wasm、调用 WebAssembly.instantiate、初始化 OpenCV C++ 运行时
 * 5.  校验必需 API（Mat / Canny / cvtColor / findContours / fitEllipseAMS）存在，暴露 OpenCV
 * ---
 * 设计思路：
 * - 模块级 singleton：模块顶层 shallowRef 确保多个 Vue 组件共享同一份 wasm 实例（跨页面也共享）
 * - 并发去重：同一 profile 并发调用复用同一 Promise；不同 profile 显式拒绝（避免 OpenCV Mat 与新 Runtime 混用）
 * - 自动 fallback：单变体失败不 throw，记录原因后试下一个；全部失败时抛 AggregateError 保留完整错误链
 * - AggregateError：错误聚合避免调试时只能看到最后一次失败
 * - readonly() 包裹 ref：业务侧不能直接修改状态机
 * ---
 * @note 必须通过手动复制部署以下文件到 public/opencv/<variant>/ 目录：
 * - opencv.js         ← Emscripten 运行时 + Embind 类型系统 + OpenCV JS 胶水类（Mat/Point/Range 等）
 * - opencv_js.wasm    ← OpenCV C++ 源码编译成的 WebAssembly 字节码
 * ---
 * @note 为什么不能用 Vite 的 `?init` 后缀 / WASM ESM Integration 直接 import .wasm 文件：
 * - OpenCV 是 C++ 巨型库（几 MB ~ 十几 MB wasm），已用 Emscripten 编译打包。vite 二次打包开销大、收益小
 * - Emscripten 产物结构 = opencv.js（runtime + Embind + JS 胶水）+ opencv_js.wasm（C++ 字节码）
 * - opencv.js 不是"翻译官"，而是 wasm 必需的"操作系统"（仿真 FS/MEMFS/PATH/Browser、Embind 类型系统、线性内存管理）
 * - opencv.js 已经在 Emscripten 编译打包时做了 minify 处理
 * - 因此本 composable 走的是"`import()` opencv.js → opencv.js 内部再 fetch wasm"这条路径，绕开 Vite 的 wasm 处理管线
 */


// ==== 类型定义 ====

/** OpenCV.js 加载状态 */
export type OpenCVStatus = "idle" | "loading" | "ready" | "error"
/**
 * OpenCV.js 构建类型
 * - min 最小构建，适用于生产环境
 * - all 全部构建，适用于开发环境
 */
export type OpenCVProfile = "min" | "all"
/**
 * 支持的 OpenCV.js 运行时变体类型
 * - fallback：纯 wasm，兼容老浏览器
 * - simd：含 SIMD 指令，速度更快（Chrome 91+ / Firefox 89+ / Safari 16.4+）
 * - pthreads：多线程版（需 SharedArrayBuffer + crossOriginIsolated）
 *   - simd.pthreads：含 SIMD 指令 + 多线程（需 SharedArrayBuffer + crossOriginIsolated）
 */
export type OpenCVVariant = "fallback" | "simd" | "simd.pthreads"


// 本项目必需的 OpenCV API
const REQUIRED_APIS = ["Mat", "Canny", "cvtColor", "findContours", "fitEllipseAMS"]


// === 本模块的私有状态对象 ===
/** 全局共享的加载 Promise，用于并发去重 */
let _loadPromise: Promise<OpenCV> | null = null
/** OpenCV.js（包含 cv.Mat / cv.Canny 等所有 API），外部 readonly */
// const _runtime = shallowRef<OpenCV | null>(null)
const _cvRef = shallowRef<OpenCV | null>(null)
/** OpenCV.js 加载状态机，外部 readonly */
const _status = shallowRef<OpenCVStatus>("idle")
/** 实际加载成功的变体，外部 readonly */
const _variant = shallowRef<OpenCVVariant | null>(null)


// === 宿主环境检测实现 ===


/**
 * 检测 WebAssembly SIMD 支持
 * 
 * 该字节序列是一个含 `v128.const` 的最小合法模块。使用 `WebAssembly.validate`
 * 只做语法能力检测，不创建实例，也不分配持久资源 —— 是教科书级的 SIMD 探测函数。
 * @returns 浏览器是否支持 WebAssembly SIMD 指令集
 */
export function supportsWasmSimd(): boolean {
  // 浏览器环境最基础的两道闸：WebAssembly API 存在 + validate 函数存在
  if ((typeof WebAssembly === "undefined") || (typeof WebAssembly.validate !== "function")) {
    return false
  }
  try {
    // 最小 SIMD wasm 模块字节流：
    // magic(4) + version(4) + type section(7) + func section(4) + code section(22) = 41 字节
    // 核心：code 段里的 v128.const 指令只能被支持 SIMD 的引擎通过 validate
    return WebAssembly.validate(new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
      0x03, 0x02, 0x01, 0x00,
      0x0a, 0x16, 0x01, 0x14, 0x00, 0xfd, 0x0c,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x0b,
    ]))
  } catch {
    // 任何异常都视为不支持
    return false
  }
}


/**
 * 检测 WebAssembly pthreads（多线程）支持
 * 
 * pthreads 版需要 SharedArrayBuffer 和跨源隔离同时成立：
 * - SharedArrayBuffer：API 必须存在
 * - crossOriginIsolated：必须通过以下两个响应头激活
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Embedder-Policy: require-corp
 * @returns 浏览器是否支持 pthreads 版 OpenCV.js
 */
export function supportsWasmPthreads(): boolean {
  // 必须两个条件同时成立：API 存在 + 跨源隔离已激活
  return (
    (typeof SharedArrayBuffer !== "undefined")
      && (globalThis.crossOriginIsolated === true)
  )
}


// === 加载策略：变体选择与工厂加载 ===


/**
 * 从静态资源目录加载指定构建变体的 opencv.js 工厂函数
 * 
 * OpenCV.js 与 WASM 产物应部署到 `public/opencv/<variant>/`。
 * 
 * 这里保留四个显式分支来约束合法变体；
 * 用 `@vite-ignore` 注释让浏览器直接按 URL 导入预构建 Emscripten ESM，
 * 避免 Vite 再次打包 14 MB 的生成文件。
 * 
 * @param profile  选中的构建
 * @param variant  运行时种类
 * @returns Emscripten 工厂函数（opencv.js 的默认导出）
 * @note 该步骤返回工厂函数，避免重复拉取
 */
async function importFactory(profile: OpenCVProfile, variant: OpenCVVariant): Promise<OpenCVFactory> {
  try {
    /** 以“构建”-“变体”作为key */
    const key = `${ profile }-${ variant }`
    // 显式分支，以匹配vite静态分析
    // 注：switch 下的各 case 并非独立作用域，
    //     如果先 `const module = ...` 再 `return module.default`，会导致多 module 对象名冲突
    //     因此直接 return 即可
    switch (key) {
      case "min-simd":
        return (
          (await import("@utils/opencv/min-simd/opencv.js"))
            .default
        )
      case "min-fallback":
        return (
          (await import("@utils/opencv/min-fallback/opencv.js"))
            .default
        )
      case "all-simd":
        return (
          (await import("@utils/opencv/all-simd/opencv.js"))
            .default
        )
      default:
        throw new Error(`未知的计算引擎: ${ key }`)
    }
  } catch (err) {
    throw new Error(
      `[useOpenCV] OpenCV ${ profile }-${ variant } 拉取失败：\n`
        + (err as Error).message
    )
  }
}


/**
 * 按宿主能力生成可用的变体列表
 * 
 * 策略："simd.pthreads" > "simd" > "fallback"
 * @returns 按优先级排序的变体候选列表
 */
function getVariants(): OpenCVVariant[] {
  /** 候选列表 */
  const variants: OpenCVVariant[] = ["fallback"]
  // 如果支持 SIMD
  if (supportsWasmSimd()) {
    // 先加 SIMD
    variants.unshift("simd")
    // 如果支持 pthreads
    if (supportsWasmPthreads()) {
      // 加上 pthreads 候选
      variants.unshift("simd.pthreads")
    }
  }
  // 返回列表（包含 fallback）
  return variants
}


/**
 * 校验 OpenCV.js 运行时是否包含必需 API
 * 
 * 不同构建变体的 whitelist（OpenCV BINDINGS_WHITELIST）可能漏配某些函数；
 * 加载成功后立即校验必需 API，防止运行时调用 `cv.Canny` 等才报 undefined。
 * @param cv 待检测的OpenCV对象
 */
function assertOpenCV(cv: OpenCV): void {
  /** 缺失的API */
  const missingApis = REQUIRED_APIS.filter(apiName => !(apiName in cv))
  // 缺失则抛错，让 loadOpenCV 触发 fallback 候选
  if (missingApis.length > 0) {
    throw new Error(`[OpenCV.js] 构建产物缺少必需 API：${ missingApis.join(", ") }`)
  }
}


// === 加载逻辑 ===

/**
 * 按候选优先级加载 OpenCV.js
 * 
 * 关键设计：
 * - 单个优化版本失败时记录原因并降级到下一个候选
 * - 所有候选均失败时用 AggregateError 保留完整错误链
 * - 避免调试时只能看到最后一次失败（"哎我明明 SIMD 优先，为什么还在跑 fallback？"）
 * @param profile 构建类型（min | all）
 * @returns 成功加载的 OpenCV.js 运行时
 */
async function loadOpenCV(profile: OpenCVProfile) {
  // 状态机：开始加载
  _status.value = "loading"
  /** 支持的变体列表 */
  const variants = getVariants()
  // 依次尝试每个候选
  for (const variant of variants) {
    try {
      // 阶段 1：动态 import opencv.js 拿到工厂函数
      const factory = await importFactory(profile, variant)
      // 阶段 2：调用工厂函数（内部会 fetch opencv_js.wasm + 实例化 wasm）
      const module = await factory()
      // const module = await factory({
      //   // 以 locateFile 回调，显式指定 wasm 文件位置
      //   locateFile(fileName) {
      //     const realFile = withBase(`${ BASE_URL }/${ profile }-${ variant }/${ fileName }`)
      //     return realFile
      //   },
      // })
      // 阶段 3：校验必需 API（防止 whitelist 漏配）
      assertOpenCV(module)
      // 成功！记录实际加载的变体
      _status.value = "ready"
      _variant.value = variant
      _cvRef.value = module
      // 返回 OpenCV.js 运行时
      return module
    } catch (err) {
      console.warn(err)
    }
  }
  // 所有候选都失败：Error
  _status.value = "error"
  throw new Error("[useOpenCV] OpenCV.js 没有可用的运行时")
}


// === Composable 主体 ===

/**
 * OpenCV.js 的 Vue composable
 * 
 * 设计思路：
 * - 模块级状态确保多个页面共享同一 WASM 实例（不会被组件卸载意外销毁）
 * - 同一配置的并发调用复用同一个 Promise
 * - 不同配置不能在运行中切换，以免旧 Mat 与新 Runtime 混用；
 *   需要切换 profile 时应刷新页面或独立放入 Worker
 * @param profile OpenCV.js 构建种类（min | all）
 * @example
 * ```ts
 * const { OpenCVStatus, OpenCV, OpenCVVariant, ensureOpenCVReady } = useOpenCV()
 * onMounted(() => ensureOpenCVReady())
 * ```
 */
export function useOpenCV(profile: OpenCVProfile = "min") {

  /**
   * 确保 OpenCV.js 已加载完成
   * 幂等：多次调用复用同一 Promise。
   * 不同 profile/baseUrl 的并发请求会被显式拒绝（避免 Mat 跨 Runtime 混用）。
   */
  function ensureReady(): Promise<OpenCV> {
    // 情况 1：已经 ready
    if (_status.value === "ready" && _cvRef.value) {
      // 直接返回 OpenCV；不一致 → 拒绝
      return Promise.resolve(_cvRef.value)
    }
    // 情况 2：正在加载中
    if (_loadPromise) {
      // 复用同一 Promise（并发去重）
      return _loadPromise
    }
    // 情况 3：首次调用 → 启动加载流程
    // 状态切换为 "loading"
    _status.value = "loading"
    // 生成新的 Promise
    _loadPromise = loadOpenCV(profile)
    // 返回 Promise
    return _loadPromise
  }

  // 返回 composables 内容（readonly() 包裹保证外部不能直接修改状态机）
  return {
    /** 状态机："idle" | "loading" | "ready" | "error"，外部只读 */
    OpenCVStatus: readonly(_status),
    /** 加载成功的 OpenCV.js 运行时（含 cv.Mat / cv.Canny 等 API），外部只读 */
    OpenCV: readonly(_cvRef),
    /** 实际加载的变体，外部只读 */
    OpenCVVariant: readonly(_variant),
    /** 触发加载，幂等 */
    ensureOpenCVReady: ensureReady,
  }
}
