<!--
  自用滑轨组件
  基于 tdesign-mobile-vue 的 t-slider 自封
  ---
  设计思路：
  - 暴露业务最常用字段：value(v-model)、min、max、step、marks、range、disabled、title
  - 业务侧不需要感知 t-slider 内部 layout / vertical / theme 这些无关字段
  - title 在滑轨上方显示（slot + v-for 列表式标签）
-->

<script setup lang="ts">
/**
 * 滑轨值的类型
 * - 单值：number
 * - 范围值（range=true 时）：number[]
 */
type SliderValue = number | number[]

/** t-slider.marks 支持的两种形式 */
type MarksType = number[] | Record<number, string>

/** 组件传参 */
interface MySliderProps {
  /** 双向绑定的值 */
  modelValue: SliderValue
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 步长 */
  step?: number
  /** 刻度标记数组 / 字典 */
  marks?: MarksType
  /** 是否为范围滑轨（双滑轨） */
  range?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 滑轨上方显示的标题文字（业务侧用，省得自己包 div） */
  title?: string
  /** 滑轨标签：true 显示数值；false 不显示；string 显示固定文本 */
  label?: boolean | string
}

const props = withDefaults(defineProps<MySliderProps>(), {
  min: 0,
  max: 100,
  step: 1,
  marks: undefined,
  range: false,
  disabled: false,
  title: "",
  label: false,
})

/** v-model 事件 */
const emit = defineEmits<{
  (e: "update:modelValue", value: SliderValue): void
  (e: "change", value: SliderValue): void
}>()

/**
 * 滑轨值变更时回传
 * 业务侧主要用 v-model，这里转发 update:modelValue 让响应式链路通畅
 */
function onChange(value: SliderValue) {
  emit("update:modelValue", value)
  emit("change", value)
}
</script>

<template>
  <div class="my-slider">
    <!-- 标题（仅在传了 title 时显示） -->
    <div v-if="props.title" class="my-slider-title">{{ props.title }}</div>
    <t-slider
      :model-value="props.modelValue"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :marks="props.marks"
      :range="props.range"
      :disabled="props.disabled"
      :label="props.label"
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.my-slider {
  /* 占满父容器宽度 */
  width: 100%;
  /* 上下留一点呼吸空间 */
  padding: 8px 0;
}
.my-slider-title {
  /* 标题文字 */
  font-size: 14px;
  /* 标题与滑轨之间留点空隙 */
  margin-bottom: 8px;
  /* 颜色：用 vp-doc 的正文色，保持页面风格统一 */
  color: var(--vp-c-text-1);
}
</style>
