"use strict"

/**
 * @本应用的全局状态变量及通用方法
 *   goToPage() 前往新页面
 *   paramQuery() 把传参对象解析成url传参字符串格式，未导出
 *   findDom() 获取某个DOM元素对象
 *   wait() 等待，未导出
 *   downloadFile() 下载文件
 *   arrayTranspose() 数组转置
 *   downloadJson() 将JSON对象下载为js文件。（可能会废弃）
 */

/**
 * goToPage 前往新页面
 * @param { String } localPage 本地页面的url路径及传参。可以是相对路径，即最后一个节点；也可以是绝对路径，即pages开始。
 * @param { Object } [param] 额外传参，会加到localPage里进行传递。必须是封装的object对象。
 * @param { Boolean } [ifNavigate] 额外传参，是否必须保留当前页面。默认为true。
 */
export function goToPage(localPage, param, ifNavigate) { try {
  // 如果有额外传参，且传参格式正确
  if (param && (typeof param === "object")) {
    // 处理传参，搞个接传参序列化的字符串
    const paramQueryString = paramQuery(param)
    // 搞个用于匹配问号的正则表达式
    const regex = /\?/
    // 如果localPage里有问号，即已经有url传参了
    if (regex.test(localPage)) {
      // 就把param作为额外的传参加进localPage里去
      localPage = `${ localPage }&${ paramQueryString }`
    // 如果localPage里没问号，即还没有url传参
    } else {
      // 把param作为第一个传参加进localPage里去
      localPage = `${ localPage }?${ paramQueryString }`
    }
  }
  // 如果ifNavigate值为false
  if (ifNavigate === false) {
    // 则关闭当前页，前往新页面，省内存
    uni.redirectTo({ url: localPage })
      .catch(() => { underTransplantation() })
  // 否则
  } else {
    // 保留当前页，前往新页面
    uni.navigateTo({ url: localPage })
      .catch(() => { underTransplantation() })
  }
} catch (error) {
  console.error("goToPage()报错：", error)
  throw new Error(error)
}}

/**
 * 正在移植功能的临时跳转方法
 */
function underTransplantation() {
  uni.showModal({
    showCancel: true,
    title: "敬请期待",
    content: "该模块还在紧张移植中，可先访问原版。",
    cancelText: "留在该页",
    confirmText: "访问原版",
    success: (res) => {
      // 用户点击确定
      if (res.confirm) {
        // 开个新页面，跳转到老项目
        window.open("https://roxszi.atomgit.net/tfjs-index/", "_blank")
      }
    }
  })
}

/**
 * paramQuery 把传参对象解析成url传参字符串格式
 * @param { Object } paramObject 本地页面的传参，必须是object对象。
 * @return { String } 返回的字符串。
 */
function paramQuery(paramObject) { try {
  // 获得对象里的成员对象键的数组
  const keys = Object.keys(paramObject)
  // 数组调用map方法，组成键-值字符串的数组
  const paramStrings = keys.map((key) => {
    return `${ encodeURIComponent(key) }=${ encodeURIComponent(paramObject[key]) }`
  })
  // join()方法，用"&"连接字符串
  const paramQuery = paramStrings.join("&")
  // 返回解析好的url传参字符串
  return paramQuery
} catch (error) {
  console.error("paramQuery()报错：", error)
  throw new Error(error)
}}

/**
 * findDom 获取某个DOM元素对象
 * uni-app会对<video>、<canvas>进行封装，所以需要找到DOM。
 * @param { String } parentElementId 父元素的ID。
 * @param { String } elementTagName 要获取的元素的标签名。
 * @returns { Promise<HTMLElement> } 返回元素对象。
 */
export async function findDom(parentElementId, elementTagName) { try {
  // 先找父元素
  let parentElement = document.getElementById(parentElementId)
  // 如果没找到
  while (!parentElement) {
    // 等100毫秒
    await wait(100)
    // 再找
    parentElement = document.getElementById(parentElementId)
  }
  // 再找子元素
  let element = parentElement.getElementsByTagName(elementTagName)[0]
  // 如果没找到
  while (!element) {
    // 等100毫秒
    await wait(100)
    // 再找
    element = parentElement.getElementsByTagName(elementTagName)[0]
  }
  // 返回元素对象
  return element
} catch (error) {
  console.error("findDom()报错：", error)
  throw new Error(error)
}}

/**
 * wait 等待方法
 * @param { Number } ms 等待时间，单位是毫秒
 * @returns { Promise<void> } 单纯的等待
 */
export async function wait(ms) {
  // 返回Promise对象
  return new Promise((resolve) => {
    // 等待方法，回调为空方法
    setTimeout(resolve, ms)
  })
}

/**
 * downloadFile 下载文件
 * @param { Buffer | Response | File } data Buffer格式的数据对象。
 * @param { String } fileName 文件名(含扩展名)。
 * @param { String } [fileType] 文件类型。
 */
export function downloadFile(data, fileName, fileType = "application/octet-stream") { try {
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
} catch (error) {
  console.error("downloadFile()报错: ", error)
  throw new Error(error)
}}


/**
 * downloadJson 将JSON对象下载为js文件
 * @param { JSON } datasetJson 数据集对象。
 * @param { String } datasetName 数据集的名称。
 * @note 数据集对象必须得是JSON化的。
 */
export function downloadJson(datasetJson, datasetName) { try {
  // 将对象转为文本文件的完整字符串
  const datasetStr = `export const ${ datasetName } = ${ JSON.stringify(datasetJson) }`
  downloadFile(datasetStr, "export-dataset.js")
} catch (error) {
  console.error("downloadJson()报错：", error)
  throw new Error(error)
}}
