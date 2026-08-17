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

<div class="my-section my-column my-gap">
  <t-input
    v-model:value="inputDataRef.temperatureStr"
    align="center"
    :clearable="true"
    :label="langRef.TemperatureLabel"
    :placeholder="langRef.TemperaturePlaceholder"
    suffix="℃"
    type="number"
  />
  <t-input
    v-model:value="inputDataRef.alphaEquilibriumStr"
    align="center"
    :clearable="true"
    :placeholder="langRef.AlphaEquilibriumPlaceholder"
    suffix="°"
    type="number"
  >
    <template #label>α<sub>∞</sub></template>
  </t-input>
</div>
<!-- ========= 数据表格区 ========= -->

<!-- 条件渲染：有数据才渲染 -->

<h3>{{ langRef.TableHeading }}</h3>

<!-- 表格体 -->
<MyTable
  :titleArr="tableTitleArr"
  :dataAoa="tableDataAoaRef"
  :rowMarkAoa="tableRowMarkArrRef"
>
  <!-- 插槽：删除/恢复行数据 -->
  <template #actions="{ rowIndex, rowMarkArr }">
    <!-- 恢复 -->
    <MyButton
      v-if="rowMarkArr?.[0] === false"
      :block="false"
      theme="primary"
      variant="outline"
      size="small"
      @click="onSwitchDataActivation(rowIndex, rowMarkArr?.[0])"
    >
      {{ langRef.RestoreButton }}
    </MyButton>
    <!-- 删除 -->
    <MyButton
      v-else
      :block="false"
      theme="danger"
      variant="outline"
      size="small"
      @click="onSwitchDataActivation(rowIndex, rowMarkArr?.[0])"
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
    @click="onDeleteAllData"
  >
    {{ langRef.ClearTableButton }}
  </MyButton>
  <MyButton
    :block="false"
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
    @click="onReadExampleData"
  >
    {{ langRef.ReadExampleButton }}
  </MyButton>
</div>

<!-- ========= 数据填写区 ========= -->

<h3>{{ langRef.InputHeading }}</h3>

<div class="my-section my-column my-gap">
  <!-- t -->
  <t-input
    v-model:value="inputDataRef.tStr"
    align="center"
    :clearable="true"
    label="t"
    :placeholder="langRef.TPlaceholder"
    suffix="min"
    type="number"
  />
  <!-- α -->
  <t-input
    v-model:value="inputDataRef.alphaStr"
    align="center"
    :clearable="true"
    label="α"
    :placeholder="langRef.AlphaPlaceholder"
    suffix="°"
    type="number"
  />
  <!-- 提交按钮 -->
  <MyButton
    size="large"
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
  <MyTable
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
// 导入组件类型
import type { MySymbolLineChartType } from "@components/types.ts"

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
/** 原始数据内容的ShallowRef对象 - [t, α, isActivated][] */
const rawDataAoaRef = shallowRef<[number, number, boolean][]>([])
/** 表格内容的Ref对象 - [t, α][] */
const tableDataAoaRef = ref<[number, number][]>([])
/** 表格行标记的Ref对象 */
const tableRowMarkArrRef = ref<[boolean][]>([])
/** 非线性图内容的Ref对象 */
const nonlinearChartDataAoaRef = shallowRef<[number, number, number][]>([])
/** 非线性数据图表类型（线性/非线性共用）；系列名跟随语言切换 */
const chartDataProfileArr = computed(() => [
  // 实验值：点图
  {
    name: langRef.value.ExperimentalSeriesName,
    chartType: "symbol" as MySymbolLineChartType
  },
  // 拟合值：线图
  {
    name: langRef.value.FittedSeriesName,
    chartType: "line" as MySymbolLineChartType
  },
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
  // 读取localStorage中的数据，恢复到表格中
  const rawDataAoaStr = localStorage.getItem("SucroseHydrolysisTableDataAoa")
  if (rawDataAoaStr !== null) {
    rawDataAoaRef.value = JSON.parse(rawDataAoaStr) as [number, number, boolean][]
  }
})

