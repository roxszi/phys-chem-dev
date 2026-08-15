<!--
  自用团队成员展示组件
  ---
  设计思路（参考 MyBadge 风格：纯样式继承，零业务逻辑）：
  - 完全复用 VitePress 默认主题的 VPTeamMembers + VPTeamMembersItem：
    - 响应式 grid 布局（auto-fit + minmax）
    - 头像卡片 + hover 动效
    - dark/light 主题自动适配
    - 内部由 VitePress 全局 CSS 变量驱动样式（升级 vitepress 时自动跟进）
  - props 直接透传（成员数据 + 卡片尺寸），业务侧无需关心 vitepress 内部组件路径
-->

<script setup lang="ts">
// 从 VitePress 默认主题入口导入（包含所有 VP* 组件 + 全局 CSS）
import { VPTeamMembers } from "vitepress/theme"
// 透出 TeamMember 类型，业务侧可直接用：import type { TeamMember } from "@com/MyTeamMembers.vue"
import type { DefaultTheme } from "vitepress/theme"

/** 团队成员类型（头像 / 姓名 / 职称 / 单位 / 简介 / 社交链接 / 赞助链接） */
export type TeamMember = DefaultTheme.TeamMember

/** 组件传参 */
interface MyTeamMembersProps {
  /** 团队成员列表 */
  members: TeamMember[]
  /** 卡片尺寸（默认 medium）。small 卡片更紧凑适合"致谢 / 简短展示" */
  size?: "small" | "medium"
}

const props = withDefaults(defineProps<MyTeamMembersProps>(), {
  size: "medium",
})
</script>


<!--
  视图层
-->
<template>
  <!-- 直接复用 VitePress 的团队成员组件 -->
  <VPTeamMembers :members="props.members" :size="props.size" />
</template>