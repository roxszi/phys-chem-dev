"use strict"

/**
 * @导航栏
 */

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.NavItem[] } */
  root: [
    { text: "Global Server", link: "https://roxszi.github.io/phys-chem/en/" },
    // { text: "技术栈", items: [
    //   { text: "VitePress", link: "https://vitepress.dev/zh/" },
    //   { text: "TDsign", link: "https://tdesign.tencent.com/" }
    // ]},
  ],

  /** 英文 @type { import("vitepress").DefaultTheme.NavItem[] } */
  en: [
    { text: "中国大陆访问", link: "https://cpuer.atomgit.net/phys-chem/" },
    // { text: "Tech Stack", items: [
    //   { text: "VitePress", link: "https://vitepress.dev/" },
    //   { text: "TDsign", link: "https://tdesign.tencent.com/index-en" }
    // ]},
  ],

}
