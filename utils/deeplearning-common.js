"use strict"

/**
 * @深度学习的全局状态变量及通用方法
 */

/**
 * @库导入
 */
// 导入tfjs和tfvis和库
import * as tf from "@tensorflow/tfjs"
import * as tfvis from "@tensorflow/tfjs-vis"
// 导入xlsx库，以XLSX作为引用对象
import * as XLSX from "xlsx"
// 从vue库导入各类响应式变量构造器
import { shallowRef } from "vue"
// 导入数据集
// import { gsdDataAoaExample } from "../datasets/gsd-data-aoa-example.js"

/**
 * @全局状态变量
 *   tfBackendRef tf后端加载状态
 */

/**
 * @tf后端加载状态
 * @const { ShallowRef }
 */
export const tfBackendRef = shallowRef(null)

/**
 * @全局通用方法
 *   goToPage() 前往新页面
 *   paramQuery() 把传参对象解析成url传参字符串格式，未导出
 *   findDom() 获取某个DOM元素对象
 *   wait() 等待，未导出
 *   downloadFile() 下载文件
 *   arrayTranspose() 数组转置
 *   showVisor() 打开图表栏
 *   downloadJson() 将JSON对象下载为js文件。（可能会废弃）
 *   downloadTrainHistoryToXlsx() 将训练数据下载为excel文件
 *   showModelSummary() 可视化模型概要
 *   showModelLayers() 可视化模型各层训练结果
 *   aoaTotfvisChart() 用tfvis渲染Aoa数据为图表的封装方法
 *   downloadExampleFile() 下载示例波谱文件
 *   readXlsxFile() 读取XLSX文件为工作簿对象
 *   sheetToDataArr() 从工作表提取原始数据的方法
 *   arrRangeAve() 数组从小到大序列的某个范围内的均值，未导出
 *   minToZero() 零位校正
 *   maxToOne() 归一化，即上限归一
 */

/**
 * @goToPage 前往新页面
 * @function
 * @param { string } localPage 本地页面的url路径及传参。可以是相对路径，即最后一个节点；也可以是绝对路径，即pages开始。
 * @param { object } [param] 额外传参，会加到localPage里进行传递。必须是封装的object对象。
 * @param { boolean } [ifNavigate] 额外传参，是否必须保留当前页面。默认为true。
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
      localPage = `${localPage}&${paramQueryString}`
    // 如果localPage里没问号，即还没有url传参
    } else {
      // 把param作为第一个传参加进localPage里去
      localPage = `${localPage}?${paramQueryString}`
    }
  }
  // 如果ifNavigate值为false
  if (ifNavigate === false) {
    // 则关闭当前页，前往新页面，省内存
    uni.redirectTo({ url: localPage })
  // 否则
  } else {
    // 保留当前页，前往新页面
    uni.navigateTo({ url: localPage })
  }
} catch (error) {
  console.error("goToPage()报错：", error)
}}

/**
 * @paramQuery 把传参对象解析成url传参字符串格式
 * main模块全局方法调用的内部方法。
 * @function
 * @param { object } paramObject 本地页面的传参，必须是object对象。
 * @return { string } 返回的字符串。
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
}}

/**
 * @findDom 获取某个DOM元素对象
 * uni-app会对<video>、<canvas>进行封装，所以需要找到DOM。
 * @function async
 * @param { string } parentElementId 父元素的ID。
 * @param { string } elementTagName 要获取的元素的标签名。
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
}}

/**
 * @wait 等待方法
 * @function async 不导出
 * @param { number } ms 等待时间，单位是毫秒
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
 * @downloadFile 下载文件
 * @function
 * @param { ArrayBuffer } dataObj Buffer格式的数据对象。
 * @param { String } fileName 文件名(含扩展名)。
 */
export function downloadFile(dataObj, fileName) { try {
  // 将数据对象转换为Blob对象
  const dataBlob = new Blob([dataObj], { type: "application/octet-stream" })
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
  downloadLink.href = URL.createObjectURL(dataBlob)
  // 执行下载
  downloadLink.click()
} catch (error) {
  console.error("downloadFile()报错: ", error)
}}

