


<!--
  测试用
-->


<!--
  视图层
-->
<template>

</template>


<!--
  逻辑层
 -->
<script setup lang="ts">
// 引入各类方法
import { aoaMapToWorkbook,  } from "@utils/xlsx.js"

const aoa = [[5, 6, 7], [8, 9, 10]]
const aoaMap = new Map([
  ["good", aoa]
])

</script>


<!--
  样式层
-->
<style scoped>

</style>