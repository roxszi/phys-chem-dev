"use strict"

/**
 * @主题文件
 * 用于增强默认主题
 * 详见：https://vitepress.dev/zh/guide/custom-theme
 * @important 这里可以定义Vue3组件
 */

// 导入TDesign组件库
// 自动导入无法处理.md内的组件（只能处理.vue里的），因此需要在此手动导入
// 也可以修改自动导入相关配置，后面再摸索
// import { Button as TButton } from "tdesign-vue-next"
// import TDesign from "tdesign-vue-next"
// 导入默认主题
import DefaultTheme from "vitepress/theme"
// 导入可用于自定义的默认样式
import "./style.css"
// 引入TDesign组件库的少量全局样式变量
import "tdesign-vue-next/es/style/index.css"
// 导入自定义样式
import "./custom.css"
// 从vue导入组件的html化方法
import { h, defineAsyncComponent } from "vue"
// 导入主题重写组件
import CustomLayout from "./CustomLayout.vue"

// 将默认主题以默认对象导出
/** @type { import("vitepress").Theme } */
export default {
  // 主题名称
  extends: DefaultTheme,
  // 主题扩展重写
  Layout: h(CustomLayout),
  // 主题增强
  enhanceApp({ app, router, siteData }) {
    // 手动注册TDesign为全局组件
    // app.use(TDesign)
    // 自动从components目录注册所有.vue文件为全局组件
    // 从components目录导入所有.vue文件
    const components = import.meta.glob("@/components/**/*.vue")
    // 遍历所有.vue文件，并注册为全局组件
    for (const [path, component] of Object.entries(components)) {
      // 从路径中获取组件名称
      const name = path
        // 路径字符串按照“/”分割，然后冒泡取最后一个元素，即文件名
        .split("/").pop()
        // 将文件名中的“.vue”替换为空
        .replace(".vue", "")
      // 注册组件
      app.component(name, defineAsyncComponent(component))
    }
  }
}
