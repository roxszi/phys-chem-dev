<!--
  蔗糖水解反应动力学实验助手
-->


<!--
  视图层
-->
<template>

<!-- ========= 实验条件输入区 ========= -->

<h3>实验条件</h3>

<t-input
  v-model:value="inputDataRef.temperatureStr"
  label="实验温度"
  suffix="℃"
  align="center"
  placeholder="实验温度"
  type="number"
/>
<t-input
  v-model:value="inputDataRef.alphaEquilibriumStr"
  suffix="°"
  align="center"
  placeholder="平衡时刻的旋光度"
  type="number"
>
  <template #label>α<sub>∞</sub></template>
</t-input>

<!-- ========= 数据表格区 ========= -->

<!-- 条件渲染：有数据才渲染 -->

<h3>数据表格</h3>

<!-- 表格体 -->
<MyTable
  :titleArr="tableTitleArrRef"
  :dataAoa="tableDataAoaRef"
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
<div
  v-if="tableDataAoaRef.length !== 0"
  class="my-margin my-row"
>
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
<!-- 表格数据操作按钮：横向排布 -->
<div class="my-margin my-gap my-row">
  <!-- 读取示例数据 -->
  <MyButton
    theme="default"
    :block="false"
    @click="onReadExampleData"
  >
    读取示例数据
  </MyButton>
  <!-- 读取示例数据 -->
  <MyButton
    theme="default"
    :block="false"
    @click="onReadXlsxFile"
  >
    读取xlsx文件
  </MyButton>
  <!-- 提交按钮 -->
  <MyButton
    :block="false"
    :disabled="!isInputedRef"
    @click="onAddData"
  >
    提交数据
  </MyButton>
</div>

<!-- ========= 数据拟合区（侧边栏） ========= -->

<t-drawer
  v-model:visible="drawerRef"
>

  <template #title>
    📈 拟合数据
  </template>

  <!-- <h3 class="t-drawer__title">📈 拟合数据</h3> -->

  <Chart
    v-if="drawerRef"
    title="蔗糖水解动力学"
    xAxisName="Δt (min)"
    yAxisName="Δα (°)"
    :dataAoa="chartDataAoaRef"
    :dataProfileArr="dataProfileArr"
  />

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
// 导入示例数据
import { exampleDataAoa } from "./data.ts"
// 导入公式 + 一键拟合入口
import { sucroseHydrolysis, fitEquation } from "@shared/equation/index.ts"
// 导入图表组件
import Chart from "./Chart.vue"

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
const tableTitleArrRef = ref(["t", "α"])

/** 表格内容的Ref对象 - [t, α][] */
const tableDataAoaRef = ref<[number, number][]>([])

/** 图内容的Ref对象 */
const chartDataAoaRef = ref<[number, number, number][]>([])

/** 数据图表类型 */
const dataProfileArr = [
  { name: "实验值",  chartType: "symbol" as const, },
  { name: "拟合值",  chartType: "line" as const, },
]

/** 抽屉是否开启的Ref对象 */
const drawerRef = ref(false)

/**
 * 读取示例数据的回调
 */
function onReadExampleData() {
  // 直接覆盖数据
  tableDataAoaRef.value = exampleDataAoa
}

/**
 * 读取xlsx数据文件的回调
 */
function onReadXlsxFile() {
  myDialog("敬请期待")
}

/**
 * 向表格添加数据的回调
 * @note 读取inputDataRef中的数据，添加到dataAoaRef中
 */
function onAddData() {
  // 读取inputDataRef中的数据
  const { tStr, alphaStr } = inputDataRef.value
  // 读取dataAoaRef的数据
  const dataAoa = tableDataAoaRef.value
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
    tableDataAoaRef.value = []
  // 否则，删除指定行
  } else {
    // 直接从dataAoaRef中删除一行数据
    tableDataAoaRef.value.splice(rowIndex, 1)
  }
}

/**
 * 拟合数据的回调
 * @note 有3个待拟合参数，因此必须得有至少4行数据才行
 */
function onDataFitting() {
  /** 数据 */
  const dataAoa = [...tableDataAoaRef.value]
  /** α_∞（字符串） */
  const alphaEquilibriumStr = inputDataRef.value.alphaEquilibriumStr
  /** α_∞ */
  const alphaEquilibrium = Number(alphaEquilibriumStr)
  // 检查 α_∞ 有效性
  if ((alphaEquilibriumStr !== "") && !isNaN(alphaEquilibrium)) {
    // α_∞ 有效，加入数组
    dataAoa.push([Infinity, alphaEquilibrium])
  }
  // 检查数据量是否足够
  if (dataAoa.length < 4) {
    myDialog("数据量不足，无法拟合")
    return
  }
  // ================ 数据准备 ================
  // 解构 AOA → x[] 和 y[]
  /** x[] */
  const tArr: number[] = []
  /** y[] */
  const alphaArr: number[] = []
  // 遍历解构
  for (const dataArr of dataAoa) {
    tArr.push(dataArr[0]!)
    alphaArr.push(dataArr[1]!)
  }
  // ================ 拟合 ================
  /** 拟合结果原始对象 */
  const fitResultRaw = fitEquation(sucroseHydrolysis, tArr, alphaArr, {})
  // 解构取值
  const {
    // 自由度
    // dof,
    // 参数表
    params,
    // R²
    rSquared,
    // 拟合值
    predicted,
  } = fitResultRaw

  // ================ 作图 ================
  /** 作图数据集 */
  const chartDataAoa: [number, number, number?][] = []
  for (const dataArr of tableDataAoaRef.value) {
    chartDataAoa.push([...dataArr])
  }
  /** 作图数据集长度 */
  const n = chartDataAoa.length
  // 如果拟合值数量与数据集数量不一致，则说明存在α_0，需要加进去
  if (n !== predicted.length) {
    predicted.unshift(params["alphaInitial"]!)
  }
  // 如果还不一致，则报错
  if (n !== predicted.length) {
    throw new Error("数据量与拟合值数量不一致，请检查数据")
  }
  // 遍历添加数值
  for (let i = 0; i < n; i++) {
    chartDataAoa[i]!.push(predicted[i]!)
  }
  // 赋值
  chartDataAoaRef.value = chartDataAoa as [number, number, number][]
  // 打开抽屉
  drawerRef.value = true
}


</script>

