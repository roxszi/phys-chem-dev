


<!--
  测试用
 -->


<!--
  视图层
 -->
<template>

  <t-upload
    v-model:files="fileArrRef"
    :autoUpload="false"
    :disabled="true"
    :multiple="false"
    theme="list"
    :max="1"
    :onChange="onChange"
  >

    <template #addContent>
      <MyButton
        :disabled="true"
      
      >上传</MyButton>
    </template>
  </t-upload>


  <MyUpload
    v-model:files="fileArrRef"
    :onChange="onChange"
  ></MyUpload>







</template>


<!--
  逻辑层
 -->
<script setup lang="ts">

import type { UploadFile, UploadChangeContext } from "tdesign-mobile-vue"

const fileArrRef = ref<UploadFile[]>([])

function onChange(value: UploadFile[], context: UploadChangeContext) {
  console.log("value: ", value[0])
  console.log("context: ", context)
}

function onFail() {
  console.log("上传失败")
}

</script>


<!--
  样式层
-->
<style scoped>

</style>