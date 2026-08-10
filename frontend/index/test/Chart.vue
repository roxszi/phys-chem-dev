<!-- 
  图表组件
  其实就是 vue-echarts + echarts 的封装
 -->


<!--
  视图层
-->
<template>
  <VChart :option="option" :autoresize="true"/>
</template>


<!--
  逻辑层
-->
<script setup lang="ts">
// 导入 echarts/core 核心库的图表挂载方法
import { use } from "echarts/core"
// 导入 echarts 的 canvas 渲染器
import { CanvasRenderer } from "echarts/renderers"
// 导入 echarts 的 line 图表
import { LineChart } from "echarts/charts"
// 导入 echarts 的各类 UI 组件
import {
  // 笛卡尔坐标组件组件
  GridComponent,
  // 传统绘图组件
  LegendComponent,
  // 数据集组件
  DatasetComponent,
  // 标题组件
  TitleComponent,
  // 提示框组件
  TooltipComponent,
} from "echarts/components"
// 导入 echarts 的独立扩展功能模块
import {
  // 标签布局优化
  LabelLayout,
  // 通用过渡动画
  UniversalTransition
} from "echarts/features"
// 导入vue-echarts
import VChart from "vue-echarts"
// 导入 Echarts 类型
import type { EChartsOption } from "echarts"

/**
 * 本组件支持的图表类型
 * - symbol：点（有一定趋势的）
 * - line：线
 * - symbol-line：点线
 */
type ChartType = "symbol" | "line" | "symbol-line"

/** 数据信息 */
type DataProfile = {
  /** 数据名称 */
  name: string
  /** 图表类型 */
  chartType: ChartType
  /** 是否支持交互式图例，默认支持 */
  isSupportLegend?: boolean
}

/** 本组件的传参数据类型 */
interface ChartProps {
  /** 标题 */
  title?: string
  /** X轴数据名称 */
  xAxisName?: string
  /** Y轴数据名称 */
  yAxisName?: string
  /** 数据 */
  dataAoa: number[][]
  /** 数据图表类型 */
  dataProfileArr: DataProfile[]
}

/** 组件传参 */
const props = defineProps<ChartProps>()

// 处理组件传参
const computeds = computed(() => {
  // 结传参
  const { dataProfileArr } = props
  /** 有效数据数量 */
  const n = Math.min(
    // 数据集标签数量
    dataProfileArr.length,
    // 真实数据集数量 - X轴标签
    (props.dataAoa.length - 1)
  )
  /** 交互式图例标签集 */
  const legendDataArr: string[] = []
  /** 绘图序列数据 */
  const serieArr = []
  // 遍历
  for (let i = 0; i < n; i++) {
    // 若支持交互式图例（默认支持，因此只要不显式声明false，则都是支持）
    if (dataProfileArr[i]!.isSupportLegend !== false) {
      // 添加标签进交式图例里
      legendDataArr.push(dataProfileArr[i]!.name)
    }
    // 添加绘图序列数据
    switch (dataProfileArr[i]!.chartType) {
      // 点
      case "symbol":
        serieArr.push({
          // 名称
          name: dataProfileArr[i]!.name,
          // 数据在数据集中的索引
          encode: { x: 0, y: i + 1 },
          // 类型
          type: "line" as const,
          // 点的形状、大小
          symbol: "circle",
          symbolSize: 7,
          // 取消线条
          lineStyle: { width: 0 },
        })
        break
      // 线
      case "line":
        serieArr.push({
          // 名称
          name: dataProfileArr[i]!.name,
          // 数据在数据集中的索引
          encode: { x: 0, y: i + 1 },
          // 绘图类型
          type: "line" as const,
          // 取消点
          symbol: "none",
          // 线条平滑
          smooth: true,
        })
        break
      // 点线
      case "symbol-line":
        serieArr.push({
          // 名称
          name: dataProfileArr[i]!.name,
          // 数据在数据集中的索引
          encode: { x: 0, y: i + 1 },
          // 绘图类型
          type: "line" as const,
          // 点的形状、大小
          symbol: "circle",
          symbolSize: 7,
          // 线条平滑
          smooth: true,
        })
        break
    }
  }
  // 返回
  return { legendDataArr, serieArr }
})

// 按需注册：2个独立扩展功能模块 + 5个组件 + 1种图表 + 渲染核心
use([
  LabelLayout, UniversalTransition,
  GridComponent, LegendComponent, DatasetComponent, TitleComponent, TooltipComponent,
  LineChart,
  CanvasRenderer,
])

// 模拟数据：实验点（散点）+ 拟合曲线（折线）
// 场景：反应速率常数 k 随温度 T 的变化（Arrhenius 行为）
const option = shallowRef<EChartsOption>({
  title: { text: props.title },
  // 提示框
  tooltip: {
    // 触发类型：轴触发
    trigger: "axis",
    // 坐标轴指示器：十字准星
    axisPointer: { type: "cross" },
  },
  // 交互式图例
  legend: { data: computeds.value.legendDataArr },
  // X轴
  xAxis: {
    name: props.xAxisName,
    // 轴类型：数值轴
    type: "value",
    // 位置必须在中间
    nameLocation: "middle",
    // 自动缩放，仅对“value”数值轴有效
    scale: true,
  },
  // Y轴，设置同上
  yAxis: {
    name: props.yAxisName,
    type: "value",
    nameLocation: "middle",
    scale: true,
  },
  // 数据
  series: computeds.value.serieArr,
  // 数据集
  dataset: { source: props.dataAoa }
})

</script>


