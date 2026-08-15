<!-- 
  自用按钮组件
  其实就是tButton的封装
 -->

<!--
  逻辑层
 -->
<script setup lang="ts">
/** 本组件的传参数据类型 */
interface MyButtonProps {
  /** 是否块级结构。块级将占满一行，并默认适用上下margin */
  block?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否镂空 */
  ghost?: boolean
  /** 跳转地址 */
  href?: string
  /** 是否加载中 */
  loading?: boolean
  /** 按钮形状 */
  shape?: "rectangle" | "square" | "round" | "circle"
  /** 按钮尺寸 */
  size?: "small" | "medium" | "large"
  /** 风格 */
  theme?: "default" | "primary" | "danger" | "warning" | "success"
  /** 变体 */
  variant?: "base" | "outline" | "dashed" | "text"
}

/** 组件传参 */
const props = withDefaults(defineProps<MyButtonProps>(), {
  block: true,
  disabled: false,
  ghost: false,
  loading: false,
  shape: "round",
  size: "medium",
  theme: "primary",
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
    :href="props.href"
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
