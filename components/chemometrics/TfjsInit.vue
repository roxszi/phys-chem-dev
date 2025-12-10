<!--
  TFjs初始化组件
 -->

<!-- 视图层 -->
<template>

  <!-- 警报框 -->
  <t-alert
    v-if="isInitializedModel"
    theme="info" title="TensorFlow.js 初始化"
  >
    {{
      isInitializedModel
        ? `初始化完毕，当前使用${ tfBackendMap[tfBackendRef] }。`
        : "正在初始化TensorFlow.js计算环境，请稍候..."
    }}
  </t-alert>

</template>

<!-- 逻辑层 -->
<script setup>
// 导入tfjs库，及WebGPU计算层
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgpu"
// 导入vue方法
import { ref, onMounted } from "vue"
// 导入自有方法
import my from "@/utils/myFunc.js"

// 硬件加速表
const tfBackendMap = {
  "webgpu": " WebGPU 硬件加速计算层",
  "webgl": " WebGL 硬件加速计算层",
  "cpu": " CPU 计算层",
  "wasm": " WASM 编译加速计算层"
}
/**
 * 双向绑定的组件传参
 * @property { boolean } [isInitializedModel = false] 是否初始化完毕
 */
const isInitializedModel = defineModel("isInitialized", {
  type: Boolean,
  required: true,
  default: false,
})
// tfjs的计算环境(后端)
const tfBackendRef = ref("")

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
  isInitializedModel.value = true
} catch (error) {
  console.error("tfjs计算层初始化报错: ", error)
  my.dialog({
    theme: "danger",
    header: "TensorFlow.js计算层初始化报错",
    body: error
  })
}})

</script>
