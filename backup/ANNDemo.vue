<!--
  人工神经网络演示组件 Artificial Neural Network，ANN
 -->

<!--
  视图层
 -->
<template><MySpace>

  <!-- tfjs计算层 -->
  <TfjsInit v-model:tfjsInitializationState="tfjsInitializationStateRef"/>

  <!-- 内容容器：需要先加载tfjs计算层 -->
  <MySpace v-if="tfjsInitializationStateRef === 1">

    <!-- 挂载预训练模型 -->
    <MyButton
      size="large"
      :theme="isPreTrainedModelFetchedRef ? 'success' : 'primary'"
      @click="onFetchPreTrainedModelBtnClicked"
      :disabled="isPreTrainedModelFetchedRef"
    >
      {{ isPreTrainedModelFetchedRef ? `模型读取成功` : "读取预训练模型" }}
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
 */
/** ANN业务的数据对象 @type { ANN } */
const annObj = {
  modelFileNameArr: null,
  modelFileHandleArr: null,
  preTrainedModel: null
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
  
  // 调试模式
  // tf.enableDebugMode()
  
  // 模型链接
  const preTrainedModelUrl = withBase("/cnn/ssdlite-mobilenet-v2-tfjs/model.json")
  // 读取模型
  annObj.preTrainedModel = await tf.loadGraphModel(preTrainedModelUrl)
  // 读取完毕，更新Ref状态
  isPreTrainedModelFetchedRef.value = true

  // 打印模型
  console.log("预训练模型：", annObj.preTrainedModel)
  // console.log("节点：", annObj.preTrainedModel.executor.graph.nodes)
  
  // // 遍历节点
  // const nodeNames = []
  // const nodes = annObj.preTrainedModel.executor.graph.nodes
  // for (const nodeKey in nodes) {
  //   // 获取节点名
  //   nodeNames.push(nodes[nodeKey].name)
  // }
  // console.log("节点名：", nodeNames)



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
  // 接参数
  const preTrainedModel = annObj.preTrainedModel
  
  // 列出你想测试的候选节点名称
  const candidateNodes = [
    "FeatureExtractor/MobilenetV2/expanded_conv_16/expand/Relu6",
    "FeatureExtractor/MobilenetV2/Conv/Relu6",
    "FeatureExtractor/MobilenetV2/Conv_1/Relu6",
    "FeatureExtractor/MobilenetV2/expanded_conv/project/BatchNorm/batchnorm/add_1",
    "FeatureExtractor/MobilenetV2/expanded_conv_1/project/BatchNorm/batchnorm/add_1",
    "FeatureExtractor/MobilenetV2/expanded_conv_11/ArithmeticOptimizer/AddOpsRewrite_add"
  ];
  
  
  // 对图像张量进行预处理，然后使用模型进行预测，得到logits输出
  /** @type { tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] } */
  const features = await preTrainedModel.executeAsync(imgTensor, candidateNodes)

  

  // // 获取所有中间张量
  // const intermediates = preTrainedModel.getIntermediateTensors()

  // // 打印节点信息
  // console.log('找到以下中间节点：');

  // for (const [name, tensor] of Object.entries(intermediates)) {
  //   // 过滤Conv2D
  //   if (name.includes('Conv2D')) {
  //     console.log({ name })
  //     console.log("tensor.length: ", tensor.length)
  //     if (tensor.length) {
  //       tensor[0].print()
  //     } else {
  //       // @ts-ignore
  //       tensor.print()
  //     }
  //   }
    
    
  //   // console.log(name)
  //   // 可选：释放中间张量？不，稍后统一释放，现在只是查看
  // }


  // 缩维，把形状为1的维度都去掉
  // const logits = features.squeeze()

  // 计算logits中最大值的索引，即预测的类别索引，并将其转换为普通JS数值
  // const classIndex = await tf.argMax(tf.squeeze(logits)).data()
    
  // 关闭加载动画
  my.loading(false)
  debugger
}

/**
 * 构建新模型
 */
function establishModel() {



}



</script>
