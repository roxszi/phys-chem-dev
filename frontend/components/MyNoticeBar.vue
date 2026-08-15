<!--
  自用提示框组件
  ---
  设计思路：
  - 完全复用 VitePress 默认主题的  样式（`.custom-block`）。
    本组件仅渲染同样的 DOM 结构，**不需要任何 scoped CSS**，由 vitepress 默认主题
    的 custom-block.css 提供所有视觉样式（背景色 / 边框色 / 链接色 / code 背景色 等）。
  - 这样业务侧在 .md 和 .vue 里写提示框，**视觉 100% 一致**：
      md：`::: warning 标题\n内容\n:::`
      vue：<MyNoticeBar theme="warning" title="标题">内容</MyNoticeBar>
  - 主题对齐 VitePress 内置 7 个容器：info / note / tip / important / warning / danger / caution
  - title 可选：不传则无标题行，padding 仍走 .custom-block 的 8/16 默认
-->


<!--
  逻辑层
-->
<script setup lang="ts">
/** 本组件的传参数据类型 */
interface MyNoticeBarProps {
  /**
   * 主题（颜色档）。
   * - 默认 "warning"（黄色）
   * - 其中：
   *   - info = note - 灰色
   *   - tip - 紫色
   *   - important - 红紫
   *   - warning - 黄色
   *   - danger = caution - 红色
   */
  theme?: "info" | "tip" | "important" | "warning" | "danger"
  /** 标题文本（可选） */
  title?: string
}

/** 组件传参 */
const props = withDefaults(defineProps<MyNoticeBarProps>(), {
  theme: "warning",
})
</script>


<!--
  视图层
-->
<template>
  <!-- 直接复用VitePress的样式类 -->
  <div :class="[props.theme, 'custom-block']">
    <!-- 标题 -->
    <p
      v-if="title"
      class="custom-block-title custom-block-title-default"
    >
      {{ props.title }}
    </p>
    <!-- 内容插槽 -->
    <slot />
  </div>
</template>
