<!--
  基础布局
    对VitePress默认主题的Layout组件进行简单扩展，其它尽可能不变
  ---
  设计思路：
  - 在 <DefaultLayout> 外层包 <t-config-provider>，让 tdesign-mobile-vue 组件
    继承全局配置（语言 / 主题），无需在每个业务组件单独配置
  - 用 computed（不是 watch + 手动同步）响应 vitepress 语言切换：
    computed 自动追踪 localeIndex 变化，零状态同步代码
  - 路由加载圈抽到 composables/useRouteLoading.ts，
    BaseLayout 只负责装配，路由逻辑可独立测试
-->

<!--
  逻辑层
-->
<script setup lang="ts">
// 引入默认主题
import DefaultTheme from "vitepress/theme"
// 引入TDsign的中文和英文配置
import tZhConfig from "tdesign-vue-next/es/locale/zh_CN"
import tEnConfig from "tdesign-vue-next/es/locale/en_US"
// 引入数据类型：TDsign的中文和英文配置数据类型
import type { GlobalConfigProvider } from "tdesign-vue-next"

// 从默认主题中解构出默认Layout组件
const { Layout: DefaultLayout } = DefaultTheme
// 解构读取VitePress页面数据
// 详见：https://vitepress.dev/reference/runtime-api#usedata
const { localeIndex } = useData()
/** 路由实例 */
const myRouter = useRouter()

/** TDesign中英文配置字典 */
const tGlobalConfigDict = { root: tZhConfig, en: tEnConfig } as const
/** TDesign的全局配置对象，默认中文 */
const tGlobalConfigComputed = computed(() => (
  tGlobalConfigDict[localeIndex.value as (keyof typeof tGlobalConfigDict)] ?? tZhConfig
) as unknown as GlobalConfigProvider)

// 生命周期钩子，SSG的SPA化实现，整个WebApp挂载后执行
onMounted(() => {
  // 路由守卫实现
  // 路由守卫只能在有“新页面”的时候执行，无法拦截浏览器自身的前进后退
  // 路由/url地址更改前调用
  myRouter.onBeforeRouteChange = onBeforeRoute
  // 路由/url地址更改后调用
  myRouter.onAfterRouteChange = onAfterRoute
})

// 生命周期钩子，整个WebApp卸载前执行
onBeforeUnmount(() => {
  // 清理 onMounted 的相关设置（防御性，避免热重载时残留）
  if (myRouter.onBeforeRouteChange === onBeforeRoute) {
    myRouter.onBeforeRouteChange = undefined
  }
  if (myRouter.onAfterRouteChange === onAfterRoute) {
    myRouter.onAfterRouteChange = undefined
  }
})


/** 路由/url地址更改前的回调 */
function onBeforeRoute() {
  // 页面加载框
  myLoading()
}

/** 路由/url地址更改后的回调 */
function onAfterRoute() {
  // 关闭页面加载框
  myLoading(false)
}
</script>


<!--
  视图层
-->
<template>
<!-- 全局包裹TDesign全局配置 -->
<t-config-provider :globalConfig="tGlobalConfigComputed">
  <!-- TDesign默认布局 -->
  <DefaultLayout />
</t-config-provider>
</template>