/**
 * @arrayTranspose 数组转置
 * @function
 * @param { Array[] } aoa AOA二维数组。
 * @returns { Array[] } 转置后的AOA二维数组。
 */
export function arrayTranspose(aoa) { try {
  // 行数和列数（转置后的列数和行数）
  const rowNumber = aoa.length
  const colNumber = aoa[0].length
  // 转置后的数组
  const transposedAoa = []
  // 遍历原数组每一行，将原数组的行和列互换，存入转置后的数组
  for (let j = 0; j < colNumber; j++) {
    // 设定转置后的第j行元素为数组对象，用于接列数组
    transposedAoa[j] = []
    // 遍历原数组每一行的元素
    for (let i = 0; i < rowNumber; i++) {
      // 转置
      transposedAoa[j][i] = aoa[i][j]
    }
  }
  // 返回转置后的数组
  return transposedAoa
} catch (error) {
  console.error("arrayTranspose()报错: ", error)
}}

/**
 * @showVisor 打开图表栏
 * @function
 */
export function showVisor() { try {
  // 如果图表栏未打开，则打开
  if (!tfvis.visor().isOpen()) {
    tfvis.visor().open()
  }
} catch (error) {
  console.error("showVisor()报错：", error)
}}

/**
 * @downloadJson 将JSON对象下载为js文件
 * @function
 * @param { JSON } datasetJson 数据集对象。
 * @param { String } datasetName 数据集的名称。
 * @note 数据集对象必须得是JSON化的。
 */
export function downloadJson(datasetJson, datasetName) { try {
  // 将对象转为文本文件的完整字符串
  let datasetStr = `export const ${ datasetName } = ${ JSON.stringify(datasetJson) }`
  downloadFile(datasetStr, "export-dataset.js")
} catch (error) {
  console.error("downloadJson()报错：", error)
}}

/**
 * @downloadTrainHistoryToXlsx 将训练数据下载为excel文件
 * @function
 * @note 前端网页方法，node不适用。
 * @param { tf.History } trainHistory 训练数据记录。
 */
export function downloadTrainHistoryToXlsx(trainHistory) { try {
  // 把history数据转换成JSON格式数组
  // 建立一个空数组，用于存放转换后的JSON数据
  let historyJson = []
  // 遍历history数据
  for (let i = 0; i < trainHistory.params.epochs; i++) {
    // 将每一项转换成JSON格式，并添加到数组中
    let uniHistoryJson = { "epoch": i + 1 }
    // 读取每一项都键，再将键值对添加到JSON对象中
    for (let key of trainHistory.params.metrics) {
      uniHistoryJson[key] = trainHistory.history[key][i]
    }
    // 将JSON对象添加到数组中
    historyJson.push(uniHistoryJson)
  }
  // json_to_sheet()方法，把JSON化的数据data转换为工作表
  const sheet = XLSX.utils.json_to_sheet(historyJson)
  // 创建一个新的工作簿
  let workbook = XLSX.utils.book_new()
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(workbook, sheet, "tfjs-data")
  // 将工作簿生成ArrayBuffer对象
  const xlsxObj = XLSX.write(workbook, { type: "buffer" })
  // 将ArrayBuffer对象转换为Blob对象
  const xlsxBlob = new Blob([xlsxObj], { type: "application/octet-stream" })
  // 在网页上找一个id为“justForDownload”的下载链接元素块
  let downloadLink = document.getElementById("justForDownload")
  // 如果没找到这个元素块
  if (!downloadLink) {
    // 构建这个下载元素块
    downloadLink = document.createElement("a")
    // 设置该元素块的id为“justForDownload”
    downloadLink.setAttribute("id", "justForDownload")
    // 设置该元素块隐藏
    downloadLink.style.display = "none"
    // 设置该元素块下载功能赋值的文件名为“train-log.xlsx”
    downloadLink.download = "train-log.xlsx"
  }
  // 把xlsxBlob赋值给元素块的下载链接
  downloadLink.href = URL.createObjectURL(xlsxBlob)
  // 执行下载
  downloadLink.click()
} catch (error) {
  console.error("downloadTrainHistoryToXlsx()报错: ", error)
}}

