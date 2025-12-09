"use strict"

/**
 * @训练模型 具体实现以下几个步骤：
 *   1. 指定训练参数，除批次大小外，还有以下重要参数：
 *     1.1 迭代次数epochs，以完整用完训练数据集计为一次迭代(不是采样批次batch)
 *     1.2 用于从训练集中构建验证集的比例validationSplit
 *     1.3 每次迭代前是否随机打乱数据shuffle
 *   2. 训练模型及相关回调
 *   3. 训练后的数据处理
 */

/**
 * @库导入
 */
// 导入tfjs和tfvis和库
import * as tf from "@tensorflow/tfjs"
import * as tfvis from "@tensorflow/tfjs-vis"
// 导入公共方法
import { showModelLayers } from "../app_common.js"

/**
 * @训练模型
 * @function async
 * @param { tf.Sequential } model 用于训练的模型
 * @param { tf.Tensor } featureTensor 用于训练模型的特征张量，即输入数据
 * @param { tf.Tensor } labelTensor 用于训练模型的标签张量，即输出数据
 * @param { number } epochCounts 迭代次数
 * @param { string[] } logArr 记录处理流程的字符串数组
 * @returns { Promise<tf.History> } 训练结果，包含训练性能的评估指标和训练过程的记录
 */
export async function trainFix(model, featureTensor, labelTensor, epochCounts, logArr) { try {

  // 控制台记录 + 前端记录
  console.time("模型训练完成，耗时")
  console.log("开始训练模型...")
  const startTime = (new Date()).getTime()
  logArr.push("开始训练模型...")

  /**
   * @训练模型
   * fit()拟合/训练。给模型指定训练数据和训练参数，返回训练结果
   * trainLog就是每次log的结果堆在一起的tf张量数组
   */
  const trainLog = await model.fit(featureTensor, labelTensor, {

    // 批次大小，每次训练迭代的采样数，tf默认32
    batchSize: 32,
    // 迭代次数，即训练轮数
    epochs: epochCounts,
    // 用于从训练集中构建验证集的比例
    validationSplit: 0.1,
    // 每次迭代前是否随机打乱数据
    shuffle: true,

    // 回调
    callbacks: [
      // 每轮训练结束的回调
      { onEpochEnd: (epoch, logs) => {
        // // 每10次执行一次
        // if (epoch % 10 === 9) {
          // 训练过程的控制台记录 + 前端记录
          // console.log(`第${ epoch + 1 }轮，记录为：${ JSON.stringify(logs) }`)
          logArr.push(`已完成 ${ epoch + 1 } / ${ epochCounts } 轮迭代：
            训练集损失值 = ${ logs.loss }
            验证集损失值 = ${ logs.val_loss || "[未设定测试集]" }
            ${ (logs.loss < logs.val_loss) ? "！请注意过拟合情况" : "迭代正常" }
          `)
        // }
      }},
    ],

  })

  // 控制台记录 + 前端记录
  console.timeEnd("模型训练完成，耗时")
  const endTime = (new Date()).getTime()
  logArr.push(`模型训练完成，耗时 ${ (endTime - startTime) / 1000 } 秒，详情见图表。`)

  /**
   * @可视化模型各层参数
   */
  showModelLayers(model, "训练参数")

  /**
   * @可视化模型训练过程
   */
  tfvis.show.history(
    // 容器
    {
      tab: "训练历程",
      name: "评价指标：均方误差 & 平均绝对误差（训练集 & 验证集）",
    },
    // 内容
    trainLog,
    trainLog.params.metrics,
  )

  /**
   * @返回训练结果
   */
  return trainLog

} catch (error) {
  console.error("模型初始化时遇到报错: ", error)
}}
