"use strict"

/**
 * @本应用的全局状态变量及通用方法
 *   downloadFile() 下载文件
 *   downloadJson() 将JSON对象下载为js文件。（可能会废弃）
 */

/**
 * downloadFile 下载文件
 * @param { Buffer | Response | File } data Buffer格式的数据对象。
 * @param { String } fileName 文件名(含扩展名)。
 * @param { String } [fileType] 文件类型。
 */
export function downloadFile(data, fileName, fileType = "application/octet-stream") {
  // // 将数据对象转换为ArrayBuffer格式
  // const dataBuffer = dataBuffer instanceof ArrayBuffer
  //   ? data
  //   : await data.arrayBuffer()
  // 将数据对象转换为Blob对象
  const dataBlob = new Blob([data], { type: fileType })
  // 在网页上找一个id为“just-for-download”的下载链接元素块
  let downloadLink = document.getElementById("just-for-download")
  // 如果没找到这个元素块
  if (!downloadLink) {
    // 构建这个下载元素块
    downloadLink = document.createElement("a")
    // 设置该元素块的id为“justForDownload”
    downloadLink.setAttribute("id", "justForDownload")
    // 设置该元素块隐藏
    downloadLink.style.display = "none"
    // 设置该元素块下载功能赋值的文件名为“train-log.xlsx”
    downloadLink.download = fileName
  }
  // 把dataBlob赋值给元素块的下载链接
  const url = URL.createObjectURL(dataBlob)
  downloadLink.href = url
  // 执行下载
  downloadLink.click()
  // 清理：10秒后释放url对象
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}


/**
 * downloadJson 将JSON对象下载为js文件
 * @param { JSON } datasetJson 数据集对象。
 * @param { String } datasetName 数据集的名称。
 * @note 数据集对象必须得是JSON化的。
 */
export function downloadJson(datasetJson, datasetName) {
  // 将对象转为文本文件的完整字符串
  const datasetStr = `export const ${ datasetName } = ${ JSON.stringify(datasetJson) }`
  downloadFile(datasetStr, "export-dataset.js")
}
