"use strict"

/**
 * @本应用的全局状态变量及通用方法
 *   downloadFile() 下载文件
 *   downloadJson() 将JSON对象下载为js文件。（可能会废弃）
 */


/**
 * downloadFile 下载文件
 * @param { ArrayBuffer } dataBuffer Buffer格式的数据对象。
 * @param { string } fileName 文件名(含扩展名)。
 * @param { string } [fileType = "application/octet-stream"] 文件类型。
 */
export function downloadFile(dataBuffer, fileName, fileType = "application/octet-stream") {
  // // 将数据对象强转为ArrayBuffer格式
  // const dataBuffer =
  //   (dataBuffer instanceof ArrayBuffer)
  //     ? dataBuffer
  //     : await dataBuffer.arrayBuffer()
  // 将数据对象封装为Uint8Array通用格式，然后转换为Blob对象
  const dataBlob = new Blob([new Uint8Array(dataBuffer)], { type: fileType })
  // 创建一个新的<a>下载链接元素块
  const downloadLink = document.createElement("a")
  // 设置该元素块隐藏
  downloadLink.style.display = "none"
  // 设置该元素块下载功能赋值的文件名
  downloadLink.download = fileName
  // 把<a>元素块挂载到DOM中
  document.body.appendChild(downloadLink)
  // 把dataBlob赋值给元素块的下载链接
  const url = URL.createObjectURL(dataBlob)
  downloadLink.href = url
  // 执行下载
  downloadLink.click()
  // 清理：3秒后释放<a>元素块及url对象
  setTimeout(() => {
    document.body.removeChild(downloadLink)
    URL.revokeObjectURL(url)
  }, 3000)
}


/**
 * downloadJson 将JSON对象下载为js文件
 * @param { JSON } datasetJson 数据集对象。
 * @param { String } datasetName 数据集的名称。
 * @note 数据集对象必须得是JSON化的。
 */
export function downloadJson(datasetJson, datasetName) {
  // 将对象转为文本文件的完整字符串
  const jsonStr = `export const ${ datasetName } = ${ JSON.stringify(datasetJson) }`
  // 创建编码器实例（默认UTF-8编码）
  const encoder = new TextEncoder()
  // 将字符串编码为Uint8Array视图
  const jsonUint8Array = encoder.encode(jsonStr)
  // 下载文件
  downloadFile(jsonUint8Array.buffer, "export-dataset.js", "application/javascript")
}
