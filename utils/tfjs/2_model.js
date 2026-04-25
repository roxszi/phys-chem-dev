"use strict"

/**
 * @建立神经网络模型 初始化机器学习模型，参数如下：
 *   1. 模型的层数
 *   2. 每一层的输出维度
 *   3. 每一层是线性还是非线性，非线性的话，激活函数是什么
 */

/**
 * @模型
 * @note 序列模型
 * tf.Sequential类，即“序列模型”，是最简单的模型
 * 序列模型下，一个模型由多个有序的层(layers)组成，任何一层的输出是下一层的输入
 * 模型的拓扑结构是一个关于层的“堆栈”，没有分支或跳跃
 * @note 普通模型
 * tf.Model类，由tf.model()构造，更接近底层，操作更复杂
 * 手动设置层之间的输入-输出关系，可实现一对多、多对一、多对多的输入-输出
 * @note 图模型
 */

/**
 * @层 layers
 * tf.Layers类。尤在序列模型下，以tf.Dense类为主
 * tf.layers.dense()构造一个密集层/全连接层
 * 序列模型下，一个模型由多个层(layers)组成，各层之间是序列关系，
 * 任何一层的输出是下一层的输入，模型拓扑是一个简单的层“堆栈”，没有分支或跳跃
 * 更为复杂的模型为tf.Model类，由tf.model()构造，更接近底层，操作更复杂
 */

/**
 * @激活函数 activation
 * 源自“神经元刺激/激活”的相关灵感，本质为非线性函数。具体如下：
 * elu - 负值平滑处理为指数函数的ReLU，常用于图片识别
 * hardSigmoid - 硬Sigmoid，分段线性近似Sigmoid，将输入值映射到(0, 1)区间
 * linear - f(x) = x，线性激活函数
 * @relu - f(x) = max(0, x)，输出x的正值部分，负值则输出0。最常用的激活函数之一
 * relu6 - 限制输出在(0, 6)的ReLU
 * selu - Scaled Exponential Linear Unit，通过缩放和位移参数实现自归一化神经网络的ELU
 * @sigmoid - 将输入映射到(0, 1)区间，常用于二分类问题的输出层
 * softmax - 用于多分类问题的输出层，将输入转换为概率分布，所有元素之和为1
 * softplus - ReLU的平滑版本，将ReLU的一个上界估计定义为log(1 + e^x)
 * @softsign - 将输入值映射到(-1,1)区间，反对称、去中心、可微分，是Tanh的更平坦版本
 * tanh - Hyperbolic Tangent，将输入映射到(-1, 1)区间
 * swish - f(x) = x * sigmoid(x)，自门控的Sigmoid激活函数
 * mish - f(x) = x * tanh(softplus(x))，用于改进ReLU系列激活函数的性能
 * gelu - Gaussian Error Linear Unit，基于高斯误差函数的激活函数，模拟神经网络的预激活正态分布
 * @gelu_new - GELU的改进版本
 */

/**
 * @库导入
 */
// 导入tfjs和tfvis和库
import * as tf from "@tensorflow/tfjs"
// import * as tfvis from "@tensorflow/tfjs-vis"
// 导入公共方法
import { showModelSummary } from "../deeplearning-common.js"

/**
 * @各种层示例
 * @note 对于任何层，作为输入层时，都需要加如下参数：
 * ```js
 * // 输入维度
 * inputShape: [1600],
 * ```
 * @note 对于任何层，可以添加如下参数设置正则化：
 * ```js
 * // 核权重正则化
 * kernelRegularizer: "l1l2",
 * // 偏差正则化
 * biasRegularizer: "l1l2",
 * // 激活函数正则化
 * activityRegularizer: "l1l2",
 * ```
 */

/**
 * @融合层 合并两个输入用的
 * 融合层无法用于tf.sequelize模型，只能用于tf.model()模型
 * 因此，所有的融合层，在其声明时都需要添加一个apply()的链式调用，如：
 * ```js
 * tf.layers.add({ ... }).apply([layer1, layer2, ...])
 * ```
 */