// 监听表格原始内容，一旦有变化，就更新表格内容
watch(
  // 监听对象：表格内容
  rawDataAoaRef,
  // 回调函数
  (newRawDataAoa) => {
    // 保存到localStorage
    localStorage.setItem("SucroseHydrolysisTableDataAoa", JSON.stringify(newRawDataAoa))
    // 临时的筐
    const tableDataAoaTemp: [number, number][] = []
    const tableRowMarkAoaTemp: [boolean][] = []
    // 遍历赋值
    for (const newRawDataArr of newRawDataAoa) {
      // 数据
      tableDataAoaTemp.push([newRawDataArr[0], newRawDataArr[1]])
      // 标记
      tableRowMarkAoaTemp.push([newRawDataArr[2] ?? true])
    }
    // 赋值
    tableDataAoaRef.value = tableDataAoaTemp
    tableRowMarkArrRef.value = tableRowMarkAoaTemp
  }
)

/**
 * 读取示例数据的回调
 */
function onReadExampleData() {
  // 筐
  const rawDataAoaTemp: [number, number, boolean][] = []
  // 遍历赋值
  for (const exampleDataArr of exampleDataAoa) {
    rawDataAoaTemp.push([...exampleDataArr])
  }
  // 直接无损覆盖数据
  rawDataAoaRef.value = rawDataAoaTemp
}

/**
 * 向表格添加数据的回调
 * @note 读取inputDataRef中的数据，添加到dataAoaRef中
 */
function onAddData() {
  // 读取inputDataRef中的数据
  const { tStr, alphaStr } = inputDataRef.value
  // 读取dataAoaRef的数据
  const rawDataAoa = rawDataAoaRef.value
  // 以数值格式插入数据
  rawDataAoa.push([
    Number(tStr),
    Number(alphaStr),
    // 行插入数据默认为true
    true,
  ])
  // 按照t升序排序
  rawDataAoa.sort((a, b) => a[0] - b[0])
  // 清空输入框
  inputDataRef.value.tStr = ""
  inputDataRef.value.alphaStr = ""
  // 刷新ShallowRef
  triggerRef(rawDataAoaRef)
}

/**
 * 切换数据的激活属性的回调
 * @param rowIndex 行索引
 * @param isActived 是否激活
 */
function onSwitchDataActivation(rowIndex: number, isActived?: boolean) {
  // 取值
  const rawDataArr = rawDataAoaRef.value[rowIndex]
  const realIsActived = rawDataArr?.[2]
  // 验证
  if (
    isActived === undefined
    || !rawDataArr
    || realIsActived === undefined
    || realIsActived !== isActived) {
    throw new Error("传参错误")
  }
  // 划去指定行
  rawDataArr[2] = !realIsActived
  // 刷新ShallowRef
  triggerRef(rawDataAoaRef)
}

/**
 * 删除表格中的全部数据的回调
 */
function onDeleteAllData() {
  // 提醒一下
  myDialog({
    body: langRef.value.ClearConfirmContent,
    onConfirmCallBack: () => {
      // 清空表格
      rawDataAoaRef.value = []
    }
  })
}

/**
 * 拟合数据的回调
 * @note 有3个待拟合参数，因此必须得有至少4行数据才行
 */