/**
 * @showModelSummary 可视化模型概要
 * @function
 * @param { tf.LayersModel } model 模型。
 * @param { string } tableName 表格名(表头)。
 */
export function showModelSummary(model, tableName) { try {
  // 直接用tfvis的方法
  tfvis.show.modelSummary(
    // 容器
    {
      tab: "模型概要",
      name: tableName,
    },
    // 内容
    model
  )
} catch (error) {
  console.error("showModelSummary()报错: ", error)
}}

/**
 * @showModelLayers 可视化模型各层参数
 * @function
 * @param { tf.LayersModel } model 模型。
 * @param { string } tableTab 表格标签。
 */
export function showModelLayers(model, tableTab) { try {
  // 遍历模型各层
  for (let key in model.layers) {
    // // 控制台输出
    // console.log(model.layers[key])
    // 要么有核，要么多细胞(RNN)有核
    if (
      model.layers[key].kernel
      || (model.layers[key].cell && model.layers[key].cell.kernel)
    ) {
      // 可视化
      tfvis.show.layer(
        // 容器
        {
          tab: tableTab,
          name: `${ model.layers[key].name }层参数`,
        },
        // 层对象
        model.layers[key]
      )
    }
  }
} catch (error) {
  console.error("showModelLayers()报错: ", error)
}}

/**
 * @aoaTotfvisChart 用tfvis渲染Aoa数据为图表的封装方法
 * 直接给x和y的数组即可
 * @function
 * @param { String } chartKind 图表类别，有"linechart"、"scatterplot"
 * @param {{
 *   tab: String,
 *   name: String,
 * }} container 容器对象
 * @param {{
 *   x?: Number[],
 *   y: Number[],
 * }[] } dataAoa 用于生成图表的AOA处理的数组
 * @param { String[] } [serieTagArr] 序列名称数组
 * @param { Object } [visOptions] 可视化选项
 * @example
 * ```js
 * // 绘图预览
 * aoaTotfvisChart(
 *   // 图表类型
 *   "scatterplot",
 *   // 图表容器
 *   { tab: "测试数据", name: "原始数据" },
 *   // 图表数据
 *   [
 *     { x: x, y: y },
 *     { x: x, y: corrected },
 *     { x: x, y: baseline },
 *   ],
 *   // 数据序列标签
 *   ["原始数据", "校正", "基线"],
 * )
 * ```
 */
export function aoaTotfvisChart(chartKind, container, dataAoa, serieTagArr, visOptions) { try {
  // 建一个框，用于装JSON化的Aoa数据
  const dataJsonAoa = []
  // 额外参数
  const visOptionObj = {
    // 是否缩放以适应容器
    zoomToFit: (visOptions && visOptions.zoomToFit) ? visOptions.zoomToFit : true,
    // 其它额外参数
    ...visOptions
  }
  // 遍历dataAoa传参
  for (let i = 0; i < dataAoa.length; i++) {
    // 建一个框，用于装JSON化的Arr数据，即一堆{x, y}的数组
    const dataJsonArr = []
    // 遍历dataAoa里的Arr数据，提取{x, y}
    for (let j = 0; j < dataAoa[i].y.length; j++) {
      // 把{ x, y }推入dataJsonArr框
      dataJsonArr.push({
        x: (dataAoa[i].x) ? dataAoa[i].x[j] : undefined,
        y: dataAoa[i].y[j],
      })
    }
    // 把dataJsonArr推入dataJsonAoa框
    dataJsonAoa.push(dataJsonArr)
  }
  // 作图
  if (chartKind == "linechart") {
    tfvis.render.linechart(
      // 容器对象
      container,
      // 数据
      {
        // 数据集
        values: dataJsonAoa,
        // 数据序列标签，有则赋值，否则undefined
        series: serieTagArr || undefined,
      },
      // 额外参数
      visOptionObj
    )
  } else if (chartKind == "scatterplot") {
    tfvis.render.scatterplot(
      // 容器对象
      container,
      // 数据
      {
        // 数据集
        values: dataJsonAoa,
        // 数据序列标签，有则赋值，否则undefined
        series: serieTagArr || undefined,
      },
      // 额外参数
      visOptionObj
    )
  }
} catch (error) {
  console.error("aoaTotfvisChart()报错: ", error)
}}

