<!-- 
  自用滑轨组件
  其实就是tSlider的封装
  ---
  注意：
  1.  点击滑轨数值，会短暂触发单游标
 -->

<!--
  逻辑层
 -->
<script setup lang="ts">
// 导入导出类型
import type { SliderValue } from "tdesign-vue-next"
export type { SliderValue }
/** 数据类型：最大值 */
type MySliderMax = number
/** 数据类型：最小值 */
type MySliderMin = number
/** 数据类型：显示标记 */
export type MySliderMarks = [MySliderMin, ...number[], MySliderMax]

/** 本组件的传参数据类型 */
interface MySliderProps {
  /** 刻度标记 */
  marks: MySliderMarks
  /** 标题 */
  title?: string
  /** 步长。默认1 */
  step?: number
  /** 是否禁用组件,。默认否 */
  disabled?: boolean
  /** 是否显示当前值文本。默认是 */
  label?: boolean
  /** 是否边界值。默认否 */
  showExtremeValues?: boolean
  /** 滑块风格。默认default */
  theme?: "default" | "capsule"
  /** 是否垂直。默认否 */
  vertical?: boolean
  /** 数值变化的回调 */
  onChange?: (value: SliderValue) => void
  /** 数值变化结束的回调（用户停止拖动时触发） */
  onChangeEnd?: (value: SliderValue) => void
}

/** 组件传参 */
const props = withDefaults(defineProps<MySliderProps>(), {
  step: 1,
  disabled: false,
  label: true,
  showExtremeValues: false,
  theme: "default",
  vertical: false,
  onChange: () => { },
  onChangeEnd: () => { },
})

/** 双相绑定传参：value */
const valueModel = defineModel<SliderValue>("value", { default: 0 })

/**
 * 是否双游标
 * 这个不能做computed，一旦数据确定，就不能改变
 * 否则点击滑轨数值是，会短暂触发单游标
 */
const isRange = Array.isArray(valueModel.value)
/** 计算值：滑轨最小值 */
const sliderMinComputed = computed(() => props.marks[0])
/** 计算值：滑轨最大值 */
const sliderMaxComputed = computed(() => props.marks[props.marks.length - 1])

</script>


<!--
  视图层
 -->
<template>
  <!-- 容器 -->
  <div class="my-column my-gap">
    <!-- 标题 -->
    <div v-if="props.title">
      <strong>{{ props.title }}</strong>
    </div>
    <!-- 滑轨 -->
    <t-slider
      v-model:value="valueModel"
      :min="sliderMinComputed"
      :max="sliderMaxComputed"
      :marks="props.marks"
      :range="isRange"
      :step="props.step"
      :label="props.label"
      :showExtremeValue="props.showExtremeValues"
      :vertical="props.vertical"
      :onChange="props.onChange"
      :onChangeEnd="props.onChangeEnd"
    />
    <!-- 间隔开 -->
    <t-divider />
  </div>
</template>