function onDataFitting() {
  /** x[]数据 */
  const tArr: number[] = []
  /** y[]数据 */
  const alphaArr: number[] = []
  /** 作图数据集。 [x, y, y_fit] */
  const chartDataAoa: [number, number, number?][] = []
  // 遍历rawDataAoaShallowRef，把数据添加到dataAoa中
  for (const rawDataArr of rawDataAoaRef.value) {
    // 只有isActivated为true的数据才被添加到dataAoa中
    if (rawDataArr[2]) {
      tArr.push(rawDataArr[0])
      alphaArr.push(rawDataArr[1])
      chartDataAoa.push([rawDataArr[0], rawDataArr[1]])
    }
  }
  /** α_∞（字符串） */
  const alphaEquilibriumStr = inputDataRef.value.alphaEquilibriumStr
  /** α_∞ */
  const alphaEquilibrium = Number(alphaEquilibriumStr)
  // 检查 α_∞ 有效性
  if ((alphaEquilibriumStr !== "") && !isNaN(alphaEquilibrium)) {
    // α_∞ 有效，加入数组
    tArr.push(Infinity)
    alphaArr.push(alphaEquilibrium)
  }
  // 检查数据量是否足够
  if (tArr.length < 4) {
    myDialog(langRef.value.InsufficientDataContent)
    return
  }
  // 验证数据有效性
  if(!validateData(tArr, alphaArr)) return
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
  /** 作图数据集长度 */
  const n = chartDataAoa.length
  // 数据集 chartDataAoa 含有 α_0，但是 α_0 作为公式参数，不参与拟合，在拟合处理的时候把 α_0 踢除了
  // 所以 predicted 没有 α_0
  // 如果拟合值 predicted 与数据集 chartDataAoa 长度不一致，则说明 chartDataAoa 存在 α_0，需要额外处理
  if (n !== predicted.length) {
    // 给 predicted 数组添加 α_0，确保 predicted 与 chartDataAoa 长度一致
    predicted.unshift(params["alphaInitial"]!)
  }
  // 如果还不一致，则报错
  if (n !== predicted.length) {
    throw new Error("数据量与拟合值数量不一致，请检查数据")
  }
  // 遍历赋值，合并 predicted 进 chartDataAoa
  for (let i = 0; i < n; i++) {
    chartDataAoa[i]!.push(predicted[i]!)
  }
  // ======== 线性化数据 ========
  /** 线性化作图数据集 */
  const linearChartDataAoa: [number, number, number][] = []
  // 转换数据
  for (const chartDataArr of chartDataAoa) {
    linearChartDataAoa.push([
      chartDataArr[0],
      Math.log(chartDataArr[1] - params["alphaEquilibrium"]!),
      Math.log(chartDataArr[2]! - params["alphaEquilibrium"]!),
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
  const resultK = params["k"] as number
  /** 半衰期 t(1/2) */
  const resultTHalf = Math.log(2) / resultK
  // 赋值
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

/**
 * 验证数据有效性
 * @param tArr t[]数据
 * @param alphaArr α[]数据
 */
function validateData(tArr: number[], alphaArr: number[]) {
  const incorrectDataTArr = []
  // 检查初始时刻数据：初始时刻数据必须大于后一位
  // 如果居然没大于
  if (alphaArr[0]! <= alphaArr[1]!) {
    // 就把初始时刻数据添加到错误数组中
    incorrectDataTArr.push(String(tArr[0]))
  }
  // 遍历数据
  for (let i = 1; i < tArr.length - 1; i++) {
    // 如果当前数据小于前一位数据，或者大于后一位数据，则把当前数据添加到错误数组中
    if (
      (alphaArr[i - 1]! <= alphaArr[i]!)
      || (alphaArr[i]! <= alphaArr[i + 1]!)
    ) {
      incorrectDataTArr.push(String(tArr[i]))
    }
  }
  // 检查最后一个数据
  const lastIndex = tArr.length - 1
  if (alphaArr[lastIndex - 1]! <= alphaArr[lastIndex]!) {
    incorrectDataTArr.push("∞")
  }
  // 如果错误数组不为空，则说明数据无效
  if (incorrectDataTArr.length > 0) {
    // 提示用户
    myDialog({
      theme: "danger",
      body: langRef.value.IncorrectDataContent(incorrectDataTArr),
    })
    // 返回false
    return false
  // 否则返回true
  } else {
    return true
  }
}

</script>
