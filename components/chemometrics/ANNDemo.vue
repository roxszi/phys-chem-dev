<!--
  人工神经网络演示组件 Artificial Neural Network，ANN
 -->

<!--
  视图层
 -->
<template><MySpace>

  <TfjsInit v-model:isInitialized="isInitializedRef"/>

  <div v-if="isInitializedRef">
    这样就可以实现一些吃性能的东西了，比如ANN。
  </div>
  <div v-else>
    需要等待TensorFlow.js初始化完成...
  </div>

</MySpace></template>


<!--
  逻辑层
 -->
<script setup>
// 导入vue方法
import { ref, onMounted } from "vue"
// 导入自有方法
import my from "@/utils/myFunc.js"

// tfjs的初始化组件钩子
const isInitializedRef = ref(false)




</script>
