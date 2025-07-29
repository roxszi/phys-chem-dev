<!--
  测试用的
 -->


<!--
  视图层
 -->
<template><MySpace>


</MySpace></template>



<!--
  逻辑层
 -->
<script setup>
import { onMounted } from "vue"

// 生命周期钩子，SSG的SPA化实现，整个WebApp挂载后执行
onMounted(() => {
  console.log("import.meta: ", import.meta)
})

</script>
