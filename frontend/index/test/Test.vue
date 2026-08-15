


<!--
  测试用
 -->


<!--
  视图层
 -->
<template>

  <div class="my-column">
  <MyNoticeBar
    title="测试"
  >
    <p>ddd</p>
    <p><strong>小标题。</strong>继续写内容。</p>
  </MyNoticeBar>

  <MySlider
    title="测试"
    v-model:value="sliderValueRef"
    :marks="[0,20,40,60,80,100]"
    :onChange="onChange"
  />

  <MySlider
    title="测试"
    v-model:value="sliderValueRef"
    :marks="[0,20,40,60,80,100]"
    :onChange="onChange"
  />
</div>
</template>


<!--
  逻辑层
 -->
<script setup lang="ts">



const sliderValueRef = ref(20)
const marks = {
  0: '0',
  20: '20',
  40: '40',
  60: '60',
  80: '80',
  100: '100',
};

function onFail() {
  console.log("上传失败")
}

function onChange(value) {
  console.log("value: ", value)
}

</script>


<!--
  样式层
-->
<style scoped>

</style>