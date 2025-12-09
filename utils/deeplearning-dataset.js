"use strict"

/**
 * @深度学习_数据集 深度学习项目的数据集相关方法库，目前包含：
 *   downloadExampleXlsxFile() 示例excel文件下载
 *   xlsxToJsonArr() 从excel文件读取并返回若干(数组格式的)JSON对象
 *   jsonToArray() 将JSON对象转为数组对象(递归)
 *   splitDatasetArr() 拆分数据集数组为训练集和测试集数组
 *   无序化
 *   dataAoaToTensor2d() 将AOA化的数据集数组处理为特征及标签的二维张量
 *   tensorNormalize() 张量归一化
 */

/**
 * @库导入
 */
// 导入tfjs和tfvis和库
import * as tf from "@tensorflow/tfjs"
// import * as tfvis from "@tensorflow/tfjs-vis"
// 导入xlsx库，以XLSX作为引用对象
import * as XLSX from "xlsx"

// 导入公共方法
import { downloadFile } from "./app-utils.js"


/**
 * @downloadExampleXlsxFile 下载示例excel文件
 * @function
 */
export function downloadExampleXlsxFile() { try {
  // 建立一个AOA(Array of Array)数组对象
  const exampleAoaData = [
    ["特征1", "特征2", "特征3", "标签1", "标签2"],
    [10, 200, 30, 5, 20],
    [35, 300, 40, 10, 40],
    [24, 100, 20, 2, 30],
  ]
  // aoa_to_sheet()方法，把AOA化的数据转为一张工作表
  const sheet = XLSX.utils.aoa_to_sheet(exampleAoaData)
  // 创建一个新的工作簿对象
  const workbook = XLSX.utils.book_new()
  // 将工作表添加到工作簿，该表名为"数据集"
  XLSX.utils.book_append_sheet(workbook, sheet, "数据集")
  // 以工作簿生成ArrayBuffer对象
  const workbookArrBufObj = XLSX.write(workbook, { type: "buffer" })
  // 以xlsx格式下载该工作簿ArrayBuffer对象
  downloadFile(workbookArrBufObj, "数据集.xlsx")
} catch (error) {
  console.error("downloadExampleXlsxFile()报错: ", error)
}}

/**
 * @xlsxToJsonArr 从excel文件读取并返回若干(数组格式的)JSON对象
 * @function async
 * @param { File } xlsxFile excel文件。
 * @param { String[] } [sheetNames] 表格名数组，若未填则默认读取第一个表格。
 * @returns { JSON[] } 表格中的数据，以JSON对象数组的形式返回。
 */
export async function xlsxFileToJson(xlsxFile, sheetNames) { try {
  // 读取xlsx文件，并返回ArrayBuffer对象
  const xlsxArrBuf = await xlsxFile.arrayBuffer()
  // 将ArrayBuffer对象读取为工作簿
  const workbook = XLSX.read(xlsxArrBuf, { type: "buffer" })
  // 如何没有sheetNames传参
  if (!sheetNames) {
    // 读取第1个表格
    const dataJson = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
    // 直接以数组格式返回该表格的JSON对象
    return [dataJson]
  // 如何有sheetNames传参
  } else {
    // 声明一个JSON对象数组，用来装找到的JSON对象
    const dataJsonArr = []
    // 遍历要找的表格名数组
    for (let key in sheetNames) {
      // 用表格名找表格，用sheet_to_json()方法转JSON，然后推进数组里
      dataJsonArr.push(XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[key]]))
    }
    // 返回JSON对象数组
    return dataJsonArr
  }
} catch (error) {
  console.error("downloadExampleXlsxFile()报错: ", error)
}}

/**
 * @jsonToArray 将JSON对象转为数组对象(递归)
 * @function
 * @param { JSON | JSON[] } jsonDataset 数据集JSON对象，它是个对象数组
 * @returns { Array } 数据集对象
 */
