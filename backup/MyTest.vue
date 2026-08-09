<!--
  测试组件
-->

<!--
  逻辑层
-->
<script setup lang="ts">
import { useData } from "vitepress"
// import { levenbergMarquardt } from "@shared/fitting"

const dtDisplayText = ref('')

const inputAlpha = shallowRef('')

function message() {
  myDialog({
    title: '提示',
    content: 
    `这是一个提示框这是一个提示框这是一个提示框这
    sss是一个提示框这是一个提示框这是一个提示框这
    ddd是一个提示框这是一个提示框这是一个提示框这是一个提示框这是一个提示框这是一个提示框`,
    // onConfirmCallBack: () => { console.log('点击了确定按钮') }
  })
}

const { TFjsStatus, TFjsEngine, ensureTFjsReady, disposeTFjsVariables } = useTFjs()
onMounted(() => {
  ensureTFjsReady()
})


// https://vitepress.dev/reference/runtime-api#usedata
const { site, frontmatter, isDark } = useData()



</script>


<!--
  视图层
-->
<template>
  <div class="my-gap">
  <div>
    是否为黑夜模式：{{ isDark }}
  </div>
  <div>
    TFjs计算引擎：{{ TFjsEngine }}
  </div>
    <div>
    TFjs状态：{{ TFjsStatus }}
  </div>
  <MyButton :onclick="message" >sss</MyButton>

  
  <t-cell-group theme="card" title="数据输入">
    <!-- 时间 t：点击弹出 Picker 选择时:分:秒 -->
    <t-cell
      title="时间 t"
      arrow
      hover
    >
      <template #right-icon>
        <t-button>
          当前
        </t-button>
      </template>
    </t-cell>

    <!-- Δt：点击弹出 Picker 选择分:秒 -->
    <t-cell
      title="Δt（经过时间）"
      :value="dtDisplayText"
      arrow
      hover
    />

    <!-- 旋光度 + 温度输入行 -->
    <t-cell>
        <t-input
          v-model="inputAlpha"
          type="number"
          label="旋光度 α (°)"
          placeholder="如：+8.50"
        />
    </t-cell>


    <!-- 联动状态提示 -->
    <t-cell>
      <span style="font-size: var(--td-font-size-body-small); color: var(--td-text-color-secondary);">
        首次添加数据点后将自动确定反应起始时刻 t₀
      </span>
    </t-cell>
  </t-cell-group>


</div></template>