// 直接加和。几个输入形状必须一致
const addLayer = tf.layers.add({
  name: "add-demo",
})
// 取平均。几个输入形状必须一致
const averageLayer = tf.layers.average({
  name: "average-demo",
})
// 连接/合并。几个输入的连接维度的形状可以不一致，其它维度形状必须一致
const concatenateLayer = tf.layers.concatenate({
  name: "concatenate-demo",
  // 沿着哪个轴进行连接，默认为-1，即最后一个轴（需注意batch轴为0轴）
  axis: -1
})
// 矩阵点乘。用得不多
const dotLayer = tf.layers.dot({
  name: "dot-demo",
  // 点积轴
  axes: -1,
  // 是否沿着点积轴进行归一化
  normalize: false,
})
// 取最大值。几个输入形状必须一致
const maximumLayer = tf.layers.maximum({
  name: "maximum-demo",
})
// 取最小值。几个输入形状必须一致
const minimumLayer = tf.layers.minimum({
  name: "minimum-demo",
})
// 乘积。几个输入形状必须一致能形成有效矩阵乘积
const multiplyLayer = tf.layers.multiply({
  name: "multiply-demo",
})

/**
 * @reshape层 改变张量形状用的
 */
const reshapeLayerDemo = tf.layers.reshape({
  name: "reshape-demo",
  // 输入空间的形状，不需要加null
  inputShape: [1600],
  // 输出空间的形状
  targetShape: [1600, 1],
})

/**
 * @卷积层
 * 1维：
 *   输入尺寸：[batchSize, width, channels]
 *   输出尺寸：[batchSize, newWidth, filters]
 * 2维：
 *   输入尺寸：[batchSize, height, width, channels]，即NHWC
 *   输出尺寸：[batchSize, newHeight, newWidth, filters]
 * 3维：
 *   输入尺寸：[batchSize, depth, height, width, channels]
 *   输出尺寸：[batchSize, newDepth, newHeight, newWidth, filters]
 */
const conv1dLayerDemo = tf.layers.conv1d({
  name: "conv1d-demo",
  // 滤波器数量，即输出的最后一层channels层增加倍数
  filters: 200,
  // 卷积核尺寸
  kernelSize: [5],
  // 卷积步长
  strides: 5,
  // 边缘处理方法，valid为不添加填充
  padding: "valid",
  // 启用偏差
  useBias: true,
  // 激活函数，不用的话就写“undefined”
  activation: undefined,
})

/**
 * @池化层 卷积之后一般会跟着池化，压缩height和width维度数
 * 最大/平均池化：
 *   输入尺寸：[batchSize, (depth), (height), width, channels]
 *   输出尺寸：[batchSize, (newDepth), (newHeight), newWidth, channels]
 * 全局最大/平均池化：
 *   输入尺寸：[batchSize, (depth), (height), width, channels]
 *   输出尺寸：[batchSize, channels]
 */
const averagePooling1dLayerDemo = tf.layers.averagePooling1d({
  name: "average-pooling-1d-demo",
  // 池化尺寸
  poolSize: [5],
  // 池化步长
  strides: 5,
  // 边缘处理方法，valid为不添加填充
  padding: "valid",
})

/**
 * @GRU循环层
 * 输入尺寸：[(batchSize), timeSteps, features]
 * 输出尺寸：[batchSize | null, units]
 * 如果使用returnSequences: true，则输出尺寸：[batchSize | null, timeSteps, units]
 */
const gruLayerDemo = tf.layers.gru({
  name: "rnn-gru-demo",
  // // 随机“丢弃”一些前一层传来的神经元，以防过拟合
  // // 除专门的dropout层外，只有RNN层有扩展的dropout参数
  // dropout: 0.5,
  // // 随机“丢弃”对前一个时间步的依赖，以防过拟合
  // recurrentDropout: 0.5,
  // 是否返回每个时间步的输出
  // 如果要堆叠多个RNN层，则必须设定为true
  returnSequences: false,
  // 循环层内部门控机制的激活函数
  recurrentActivation: "hardSigmoid",
  // 输出空间的维度（类似卷积核的滤波器）
  units: 4,
  // 不启用偏差
  useBias: false,
  // 激活函数，RNN默认为hyperbolic tangent (tanh)
  activation: "tanh",
})

/**
 * @LSTM循环层
 * 输入尺寸：([batchSize], timeSteps, features)
 * 输出尺寸：(batchSize | null, units)
 * 如果使用returnSequences: true，则输出尺寸：(batchSize | null, timeSteps, units)
 */