export function jsonToArray(jsonDataset) { try {
  // 声明一个数组对象
  const arrayDataset = []
  // 如果传入的数据集JSON对象格式是“object”
  if (typeof jsonDataset === "object") {
    // 遍历该JSON对象
    for (let key in jsonDataset) {
      // 如果该JSON对象的成员对象也是对象
      if (typeof jsonDataset[key] === "object") {
        // 循环嵌套本jsonToArray()方法，然后添加进arrayDataset数组里
        arrayDataset.push(jsonToArray(jsonDataset[key]))
      // 如果该JSON对象的成员对象不是对象
      } else {
        // 就添加进arrayDataset数组里
        arrayDataset.push(jsonDataset[key])
      }
    }
  // 如果传入的数据集JSON对象格式不是“object”
  } else {
    // 直接添加，即数组化
    arrayDataset.push(jsonDataset)
  }
  // 返回数组对象
  return arrayDataset
} catch (error) {
  console.error("jsonToArray()报错：", error)
}}

/**
 * @splitDatasetArr 拆分数据集数组为训练集和测试集数组
 * @function
 * @param { JSON[] | Array[] } rawDatasetArr 原始数据集。
 * @param { Number } splitDuration 拆分间隔，必须大于1。
 * @param { Boolean } [isUniShuffle] 拆分间隔内是否打散。
 * @returns {{
 *   trainDatasetArr: JSON[] | Array[],
 *   testDatasetArr: JSON[] | Array[],
  * }} 包含训练集和测试集的JSON对象数组
 */
export function splitDataset(rawDatasetArr, splitDuration, isUniShuffle) { try {
  // 建训练集train和测试集test数组
  const trainDatasetArr = []
  const testDatasetArr = []
  // 临时数组，用来中转处理
  const tempDatasetArr = []
  // 拆分数据集为训练集trainingSet和测试集testingSet
  // 遍历原始数据集
  for (let i = 0; i < rawDatasetArr.length; i++) {
    // 把数据集的每一行数据推进临时数组里
    tempDatasetArr.push(rawDatasetArr[i])
    // 看看有没有满splitDuration
    if ((i + 1) % splitDuration === 0) {
      // 小组内是否打散(随机化)
      if (isUniShuffle) {
        // 使用Fisher-Yates算法对数据进行无序化处理
        tf.util.shuffle(tempDatasetArr)
      }
      // 从临时数组里取出最后一个对象丢进测试集里
      testDatasetArr.push(tempDatasetArr.pop())
      // 剩下的拼接进训练集里
      trainDatasetArr.concat(tempDatasetArr)
      // 清空临时数组
      tempDatasetArr.length = 0
    }
  }
  // 返回包含训练集和测试集的JSON对象数组
  return {
    trainDatasetArr: trainDatasetArr,
    testDatasetArr: testDatasetArr
  }
} catch (error) {
  console.error("dataArrToTensor2d()报错: ", error)
}}

/**
 * @无序化
 * 使用Fisher-Yates算法对数据进行无序化处理
 * 仅处理外层
 * ```js
 * tf.util.shuffle(array)
 * ```
 */

/**
 * @dataAoaToTensor2d 将AOA化的数据集数组处理为特征及标签的二维张量
 * @function
 * @param { Array[] } dataAoa AOA化的数据集对象数组
 * @param { Number } [indexRank] 数据集标签的数量
 * @returns {{
*   featureTensor: tf.Tensor2D,
*   labelTensor: tf.Tensor2D
* }} 特征张量，标签张量
*/
export function dataAoaToTensor2d(dataAoa, indexRank) { try {
  // 外层嵌套tidy()方法，只保留内层返回值，其余张量均销毁，以释放内存
  return tf.tidy(() => {
    // 构造数据集张量
    const dataTensor = tf.tensor2d(dataAoa, [dataAoa.length, dataAoa[0].length])
    // 如果没有indexRank传参，或传参为0，即全都是特征
    if ((!indexRank) || (indexRank === 0)) {
      // 直接输出张量即可
      return {
        featureTensor: dataTensor,
        labelTensor: null,
      }
    // 有不为0的indexRank传参，即存在标签
    } else {
      // 解构赋值，拆分数据集张量
      const [featureArray, labelArray] = tf.split(
        dataTensor,
        // 二维张量，shape[0]为样品数，shape[1]为总特征+总标签数
        [dataTensor.shape[1] - indexRank, indexRank],
        // 沿着[1]特征轴分割
        1
      )
      // 输出张量
      return {
        featureTensor: featureArray,
        labelTensor: labelArray,
      }
    }
  })
} catch (error) {
  console.error("dataAoaToTensor2d()报错: ", error)
}}

