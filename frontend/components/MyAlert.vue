<!--
  自用提示框组件
  基于 tdesign-mobile-vue 的 t-notice-bar 自封
  ---
  设计思路：
  - 屏蔽滚动 / 喇叭图标 / 关闭按钮：业务侧只想用"提示文本"语义，不需要横幅交互
  - 主题对齐：info/warning/error 三个语义档（与 tdesign 移动端 theme 一致）
  - title 在前、默认 slot 在后：业务侧照原 t-alert 的"title + 多行内容"写法即可
-->

<script setup lang="ts">
/**
 * 主题类型，与 t-notice-bar.theme 对齐
 */
type Theme = "info" | "warning" | "error"

/** 组件传参 */
interface MyAlertProps {
  /** 主题（颜色档） */
  theme?: Theme
  /** 标题文本，可选 */
  title?: string
}

const props = withDefaults(defineProps<MyAlertProps>(), {
  /** 主题，默认 info */
  theme: "info",
  /** 标题，可省略（默认 slot 就是全部内容） */
  title: "",
})

/**
 * 把 title + 默认 slot 拼成 t-notice-bar 的 content 数组
 * 模板里通过 v-for 渲染 <slot/> 的兄弟节点
 */
</script>

<template>
  <t-notice-bar
    :theme="props.theme"
    direction="vertical"
    :prefix-icon="false"
    :suffix-icon="null"
    :marquee="false"
    :visible="true"
    :default-visible="true"
    class="my-alert"
  >
    <!--
      content 用数组形式：每行单独一段，让 multi-line 文案不被压缩成单行
      有 title 时第一行作为标题加粗（视觉上对齐原 t-alert 行为）
    -->
    <template v-if="props.title" #content>
      <div class="my-alert-title">{{ props.title }}</div>
    </template>
    <slot />
  </t-notice-bar>
</template>

<style scoped>
.my-alert {
  /* 默认占满父容器宽度 */
  width: 100%;
}
.my-alert-title {
  /* 标题加粗 */
  font-weight: 600;
  /* 标题与正文之间留一点空隙 */
  margin-bottom: 4px;
}
</style>
