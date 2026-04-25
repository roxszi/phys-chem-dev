"use strict"

/**
 * TensorFlow.js的一些工具
 */

// 导入tfjs和tfjs-visor库
import * as tf from "@tensorflow/tfjs"
import * as tfvis from "@tensorflow/tfjs-vis"

/**
 * 读取文件夹
 * @param { FileSystemDirectoryHandle } dirHandle 文件夹句柄
 * @returns { Promise<[string[], FileSystemFileHandle[]]> } fileNameArr和fileHandleArr
 */
export async function readDirectory(dirHandle) {
  /** 文件名称及句柄的异步迭代器 @type { AsyncIterableIterator<[string, FileSystemHandle]> } */
  // @ts-ignore
  const fileHandleAsyncIter = dirHandle.entries()
  // 用于接收文件名称和句柄的数组筐
  const fileNameArr = []
  const fileHandleArr = []
  // 异步迭代
  forEachFile: for await (const [fileName, fileHandle] of fileHandleAsyncIter) {
    // 判断是否为文件夹
    if (fileHandle.kind === "directory") {
      // 是文件夹则跳过
      continue forEachFile
    }
    // // 获取扩展名：按“.”拆分，提取最后一个，即为文件扩展名
    // /** @type { string } */
    // const fileNameExt = fileName.split(".").slice(-1)[0]
    // 不是文件夹，则将文件名称和句柄存入数组筐
    fileNameArr.push(fileName)
    fileHandleArr.push(fileHandle)
  }
  // 看看有没有获取到文件
  if (fileNameArr.length === 0) {
    throw new Error("文件夹中没有文件")
  }
  // 返回文件名称和句柄的数组筐
  // @ts-ignore
  return [fileNameArr, fileHandleArr]
}


