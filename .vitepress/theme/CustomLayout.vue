<!--
  默认主题重写
  视图层：全局包裹TDesign全局配置
  逻辑层：设置全局脚本
 -->


<!--
  视图层
 -->
<template>
<!-- 全局包裹TDesign全局配置 -->
<t-config-provider :global-config="tGlobalConfig">
  <!-- VitePress默认布局 -->
  <Layout>
    <!-- 可在此处用插槽语法 -->
  </Layout>
</t-config-provider>
</template>


<!--
  逻辑层
  1.  统一VitePress和TDsign的暗黑主题模式
  2.  统一VitePress和TDsign的中英文界面
 -->
<script setup>
// 引入默认主题
import DefaultTheme from "vitepress/theme"
// 从默认主题中解构出Layout组件
const { Layout } = DefaultTheme
// 从VitePress引入用户数据
import { useData, useRouter } from "vitepress"
// 从Vue3引入各类方法
import { shallowRef, onMounted, watch } from "vue"
// 引入TDsign的中文和英文配置
import tZhConfig from "tdesign-vue-next/es/locale/zh_CN"
import tEnConfig from "tdesign-vue-next/es/locale/en_US"
// 引入TDesign插件
import { LoadingPlugin } from "tdesign-vue-next"

// 读取页面设置数据：暗黑模式、语言
const { isDark, lang } = useData()
// TDesign的全局配置对象
const tGlobalConfig = shallowRef(null)

/**
 * @全局钩子
 */

// 生命周期钩子，SSG的SPA化实现，整个WebApp挂载后执行
onMounted(() => {

  /**
   * 监听钩子
   * 用于全局切换时的事件监听
   */
  // TDesign的暗黑模式切换（监听注册后立即执行一次）
  watch(isDark, tDarkToggle, { immediate: true })
  // TDesign的中英文切换
  watch(lang, tLangSwitch, { immediate: true })

  /**
   * 路由守卫实现
   * 目前先实现页面加载
   */
  const myRouter = useRouter()
  // 路由更改前调用
  myRouter.onBeforeRouteChange = (to) => {
    // 打开页面加载
    myRouter.pageLoadingInstance = LoadingPlugin({
      // 延迟
      delay: 0,
      // 是否全屏
      fullscreen: true,
      // 加载指示符
      indicator: true,
      // 是否继承父类颜色
      inheritColor: false,
      // 是否加载中
      loading: true,
      // 是否防穿透
      preventScrollThrough: true,
      // 是否显示遮罩层
      showOverlay: true,
      // 尺寸
      size: "large",
      // 文案
      text: "加载中...",
      // 层级：尽可能大，但是不至于太大
      zIndex: 10000
    })
  }
  // 路由更改后调用
  myRouter.onAfterRouteChange = (to) => {
    // 关闭页面加载
    myRouter.pageLoadingInstance?.hide()
  }

})

/**
 * TDesign的暗黑模式切换
 * @param { Boolean } isDarkValue 是否开启暗黑模式
 */
function tDarkToggle(isDarkValue) {
  // 如果用户开启暗黑模式，则将html标签的theme-mode属性设置为dark
  if (isDarkValue) {
    document.documentElement.setAttribute("theme-mode", "dark")
  // 否则移除暗黑模式
  } else {
    document.documentElement.removeAttribute("theme-mode")
  }
}

/**
 * TDesign的中英文切换
 * @param { String } langValue 语言值
 */
function tLangSwitch(langValue) {
  // 如果用户选择中文，则将TDesign设置为中文
  if (langValue === "zh-CN") {
    tGlobalConfig.value = tZhConfig
  // 否则设置为英文
  } else {
    tGlobalConfig.value = tEnConfig
  }
}

</script>
