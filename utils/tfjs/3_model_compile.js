"use strict"

/**
 * @编译模型
 * 给模型指定训练时的优化器、损失函数、评估指标等，其旨在：
 *   1. 根据每一层的设置参数及层之间的逻辑关系，编译模型前向传播的具体算法
 *   2. 结合损失函数、优化器，编译模型反向传播的具体算法(损失对各层的梯度、更新权重的方法等)
 *   3. 上述1、2即得到一个“计算图”
 * 因此，编译模型之后，模型的层设置才生效
 * @note 具体操作：
 *   1. 指定损失函数loss
 *   2. 指定优化器optimizer
 *   3. 指定评估指标metrics
 */

/**
 * @库导入
 */
// 导入tfjs和tfvis和库
import * as tf from "@tensorflow/tfjs"
// import * as tfvis from "@tensorflow/tfjs-vis"

/**
 * @编译模型
 * @function
 * @param { tf.LayersModel } model 待编译的模型
 * @param { string[] } logArr 记录处理流程的字符串数组
 */
export function modelCompile(model, logArr) { try {

  // 控制台记录 + 前端记录
  console.time("模型编译完成，耗时")
  console.log("开始编译模型...")
  const startTime = (new Date()).getTime()
  logArr.push("开始编译模型...")

  // 编译模型
  model.compile({

/**
 * @优化器 optimizer
 * 反向传播优化器，读取损失函数值(loss)并更新模型参数(权重等)的一套算法，以最小化损失
 * sgd - 随机梯度下降（Stochastic Gradient Descent, SGD）算法，使用学习率作为梯度的倍增因子，每次只使用一个样本的梯度来更新权重。适用于各类的神经网络，但可能耗时较长
 * momentum - 利用历史梯度信息来加速学习过程，类似于物理中的动量。有助于加快收敛速度，减少震荡。
 * adagrad - AdaGrad算法，根据每个参数的历史梯度累积量来调整学习率，适用于稀疏数据。
 * adadelta - AdaDelta算法，结合了AdaGrad和Momentum的优点，根据梯度的大小来调整学习率，适用于稀疏数据。
 * @adam - 自适应运动估计（Adaptive Moment Estimation, ADAM）算法，结合了AdaDelta的适应性学习率策略和momentum动量方法的特点，适用于各类神经网络。
 * adamax - Adam的变种，当梯度非常大时，可以避免Adagrad中的学习率下降过快的问题。适用于各类神经网络，特别是当数据稀疏时。
 * rmsprop - RMSProp算法，使用梯度的平方移动平均值来调整学习率。适用于稀疏数据。
 */

    // 使用adam优化器，学习率默认为0.001
    optimizer: tf.train.adam(),

/**
 * @损失函数和评估指标的具体算法 用于损失函数loss及评估指标metrics
 *   Losses类，即损失函数，可传参权重weights等，用法为tf.losses.{xxx}
 *   Metrics类，即评估指标，传参仅为x和y，用法为tf.metrics.{xxx}
 * @回归适用
 *   absoluteDifference { losses } - 绝对值差异（的平均值）
 *   meanAbsoluteError { metrics } - 平均绝对误差，即预测值与真实值之差的绝对值
 *   meanAbsolutePercentageError { metrics } - 平均绝对百分比误差，即预测值与真实值之差的绝对值占真实值的比例
 *   computeWeightedLoss { losses } - 加权差异（的平均值），可以对不同样本或不同特征分配不同的权重
 *   @meanSquaredError { losses | metrics } - 均方误差，即预测值与真实值之差的平方的平均值
 *   cosineDistance { losses } - 余弦距离，即预测值与真实值之差的余弦值（的平均值），方向敏感，稀疏数据适用
 * @二分类适用
 *   binaryAccuracy { metrics } - 二分类准确率，即预测正确的样本占样本总数的比例
 *   binaryCrossentropy { metrics } - 二分类交叉熵，即预测值与真实值之间的差异大小
 *   logLoss { losses } - 对数损失函数。适用于二分类问题
 *   hingeLoss { losses } - 合页损失函数，计算SVM中的hinge损失。适用于二分类问题
 *   sigmoidCrossEntropy { losses } - Sigmoid交叉熵。用于二分类问题
 * @二分类及多分类适用
 *   precision { metrics } - 准确率，即预测为正样本的样本中，实际为正样本的比例
 *   recall { metrics } - 召回率，即实际为正样本的样本中，预测为正样本的比例
 * @多分类适用
 *   categoricalAccuracy { metrics } - 多分类准确率，即预测正确的样本占样本总数的比例
 *   categoricalCrossentropy { metrics } - 多分类交叉熵，即预测值与真实值之间的差异大小
 *   cosineProximity { metrics } - 余弦相似度，即预测值与真实值之差的余弦值
 *   huberLoss { losses } - Huber损失函数
 *   softmaxCrossEntropy { losses } - Softmax交叉熵
 *   sparseCategoricalAccuracy { metrics } - 稀疏多分类准确率，即预测正确的样本占样本总数的比例。稀疏多分类适用
 */

/**
 * @损失函数 loss
 * 定义模型预测值与真实值之间的差异大小(即“损失”)的函数
 * 被用于反向传播优化器，用于计算梯度，并更新模型参数
 */

    // 损失函数。使用平均绝对误差
    loss: [tf.metrics.meanAbsoluteError],

/**
 * @评估指标 metrics
 * 定义模型性能的评估指标，传参类型与loss损失函数相同
 * 不被用于反向传播优化器，只是用于监测/报告
 */

    // 评估指标。使用均方误差
    metrics: [tf.losses.meanSquaredError],

  })

  // 控制台记录 + 前端记录
  console.timeEnd("模型编译完成，耗时")
  const endTime = (new Date()).getTime()
  logArr.push(`模型编译完成，耗时 ${ (endTime - startTime) / 1000 } 秒。`)

} catch (error) {
  console.error("模型编译时遇到报错: ", error)
}}
