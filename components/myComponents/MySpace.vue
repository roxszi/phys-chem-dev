<!-- 
  MySpace组件
  其实就是tSpace的封装
 -->


<!--
  视图层
 -->
<template>
  <!-- TDeSign布局 -->
  <t-space
    :align="props.align"
    :direction="props.direction"
    :breakLine="props.breakLine"
    :size="props.size"
    style="width: 100%;"
  >
    <!-- 插槽 -->
    <slot></slot>
  </t-space>
</template>


<!--
  逻辑层
 -->
<script setup>
/**
 * 组件传参
 * @property { "start" | "end" | "center" | "baseline" } [align = "center"] 对齐方式
 * @property { boolean } [breakLine = false] 是否自动换行。仅horizontal时有效
 * @property { "horizontal" | "vertical" } [direction = "vertical"] 排列方向
 * @property { "small" | "medium" | "large" } [size = "medium"] 间隔尺寸
 */
const props = defineProps({
  // 对齐方式
  align: {
    type: String,
    required: false,
    default: "center",
  },
  // 是否自动换行
  breakLine: {
    type: Boolean,
    required: false,
    default: false,
  },
  // 排列方向
  direction: {
    type: String,
    required: false,
    default: "vertical",
  },
  // 间隔尺寸
  size: {
    type: String,
    required: false,
    default: "medium",
  },
})
</script>
