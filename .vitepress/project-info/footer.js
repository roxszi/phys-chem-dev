// @ts-nocheck
"use strict"

/**
 * @页脚信息
 */

// 导入Node编译时环境变量
import { env as processEnv } from "node:process"
// 导入node的路径方法
import { join as pathJoin } from "node:path"
// 网站的根目录
const buildKind = processEnv.VITE_BUILD_KIND
const baseUrl =
  (buildKind === "root")
    ? "/"
    : "/phys-chem/"
// 公安网备的图片路径
const publicSecurityWebsiteFilingicon = pathJoin(baseUrl, "gongan.png")

/**
 * 以页脚设置内容作为默认导出
 * @type { import("vitepress").DefaultTheme.Footer }
 */
export default {

  /** 默认语言，即中文 */
  root: {
    // 第一行，一般是信息页
    message: `Bug反馈：<a href="sms:008613611580728">13611580728 (司承运)</a>`,
    // 第二行，一般是版权页
    copyright:
      `本作品采用 <a href="https://license.coscl.org.cn/MulanPSL2" rel="noreferrer" target="_blank">木兰宽松许可证 第2版</a> 授权
      <br />
      版权所有 © 2025-至今 司承运
      <br />
      <a href="https://beian.miit.gov.cn/" rel="noreferrer" target="_Blank">
        ICP备案：苏ICP备2025161951号-2
      </a>
      <br />
      <img style="display: inline; height: 1em; vertical-align: middle;" src="${ publicSecurityWebsiteFilingicon }" />
      <a href="https://beian.mps.gov.cn/#/query/webSearch?code=32011502013577" rel="noreferrer" target="_Blank">
        苏公网安备 32011502013577 号
      </a>`
  },

  /** 英文 */
  en: {
    message: `Bug Feedback：<a href="sms:008613611580728">0086-13611580728 (SI_Cheng-Yun)`,
    copyright:
      `Licensed under <a href="https://license.coscl.org.cn/MulanPSL2" target="_blank">Mulan PSL v2</a>
      <br />
      Copyright © 2025-Now SI_Cheng-Yun
      <br />
      <a href="https://beian.miit.gov.cn/" rel="noreferrer" target="_Blank">
        China ICP Code：苏ICP备2025161951号-2
      </a>
      <br />
      <img style="display: inline; height: 1em; vertical-align: middle;" src="${ publicSecurityWebsiteFilingicon }" />
      <a href="https://beian.mps.gov.cn/#/query/webSearch?code=32011502013577" rel="noreferrer" target="_Blank">
        苏公网安备 32011502013577 号
      </a>`
  },

}
