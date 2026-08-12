<!--
  基础布局
    对VitePress默认主题的Layout组件进行简单扩展，其它尽可能不变
-->

<!--
  逻辑层
-->
<script setup lang="ts">
// 引入VitePress方法
import { useData, useRouter } from "vitepress"
// 引入默认主题
import DefaultTheme from "vitepress/theme"
// 引入vue方法
// import { shallowRef, onMounted, watch } from "vue"
// 引入TDsign的中文和英文配置
import tZhConfig from "tdesign-mobile-vue/es/locale/zh_CN"
import tEnConfig from "tdesign-mobile-vue/es/locale/en_US"
// 从默认主题中解构出默认Layout组件
const { Layout: DefaultLayout } = DefaultTheme

/** TDesign的全局配置对象，默认中文 */
const tGlobalConfig = shallowRef(tZhConfig)

// https://vitepress.dev/reference/runtime-api#usedata
// const { site, frontmatter, isDark } = useData()


// 生命周期钩子，SSG的SPA化实现，整个WebApp挂载后执行
onMounted(() => {

  // 读取页面设置数据：语言
  const { localeIndex } = useData()

  // 监听钩子
  // 用于全局切换时的事件监听
  // TDesign的中英文切换
  watch(localeIndex, tLangSwitch, { immediate: true })

  // 路由守卫实现
  // 路由守卫只能在有“新页面”的时候执行，无法拦截浏览器自身的前进后退
  // 目前先实现页面加载
  /** 路由实例 */
  const myRouter = useRouter()
  // 路由/url地址更改前调用
  myRouter.onBeforeRouteChange = () => {
    // 打开页面加载圈
    myLoading()
  }
  // 路由/url地址更改后调用
  myRouter.onAfterRouteChange = () => {
    // 关闭页面加载
    myLoading(false)
  }

})

/**
 * TDesign的中英文切换
 * @param langIndexValue 语言值
 */
function tLangSwitch(langIndexValue: string) {
  // 如果用户选择中文，则将TDesign设置为中文
  if (langIndexValue === "root") {
    tGlobalConfig.value = tZhConfig
  // 否则设置为英文
  } else {
    tGlobalConfig.value = tEnConfig
  }
}

</script>


<!--
  视图层
-->
<template>
<!-- 全局包裹TDesign全局配置 -->
<t-config-provider :global-config="tGlobalConfig">
  <DefaultLayout>
  </DefaultLayout>
</t-config-provider>
</template>
