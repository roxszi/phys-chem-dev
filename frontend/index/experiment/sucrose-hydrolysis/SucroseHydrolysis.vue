<!--
  蔗糖水解反应动力学实验助手
  ---
  i18n 说明：
  - 业务文案走 langRef（由 ./SucroseHydrolysis-lang.ts + composables/useLang.ts 派生）
  - 物理量符号 / 数学符号 / 单位留在模板字面量，不进入语言包（t、α、min⁻¹、℃、°、ln、R²、α_0、α_∞、t(1/2) 等）
  - 内部开发者错误（throw new Error）不翻译
  - localStorage key 不按语言区分（实验数据与界面语言无关）
-->


<!--
  视图层
-->
<template>

<!-- ========= 实验条件输入区 ========= -->

<h3>{{ langRef.ConditionsHeading }}</h3>

<t-input
  v-model:value="inputDataRef.temperatureStr"
  :label="langRef.TemperatureLabel"
  suffix="℃"
  align="center"
  :placeholder="langRef.TemperaturePlaceholder"
  type="number"
/>
<t-input
  v-model:value="inputDataRef.alphaEquilibriumStr"
  suffix="°"
  align="center"
  :placeholder="langRef.AlphaEquilibriumPlaceholder"
  type="number"
>
  <template #label>α<sub>∞</sub></template>
</t-input>

<!-- ========= 数据表格区 ========= -->

<!-- 条件渲染：有数据才渲染 -->

<h3>{{ langRef.TableHeading }}</h3>

<!-- 表格体 -->
<MyTable
  :titleArr="tableTitleArr"
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
      {{ langRef.DeleteButton }}
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
    {{ langRef.ClearTableButton }}
  </MyButton>
  <MyButton
    :block="false"
    size="small"
    @click="onDataFitting()"
  >
    {{ langRef.FitDataButton }}
  </MyButton>
</div>

<!-- 读取已有表格数据按钮：横向排布 -->
<div
  v-else
  class="my-margin my-row"
>
  <!-- 读取示例数据 -->
  <MyButton
    theme="default"
    :block="false"
    size="small"
    @click="onReadExampleData"
  >
    {{ langRef.ReadExampleButton }}
  </MyButton>
</div>

<!-- ========= 数据填写区 ========= -->

<h3>{{ langRef.InputHeading }}</h3>
<!-- t -->
<t-input
  v-model:value="inputDataRef.tStr"
  label="t"
  suffix="min"
  align="center"
  :placeholder="langRef.TPlaceholder"
  type="number"
/>
<!-- α -->
<t-input
  v-model:value="inputDataRef.alphaStr"
  label="α"
  suffix="°"
  align="center"
  :placeholder="langRef.AlphaPlaceholder"
  type="number"
/>
<!-- 表格数据操作按钮：横向排布 -->
<div class="my-margin my-gap my-row">
  <!-- 提交按钮 -->
  <MyButton
    :block="false"
    :disabled="!isInputedRef"
    @click="onAddData"
  >
    {{ langRef.SubmitButton }}
  </MyButton>
</div>

<!-- ========= 数据拟合区（侧边栏） ========= -->

<MyDrawer
  :title="langRef.ResultDrawerTitle"
  v-model:visible="isDrawerVisiableRef"
>

  <!-- 非线性点线图 -->
  <MySymbolLineChart
    :title="langRef.NonlinearChartTitle"
    xAxisName="t (min)"
    yAxisName="α (°)"
    :dataAoa="nonlinearChartDataAoaRef"
    :dataProfileArr="chartDataProfileArr"
  />

  <!-- 拟合结果表格 -->
  <MyTTable
    :titleArr="chartTableTitleArrComputed"
    :dataAoa="chartTableDataAoaRef"
  />

  <!-- 线性点线图 -->
  <MySymbolLineChart
    :title="langRef.LinearChartTitle"
    xAxisName="t (min)"
    yAxisName="ln(αt-α∞)"
    :dataAoa="linearChartDataAoaRef"
    :dataProfileArr="chartDataProfileArr"
  />

</MyDrawer>
</template>


<!--
  逻辑层
-->
<script setup lang="ts">
// 导入示例数据
import { exampleDataAoa } from "./data.ts"
// 导入公式 + 一键拟合入口
import { sucroseHydrolysis, fitEquation } from "@shared/equation/index.ts"
// 导入本组件语言包
import { langDict } from "./SucroseHydrolysis-lang.ts"

