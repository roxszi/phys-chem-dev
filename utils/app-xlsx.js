"use strict"

/**
 * @和表格处理相关的各类方法
 *   readXlsxFile() 读取XLSX文件为工作簿对象
 *   sheetToAoa() 从工作簿对象中提取指定工作表的数据为AOA对象
 *   arrTrim() 剔除标题数组里可能存在的前后空格
 *   aoaTranspose() 数组转置
 *   aoaMapToWorkbook() AOA的键值对Map数据转为工作簿对象
 *   downloadXlsx() 下载工作簿xlsx文件
 * 
 *   downloadExampleFile() 下载示例波谱文件
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
// 导入xlsx库，以XLSX为命名空间引用
import XLSX from "xlsx"
// 导入其它库的可复用方法
import { downloadFile } from "./app-utils.js"
// 导入数据集
// import { gsdDataAoaExample } from "../datasets/gsd-data-aoa-example.js"

/**
 * 读取XLSX文件为工作簿对象
 * @async
 * @param { File | Response } xlsxFile XLSX文件对象
 * @returns { Promise<XLSX.WorkBook> } 工作簿对象
 */
export async function readXlsxFile(xlsxFile) { try {
  // file(File类)继承Blob类的arrayBuffer()方法，直接转ArrayBuffer格式
  const dataBuffer = await xlsxFile.arrayBuffer()
  // 将ArrayBuffer对象读取为工作簿
  const workbook = XLSX.read(dataBuffer, { type: "file" })
  // 返回工作簿
  return workbook
} catch (error) {
  console.error("readXlsxFile()报错: ", error)
  throw new Error(error)
}}

/**
 * 从工作簿对象中提取指定工作表的数据为AOA对象
 * @template { Number | String } T
 * @param { XLSX.WorkBook } workbook 工作簿对象
 * @param { String } sheetName 表格名称
 * @returns { T[][] } AOA数组
 */
export function sheetToAoa(workbook, sheetName) { try {
  // 根据工作表的名字，从工作簿中获取工作表
  const workSheet = workbook.Sheets[sheetName]
  // 如果工作簿中不存在指定的工作表
  if (workSheet === undefined) {
    // 则输出错误信息
    throw new Error(`工作簿中找不到名为 ${ sheetName } 的工作表`)
  }
  // 将工作表转为AOA数据
  const sheetDataAoa = XLSX.utils.sheet_to_json(workSheet, {
    // 标题设置为“1模式”，即AOA呈现
    header: 1,
    // 不允许空白行，遇空白行则跳过
    blankrows: false
  })
  // 返回AOA数据
  return sheetDataAoa
} catch (error) {
  console.error("sheetToAoa()报错: ", error)
  throw new Error(error)
}}

/**
 * 剔除标题数组里可能存在的前后空格
 * @param { String[] } arr 待剔除空格的数组
 * @returns { String[] } 剔除空格后的数组
 */
export function arrTrim(arr) { try {
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
} catch (error) {
  console.error("arrTrim()报错: ", error)
  throw new Error(error)
}}

/**
 * 数组转置
 * @param { Number[][] } aoa 待转置的AOA数组
 * @param { Number } [dataNumber] 需要获取的数据数(列)，默认为AOA的最大列数
 * @returns { Number[][] } 转置后的AOA数组
 */
export function aoaTranspose(aoa, dataNumber) { try {
  // 获取(最大)行数
  const rowNumber = aoa.length || 0
  // 如果数组为空，则应报错
  if (rowNumber === 0) {
    throw new Error("表格没数据，请检查")
  }
  // 获取(最大)列数
  const colNumber = dataNumber
    ? dataNumber
    // 如果未指定数据数(列数)，则获取AOA每个成员数组长度，并获得最大值(列数)
    : Math.max(...aoa.map((arr) => {
        return (arr.length || 0)
      }))
  // 使用(最大)行数、(最大)列数开始转置
  // 转置后的数组：列 => 行；行 => 列
  const transposedAoa = []
  // 遍历原数组每一列
  for (let col = 0; col < colNumber; col++) {
    // 原数组的第col列即为转置后的第col行，为数组
    transposedAoa[col] = []
    // 遍历原数组第col列的每一行
    for (let row = 0; row < rowNumber; row++) {
      // 转置存入
      transposedAoa[col][row] = aoa[row][col]
    }
  }
  // 返回转置后的数组
  return transposedAoa
} catch (error) {
  console.error("aoaTranspose()报错: ", error)
  throw new Error(error)
}}

/**
 * AOA的键值对Map数据转为工作簿对象
 * @template { Number | String } T
 * @param { Map<String, T[][]> } aoaMap AOA数组的Map对象
 * @returns { XLSX.WorkBook } 工作簿
 */
export function aoaMapToWorkbook(aoaMap) { try {
  // 创建一个新的工作簿对象
  const workbook = XLSX.utils.book_new()
  // 遍历AOA数组的Map对象，将每个AOA数组转为工作表，并添加到工作簿中
  aoaMap.forEach((sheetAoaData, sheetName) => {
    // 数据表
    const sheet = XLSX.utils.aoa_to_sheet(sheetAoaData)
    // 写入工作簿
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  })
  // 返回工作簿对象
  return workbook
} catch (error) {
  console.error("aoaMapToWorkbook()报错: ", error)
  throw new Error(error)
}}

/**
 * 下载工作簿xlsx文件
 * @param { XLSX.WorkBook } workbook 工作簿对象
 * @param { String } xlsxName 文件名
 */
export function downloadXlsx(workbook, xlsxName) { try {
  // 工作簿转为Buffer
  const xlsxBuffer = XLSX.write(workbook, { type: "buffer" })
  // 下载文件
  downloadFile(xlsxBuffer, xlsxName)
} catch (error) {
  console.error("downloadXlsx()报错: ", error)
  throw new Error(error)
}}
