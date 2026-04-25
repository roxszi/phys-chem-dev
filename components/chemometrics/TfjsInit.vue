<!--
  TFjs初始化组件
 -->

<!-- 视图层 -->
<template>

  <!-- 警报框 -->
  <t-alert
    theme="info"
    title="TensorFlow.js 初始化"
  >
    <!-- TFjs计算层内容 -->
    <div v-if="tfjsInitializationStateModel === 0">
      正在初始化TensorFlow.js计算环境，请稍候...
    </div>
    <div v-else-if="tfjsInitializationStateModel === 1">
      {{ `初始化完毕，当前使用${ tfBackendMap[tfBackendRef] }。` }}
    </div>
    <div v-else>
      TensorFlow.js计算环境初始化失败，请检查浏览器版本。
    </div>
  </t-alert>

</template>

<!-- 逻辑层 -->
<script setup>
// 导入tfjs库，及WebGPU计算层
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgpu"
// 导入vue方法
import { shallowRef, onMounted } from "vue"

/** 硬件加速表 */
const tfBackendMap = {
  "webgpu": " WebGPU 硬件加速计算层",
  "webgl": " WebGL 硬件加速计算层",
  "cpu": " CPU 计算层",
  "wasm": " WASM 编译加速计算层"
}
/**
 * 双向绑定的组件传参
 * @property { 0 | 1 | -1 } [tfjsInitializationStateModel = 0] 是否初始化完毕
 */
const tfjsInitializationStateModel = defineModel("tfjsInitializationState", {
  type: Number,
  required: true,
  default: 0,
})
/** tfjs的计算环境(后端) */
const tfBackendRef = shallowRef("")

/**
 * @启动方法
 * 生命周期钩子，组件加载完毕后执行
 */
onMounted(async () => { try {
  // 等待计算服务(后端)全部初始化完毕
  await tf.ready()
  // 把后台传给tfBackend
  tfBackendRef.value = tf.getBackend()
  // 更新model状态
  tfjsInitializationStateModel.value = 1
// 捕获错误
} catch (error) {
  // 更新model状态
  tfjsInitializationStateModel.value = -1
  // 抛出错误
  throw Error(error)
}})

</script>
