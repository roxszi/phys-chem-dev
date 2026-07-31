<!-- 
  自用按钮组件
  其实就是tButton的封装
 -->

<!--
  逻辑层
 -->
<script setup lang="ts">
/**
 * i18n
 */
// import { useData } from "vitepress"
// const { lang, localeIndex } =  useData()
// console.log("localeIndex：", localeIndex.value)

/** 本组件的传参数据类型 */
interface MyButtonProps {
  /** 是否块级结构。块级将占满一行，并默认适用上下margin */
  block?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否镂空 */
  ghost?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 按钮形状 */
  shape?: "rectangle" | "square" | "round" | "circle"
  /** 按钮尺寸 */
  size?: "extra-small" | "small" | "medium" | "large"
  /** 风格 */
  theme?: "default" | "primary" | "danger" | "light"
  /** 变体 */
  variant?: "base" | "outline" | "dashed" | "text"
}

/** 组件传参 */
const props = withDefaults(defineProps<MyButtonProps>(), {
  /** 是否块级结构 */
  block: true,
  /** 是否禁用 */
  disabled: false,
  /** 是否镂空 */
  ghost: false,
  /** 是否加载中 */
  loading: false,
  /** 按钮形状 "rectangle" | "square" | "round" | "circle" */
  shape: "round",
  /** 按钮尺寸 "extra-small" | "small" | "medium" | "large" */
  size: "medium",
  /** 风格 "default" | "primary" | "danger" | "light" */
  theme: "primary",
  /** 变体 */
  variant: "base"
})

/** 样式类 */
const classStrRef = computed(() => {
  if (props.block) { return "my-margin" }
  else { return "" }
})

</script>


<!--
  视图层
 -->
<template>
  <t-button
    :class="classStrRef"
    :block="props.block"
    :disabled="props.disabled"
    :ghost="props.ghost"
    :loading="props.loading"
    :shape="props.shape"
    :size="props.size"
    :theme="props.theme"
    type="button"
    :variant="props.variant"
  >
    <!-- 插槽 -->
    <slot />
  </t-button>
</template>
