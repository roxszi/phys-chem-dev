/**
 * OpenCV.js 模块数据类型
 * 用 Emscripten 构建的 ESM 的 OpenCV.js 模块，并分离了独立的 wasm 文件
 * @note 该 d.ts 文件为全局模块，务必注意命名空间/变量污染问题
 */

/** 全局声明 OpenCV 对象 */
type OpenCV = import("@techstark/opencv-js").CV
type OpenCVMat = import("@techstark/opencv-js").Mat
type OpenCVEllipse = import("@techstark/opencv-js").RotatedRect
type OpenCVMatVector = import("@techstark/opencv-js").MatVector


/**
 * Emscripten 原生 ES Module 导出的异步工厂函数
 * （opencv.js 默认导出 `cv`）
 */
type OpenCVFactory = (
  /** 该工厂函数的传参对象 */
  args?: {
    /**
     * 回调函数，用于显式指定 OpenCV.js 的 wasm 文件路径
     * @param wasmDirectory OpenCV.wasm 文件所在的目录
     * @param wasmName OpenCV.wasm 文件名（默认为 `opencv_js.wasm`）
     * @returns OpenCV.wasm 文件的完整路径
     */
    locateFile?: (wasmDirectory: string, wasmName: string) => string
  }
) => Promise<OpenCV>

/**
 * OpenCV 的 ESM 模块
 * 内含 OpenCV 的 wasm 导入工厂函数等
 */
declare module "@utils/opencv/*/opencv_js.js" {
  const factory: OpenCVFactory
  export default factory
}
