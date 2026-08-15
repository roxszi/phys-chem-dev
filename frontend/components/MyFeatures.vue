<!--
  自用特性卡片网格组件
  ---
  设计思路（参考 MyBadge 风格：纯样式继承，零业务逻辑）：
  - 完全复用 VitePress 默认主题的 VPFeatures + VPFeature：
    · 响应式 grid 布局（自动根据 features.length 算列数：2/3/4/6）
    · 卡片 hover 动效（vp-c-gutter 边框过渡）
    · dark/light 主题自动适配
    · 内部由 VitePress 全局 CSS 变量驱动样式
  - props 直接透传（features 数据数组），业务侧无需关心 vitepress 内部组件路径
-->

<script setup lang="ts">
// 从 VitePress 默认主题入口导入（包含所有 VP* 组件 + 全局 CSS）
import { VPFeatures } from "vitepress/theme"
import type { DefaultTheme } from "vitepress/theme"

/**
 * 特性卡片数据结构
 * - 与 VitePress VPFeatures 的 Feature 字段对齐
 * - 业务侧传数组时按此结构填字段即可
 */
export interface MyFeature {
  /** 图标：emoji 字符串 / 图片 src / dark-light 双图对象 */
  icon?: DefaultTheme.FeatureIcon
  /** 卡片标题 */
  title: string
  /** 卡片描述（支持 HTML 字符串） */
  details: string
  /** 点击卡片跳转的链接（可选） */
  link?: string
  /** 链接按钮文字（可选，不填则不显示链接按钮） */
  linkText?: string
  /** 链接 rel 属性（如 "external nofollow"） */
  rel?: string
  /** 链接 target 属性（如 "_blank"） */
  target?: string
}

/** 组件传参 */
interface MyFeaturesProps {
  /** 特性卡片列表 */
  features: MyFeature[]
}

const props = defineProps<MyFeaturesProps>()
</script>


<!--
  视图层
-->
<template>
  <!-- 直接复用 VitePress 的特性卡片网格组件 -->
  <VPFeatures :features="props.features" />
</template>