/**
 * @downloadExampleFile 下载示例波谱文件
 * 需要从gsd-data-aoa-example.js文件读取gsdDataAoaExample示例文件对象
 * 需要XLSX库
 * 需要downloadFile()方法
 */
// export function downloadExampleFile() { try {
//   // aoa_to_sheet()方法，把AOA化的数据转为一张工作表
//   const sheet = XLSX.utils.aoa_to_sheet(gsdDataAoaExample)
//   // 创建一个新的工作簿对象
//   const workbook = XLSX.utils.book_new()
//   // 将工作表添加到工作簿，该表名为"波谱数据集"
//   XLSX.utils.book_append_sheet(workbook, sheet, "波谱数据集")
//   // 以工作簿生成ArrayBuffer对象
//   const workbookArrBufObj = XLSX.write(workbook, { type: "buffer" })
//   // 以xlsx格式下载该工作簿ArrayBuffer对象
//   downloadFile(workbookArrBufObj, "波谱数据集.xlsx")
// } catch (error) {
//   console.error("downloadExampleFile()报错: ", error)
// }}

/**
 * @readXlsxFile 读取XLSX文件为工作簿对象
 * @function async
 * @param { File } xlsxFile XLSX文件对象
 * @returns { Promise<XLSX.WorkBook> } 工作簿对象
 */
export async function readXlsxFile(xlsxFile) { try {
  // file(File类)继承Blob类的arrayBuffer()方法，直接转ArrayBuffer格式
  const dataBuffer = await xlsxFile.arrayBuffer()
  // 将ArrayBuffer对象读取为工作簿并返回
  return XLSX.read(dataBuffer, { type: "buffer" })
} catch (error) {
  console.error("readXlsxFile()报错: ", error)
}}

/**
 * @sheetToDataArr 从工作表提取原始数据的方法
 * 含检查、修复、XY配对等
 * @function
 * @param { XLSX.WorkSheet } workSheet 工作簿表格对象，需要有header行
 * @returns {{
 *   x: Number[],
 *   y: Number[],
 *   header: String | Number
 * }[] | null } 可用于处理的数组，或无返回，即模态框报错
 */
