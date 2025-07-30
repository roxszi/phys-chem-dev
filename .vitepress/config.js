"use strict"

/**
 * @VitePress设置
 * 项目信息相关的配置项已经移出，仅保留VitePress工程化的各类配置。
 * 基本维持默认配置即可。
 * 具体项目通过修改其它几个js的内容以进行差异化配置。
 */
// 导入node的path路径模块的join方法
import { join as pathJoin } from "node:path"
// 导入vitepress的配置注释
import { defineConfig } from "vitepress"
// 导入vite的压缩插件
// AtomGit Pages不支持Gzip，故注释掉
// import { compression } from "vite-plugin-compression2"
// 导入TDesign组件库的按需引入插件
import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { TDesignResolver } from "unplugin-vue-components/resolvers"
// 导入项目信息文件
import projectInfo from "./project-info/index.js"

/** 基础url路径，用于部署 @type { String } */
const baseUrl = projectInfo.baseUrl

/**
 * @配置内容
 * 详见：https://vitepress.dev/zh/reference/site-config
 */
export default defineConfig({

  /**
   * Vite配置
   */
  vite: {
    // 别名处理
    resolve: { alias: {
      // 把“@”映射为项目根目录
      "@": pathJoin(import.meta.dirname, "..")
    }},
    // 插件
    plugins: [
      // 按需引入组件的插件
      AutoImport({ resolvers: [
        // TDesign的"vue-next"组件库
        TDesignResolver({ library: "vue-next" })
      ]}),
      // 按需注册组件的插件
      Components({ resolvers: [
        // TDesign的"vue-next"组件库
        TDesignResolver({ library: "vue-next" })
      ]}),
      // 开启Gzip压缩
      // AtomGit Pages不支持Gzip，故注释掉
      // compression(),
    ],
  },

  /**
   * @构建配置相关
   */
  // Pages服务的url根路径
  base: baseUrl,
  // 构建用的资源目录（源目录），根路径（不带“/”，以路径解析）
  srcDir: ".",
  // 目录里打包时需要排除的文件
  srcExclude: projectInfo.excludeFiles,
  // 构建输出目录（不带“/”，以路径解析）
  outDir: projectInfo.outDir,
  // // 静态资源目录，维持默认即可，约定大于配置
  // assetsDir: "assets",
  // 忽略死链：false，即不忽略。让死链导致构建失败
  ignoreDeadLinks: false,
  // 将页面元数据提取到单独的JS块中，而非内联在初始HTML中
  metaChunk: true,
  // 构建时生成sitemap
  sitemap: projectInfo.sitemap,

  /**
   * @网站页面全局信息
   * 即无视i18n，全局注入的基础信息
   */
  // 自定义head元数据
  head: projectInfo.heads,
  // 路由重写
  rewrites: projectInfo.routersRewrite,

  /**
   * @i18n配置
   * 详见：https://vitepress.dev/zh/guide/i18n
   */
  locales: projectInfo.locales,

  /**
   * @页面全局主题相关
   * 注意：链接不要带后缀（.md、.html都不要带）
   * 详见：https://vitepress.dev/zh/reference/default-theme-config
   */
  themeConfig: {

    // 网站logo
    logo: projectInfo.logo,
    // 社交链接
    socialLinks: projectInfo.socialLinks,
    // 侧边栏位置："left" | true
    aside: projectInfo.outlineAside,
    // 目录大纲层级
    outline: {
      level: projectInfo.outlineLevel,
    },

    /**
     * @页面最新更新时间
     */
    lastUpdated: {
      // 格式，有full、medium、short
      formatOptions: {
        // 日期格式用短的
        dateStyle: "short",
        // 时间格式用中等的
        timeStyle: "medium"
      }
    },

    /**
     * @搜索框设置
     */
    search: {
      // 只检索本地内容
      provider: "local",
      // 使用miniSearch进行配置
      options: { miniSearch: { searchOptions: {
        // 模糊程度，0精确，1完全模糊
        fuzzy: 0.2,
        // 前缀匹配
        prefix: true,
        // 检索权重
        boost: {
          // 标题权重
          title: 4,
          // 文本权重
          text: 2,
          // 标签权重
          titles: 1,
        }
      }}}
    }

  },

  /**
   * @markdown配置相关
   */
  markdown: {
    // 目录设置
    toc: {
      // 显示多少层级
      level: projectInfo.tocLevel,
    },
    // 为每个代码块启用行号
    lineNumbers: true,
    // 启动数学公式支持（需安装开发环境依赖markdown-it-mathjax3）
    // 语法详见：https://docs.mathjax.org/en/latest/input/tex/macros/index.html
    // 直接“math: true”即可使用默认设置，也可以自定义设置
    // 详见：https://docs.mathjax.org/en/latest/options/input/tex.html
    math: true,
    // math: {
    //   // 启用自动编号
    //   // 详见：https://docs.mathjax.org/en/latest/input/tex/eqnumbers.html
    //   tex: {
    //     tags: "ams",
    //     tagSide: "right",
    //     tagIndent: "3em",
    //     tagformat: { tag: (n) => `式(${ n })` }
    //   },
    // },
    // markdown内图片设置
    image: {
      // 启用图片懒加载
      lazyLoading: true
    }
  }

})
