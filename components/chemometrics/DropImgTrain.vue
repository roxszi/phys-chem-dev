<!--
  液滴图像的大模型识别训练组件
 -->

<!--
  视图层
 -->
<template><MySpace>

  <!-- tfjs计算层 -->
  <TfjsInit v-model:tfjsInitializationState="tfjsInitializationStateRef"/>

  <!-- 内容容器：需要先加载tfjs计算层 -->
  <MySpace v-if="tfjsInitializationStateRef === 1">

    <!-- 警报框：模型 -->
    <t-alert theme="info" title="模型">
      预训练模型直接读取即可。
      分类头模型需要训练。
    </t-alert>

    <!-- 读取预训练模型 -->
    <MyButton
      size="large"
      :theme="isPreTrainedModelFetchedRef ? 'success' : 'primary'"
      @click="onFetchPreTrainedModelBtnClicked"
      :disabled="isPreTrainedModelFetchedRef"
    >
      {{ isPreTrainedModelFetchedRef ? `预训练模型读取成功` : "读取预训练模型" }}
    </MyButton>

    <!-- 挂载分类头模型 -->
    <MyButton
      size="large"
      :theme="isHeadModelMountedRef ? 'success' : 'primary'"
      @click="onMountHeadModelBtnClicked"
      :disabled="isHeadModelMountedRef"
    >
      {{ isHeadModelMountedRef ? `分类头模型挂载成功` : "挂载分类头模型" }}
    </MyButton>

    <!-- 警报框：训练集数据 -->
    <t-alert theme="info" title="模型">
      先挂载excel格式的数据文件。
      再挂载含图片的照片文件夹。
    </t-alert>

    <!-- 挂载照片文件夹 -->
    <MyButton
      size="large"
      :theme="isImgFolderFetchedRef ? 'success' : 'primary'"
      @click="onMountImgFolderBtnClicked"
    >
      {{ isImgFolderFetchedRef ? `读取到${ imgFileCountRef }张照片数据` : "挂载照片文件夹" }}
    </MyButton>

    <!-- 挂载照片文件夹 -->
    <MyButton
      size="large"
      :theme="isImgFolderFetchedRef ? 'success' : 'primary'"
      @click="onMountImgFolderBtnClicked"
    >
      {{ isImgFolderFetchedRef ? `读取到${ imgFileCountRef }张照片数据` : "挂载照片文件夹" }}
    </MyButton>



  </MySpace>

</MySpace></template>


<!--
  逻辑层
 -->
<script setup>
// 导入vue方法
import { shallowRef, ref, onMounted } from "vue"
// 导入运行时方法，用于动态创建<script>标签的url
import { withBase } from "vitepress"
// 导入自有方法
import my from "@/utils/myFunc.js"
// 导入tfjs和tfjs-visor库
import * as tf from "@tensorflow/tfjs"
import * as tfvis from "@tensorflow/tfjs-vis"
// // 导入xlsx库，以XLSX作为引用对象
// import * as XLSX from "xlsx"
// 导入tfjs脚本
import { readDirectory } from "@/utils/tfjs-utils.js"
import { imageFilehandleToGPUTensor } from "@/utils/tfjs-cnn.js"


/**
 * 对象
 */
/** Ref状态：tfjs的初始化组件钩子 */
const tfjsInitializationStateRef = shallowRef(0)
/** Ref状态：是否读取到预训练模型 */
const isPreTrainedModelFetchedRef = shallowRef(false)
/** Ref状态：是否读取到分类头模型 */
const isHeadModelFetchedRef = shallowRef(false)
/** Ref状态：是否读取到图片文件夹 */
const isImgFolderFetchedRef = shallowRef(false)
/** Ref状态：读取到的有效文件数量 */
const imgFileCountRef = ref(0)
/**
 * ANN业务的数据对象
 * @typedef { object } ANN
 * @property { string[] } modelFileNameArr (有效)文件名数组
 * @property { FileSystemFileHandle[] } modelFileHandleArr 文件句柄数组
 * @property { tf.GraphModel } preTrainedModel TF的预训练图模型
 * @property { tf.LayersModel } headModel TF的分类头模型
 * @property { [number, number] } imgShape 图片的形状 [height, width]
 */
