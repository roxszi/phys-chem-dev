<!-- 
  自用按钮图表组件
  其实就是 vue-echarts + echarts的封装
 -->

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
  title: { text: "旋光度 - 反应时长" },
  // 提示框
  tooltip: {
    // 触发类型：轴触发
    trigger: "axis",
    // 坐标轴指示器：十字准星
    axisPointer: { type: "cross" },
  },
  // 交互式图例
  legend: { data: [
    "实验值",
    // "拟合值"
  ]},
  // X轴
  xAxis: {
    name: "Δt (min)",
    // 轴类型：数值轴
    type: "value",
    // 位置必须在中间
    nameLocation: "middle",
    // 自动缩放，仅对“value”数值轴有效
    scale: true,
  },
  // Y轴
  yAxis: {
    name: "α (°)",
    type: "value",
    nameLocation: "middle",
    scale: true,
  },
  // 数据
  series: [
    {
      name: "实验值",
      type: "line",
      // 数据在数据集中的索引
      encode: { x: 0, y: 1 },
      // 点的形状、大小
      symbol: "circle",
      symbolSize: 7,
      // 取消线条
      lineStyle: { width: 0 },
    },
    // {
    //   name: "拟合值",
    //   type: "line",
    //   // 数据在数据集中的索引
    //   encode: { x: 0, y: 2 },
    //   // 取消点
    //   symbol: "none",
    //   // 线条平滑
    //   smooth: true,
    // }
  ],
  // 数据集
  dataset: {
    source: [
      [5, 10.865],
      [10, 9.9],
      [20, 8.133],
      [30, 6.579],
      [50, 4.076],
      [70, 2.190],
      [100, 0.280],
    ]
  }
})



</script>


<!--
  视图层
-->
<template>

<VChart :option="option" :autoresize="true"/>

</template>