/**
 * @tensorNormalize 张量归一化
 * @function
 * 沿着某一个轴，对张量进行归一化处理
 * @note 只有全局归一化、特征轴归一化(轴为0)时，tensorMax和tensorMin才是有意义的
 * 特征轴归一化：对某特征，求所有样本在该特征的最大值、最小值，然后归一化
 * @param { tf.Tensor } tensor 张量
 * @param { number } [axis] - 轴。对张量的第几个轴进行归一化
 * @returns {{
*   normalization: tf.Tensor<tf.Rank>,
*   tensorMax: tf.Tensor<tf.Rank>,
*   tensorMin: tf.Tensor<tf.Rank>
*   axis: number
* }} 归一化的张量，最大张量，最小张量，轴
* @note 对于一般的二维张量而言，有2个轴axis：0轴为样本轴，1轴为特征轴
* @note 对于一般的三维张量而言，有3个轴axis：0轴为样本轴，1轴为特征组轴，2为组内各特征轴
*/
export function tensorNormalize(tensor, axis) { try {
  // 外层嵌套tidy()方法，只保留内层返回值，其余张量数据均销毁，以释放内存
  return tf.tidy(() => {
    // 先取得该轴最大值张量、最小值张量
    const tensorMax = tf.max(tensor, axis)
    const tensorMin = tf.min(tensor, axis)
    // 如果axis符合tensorMax和tensorMin有意义的条件
    // 即无axis传参，或传参为0
    if ((!axis) || (axis === 0)) {
      // 归一化：原张量减去最小值，再除以(最大值-最小值)之差
      const normalization = tensor.sub(tensorMin).div(tensorMax.sub(tensorMin))
      // 输出归一化后的张量，及归一化参数(最大值、最小值)
      return {
        normalization: normalization,
        tensorMax: tensorMax,
        tensorMin: tensorMin,
        axis: null
      }
    // 如果axis不符合tensorMax和tensorMin有意义的条件
    } else {
      // tensorMax和tensorMin形状和tensor不匹配，需要扩维，并平铺扩增
      // 平铺扩增数组
      const tileArray = []
      // 沿着张量的秩(也就是轴)遍历
      for (let i = 0; i < tensor.rank; i++) {
        // 遍历到axis轴时，记录原张量在该轴的原形状，用于后面平铺扩增
        if (i === axis) {
          tileArray.push(tensor.shape[i])
        // 遍历到非axis轴时，因为没坍缩，所以不扩增，记录1就行了
        } else {
          tileArray.push(1)
        }
      }
      // 之前坍缩了axis轴，现在向axis轴扩维；然后平铺扩增
      const tensorMaxTemp = tensorMax.expandDims(axis).tile(tileArray)
      const tensorMinTemp = tensorMin.expandDims(axis).tile(tileArray)
      // 归一化：原张量减去最小值，再除以(最大值-最小值)之差
      const normalization = tensor.sub(tensorMinTemp)
        .div(tensorMaxTemp.sub(tensorMinTemp))
      // 输出归一化后的张量，及归一化参数(最大值、最小值)
      return {
        normalization: normalization,
        tensorMax: null,
        tensorMin: null,
        axis: axis
      }
    }
  })
} catch (error) {
  console.error("tensorNormalize()报错: ", error)
}}
