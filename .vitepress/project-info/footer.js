"use strict"

/**
 * @页脚信息
 */

/**
 * JSDoc类型声明
 * @typedef { import("vitepress").DefaultTheme.Footer } VPFooter
 */

export default {

  /** 默认语言，即中文 @type { VPFooter } */
  root: {
    // 第一行，一般是信息页
    message: "Bug反馈：<a href='sms:008613611580728'>13611580728 (司承运)</a>",
    // 第二行，一般是版权页
    copyright: (
      "本作品采用 <a href='https://license.coscl.org.cn/MulanPSL2' target='_blank'>木兰宽松许可证 第2版</a> 授权"
        + "<br />"
        + "<a href='https://beian.miit.gov.cn/' target='_Blank'>ICP备案：苏ICP备2025161951号</a>"
    )
  },

  /** 英文 @type { VPFooter } */
  en: {
    message: "Bug Feedback：<a href='sms:008613611580728'>0086-13611580728 (SI_Cheng-Yun)",
    copyright: (
      "Licensed under <a href='https://license.coscl.org.cn/MulanPSL2' target='_blank'>Mulan PSL v2</a>"
      + "<br />"
      + "<a href='https://beian.miit.gov.cn/' target='_Blank'>China ICP Code：苏ICP备2025161951号</a>"
    )
  },

}


