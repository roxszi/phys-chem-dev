// 数据类型
// 特指VitePress下的Theme主题对象的各类数据类型

// 导入VitePress主题数据类型
import type { DefaultTheme } from "vitepress"

// 直接从VitePress主题对象中提取导出类型
export type { HeadConfig, LocaleConfig } from "vitepress"

// 导入各分支类型

/** 目前支持的预言种类 */
export type LocaleKind = "root" | "en"

/** 主题配置 */
export type ThemeConfig = DefaultTheme.Config

/** 侧边栏 */
export type Sidebar = DefaultTheme.Sidebar

/** 导航栏 */
export type NavItem = DefaultTheme.NavItem

/** 社交链接 */
export type SocialLink = DefaultTheme.SocialLink

/** 设置（语言包用） */
export type Config = DefaultTheme.Config

/** 页脚 */
export type Footer = DefaultTheme.Footer



/** <head>区元数据 */
// export type Head = [string, Record<string, string>, string?]

