"use strict"

/**
 * @i18n设置
 * 即vitepress的`locales`设置项
 */

// 导入不同语言下的主题内容配置
import lang from "./lang.js"
import footer from "./footer.js"
import nav from "./nav.js"
import sidebar from "./sidebar.js"


export default {

  /** 默认语言，即中文 @type { import("vitepress").LocaleConfig } */
  root: {
    // 语言标签
    label: "简体中文",
    lang: "zh-CN",
    // 网站标题
    title: "CPU物化助手",
    // 网站名称的自定义后缀，一般为简称
    // titleTemplate: "CPU物化助手",
    // 网站描述
    description: "助力物理化学理论与实验教学",
    // 自定义网站头部内容
    // head: [],
    // 主题内容
    themeConfig: getI18nThemeConfig("root")
  },

  /** 英文 @type { import("vitepress").LocaleConfig } */
  en: {
    label: "English",
    lang: "en-US",
    title: "Physical Chemistry Assistant @ CPU",
    description: "Assist in theoretical and experimental teaching of physical chemistry, by teachers and students from China Pharmaceutical University.",
    themeConfig: getI18nThemeConfig("en")
   },

}

/**
 * 获取i18n各类主题配置的方法
 * @param { String } key 语言标识
 * @returns { import("vitepress").ThemeConfig }
 */
function getI18nThemeConfig(key) { try {
  // 先用lang语言包初始化
  const themeConfig = lang[key]
  // 再用nav、sidebar、footer覆盖
  themeConfig.nav = nav[key]
  themeConfig.sidebar = sidebar[key]
  themeConfig.footer = footer[key]
  // 返回生成的语言包
  return themeConfig
} catch (err) {
  console.error("getI18nThemeConfig报错：", err)
}}
