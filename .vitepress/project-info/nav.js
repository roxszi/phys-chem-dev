"use strict"

/**
 * @导航栏
 */

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.NavItem[] } */
  root: [
    // { text: "科研绘图", link: "/draw/" },
    {
      text: "技术支持",
      items: [
        { text: "VitePress", link: "https://vitepress.dev/zh/" },
        { text: "TDsign", link: "https://tdesign.tencent.com/vue-next/overview" }
      ]
    },
  ],

  /** 英文 @type { import("vitepress").DefaultTheme.NavItem[] } */
  en: [
    {
      text: "Technical Support",
      items: [
        { text: "VitePress", link: "https://vitepress.dev/zh/" },
        { text: "TDsign", link: "https://tdesign.tencent.com/vue-next/overview" }
      ]
    },
  ],

}
