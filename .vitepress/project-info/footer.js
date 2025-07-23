"use strict"

/**
 * @页脚信息
 */

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.Footer } */
  root: {
    // 第一行，一般是信息页
    message: "<a href='/about/#版权'>版权所有</a>"
      + "　○　"
      + "Bug反馈：<a href='sms:008613611580728'>13611580728 (司承运)</a>",
    // 第二行，一般是版权页
    copyright: "ICP备案：京ICP备2020036654号-9"
  },

  /** 英文 @type { import("vitepress").DefaultTheme.Footer } */
  en: {
    message: "<a href='/en/about/#copyright'>Copyright</a>"
      + "　○　"
      + "Bug Feedback：<a href='sms:008613611580728'>0086-13611580728 (SI_Cheng-Yun)",
    copyright: "China ICP Code：京ICP备2020036654号-9"
  },

}


