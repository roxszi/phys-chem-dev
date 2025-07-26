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
import { loadOpenCV } from '@/utils/opencvLoader.js'
import { onMounted } from 'vue'





onMounted(async () => {
  // window.cv?.then((cvReady) => {
  //   window.cv = cvReady
  //   console.log("window.cv: ", window.cv)
  // })
  const cvPromise = await loadOpenCV()
  console.log("cvPromise: ", cvPromise.getBuildInformation())

})


</script>