const lstmLayerDemo = tf.layers.lstm({
  name: "rnn-lstm-demo",
  // 启用LSTM遗忘门的偏差，这是LSTM独有的传参
  // 设置为true时，遗忘门相当于被施加偏置1，则更倾向于遗忘
  unitForgetBias: true,
  // 随机“丢弃”一些前一层传来的神经元，以防过拟合
  // 除专门的dropout层外，只有RNN层有扩展的dropout参数
  dropout: 0.5,
  // 随机“丢弃”对前一个时间步的依赖，以防过拟合
  recurrentDropout: 0.5,
  // 是否返回每个时间步的输出
  // 如果要堆叠多个RNN层，则必须设定为true
  returnSequences: false,
  // 循环层内部门控机制的激活函数
  recurrentActivation: "tanh",
  // 输出空间的维度（类似卷积核的滤波器）
  units: 60,
  // 启用偏差
  useBias: true,
  // 激活函数，RNN默认为hyperbolic tangent (tanh)
  activation: "tanh",
})

/**
 * @扁平层 CNN/RNN之后把数据汇总，压缩一个维度
 */
const flattenLayerDemo = tf.layers.flatten({
  name: "flatten-demo",
})

/**
 * @密集层 全连接层
 * 最普通的层，只处理传入矩阵的最后一个维度，处理为units维，其它维度形状不变
 * 因此有时候需要flatten扁平层处理压缩输入维度
 */
const denseLayerDemo = tf.layers.dense({
  // 命名，方便可视化呈现，xxx一般为激活函数类型
  name: "dense-xxx-demo",
  // 输出空间的维度
  units: 1600,
  // 启用偏差
  useBias: true,
  // 激活函数，不用的话就写“undefined”
  activation: undefined,
})

/**
 * @dropout层
 */
const dropoutLayerDemo = tf.layers.dropout({
  name: "dropout-demo",
  // 随机“丢弃”一些前一层传来的神经元，以防过拟合
  rate: 0.5,
  // 掩码，以确保形状，一般不需要
  noiseShape: undefined,
  // 种子，相同的种子可以确保训练随机数能重复
  seed: 1,
})


/**
 * @layersModel 建立神经网络模型
 * @function
 * @param { string[] } logArr 记录处理流程的字符串数组
 * @returns { tf.Sequential } 初始化的序列模型
 */
