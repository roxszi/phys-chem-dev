/**
 * @本应用的全局状态变量及通用方法
 * - downloadFile() 下载文件
 * - downloadJson() 将JSON对象下载为js文件。（可能会废弃）
 */


/**
 * 触发浏览器下载（通用工具）
 *   - 创建临时 <a>，设置 href 和 download 属性
 *   - click() 后 revokeObjectURL 释放内存
 */
export function triggerDownload(blob: Blob, filename: string): void {
  // 以Blob对象创建下载链接
  const url = URL.createObjectURL(blob)
  // 创建一个新的<a>下载链接元素块
  const a = document.createElement("a")
  // 赋值下载链接
  a.href = url
  // 设置该元素块下载功能赋值的文件名
  a.download = filename
  // 把<a>元素块挂载到DOM中
  document.body.appendChild(a)
  // 执行下载
  a.click()
  // 从文档中移除下载链接元素
  document.body.removeChild(a)
  // 延后释放，确保 click 已经处理
  setTimeout(() => URL.revokeObjectURL(url), 0)
}


/**
 * downloadFile 下载文件
 * @param dataBuffer - Buffer格式的数据对象。
 * @param fileName - 文件名(含扩展名)。
 * @param fileType - 文件MIME类型，默认为"application/octet-stream"
 */
export function downloadFile(
  dataBuffer: ArrayBuffer,
  fileName: string,
  fileType: string = "application/octet-stream"
) {
  // 将数据对象转换为Blob对象
  const dataBlob = new Blob([dataBuffer], { type: fileType })
  // 以Blob对象创建下载链接
  const url = URL.createObjectURL(dataBlob)
  // 创建一个新的<a>下载链接元素块
  const downloadLink = document.createElement("a")
  // 设置该元素块隐藏
  downloadLink.style.display = "none"
  // // 设置该元素块透明
  // downloadLink.style.opacity = "0"
  // 设置该元素块下载功能赋值的文件名
  downloadLink.download = fileName
  // 赋值下载链接
  downloadLink.href = url
  // 把<a>元素块挂载到DOM中
  document.body.appendChild(downloadLink)
  // 内存泄漏防范标记，先标记为未清理
  let isCleanedUp = false
  // 等待下一个渲染帧再执行，确保浏览器完成DOM渲染和URL的底层绑定
  requestAnimationFrame(() => {
    // 注册一个监听窗口焦点事件的回调：当下载交互完毕，窗口焦点回归时，自动清理下载链接和URL对象
    window.addEventListener("focus", _cleanup, { once: true })
    // 执行下载
    downloadLink.click()
    // 注册一个60秒后强制执行清理的回调
    setTimeout(_cleanup, 60000)
  })
  /**
   * 清理函数，移除DOM元素，释放Blob URL
   * 防止内存泄漏和资源浪费
   */
  function _cleanup() {
    // 如果已清理过，则直接返回
    if (isCleanedUp) { return }
    // 从文档中移除下载链接元素
    document.body.removeChild(downloadLink)
    // 释放创建的对象URL，释放内存
    URL.revokeObjectURL(url)
    // 标记为已清理
    isCleanedUp = true
  }
}


/**
 * downloadJson 将JSON对象下载为js文件
 * @param datasetJson - 数据集对象
 * @param datasetName - 数据集的名称
 * @note 数据集对象必须得是JSON化的。
 */
export function downloadJson(datasetJson: JSON, datasetName: string) {
  // 将对象转为文本文件的完整字符串
  const jsonStr = `export const ${ datasetName } = ${ JSON.stringify(datasetJson) }`
  // 创建编码器实例（默认UTF-8编码）
  const encoder = new TextEncoder()
  // 将字符串编码为Uint8Array视图
  const jsonUint8Array = encoder.encode(jsonStr)
  // 下载文件
  downloadFile(jsonUint8Array.buffer, "export-dataset.js", "application/javascript")
}
