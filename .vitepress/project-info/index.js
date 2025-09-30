"use strict"

/**
 * @项目信息
 * 包含了项目内容的配置信息
 */

// 导入社交链接
import socialLinks from "./social-links.js"
// 导入i18n设置
import i18n from "./i18n.js"


/**
 * 项目根目录地址
 * 对于Pages服务，项目往往并不托管于根路径“/”，而是“/some-pages/”这样。
 * 为了自动化区分dev和build环境，构建了`baseUrl`环境变量。
 * npm脚本里，以`set VITE_BUILD_KIND=atomgit&& balabala...`构建环境变量。
 * 即`process.env.VITE_BUILD_KIND`的值是"atomgit"。
 * 根据环境变量值，自动构建`baseUrl`根路径。
 */
const baseUrl =
  (process.env.VITE_BUILD_KIND === "atomgit")
    ? "/phys-chem/"
    : "/"

// 直接作为默认导出
export default {

  // 项目根目录地址
  baseUrl: baseUrl,
  // Web包的输出目录
  outDir: "./dist",
  // 网站地图的引用地址，即根目录地址
  sitemap: { hostname: `https://cpuer.atomgit.net${ baseUrl }` },
  // 网站logo
  logo: "/favicon.ico",

  // 全局head元数据
  heads: [
    // 网站图标。public目录默认映射根目录，但是base得有
    ["link", { rel: "icon", href: (baseUrl + "favicon.ico") }],
    // 百度统计
    (baseUrl === "/") ? []
      : [
        "script",
        { type: "text/javascript", id: "baidu-tongji" },
        `var _hmt = _hmt || [];
        (function() {
          var hm = document.createElement("script");
          hm.src = "https://hm.baidu.com/hm.js?6185c255f38aa19b8374234dfb43440b";
          var s = document.getElementsByTagName("script")[0]; 
          s.parentNode.insertBefore(hm, s);
        })();`
      ],
  ],

  // 路由重写
  routersRewrite: {
    // i18n的多语言切换：省去“/i18n/”前缀
    "i18n/(.*)": "(.*)",
    // 省去“/index/”前缀
    "index/(.*)": "(.*)",
    // "关于我们/(.*)": "about/(.*)",
  },

  // 排除文件列表
  excludeFiles: [
    // 备份文件
    "backup/**",
    // 一些node项目的配置文件
    "node_modules/(.*)",
    "README.md",
    "README.en.md",
    "LICENSE",
    "package.json",
    "package-lock.json",
    // 打包发布
    "dist/**",
  ],

  // toc精确到哪一级
  tocLevel: [2, 3],
  // 侧边栏位置："left" | true
  outlineAside: true,
  // 目录大纲层级
  outlineLevel: [2, 3, 4],

  // 社交链接
  socialLinks: socialLinks,
  // i18n设置
  locales: i18n,

}
