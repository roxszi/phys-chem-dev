/**
 * 和表格处理相关的各类方法
 * - readXlsxFile() 读取XLSX文件为工作簿对象
 * - sheetToAoa() 从工作簿对象中提取指定工作表的数据为AOA对象
 * - arrTrim() 剔除标题数组里可能存在的前后空格
 * - aoaTranspose() 数组转置
 * - aoaMapToWorkbook() AOA的键值对Map数据转为工作簿对象
 * - downloadXlsx() 下载工作簿xlsx文件
 */

/**
 * @note
 * 直接从xlsx表格读取到的文件类型为工作簿：XLSX.WorkBook
 * 从工作簿中，可以得到工作表：XLSX.WorkSheet
 * 继续处理工作表可以得到AOA数组
 */

/**
 * @库导入
 */
// 导入xlsx库的数据类型
import type {
  WorkBook as XLSXWorkBook,
} from "xlsx"
// 导入xlsx库，以XLSX为命名空间引用
// import * as XLSX from "xlsx"
// 导入xlsx库的各类方法
import {
  utils as XLSXUtils,
  read as XLSXRead,
  write as XLSXWrite
} from "xlsx"
// 导入其它库的可复用方法
import { downloadFile } from "./file.ts"
// 导入数据集
// import { gsdDataAoaExample } from "../datasets/gsd-data-aoa-example.js"

/** 表格内容的数据类型 */
type XlsxContent = string | number | undefined

/**
 * 读取XLSX文件为工作簿对象
 * @async
 * @param xlsxFile - XLSX文件对象
 * @returns 工作簿对象
 */
export async function readXlsxFile(xlsxFile: File) {
  // file(File类)继承Blob类的arrayBuffer()方法，直接转ArrayBuffer格式
  const dataBuffer = await xlsxFile.arrayBuffer()
  // 将ArrayBuffer对象读取为工作簿
  const workbook = XLSXRead(dataBuffer, {
    // 数据类型：ArrayBuffer
    type: "array",
    // 读取的行数，0为全部读取
    sheetRows: 0,
    // 是否只解析到表名，不解析表数据
    bookSheets: false,
    // 显式指定解析的表
    sheets: undefined
  })
  // 返回工作簿
  return workbook
}


/**
 * 从工作簿对象中提取指定工作表的数据为AOA对象
 * @param workbook - 工作簿对象
 * @param sheetName - 表格名称
 * @returns AOA数组
 */
export function sheetToAoa(workbook: XLSXWorkBook, sheetName: string): (number | string)[][] {
  // 根据工作表的名字，从工作簿中获取工作表
  const workSheet = workbook.Sheets[sheetName]
  // 如果工作簿中不存在指定的工作表
  if (workSheet === undefined) {
    // 则输出错误信息
    throw new Error(`工作簿中找不到名为 ${ sheetName } 的工作表`)
  }
  // 将工作表转为AOA数据
  const sheetDataAoa: (number | string)[][] = XLSXUtils.sheet_to_json(workSheet, {
    // 标题设置为“1模式”，即AOA呈现
    header: 1,
    // 不允许空白行，遇空白行则跳过
    blankrows: false
  })
  // 返回AOA数据
  return sheetDataAoa
}


/**
 * 剔除标题数组里可能存在的前后空格
 * @param arr - 待剔除空格的数组
 * @returns 剔除空格后的数组
 */
export function arrTrim(arr: string[]): string[] {
  // 遍历数组，如果是字符串，则提出空格
  const arrTrimed = arr.map((str) => {
    if (typeof str === "string") {
      return str.trim()
    } else {
      return str
    }
  })
  // 返回剔除空格后的数组
  return arrTrimed
}


