"use strict"

/**
 * @导航栏
 */

/**
 * JSDoc类型声明
 * @typedef { import("vitepress").DefaultTheme.NavItem } VPDefaultThemeNavItem
 */

export default {

  /** 默认语言，即中文 @type { VPDefaultThemeNavItem[] } */
  root: [
    { text: "节点加速", items: [
      { text: "国内访问", link: "https://phys-chem.top/" },
      { text: "海外访问", link: "https://roxszi.github.io/phys-chem/" }
    ]},
    { text: "技术栈", items: [
      { text: "VitePress", link: "https://vitepress.dev/zh/" },
      { text: "TDsign", link: "https://tdesign.tencent.com/" }
    ]}
  ],

  /** 英文 @type { VPDefaultThemeNavItem[] } */
  en: [
    { text: "Optimize Nodes", items: [
      { text: "China Access", link: "https://phys-chem.top/en/" },
      { text: "Global Access", link: "https://roxszi.github.io/phys-chem/en/" }
    ]},
    { text: "Tech Stack", items: [
      { text: "VitePress", link: "https://vitepress.dev/" },
      { text: "TDsign", link: "https://tdesign.tencent.com/index-en" }
    ]}
  ],

}