/** ANN业务的数据对象 @type { ANN } */
const annObj = {
  modelFileNameArr: null,
  modelFileHandleArr: null,
  preTrainedModel: null,
  headModel: null,
  imgShape: null,
}

/**
 * 方法
 */

/**
 * 读取预训练模型按钮被按下的回调
 */
async function onFetchPreTrainedModelBtnClicked() {
  // 若读取到了模型，则啥都不做
  if (isPreTrainedModelFetchedRef.value) { return }
  // 若没读取到模型，则读取
  // 加载动画
  my.loading("正在导入预训练模型，请稍候...")
  // 预训练模型链接
  const preTrainedModelUrl = withBase("/cnn/ssdlite-mobilenet-v2-tfjs/model.json")
  // 头模型链接
  // const headModelUrl = withBase("")
  // 读取模型
  ;[
    annObj.preTrainedModel,
    // annObj.headModel
  ] = await Promise.all([
    tf.loadGraphModel(preTrainedModelUrl),
    // tf.loadGraphModel(preTrainedModelUrl),
  ])

  // 分类头模型
  annObj.headModel = createHeadModel()


  // 保存模型
  // annObj.preTrainedModel.save("downloads://preTrainedModel")
  // annObj.headModel.save("downloads://headModel")

  // 读取完毕，更新Ref状态
  isPreTrainedModelFetchedRef.value = true
  // 关闭加载动画
  my.loading(false)
}




/**
 * 读取照片文件夹按钮被按下的回调
 */
async function onMountImgFolderBtnClicked() {
  // 选择文件夹，获取文件目录句柄
  /** 文件目录句柄 @type { FileSystemDirectoryHandle } */
  // @ts-ignore
  const dirHandle = await window.showDirectoryPicker()
  // 如果没有读取到文件夹，则啥都不做，直接返回
  if (!dirHandle) { return }
  // 读取到文件夹了，则读取目录，获取文件句柄
  const [fileNameArr, fileHandleArr] = await readDirectory(dirHandle)
  // 把照片文件读取为张量
  const imgTensor = await imageFilehandleToGPUTensor(fileHandleArr[0])
  // 照片的长和宽
  const [batch, imgHeight, imgWidth] = imgTensor.shape
  annObj.imgShape = [imgHeight, imgWidth]
  // 处理图片张量
  processImgTensor(imgTensor)


}

/**
 * 处理图片张量
 * @param { tf.Tensor<tf.Rank> } imgTensor 图像张量
 */
async function processImgTensor(imgTensor) {
  // 加载动画框
  my.loading("正在处理图片张量，请稍候...")
  // 接模型
  const preTrainedModel = annObj.preTrainedModel

  // 指定要提取的中间层节点名称
  const featureMapNames = [
    "FeatureExtractor/MobilenetV2/expanded_conv_13/expand/Relu6",        // [1, 19, 19, 576]
    "FeatureExtractor/MobilenetV2/Conv_1/Relu6",                         // [1, 10, 10, 1280]
    "FeatureExtractor/MobilenetV2/layer_19_2_Conv2d_2_3x3_s2_512/Relu6", // [1, 5, 5, 512]
    "FeatureExtractor/MobilenetV2/layer_19_2_Conv2d_3_3x3_s2_256/Relu6", // [1, 3, 3, 256]
    "FeatureExtractor/MobilenetV2/layer_19_2_Conv2d_4_3x3_s2_256/Relu6", // [1, 2, 2, 256]
    "FeatureExtractor/MobilenetV2/layer_19_2_Conv2d_5_3x3_s2_128/Relu6"  // [1, 1, 1, 128]
  ]
  // 对图像张量使用预训练模型进行预测，得到预训练输出
  const preTrainedFeatures = await preTrainedModel.executeAsync(imgTensor, featureMapNames)
  // // 缩维，把形状为1的维度都去掉
  // /** 预测张量。形状：[1917, 90] @type { tf.Tensor } */
  // const featureTensor = preTrainedFeatures[0].squeeze()
  // /** 边框张量。形状：[1917, 4] @type { tf.Tensor } */
  // const boxTensor = preTrainedFeatures[1].squeeze()

  // 用头模型预测
  const logits = annObj.headModel.predict(preTrainedFeatures)

  // 计算logits中最大值的索引，即预测的类别索引，并将其转换为普通JS数值
  // const classIndex = await tf.argMax(tf.squeeze(logits)).data()

  // 关闭加载动画
  my.loading(false)
  debugger
}

