<!--
  自用徽章/徽标组件
  ---
  设计思路：
  - 完全复用 VitePress 默认主题的徽章/徽标样式（`.VPBadge` + info | tip | warning | danger）。
-->


<!--
  逻辑层
-->
<script setup lang="ts">

/** 组件传参 */
interface MyNoticeBarProps {
  /**
   * 类型（颜色档）。
   * - 默认 "warning"（黄色）
   * - 其中：
   *   - info - 灰色
   *   - tip - 紫色
   *   - warning - 黄色
   *   - danger - 红色
   */
  type?: "info" | "tip" | "warning" | "danger"
}

/** 组件传参 */
const props = withDefaults(defineProps<MyNoticeBarProps>(), {
  type: "warning",
})
</script>


<!--
  视图层
-->
<template>
  <!-- 直接复用VitePress的样式类 -->
  <span :class="['VPBadge', props.type]">
    <!-- 内容插槽 -->
    <slot />
  </span>
</template>