export function sheetToDataArr(workSheet) { try {
  // 将工作表转为AOA数据
  const sheetDataAoa = XLSX.utils.sheet_to_json(workSheet, {
    // 标题设置为“1模式”，即AOA呈现
    header: 1,
    // 不允许空白行，遇空白行则跳过
    blankrows: false
  })
  // 如果用户把第一行删了，那第一行第一列就是"X"了
  // 把标题行赋值给rawDataHeaderArr，方便识别X标记
  const rawDataHeaderArr = (sheetDataAoa[0][0] === "X") ?
    sheetDataAoa[0] : sheetDataAoa[1]
  // 转置，赋值给rawDataAoa
  const rawDataAoa = (sheetDataAoa[0][0] === "X") ?
    arrayTranspose(sheetDataAoa.slice(1)) : arrayTranspose(sheetDataAoa.slice(2))
  // 开始处理，建个最终输出数据的数组
  const dataJsonArr = []
  // 先剔除标题数组里可能存在的前后空格
  const rawDataHeaderArrTrimed = rawDataHeaderArr.map((rawDataHeaderArr) => {
    if (typeof rawDataHeaderArr === "string") {
      return rawDataHeaderArr.trim()
    } else {
      return rawDataHeaderArr
    }
  })
  // 用来接X轴序列的框
  let xLabelArr = []
  // 遍历表上每一列(AOA转置数组每一行)数据
  for (let i = 0; i < rawDataAoa.length; i++) {
    // 先过滤掉该列数据里的空内容
    rawDataAoa[i] = rawDataAoa[i].filter((rawDatum) => (
      (rawDatum !== undefined) && (rawDatum !== null) && (rawDatum !== NaN)
    ))
    // 遍历每一个数据，评估数据合法性
    for (let j = 0; j < rawDataAoa[i].length; j++) {
      // 判断是否为数值，如果不是数值
      if (typeof rawDataAoa[i][j] !== "number") {
        // 如果是字符串就先剔除空格
        if (typeof rawDataAoa[i][j] === "string") {
          // 去除左右空格
          rawDataAoa[i][j] = rawDataAoa[i][j].trim()
        }
        // 尝试转为数字
        rawDataAoa[i][j] = Number(rawDataAoa[i][j])
        // 如果转换失败，即不是数字
        if (rawDataAoa[i][j] === NaN) {
          // 返回报错
          uni.showModal({
            showCancel: false,
            title: "数据错误",
            content: `表格文件第 ${ i + 1 } 列第 ${ j + 3 } 行数据不是有效数字`
          })
          // 返回空
          return
        }
      }
    }
    // 数据合法，则看看是不是X轴
    if (rawDataHeaderArrTrimed[i] === "X" || rawDataHeaderArrTrimed[i] === "x") {
      // 是X轴，看看X轴是否单调连续，先确保X轴长度不小于9
      if (rawDataAoa[i].length < 9) {
        // 返回报错
        uni.showModal({
          showCancel: false,
          title: "数据错误",
          content: `表格文件第 ${ i + 1 } 列的 X 数据过短，无法拟合`
        })
        // 返回空
        return
      // 长度不小于9，则检查其是否单调连续
      } else {
        // 先建立递增和递减的boolen对象
        let up = false
        let down = false
        // 遍历
        for (let j = 1; j < rawDataAoa[i].length; j++) {
          // 比较大小，赋值递增或递减对象
          if (rawDataAoa[i][j - 1] <= rawDataAoa[i][j]) {
            up = true
          } else if (rawDataAoa[i][j - 1] >= rawDataAoa[i][j]) {
            down = true
          }
          // 如果两个都true了
          if (down && up) {
            // 返回报错
            uni.showModal({
              showCancel: false,
              title: "数据错误",
              content: `表格文件第 ${ i + 1 } 列的 X 数据不单调`
            })
            // 返回空
            return
          }
        }
      }
      // 单调性OK，则赋值
      xLabelArr = rawDataAoa[i]
    // 若不是X轴
    } else {
      // 说明这是Y轴，验证其与X轴数量是否一致
      if (xLabelArr.length !== rawDataAoa[i].length) {
        // 报错
        uni.showModal({
          showCancel: false,
          title: "数据错误",
          content: `表格文件第 ${ i + 1 } 列数据和其X轴数据数量不一致`
        })
        // 返回
        return
      // 一致，则和X轴配对后推入输出数据里暂存该轴标签
      } else {
        // 推数据
        dataJsonArr.push({
          x: xLabelArr,
          y: rawDataAoa[i],
          header: rawDataHeaderArrTrimed[i]
        })
      }
    }
  }
  // 结束，输出数据
  return dataJsonArr
} catch (error) {
  console.error("solveRawData()报错: ", error)
}}

/**
 * @arrRangeAve 数组从小到大序列的某个范围内的均值
 * @function
 * @param { Number[] } arr 完整的数组数据。
 * @param { Number } relativeFrom 初始比例，相对值。
 * @param { Number } relativeTo 结尾比例，相对值。
 * @returns { Number } 返回均值。
 */
function arrRangeAve(arr, relativeFrom, relativeTo) {
  // 深拷贝数组
  const arrDeepCopy = [...arr]
  // 从小到大重排数组
  arrDeepCopy.sort((item1, item2) => {
    return (item1 - item2)
  })
  // 算一下起始和结束位置
  const from = Math.round((arrDeepCopy.length - 1) * relativeFrom)
  const to = Math.round((arrDeepCopy.length - 1) * relativeTo)
  // 获得数组片段
  const arrRange = arrDeepCopy.slice(from, to + 1)
  // 数组片段求和
  let sum = 0
  for (let i = 0; i < arrRange.length; i++) {
    sum = sum + arrRange[i]
  }
  // 返回均值
  const ave = sum / arrRange.length
  return ave
}

