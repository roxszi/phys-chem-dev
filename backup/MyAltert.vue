<!--
  自用提示框组件
  基于 tdesign-mobile-vue 的 t-notice-bar 自封
  ---
  - 屏蔽滚动 / 喇叭图标 / 关闭按钮：业务侧只想用"提示文本"语义
  - 主题对齐：info / success / warning / error 四个语义档
-->

<script setup lang="ts">


/** 组件传参 */
interface MyAlertProps {
  /** 主题（颜色档） */
  theme?: "info" | "success" | "warning" | "error"
  /** 标题文本（可选：省略时默认 slot 即全部内容） */
  title?: string
}

/** 组件传参 */
const props = withDefaults(defineProps<MyAlertProps>(), {
  theme: "info",
})
</script>

<template>
  <t-notice-bar
    :theme="props.theme"
    :prefixIcon="true"
    :marquee="false"
    :defaultVisible="true"
  >
    <template #content>
      <div v-if="props.title" class="my-alert-title">{{ props.title }}</div>
      <slot />
    </template>
  </t-notice-bar>
</template>

<style scoped>
.my-alert-title {
  /* 标题加粗，与正文拉开视觉层级 */
  font-weight: 600;
  /* 标题与正文之间留一点空隙 */
  margin-bottom: 4px;
}
</style>