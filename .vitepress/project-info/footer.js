"use strict"

/**
 * @页脚信息
 */

/**
 * 项目根目录地址
 * 对于Pages服务，项目往往并不托管于根路径“/”，而是“/some-pages/”这样。
 * 为了自动化区分dev和build环境，构建了`baseUrl`环境变量。
 * npm脚本里，以`set VITE_BUILD_KIND=balabala&& balabalabala...`构建环境变量。
 * 即`process.env.VITE_BUILD_KIND`的值是"root"、"subpage"。
 * "subpage" - 以Pages服务的子页面路径为输出目标进行构建
 * "root" - 以 域名根路径 为输出目标进行构建
 */
const buildKind = process.env.VITE_BUILD_KIND

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.Footer } */
  root: {
    // 第一行，一般是信息页
    message: "Bug反馈：<a href='sms:008613611580728'>13611580728 (司承运)</a>",
    // 第二行，一般是版权页
    copyright: (buildKind === "root")
      ? (
          "本作品采用 <a href='https://license.coscl.org.cn/MulanPSL2' target='_blank'>木兰宽松许可证 第2版</a> 授权"
            + "<br />"
            + "<a href='https://beian.miit.gov.cn/' target='_Blank'>ICP备案：苏ICP备2025161951号</a>"
        )
      : (
          "版权 © 2025 司承运 保留所有权利"
            + "<br />"
            + "本作品采用 <a href='https://license.coscl.org.cn/MulanPSL2' target='_blank'>木兰宽松许可证 第2版</a> 授权"
        )
  },

  /** 英文 @type { import("vitepress").DefaultTheme.Footer } */
  en: {
    message: "Bug Feedback：<a href='sms:008613611580728'>0086-13611580728 (SI_Cheng-Yun)",
    copyright: (buildKind === "root")
      ? (
          "Licensed under <a href='https://license.coscl.org.cn/MulanPSL2' target='_blank'>Mulan PSL v2</a>"
          + "<br />"
          + "<a href='https://beian.miit.gov.cn/' target='_Blank'>China ICP Code：苏ICP备2025161951号</a>"
        )
      : (
        "Copyright © 2025 SI_Cheng-Yun. All rights reserved."
        + "<br />"
        + "Licensed under <a href='https://license.coscl.org.cn/MulanPSL2' target='_blank'>Mulan PSL v2</a>"
      )
  },

}