/**
 * @minToZero 零位校正
 * 对于倒置峰，则是上限归1
 * 直接改数据，不返回结果
 * @function
 * @param { Number[] } dataJsonY 单组数据的Y数组。
 * @param { Boolean } isMinZoom 是否缩放。
 * @param { Boolean } isMaxCriteria 正置or倒置。默认正置。
 */
export function minToZero(dataJsonY, isMinZoom = true, isMaxCriteria = true) { try {
  // 对于正置峰
  if (isMaxCriteria) {
    // 以数组从小到大序列的0%~1%的值求和取平均，作为最小值
    const yMin = arrRangeAve(dataJsonY, 0.00, 0.01)
    // 如果最小值大于0，且设置了“缩放采零”
    if ((yMin > 0) && isMinZoom) {
      // 先缩放，再减1采零
      for (let i = 0; i < dataJsonY.length; i++) {
        dataJsonY[i] = dataJsonY[i] / yMin - 1
      }
    // 否则
    } else {
      // 直接减yMin采零
      for (let i = 0; i < dataJsonY.length; i++) {
        dataJsonY[i] = dataJsonY[i] - yMin
      }
    }
  // 对于倒置峰
  } else {
    // 以数组从小到大序列的99%~100%的值求和取平均，作为最大值
    const yMax = arrRangeAve(dataJsonY, 0.99, 1.00)
    // 接下来只考虑谱图上限是1(100%)和100两个情况
    // 如果最大值小于1，且设置了“缩放采零”
    if (yMax < 1 && isMinZoom) {
      // 先缩放，再用1来减，以此采零(其实是采1)
      for (let i = 0; i < dataJsonY.length; i++) {
        dataJsonY[i] = 1 - ((1 - dataJsonY[i]) / (1 - yMax))
      }
    // 如果最大值在1~100之间，且设置了“缩放采零”
    } else if (yMax > 1 && yMax < 100 && isMinZoom) {
      // 先缩放，再用100来减，以此采零(其实是采1)
      for (let i = 0; i < dataJsonY.length; i++) {
        dataJsonY[i] = 100 - ((100 - dataJsonY[i]) / (100 - yMax))
      }
    // 否则
    } else {
      // 直接减yMax再加1来采零(其实是采1)
      for (let i = 0; i < dataJsonY.length; i++) {
        dataJsonY[i] = dataJsonY[i] - yMax + 1
      }
    }
  }
} catch (error) {
  console.error("minToZero()报错: ", error)
}}

/**
 * @maxToOne 归一化，即上限归一
 * 直接改数据，不返回
 * @function
 * @param { Number[] } dataJsonY 单组数据的Y数组对象。
 * @param { Boolean } isMaxCriteria 正置or倒置。
 */
export function maxToOne(dataJsonY, isMaxCriteria = true) { try {
  // 对于正置峰
  if (isMaxCriteria) {
    // 找最大值，99%~100%的值的均值作为最大值
    const yMax = arrRangeAve(dataJsonY, 0.99, 1.00)
    // 归一化
    for (let i = 0; i < dataJsonY.length; i++) {
      dataJsonY[i] = dataJsonY[i] / yMax
    }
  // 对于倒置峰
  } else {
    // 找最大值和最小值
    const yMax = arrRangeAve(dataJsonY, 0.99, 1.00)
    const yMin = arrRangeAve(dataJsonY, 0.00, 0.01)
    // 归一化(其实是归0化)
    for (let i = 0; i < dataJsonY.length; i++) {
      dataJsonY[i] = 1 - ((yMax - dataJsonY[i]) / (yMax - yMin))
    }
  }
} catch (error) {
  console.error("maxToOne()报错: ", error)
}}
