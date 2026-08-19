


<!--
  测试用
 -->


<!--
  视图层
 -->
<template>
  <MyButton
    :href="herf"
    @click="onClick"
    downloadName="test.xlsx"
  >点击</MyButton>
</template>


<!--
  逻辑层
 -->
<script setup lang="ts">
// 引入各类方法
import { aoaMapToWorkbook, downloadXlsx, workbookToUrl } from "@utils/xlsx.js"

const aoa = [[5, 6, 7], [8, 9, 10]]
const aoaMap = new Map([
  ["good", aoa]
])

const workbook = aoaMapToWorkbook(aoaMap)

const url = workbookToUrl(workbook)

const herf = ref(url)

function onClick() {
  console.log('点击了')

}

</script>


<!--
  样式层
-->
<style scoped>

</style>