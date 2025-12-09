"use strict"

/**
 * @获取数据并乱序后预处理为归一化张量
 */

/**
 * @库导入
 */
// 导入tfjs和tfvis和库
import * as tf from "@tensorflow/tfjs"
// import * as tfvis from "@tensorflow/tfjs-vis"
// 导入机器学习库的公共对象、公共方法
import { dataAoaToTensor2d, tensorNormalize } from "../deeplearning-dataset.js"
// 导入数据集
// import { ramanData } from "../../datasets/raman-dataset.js"

/**
 * @数据处理 获取数据并乱序后预处理为归一化张量
 * @function
 * @param { String[] } logArr 记录处理流程的字符串数组
 * @returns {{
 *   featureTensorNormalized: tf.Tensor,
 *   featureTensorMax: tf.Tensor,
 *   featureTensorMin: tf.Tensor,
 *   labelTensorNormalized: tf.Tensor,
 *   labelTensorMax: tf.Tensor,
 *   labelTensorMin: tf.Tensor
 * }} 特征、标签的归一化张量，及逆归一化时需要的最大值、最小值张量
 */
export function dataTensor(logArr) { try {
  // 清空出return外的所有过程内容，节省内存开销
  return tf.tidy(() => {

    // 控制台记录 + 前端记录
    console.time("数据预处理完成，耗时")
    console.log("开始将原始JSON数据预处理为张量并归一化...")
    const startTime = (new Date()).getTime()
    logArr.push("开始将原始JSON数据预处理为张量并归一化...")

    /**
     * @原始JSON数组数据乱序
     * @乱序后预处理为张量
     */
    // 去掉ramanData的第一行，即表头行
    const dataTensor = dataAoaToTensor2d(ramanData.slice(1), 2)

    /**
     * @特征张量归一化
     * 1. 先对每个样本数据进行归一化，即对每个谱图先归一化
     *    谱图归一化这是必须做的处理，输出的max、min张量每个样本都不同，因此不用保留
     * 2. 再对每个拉曼位移(波数)下的所有样本(在该波数下的峰强)进行归一化
     */
    // 第1步
    const featureTensorNormalizeTemp = tensorNormalize(dataTensor.featureTensor, [1]).normalization
    // 第2步
    const featureTensorNormalize = tensorNormalize(featureTensorNormalizeTemp, [0])

    /**
     * @标签张量归一化
     * 目前两组标签刚好都是0~1，所以归一化不变
     */
    const labelTensorNormalize = tensorNormalize(dataTensor.labelTensor)

    // 控制台记录 + 前端记录
    console.timeEnd("数据预处理完成，耗时")
    const endTime = (new Date()).getTime()
    logArr.push(`数据预处理完成，耗时 ${ (endTime - startTime) / 1000 } 秒。`)

    /**
     * @返回值
     */
    return {
      // 特征归一化张量，及逆归一化时需要的最大值、最小值张量
      featureTensorNormalized: featureTensorNormalize.normalization,
      featureTensorMax: featureTensorNormalize.tensorMax,
      featureTensorMin: featureTensorNormalize.tensorMin,
      // 标签归一化张量，及逆归一化时需要的最大值、最小值张量
      labelTensorNormalized: labelTensorNormalize.normalization,
      labelTensorMax: labelTensorNormalize.tensorMax,
      labelTensorMin: labelTensorNormalize.tensorMin,
    }

  })
} catch (error) {
  console.error("原始JSON数组数据乱序后预处理为张量时遇到报错: ", error)
}}
