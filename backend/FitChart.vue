<template>
      <h3>📈 拟合曲线</h3>

      <div
        v-if="dataStore.measurements.length === 0"
        class="alert alert-info mt-2"
      >
        <span>暂无数据，请先录入测量点</span>
      </div>

      <div v-else class="mt-2 w-full" style="height: 360px">
        <v-chart
          class="w-full h-full"
          :option="option"
          autoresize
          data-testid="fit-chart"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @file src/components/FitChart.vue
 * @description 拟合结果可视化（ECharts）
 *   - 散点：实验数据 (time, rotation)
 *   - 曲线：拟合模型预测
 *   - R²、k、α₀、α_∞ 等参数显示在图例
 *
 * 引用方式：<FitChart client:load />
 */
import { computed } from "vue"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { ScatterChart, LineChart } from "echarts/charts"
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent,
} from "echarts/components"
import VChart from "vue-echarts"

import { useData } from "../composables/useData.js"
import { firstOrderModel } from "../lib/kinetics/models/first-order.js"

use([
  CanvasRenderer,
  ScatterChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent,
])

const dataStore = useData()

/** 构造拟合曲线上的点（密集采样） */
function buildFitLine(): Array<[number, number]> {
  if (!dataStore.fittedParams) return []
  const t = dataStore.timeRange
  if (!t) return []
  const [tMin, tMax] = t
  if (tMin === tMax) return []
  const p = dataStore.fittedParams
  const N = 100
  const out: Array<[number, number]> = []
  for (let i = 0; i <= N; i++) {
    const x = tMin + ((tMax - tMin) * i) / N
    const y = firstOrderModel.nonlinear(x, {
      k: p.k,
      alpha0: p.a0,
      alphaInf: p.aInf,
    })
    out.push([x, y])
  }
  return out
}

const option = computed(() => {
  const scatterData = dataStore.measurements.map((m) => [m.time, m.rotation])
  const fitData = buildFitLine()
  const p = dataStore.fittedParams

  return {
    title: {
      text: "旋光度-时间拟合曲线",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: 600 },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params: Array<{ seriesName: string; data: [number, number] }>) => {
        const lines = params
          .map(
            (it) =>
              `${it.seriesName}: t=${it.data[0].toFixed(1)}s, α=${it.data[1].toFixed(4)}°`,
          )
          .join("<br/>")
        return lines
      },
    },
    legend: {
      data: ["实验数据", "拟合曲线"],
      top: 28,
    },
    grid: {
      left: 60,
      right: 30,
      top: 70,
      bottom: 60,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      name: "时间 (s)",
      nameLocation: "middle",
      nameGap: 30,
      axisLine: { lineStyle: { color: "#888" } },
    },
    yAxis: {
      type: "value",
      name: "旋光度 (°)",
      nameLocation: "middle",
      nameGap: 45,
      scale: true,
      axisLine: { lineStyle: { color: "#888" } },
    },
    series: [
      {
        name: "实验数据",
        type: "scatter",
        symbolSize: 8,
        itemStyle: { color: "#3b82f6" },
        data: scatterData,
      },
      {
        name: "拟合曲线",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#f97316", width: 2 },
        data: fitData,
      },
    ],
    // 副标题：拟合参数
    ...(p
      ? {
          graphic: [
            {
              type: "text",
              left: 60,
              top: 50,
              style: {
                text:
                  `k = ${p.k.toExponential(3)} s⁻¹  |  ` +
                  `α₀ = ${p.a0.toFixed(3)}°  |  ` +
                  `α_∞ = ${p.aInf.toFixed(3)}°  |  ` +
                  `R² = ${p.rSquared.toFixed(4)}`,
                font: "12px monospace",
                fill: "#374151",
              },
            },
          ],
        }
      : {}),
  }
})
</script>
