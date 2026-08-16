// 主题配置
// 详见：https://vitepress.dev/zh/guide/custom-theme

// 从vue导入组件的html化方法
import { h } from "vue"
// 导入主题重写组件
import BaseLayout from "../layouts/BaseLayout.vue"
// 导入TDesign的基础样式
// import "tdesign-vue-next/es/style/index.css"
import "./tdesign-theme.css"
// 以VitePress基础样式变量，构建TDesign基础全局样式
// import "./bridge.css"
// 导入自建样式
import "./style.css"
// 导入数据类型
import type { Theme } from "vitepress"

/** 主题 */
const theme: Theme = {
  // 主布局
  Layout: () => {
    return h(BaseLayout)
  },
  // 扩展主题
  // extends: DefaultTheme,
  // App增强
  enhanceApp({ app, router, siteData }) {
    /**
     * 全局错误捕获
     * @note 这只能捕获同步错误，对于异步Promise错误，必须用catch捕获
     */
    app.config.errorHandler = myError
  }
}

// 以主题对象作为默认导出
export default theme
