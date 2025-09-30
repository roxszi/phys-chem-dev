"use strict"

/**
 * @导航栏
 */

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.NavItem[] } */
  root: [
    { text: "节点加速", items: [
      { text: "国内访问", link: "https://cpuer.atomgit.net/phys-chem/" },
      { text: "海外访问", link: "https://roxszi.github.io/phys-chem/" }
    ]},
    { text: "技术栈", items: [
      { text: "VitePress", link: "https://vitepress.dev/zh/" },
      { text: "TDsign", link: "https://tdesign.tencent.com/" }
    ]}
  ],

  /** 英文 @type { import("vitepress").DefaultTheme.NavItem[] } */
  en: [
    { text: "Optimize Nodes", items: [
      { text: "China Access", link: "https://cpuer.atomgit.net/phys-chem/en/" },
      { text: "Global Access", link: "https://roxszi.github.io/phys-chem/en/" }
    ]},
    { text: "Tech Stack", items: [
      { text: "VitePress", link: "https://vitepress.dev/" },
      { text: "TDsign", link: "https://tdesign.tencent.com/index-en" }
    ]}
  ],

}
