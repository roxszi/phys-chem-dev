"use strict"

/**
 * TensorFlow.js的CNN卷积神经网络的一些工具
 */

// 导入tfjs和tfjs-visor库
import * as tf from "@tensorflow/tfjs"
import * as tfvis from "@tensorflow/tfjs-vis"




/**
 * 直接读取图片文件到GPU
 * @param { FileSystemFileHandle } fileHandle 文件句柄
 * @param { [number, number] } [targetSize = [224, 224]] 目标尺寸 [height, width]
 * @returns { Promise<tf.Tensor> } 预处理后的GPU张量，形状[targetHeight, targetWidth, 3]
 */
export async function imageFilehandleToGPUTensor(fileHandle, targetSize = [224, 224]) {
  // 获取目标长宽
  const [targetHeight, targetWidth] = targetSize
  // 获取文件对象
  const imageFile = await fileHandle.getFile()
  // 解码为ImageBitmap
  const imageBitmap = await createImageBitmap(imageFile)
  // 在GPU上创建张量并预处理（全部在GPU内完成）
  const imageTensor = tf.tidy(() => {
    // 从ImageBitmap创建张量
    const origTensor = tf.browser.fromPixels(imageBitmap)
    // // 获取原始图像的尺寸
    // const [origH, origW] = origTensor.shape.slice(0, 2)
    // // 计算缩放比例和目标填充尺寸
    // const scale = Math.min(targetHeight / origH, targetWidth / origW)
    // const newH = Math.round(origH * scale)
    // const newW = Math.round(origW * scale)
    // // 双线性插值缩放图像张量
    // const resizedTensor = tf.image.resizeBilinear(origTensor, [newH, newW])
    // // 计算填充量（居中对齐）
    // const padTop = Math.floor((targetHeight - newH) / 2)
    // const padBottom = targetHeight - newH - padTop
    // const padLeft = Math.floor((targetWidth - newW) / 2)
    // const padRight = targetWidth - newW - padLeft
    // // 填充上下左右（以0，即黑色填充）
    // const paddedTensor = tf.pad(resizedTensor, [
    //   // 第一维度，即高度
    //   [padTop, padBottom],
    //   // 第二维度，即宽度
    //   [padLeft, padRight],
    //   // 第三维度，即通道数。不需要填充
    //   [0, 0]
    // ], 0)
    // // 归一化
    // // const normalizedTensor = paddedTensor.toFloat().div(255.0)
    // // 扩维，增加batch维度
    // const expandedTensor = paddedTensor.toInt().expandDims(0)
    // 返回预处理后的张量
    return origTensor.toInt().expandDims(0)
  })
  // 关闭ImageBitmap，释放内存
  imageBitmap.close()
  // 返回预处理后的张量
  return imageTensor
}

