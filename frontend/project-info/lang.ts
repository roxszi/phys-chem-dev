// 语言包
// 适配i18n多语言，包含VitePress常用功能键的翻译配置

// 导入数据类型
import type { Config } from "./types.ts"

// ================================ 语言包配置 ================================
/** 默认语言，即中文 */
const root: Config = {}
/** 英文 */
const en: Config = {}
// 默认导出
export const lang = {
  root, en
}

// ================================ 语言包内容 ================================
// 右上角的浅色/深色模式切换
root.darkModeSwitchLabel = "护眼模式切换"
root.lightModeSwitchTitle = "切换到浅色模式"
root.darkModeSwitchTitle = "切换到深色模式"

// 文本中的“[[toc]]”大纲标题文字
root.outline = { label: "本页目录" }
// 返回顶部按钮
root.returnToTopLabel = "返回顶部"
// 文本底部的“最后更新”
root.lastUpdated = { text: "最后更新时间" }

// 404页面
root.notFound = {
  // 标题
  code: "未找到页面",
  title: "抱歉，您访问的页面不存在",
  // 描述
  quote: "请检查您输入的网址是否正确，或者点击下面的链接返回首页",
  // 返回首页
  linkLabel: "返回首页",
  linkText: "返回首页"
},

// 暂时没见到过的按钮
root.langMenuLabel = "多语言",
root.sidebarMenuLabel = "网站地图", // 也有叫“菜单”的
root.skipToContentLabel = "跳转到内容",
root.docFooter = {
  prev: "上一页",
  next: "下一页"
},
root.outline = {
  label: "页面导航"
}




