<!--
  蔗糖水解反应动力学实验助手
-->


<!--
  视图层
-->
<template>

看看：
{{ OpenCVStatus }}

<!-- ========= 实验条件输入区 ========= -->

<h3>实验条件</h3>

<t-input
  v-model:value="inputDataRef.temperatureStr"
  label="实验温度:"
  suffix="℃"
  align="center"
  placeholder="实验温度"
  type="number"
/>
<!-- t -->
<t-input
  v-model:value="inputDataRef.alphaEquilibriumStr"
  label="α∞:"
  suffix="°"
  align="center"
  placeholder="平衡时刻的旋光度"
  type="number"
/>


<!-- ========= 数据表格区 ========= -->

<!-- 条件渲染：有数据才渲染 -->

<h3>数据表格</h3>

<!-- 表格体 -->
<MyTable
  :titleArr="titleArrRef"
  :dataAoa="dataAoaRef"
>
  <!-- 插槽：删除行数据 -->
  <template #actions="{ rowIndex }">
    <MyButton
      :block="false"
      theme="danger"
      variant="outline"
      size="extra-small"
      @click="onDeleteData(rowIndex)"
    >
      删除
    </MyButton>
  </template>
</MyTable>

<!-- 表格数据操作按钮：横向排布 -->
<div class="my-margin my-row">
  <MyButton
    :block="false"
    theme="danger"
    size="small"
    @click="onDeleteData()"
  >
    清空表格
  </MyButton>
  <MyButton
    :block="false"
    size="small"
    @click="onDataFitting()"
  >
    拟合数据
  </MyButton>
</div>

<!-- ========= 数据填写区 ========= -->

<h3>数据输入</h3>
<!-- t -->
<t-input
  v-model:value="inputDataRef.tStr"
  label="t"
  suffix="min"
  align="center"
  placeholder="反应时长"
  type="number"
/>
<!-- α -->
<t-input
  v-model:value="inputDataRef.alphaStr"
  label="α"
  suffix="°"
  align="center"
  placeholder="旋光度值"
  type="number"
/>
<!-- 提交按钮 -->
<MyButton
  :disabled="!isInputedRef"
  @click="onAddData"
>
  提交数据
</MyButton>

<!-- ========= 数据拟合区 ========= -->

<t-drawer
  v-model:visible="drawerRef"
>

  <template #title>
    📈 拟合数据
  </template>

  <!-- <h3 class="t-drawer__title">📈 拟合数据</h3> -->

  <MyChart></MyChart>

  <template #footer>
    <MyButton
      :block="false"
      variant="outline"
      size="small"
      @click="drawerRef = false"
    >
      关闭抽屉
    </MyButton>
  </template>

</t-drawer>



</template>


<!--
  逻辑层
-->
<script setup lang="ts">

// import myData from "./data.ts"

// import { levenbergMarquardt } from "@shared/fitting/index.ts"

// console.log("myData: ", myData)

import { useOpenCV } from "@composables/useOpenCV.ts"

const { OpenCVStatus, OpenCV, OpenCVVariant, ensureOpenCVReady } = useOpenCV()

onMounted(() => ensureOpenCVReady())






/** 输入数据的Ref对象 */
const inputDataRef = ref({
  /** 温度 ℃ */
  temperatureStr: "25",
  /** 平衡时刻的旋光率 */
  alphaEquilibriumStr: "",
  /** t，在<input>里为string */
  tStr: "",
  /** 旋光率α，在<input>里为string */
  alphaStr: "",
})

/** 可以提交数据的验证Ref对象 */
const isInputedRef = computed(() => {
  return ((inputDataRef.value.tStr !== "") && (inputDataRef.value.alphaStr !== ""))
})

/** 表格标题的Ref对象 */
const titleArrRef = ref(["t", "α"])

/** 表格内容的Ref对象 - [t, α][] */
const dataAoaRef = ref<[number, number][]>([])

/** 抽屉是否开启的Ref对象 */
const drawerRef = ref(false)

/**
 * 向表格添加数据的回调
 * @note 读取inputDataRef中的数据，添加到dataAoaRef中
 */
function onAddData() {

  // 读取inputDataRef中的数据
  const { tStr, alphaStr } = inputDataRef.value
  // 读取dataAoaRef的数据
  const dataAoa = dataAoaRef.value
  // 以数值格式插入数据
  dataAoa.push([
    Number(tStr),
    Number(alphaStr)
  ])
  // 按照t升序排序
  dataAoa.sort((a, b) => a[0] - b[0])
  // 清空输入框
  inputDataRef.value.tStr = ""
  inputDataRef.value.alphaStr = ""
}

/**
 * 从表格删除数据的回调
 * @param rowIndex 行索引
 */
function onDeleteData(rowIndex?: number) {
  // 如果没传参，则执行清空表格功能
  if (rowIndex === undefined) {
    // 提醒一下

    // 清空表格
    dataAoaRef.value = []
  // 否则，删除指定行
  } else {
    // 直接从dataAoaRef中删除一行数据
    dataAoaRef.value.splice(rowIndex, 1)
  }
}

/**
 * 拟合数据的回调
 */
function onDataFitting() {

  // 拟合数据

  console.log("OpenCVStatus: ", OpenCVStatus.value)
  console.log("OpenCV: ", OpenCV.value)
  console.log("OpenCVVariant: ", OpenCVVariant.value)







  drawerRef.value = true
}


</script>

