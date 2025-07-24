"use strict"

/**
 * @页脚信息
 */

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.Footer } */
  root: {
    // 第一行，一般是信息页
    message: "Bug反馈：<a href='sms:008613611580728'>13611580728 (司承运)</a>",
    // 第二行，一般是版权页
    copyright: 
      "版权 © 2025 司承运 保留所有权利"
        + "<br />"
        + "本作品采用 <a href='https://license.coscl.org.cn/MulanPubL-2.0' target='_blank'>木兰公共许可证 第2版</a> 授权"
        + "<br />"
        + "ICP备案：京ICP备2020036654号-9"
  },

  /** 英文 @type { import("vitepress").DefaultTheme.Footer } */
  en: {
    message: "Bug Feedback：<a href='sms:008613611580728'>0086-13611580728 (SI_Cheng-Yun)",
    copyright:
      "Copyright © 2025 SI_Cheng-Yun. All rights reserved."
        + "<br />"
        + "Licensed under <a href='https://license.coscl.org.cn/MulanPubL-2.0' target='_blank'>Mulan PubL v2</a>"
        + "<br />"
        + "China ICP Code：京ICP备2020036654号-9"
  },

}


