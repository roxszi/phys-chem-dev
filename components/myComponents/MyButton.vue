<!-- 
  自用按钮组件
  其实就是tButton的封装
 -->


<!--
  视图层
 -->
<template>
  <t-button
    :block="props.block"
    :disabled="props.disabled"
    :loading="props.loading"
    shape="round"
    size="medium"
    :theme="props.theme"
  >
    <!-- 插槽 -->
    <slot />
  </t-button>
</template>

<!--
  逻辑层
 -->
<script setup>
/**
 * i18n
 */
// import { useData } from "vitepress"
// const { lang, localeIndex } =  useData()
// console.log("localeIndex：", localeIndex.value)

/**
 * 组件传参
 * @property { boolean } [block = true] 是否块级结构
 * @property { boolean } [disabled = false] 是否禁用
 * @property { boolean } [loading = false] 是否加载中
 * @property { "small" | "medium" | "large" } [size = "medium"] 尺寸
 * @property { "default" | "primary" | "danger" | "warning" | "success" } [theme = "primary"] 主题
 */
const props = defineProps({
  // 是否块级结构
  block: {
    type: Boolean,
    required: false,
    default: true
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    required: false,
    default: false
  },
  // 是否加载中
  loading: {
    type: Boolean,
    required: false,
    default: false
  },
  // 主题
  theme: {
    type: String,
    required: false,
    default: "primary"
  },
  
})



</script>
