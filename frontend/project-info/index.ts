// 项目信息
// 包含了项目内容的配置信息
// 有一些配置信息比较多的，已经单独拆分出去了

// 导入Node编译时环境变量
import { env as processEnv } from "node:process"
// 导入页脚、导航栏、侧边栏、社交链接、基础语言包
import { footer } from "./footer.ts"
import { nav } from "./nav.ts"
import { sidebar } from "./sidebar.ts"
import { socialLinks } from "./social-link.ts"
import { lang } from "./lang.ts"
// 导入数据类型
import type { HeadConfig, LocaleConfig, ThemeConfig } from "./types.ts"

/**
 * 项目根目录地址
 * 对于Pages服务，项目往往并不托管于根路径“/”，而是“/some-pages/”这样。
 * 为了自动化区分dev和build环境，构建了`base`环境变量。
 * npm脚本里，以`set VITE_BUILD_KIND=balabala&& balabalabala...`构建环境变量。
 * 即`process.env.VITE_BUILD_KIND`的值是"root"、"subpage"。
 * "subpage" - 以Pages服务的子页面路径为输出目标进行构建
 * "root" - 以 域名根路径 为输出目标进行构建
 */
const buildKind = processEnv["VITE_BUILD_KIND"] ?? "root"
console.log(
  (buildKind === "root")
    ? "以 根路径 为输出目标进行构建："
    : "以 子页面路径 为输出目标进行构建：",
)

/** 网站的根目录 */
export const base =
  (buildKind === "root")
    ? "/"
    : "/phys-chem/"

/** head - 全局站点<head>区的自定义数据 */
export const head: HeadConfig[] = [
  // 网站图标。public目录默认映射根目录，但是base得有
  ["link", { rel: "icon", href: (base + "favicon.ico") }],
  // 百度统计
  [
    "script",
    { type: "text/javascript", id: "baidu-tongji" },
    `var _hmt = _hmt || [];
    (function() {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?6185c255f38aa19b8374234dfb43440b";
      var s = document.getElementsByTagName("script")[0]; 
      s.parentNode.insertBefore(hm, s);
    })();`
  ]
]

/** 路由重写 */
export const rewrites = {
  // i18n的多语言切换：省去“/i18n/”前缀
  "index/i18n/(.*)": "(.*)",
  // 省去“/index/”前缀
  "index/(.*)": "(.*)",
}

/** 排除文件列表 */
export const srcExclude = [
  // 原则上只保留 index/ 目录即可
  // 可能的注释文件
  "README.md",
  "README.en.md",
  // 非index目录
  ".vitepress/(.*)",
  "components/(.*)",
  "composables/(.*)",
  "layouts/(.*)",
  "project-info/(.*)",
  "public/(.*)",
  "utils/(.*)",
  // 其它文件
  "*.d.ts",
]

/** 构建输出目录 */
export const outDir = `../dist/frontend-${ buildKind }`

/** 站点地图 */
export const sitemap = {
  hostname: (buildKind === "root")
    ? "https://www.yaodasci.com/"
    : `https://roxszi.github.io${ base }`
}

/** i18n设置 */
export const locales: LocaleConfig = {
  /** 默认语言，即中文 */
  root: {
    // 语言标签
    label: "简体中文",
    lang: "zh-CN",
    // 网站标题
    title: "物化助手",
    // 网站名称的自定义后缀，一般为简称
    // titleTemplate: "物化助手",
    // 网站描述
    description: "助力物理化学理论与实验教学",
    // 主题内容
    themeConfig: getI18nThemeConfig("root")
  },
  /** 英文 */
  en: {
    label: "English",
    lang: "en-US",
    title: "Phys. Chem. Helper",
    description: "Helper in theoretical and experimental teaching of physical chemistry, by teachers and students from China Pharmaceutical University.",
    themeConfig: getI18nThemeConfig("en")
  }
}

/** 主题内容设置 */
export const themeConfig: ThemeConfig = {
  /** 网站logo */
  logo: "/favicon.ico",
  /** 侧边栏位置："left" | true */
  aside: true,
  /** 目录大纲 */
  outline: {
    /** 目录大纲层级 */
    level: [2, 4],
  },
  /** 社交链接 */
  socialLinks: socialLinks,
}

/** markdown设置 */
export const markdown = {
  // 目录设置
  toc: {
    // toc精确到哪一级
    level: [2, 3],
  },
}

/**
 * 获取i18n各类主题配置的方法
 * @param key 语言标识
 */
function getI18nThemeConfig(key: ("root" | "en")) { try {
  /** 主题设置对象 */
  const themeConfig = {
    ...lang[key],
    nav: nav[key],
    sidebar: sidebar[key],
    footer: footer[key],
  }
  // 返回生成的语言包
  return themeConfig
} catch (err) {
  console.error("getI18nThemeConfig报错：", err)
  throw err
}}