export function layersModel(logArr) { try {

  // 控制台记录 + 前端记录
  console.time("模型构建完成，耗时")
  console.log("开始构建模型...")
  const startTime = (new Date()).getTime()
  logArr.push("开始构建模型...")

  /**
   * @实例化一个序列模型
   */
  const model = tf.sequential()

  /**
   * @输入层 选用reshape层
   */
  const inputReshapeLayer = tf.layers.reshape({
    name: "input-reshape",
    // 输入空间的形状，不需要加null
    inputShape: [1600],
    // 输出空间的形状
    targetShape: [1600, 1],
  })
  model.add(inputReshapeLayer)

  /**
   * @卷积层
   * 1维：
   *   输入尺寸：[batchSize, width, channels]
   *   输出尺寸：[batchSize, newWidth, filters]
   * 2维：
   *   输入尺寸：[batchSize, height, width, channels]，即NHWC
   *   输出尺寸：[batchSize, newHeight, newWidth, filters]
   * 3维：
   *   输入尺寸：[batchSize, depth, height, width, channels]
   *   输出尺寸：[batchSize, newDepth, newHeight, newWidth, filters]
   */
  const conv1dLayer1 = tf.layers.conv1d({
    name: "conv1d-1",
    // 滤波器数量，即输出的最后一层channels层增加倍数
    filters: 32,
    // 卷积核尺寸
    kernelSize: [5],
    // 卷积步长
    strides: 1,
    // 边缘处理方法，valid为不添加填充，same为填充
    padding: "same",
    // 不启用偏差
    useBias: false,
    // 激活函数
    activation: "relu",
  })
  // 再来一层
  const conv1dLayer2 = tf.layers.conv1d({
    name: "conv1d-2",
    // 滤波器数量，即输出的最后一层channels层增加倍数
    filters: 1,
    // 卷积核尺寸
    kernelSize: [5],
    // 卷积步长
    strides: 1,
    // 边缘处理方法，valid为不添加填充，same为填充
    padding: "same",
    // 不启用偏差
    useBias: false,
    // 激活函数
    activation: "softsign",
  })

  /**
   * @池化层 卷积之后一般会跟着池化，压缩height和width维度数
   * 最大/平均池化：
   *   输入尺寸：[batchSize, (depth), (height), width, channels]
   *   输出尺寸：[batchSize, (newDepth), (newHeight), newWidth, channels]
   * 全局最大/平均池化：
   *   输入尺寸：[batchSize, (depth), (height), width, channels]
   *   输出尺寸：[batchSize, channels]
   */
  const averagePooling1dLayer = tf.layers.averagePooling1d({
    name: "average-pooling-1d",
    // 池化尺寸
    poolSize: [4],
    // 池化步长
    strides: 4,
    // 边缘处理方法，valid为不添加填充，same为填充
    padding: "same",
  })
  // 再来一层
  const maxPooling1dLayer = tf.layers.maxPooling1d({
    name: "max-pooling-1d",
    // 池化尺寸
    poolSize: [4],
    // 池化步长
    strides: 4,
    // 边缘处理方法，valid为不添加填充
    padding: "valid",
  })

  model.add(conv1dLayer1)
  model.add(averagePooling1dLayer)
  model.add(conv1dLayer2)
  model.add(maxPooling1dLayer)

  /**
   * @LSTM循环层
   * 输入尺寸：([batchSize], timeSteps, features)
   * 输出尺寸：(batchSize | null, units)
   * 如果使用returnSequences: true，则输出尺寸：(batchSize | null, timeSteps, units)
   */
  const lstmLayer = tf.layers.lstm({
    name: "rnn-lstm",
    // 启用LSTM遗忘门的偏差，这是LSTM独有的传参
    // 设置为true时，遗忘门相当于被施加偏置1，则更倾向于遗忘
    unitForgetBias: true,
    // // 随机“丢弃”一些前一层传来的神经元，以防过拟合
    // // 除专门的dropout层外，只有RNN层有扩展的dropout参数
    // dropout: 0.5,
    // // 随机“丢弃”对前一个时间步的依赖，以防过拟合
    recurrentDropout: undefined,
    // 是否返回每个时间步的输出
    // 如果要堆叠多个RNN层，则必须设定为true
    returnSequences: false,
    // 循环层内部门控机制的激活函数
    recurrentActivation: "hardSigmoid",
    // 输出空间的维度（类似卷积核的滤波器）
    units: 1,
    // 不启用偏差
    useBias: false,
    // 激活函数，RNN默认为hyperbolic tangent (tanh)
    activation: "tanh",
  })

  model.add(gruLayerDemo)
  // model.add(lstmLayer)

  /**
   * @密集层 全连接层
   */
  const denseLayerSoftsign = tf.layers.dense({
    name: "dense-softsign",
    // 输出空间的维度
    units: 32,
    // 启用偏差
    useBias: true,
    // 激活函数
    activation: "softsign",
  })
  model.add(denseLayerSoftsign)

  /**
   * @dropout层
   */
  const dropoutLayer = tf.layers.dropout({
    name: "dropout",
    // 随机“丢弃”一些前一层传来的神经元，以防过拟合
    rate: 0.5,
    // 掩码，以确保形状，一般不需要
    noiseShape: undefined,
    // 种子，相同的种子可以确保训练随机数能重复
    seed: 1,
  })
  model.add(dropoutLayer)

  /**
   * @输出层
   * 输出空间的单位为2（即ACE和THI的取值）
   * 其实本数据集的ACE + THI = 1，所以原则上秩为1，但是考虑以后会引入杂质等，故以秩为2训练
   */
  const outputReluLayer = tf.layers.dense({
    name: "output-relu",
    // 输出空间的维度
    units: 2,
    // 启用偏差
    useBias: true,
    // 激活函数
    activation: "relu",
  })
  model.add(outputReluLayer)

  // 控制台记录 + 前端记录
  console.timeEnd("模型构建完成，耗时")
  const endTime = (new Date()).getTime()
  logArr.push(`模型构建完成，耗时 ${ (endTime - startTime) / 1000 } 秒。`)

  // 可视化模型概要
  showModelSummary(model, "建立模型")

  /**
   * @返回所建立的模型
   */
  return model

} catch (error) {
  console.error("模型初始化时遇到报错: ", error)
}}