/**
 * 构建头模型
 * 输出形状：[[batch, 1], [batch, 4]]
 */
function createHeadModel() {
  // 模型输入数组
  const inputs = []
  // 分类预测输出数组
  const classificationPredictions = []
  // 位置预测输出数组
  const localizationPredictions = []
  // 预训练的特征图尺寸数组：6个中间特征图，形状：[height, width, channel]
  const preTrainedFeatureMapSizes = [
    [19, 19, 576],
    [10, 10, 1280],
    [5, 5, 512],
    [3, 3, 256],
    [2, 2, 256],
    [1, 1, 128]
  ]
  // 遍历特征尺寸，构建分类和回归分支
  for (const size of preTrainedFeatureMapSizes) {
    /**
     * 输入
     */
    // 以预训练模型的中间特征图各维度数构建输入张量
    const input = tf.input({ shape: size })
    // 把输入张量推进输入数组里
    inputs.push(input)
    /**
     * 分类（概率）
     * 输出形状：[batch, h, w, 1]
     * 只有1个类，因此相当于是唯一一个类的概率
     * 模仿注意力机制，把特征图尺寸缩小到1x1，然后输出分类预测
     */
    // 卷积-注意力机制
    const classificationAttention = tf
      // 构建卷积层
      .layers.conv2d({
        // 卷积核数：1（概率）
        filters: 1,
        // 卷积核尺寸：1 x 1（模仿注意力机制）
        kernelSize: 1,
        // 边缘卷积策略：same复制
        padding: "same",
        // 激活函数：线性
        activation: null
      })
      // 以输入为输入，构建卷积符号张量
      .apply(input)
    // 卷积-降维
    const classificationCompress = tf
      // 构建卷积层
      .layers.conv2d({
        // 卷积核数：1（概率）
        filters: 1,
        // 卷积核尺寸：[h, w]
        kernelSize: [size[0], size[1]],
        // 步长：[h, w]
        strides: [size[0], size[1]],
        // 边缘卷积策略：valid不复制
        padding: "valid",
        // 激活函数：sigmoid（确保输出为0 ~ 1）
        activation: "sigmoid"
      })
      // 以卷积-注意力机制为输入，构建卷积符号张量
      .apply(classificationAttention)
    // 展平
    const classificationReshape = tf
      // 构建reshape层
      .layers.reshape({ targetShape: [1, 1] })
      // 以卷积-降维为输入，构建reshape符号张量
      .apply(classificationCompress)
    // 推入分类预测数组
    classificationPredictions.push(classificationReshape)
    /**
     * 位置回归
     * 4个坐标点
     */
    // 卷积-注意力机制
    const localizationAttention = tf
      // 构建卷积层
      .layers.conv2d({
        // 卷积核数：4个坐标点
        filters: 4,
        // 卷积核尺寸：1 x 1（模仿注意力机制）
        kernelSize: 1,
        // 边缘卷积策略：same复制
        padding: "same",
        // 激活函数：线性
        activation: null
      })
      // 以输入为输入，构建卷积符号张量
      .apply(input)
    // 卷积-降维
    const localizationCompress = tf
      // 构建卷积层
      .layers.conv2d({
        // 卷积核数：4个坐标点
        filters: 4,
        // 卷积核尺寸：[h, w]
        kernelSize: [size[0], size[1]],
        // 步长：[h, w]
        strides: [size[0], size[1]],
        // 边缘卷积策略：valid不复制
        padding: "valid",
        // 激活函数：sigmoid（确保输出为0 ~ 1）
        activation: "sigmoid"
      })
      // 以卷积-注意力机制为输入，构建卷积符号张量
      .apply(localizationAttention)
    // 展平
    const localizationReshape = tf
      // 构建reshape层
      .layers.reshape({targetShape: [1, 4]})
      // 以卷积-降维为输入，构建reshape符号张量
      .apply(localizationCompress)
    // 推入位置预测数组
    localizationPredictions.push(localizationReshape)
  }
  /**
   * 收束
   * 分类图收束为：[batch, 6, 1]
   * 位置图收束为：[batch, 6, 4]
   */
  // 分类图收束为：[batch, 6, 1]
  const allClassification = tf
    // 以[1]为连接轴进行拼接，即把[batch, xxx, 1]中的xxx合并
    .layers.concatenate({ axis: 1 })
    // 以分类预测数组为输入，构建拼接符号常量
    // @ts-ignore
    .apply(classificationPredictions)
  // 位置图收束为：[batch, 6, 4]
  const allLocalization = tf
    // 以[1]为连接轴进行拼接，即把[batch, xxx, 4]中的xxx合并
    .layers.concatenate({ axis: 1 })
    // 以位置预测数组为输入，构建拼接符号常量
    // @ts-ignore
    .apply(localizationPredictions)
  /**
   * 融合
   * 位置概率和：[batch, 4, 1]
   */
  // 概率展平：[batch, 6]
  const allClassificationFlatten = tf
    // 构建展平层
    .layers.flatten()
    // 以分类图收束为输入，构建展平符号张量
    .apply(allClassification)
  // 概率输出
  const classificationOutput = tf
    // 构建全连接层
    .layers.dense({
      // 输出节点数：1（概率）
      units: 1,
      // 激活函数：sigmoid（确保输出为0 ~ 1）
      activation: "sigmoid"
    })
    // 以概率展平为输入，构建全连接符号张量
    .apply(allClassificationFlatten)
  // 位置概率和
  const localizationWeightSum = tf
    // dot点积层：沿着[1]轴位进行点积。输出形状：[batch, 4, 1]
    .layers.dot({ axes: 1 })
    // 以分类图和位置图为输入，构建内积符号常量
    // @ts-ignore
    .apply([allClassification, allLocalization])
  // 位置展平：[batch, 4]
  const localizationWeightSumFlatten = tf
    // 构建展平层
    .layers.flatten()
    // 以分类图收束为输入，构建展平符号张量
    .apply(localizationWeightSum)
  // 融合：位置展平 + 概率输出
  const localizationConcatenate = tf
    // 构建拼接层
    .layers.concatenate()
    // 以概率输出、位置展平为输入，构建全连接符号张量
    // @ts-ignore
    .apply([localizationWeightSumFlatten, classificationOutput])
  // 位置输出
  const localizationOutput = tf
    // 构建全连接层
    .layers.dense({
      // 输出节点数：4（位置）
      units: 4,
    })
    // 以概率输出、位置展平的拼接为输入，构建全连接符号张量
    // @ts-ignore
    .apply(localizationConcatenate)
  /**
   * 输出模型
   */
  // 组装模型
  const headModel = tf.model({
    inputs: inputs,
    // @ts-ignore
    outputs: [classificationOutput, localizationOutput] })
  // 返回模型
  return headModel
}


// const normalizedBox = [
//   (x_center) / imageWidth,
//   (y_center) / imageHeight,
//   width / imageWidth,
//   height / imageHeight
// ];



</script>