/** 派生当前语言的响应式语言包（root / en） */
const langRef = useLang(langDict)

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
/**
 * 表格标题（物理量符号，与语言无关，常量即可）
 * 注：t / α 是物理量符号而非自然语言，不进入语言包
 */
const tableTitleArr = ["t", "α"]
/** 表格内容的Ref对象 - [t, α][] */
const tableDataAoaRef = ref<[number, number][]>([])
/** 非线性图内容的Ref对象 */
const nonlinearChartDataAoaRef = shallowRef<[number, number, number][]>([])
/** 非线性数据图表类型（线性/非线性共用）；系列名跟随语言切换 */
const chartDataProfileArr = computed(() => [
  { name: langRef.value.ExperimentalSeriesName, chartType: "symbol" as const },
  { name: langRef.value.FittedSeriesName,       chartType: "line"    as const },
])
/** 图下方的拟合结果表格数据标题（跟随语言切换） */
const chartTableTitleArrComputed = computed(() => langRef.value.ChartTableTitleArr)
/** 图下方的拟合结果表格数据 */
const chartTableDataAoaRef = shallowRef<[string, string][]>([])
/** 线性图内容的Ref对象 */
const linearChartDataAoaRef = shallowRef<[number, number, number][]>([])
/** 抽屉是否开启的Ref对象 */
const isDrawerVisiableRef = shallowRef(false)

// 生命周期钩子，组件加载完成后调用
onMounted(() => {
  // ======== 1.  读取localStorage中的数据，恢复到表格中 ========
  const tableDataAoaStr = localStorage.getItem("SucroseHydrolysisTableDataAoa")
  if (tableDataAoaStr !== null) {
    tableDataAoaRef.value = JSON.parse(tableDataAoaStr) as [number, number][]
  }
})

// 深度监听表格内容，一旦有变化，就保存到localStorage
watch(
  // 监听对象：表格内容
  tableDataAoaRef,
  // 回调函数：保存到localStorage
  (newValue) => {
    localStorage.setItem("SucroseHydrolysisTableDataAoa", JSON.stringify(newValue))
  },
  // 1层就够了
  { deep: 1 }
)


/**
 * 读取示例数据的回调
 */
function onReadExampleData() {
  // 直接无损覆盖数据
  tableDataAoaRef.value = [...exampleDataAoa]
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
    myDialog({
      content: langRef.value.ClearConfirmContent,
      onConfirmCallBack: () => {
        // 清空表格
        tableDataAoaRef.value = []
      }
    })
  // 否则，删除指定行
  } else {
    // 直接从dataAoaRef中删除一行
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
    myDialog(langRef.value.InsufficientDataContent)
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
  // 深拷贝数据
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
  /** 线性化作图数据集 */
  const linearChartDataAoa: [number, number, number][] = []
  // 转换数据
  for (const dataArr of chartDataAoa) {
    linearChartDataAoa.push([
      dataArr[0],
      Math.log(dataArr[1] - params["alphaEquilibrium"]!),
      Math.log(dataArr[2]! - params["alphaEquilibrium"]!),
    ])
  }
  // 赋值
  nonlinearChartDataAoaRef.value = chartDataAoa as [number, number, number][]
  linearChartDataAoaRef.value = linearChartDataAoa
  // ================ 拟合结果形成表格 ================
  /**
   * 注：表格第一列的字符串（R²、α_0、α_∞、k、t(1/2)）是参数符号 + 单位，
   * 与语言无关，不进入语言包。
   */
  /** k */
  const resultK = params["k"]
  /** 半衰期 t(1/2) */
  const resultTHalf = Math.log(2) / resultK!
  chartTableDataAoaRef.value = [
    ["R²", rSquared.toFixed(4)],
    ["α_0 (°)", params["alphaInitial"]!.toFixed(4)],
    [`α_∞ (°)`, params["alphaEquilibrium"]!.toFixed(4)],
    ["k (min⁻¹)", params["k"]!.toFixed(4)],
    ["t(1/2) (min)", resultTHalf.toFixed(4)],
  ]
  // 打开抽屉
  isDrawerVisiableRef.value = true
}


</script>