/**
 * 数组转置
 * - 一般习惯把“子数组为独立数据”的AOA数组的数组叫做“行数组”，即【每一行为一个样品的所有数据】
 * - 把“行数组”转置为“列数组”，即把“子数组为独立数据”的AOA数组给转为“散数据”
 * - 一般建议每行数据的第一个元素为该行数据的标签，这样转置后，标签会每列第一个元素，即第一行全部为标签
 * @param rawAoa rawAoa - 待转置的AOA数组，一般是“行数组”
 * @returns 转置后的AOA数组
 */
export function aoaTranspose(rawAoa: (XlsxContent)[][]): (XlsxContent)[][] {
  // 获取(最大)行数，即数据样本量
  const rowNumber = rawAoa.length ?? 0
  // 如果数组为空，则应报错
  if (rowNumber === 0) {
    throw new Error("表格没数据，请检查")
  }
  // 获取(最大)列数，即数据维度
  // 取每行数据的长度(列数)，并比较获取最大值
  const colNumber = Math.max(...rawAoa.map((rawArr) => (rawArr.length || 0)))
  // 如果数组为空，则应报错
  if (colNumber === 0) {
    throw new Error("表格没数据，请检查")
  }
  // 使用(最大)行数、(最大)列数开始转置
  // 转置后的数组：列 => 行；行 => 列
  const transposedAoa: (XlsxContent)[][] = []
  // 遍历原数组每一列
  for (let col = 0; col < colNumber; col++) {
    // 原数组的第col列即为转置后的第col行
    transposedAoa[col] = []
    // 遍历原数组第col列的每一行
    for (let row = 0; row < rowNumber; row++) {
      // 转置存入
      transposedAoa[col]![row] = rawAoa[row]![col]!
    }
  }
  // 返回转置后的数组
  return transposedAoa
}


/**
 * AOA的键值对Map数据转为工作簿对象
 * @param aoaMap - AOA数组的Map对象
 * @returns 工作簿
 */
export function aoaMapToWorkbook(aoaMap: Map<string, (XlsxContent)[][]>): XLSXWorkBook {
  // 创建一个新的工作簿对象
  const workbook = XLSXUtils.book_new()
  // 遍历AOA数组的Map对象，将每个AOA数组转为工作表，并添加到工作簿中
  aoaMap.forEach((sheetAoaData, sheetName) => {
    // 数据表
    const sheet = XLSXUtils.aoa_to_sheet(sheetAoaData)
    // 写入工作簿
    XLSXUtils.book_append_sheet(workbook, sheet, sheetName)
  })
  // 返回工作簿对象
  return workbook
}


/**
 * AOA的键值对Map数据转为工作簿Buffer对象
 * @param aoaMap - AOA数组的Map对象
 * @returns xlsx文件ArrayBuffer
 */
export function aoaMapToXlsxArrayBuffer(aoaMap: Map<string, (XlsxContent)[][]>) {
  // 创建一个新的工作簿对象
  const workbook = XLSXUtils.book_new()
  // 遍历AOA数组的Map对象，将每个AOA数组转为工作表，并添加到工作簿中
  aoaMap.forEach((sheetAoaData, sheetName) => {
    // 数据表
    const sheet = XLSXUtils.aoa_to_sheet(sheetAoaData)
    // 写入工作簿
    XLSXUtils.book_append_sheet(workbook, sheet, sheetName)
  })
  // 将工作簿转为ArrayBuffer
  const workbookBuffer: ArrayBuffer = XLSXWrite(workbook, { type: "array", compression: true })
  // 返回ArrayBuffer对象
  return workbookBuffer
}


/**
 * 下载工作簿xlsx文件
 * @param workbook - 工作簿对象
 * @param xlsxName - 文件名
 */
export function downloadXlsx(workbook: XLSXWorkBook, xlsxName: string) {
  /** 工作簿转为ArrayBufferView @type { ArrayBuffer } */
  const xlsxArrayBuffer: ArrayBuffer = XLSXWrite(workbook, { type: "array" })
  // 下载文件
  const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  downloadFile(xlsxArrayBuffer, xlsxName, fileType)
}

