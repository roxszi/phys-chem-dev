// VitePress设置
// 项目信息相关的配置项（themeConfig）已经解耦，仅保留VitePress工程化的各类配置

// 导入vitepress的配置生成器
import { defineConfig } from "vitepress"
// 导入tsconfig.json中的paths配置插件
import TsconfigPaths from "vite-tsconfig-paths"
// 导入vite的压缩插件
import { compression } from "vite-plugin-compression2"
// 导入组件库的按需引入插件
import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
// 导入TDesign组件库解析器
import { TDesignResolver } from "@tdesign-vue-next/auto-import-resolver"
// 以命名空间形式导入全部项目信息文件
import * as projectInfo from "../project-info/index.ts"

// 默认导出的vitepress配置
// 项目内容已解耦，此处开放设置的只剩下与项目内容无关的工程化配置
// 含：vite配置
// 详见：https://vitepress.dev/zh/reference/site-config
export default defineConfig({

  // vite设置
  // vitepress 2.0-alpha.18 依赖的vite版本是8.x
  vite: {
    // 解析设置
    // resolve: {
    //   // 使用tsconfig.json中的paths配置
    //   tsconfigPaths: true
    // },
    // 插件
    plugins: [
      // 使用tsconfig.json中的paths配置
      TsconfigPaths({
        // 宽松解析，支持vue等文件
        // 仍不支持.md文件，因此.md中用.vue时，需手动导入
        loose: true,
      }),
      // 自动实现import引入
      AutoImport({
        // 开启对ts类型的支持
        dts: true,
        // 生成类型声明文件的路径
        // dts: "@frontend/auto-imports.d.ts",
        // 类型文件更新方式
        // dtsMode: "overwrite",
        // 全局自动引入的包/API
        imports: [{
          // 自动引入myPlugin.ts中的内容
          "@utils/myPlugin.ts": ["myLoading", "myDialog", "myMessage", "myError", "myWait"],
          // 自动引入vue方法
          "vue": [
            "ref", "shallowRef", "onMounted", "onBeforeUnmount", "watch", "readonly", "useTemplateRef",
            "computed", "nextTick"
          ],
          // 自动引入vitepress运行时方法
          "vitepress": ["useData", "withBase", "useRouter"],
        }],
        // 自动扫描目录
        dirs: ["composables"],
        // 解析器
        resolvers: [
          // TDesign解析器，以tdesign-vue-next为库
          TDesignResolver({ library: "vue-next" })
        ],
      }),
      // 自动实现vue组件挂载
      Components({
        // 涉及的文件扩展名：vue、md
        include: [/\.vue$/, /\.vue\?vue/, /\.vue\.[tj]sx?\?vue/, /\.md$/],
        // 生成d.ts文件
        dts: true,
        // 组件存放目录的相对路径
        dirs: [
          "components",
          "index"
        ],
        // 读取子目录
        deep: true,
        // 以子目录作为命名空间前缀
        directoryAsNamespace: false,
        // 可解析的组件扩展名
        extensions: ["vue"],
        // 解析器
        resolvers: [
          // TDesign解析器，以tdesign-vue-next为库
          TDesignResolver({
            library: "vue-next",
            // resolveIcons: true
          })
        ]
      }),
      // 开启Gzip压缩。压缩算法只要gzip即可
      compression({ algorithms: ["gzip"] }),
    ],
    // css样式处理：使用lightningcss
    // css: { transformer: "lightningcss" },
    // 构建设置
    build: {
      // css压缩：使用lightningcss
      // cssMinify: "lightningcss",
    },
    // 开发服务器配置
    server: {
      // 端口
      // port: 3000,
    },
    // 需要作为 raw asset 处理的文件
    assetsInclude: [
      // "**/opencv_js.wasm",
    ],
  },

  // 全局站点元数据
  // 此处仅继承可全局生效的元数据
  // i18n 有关的部分元数据在 `locale` 中定义
  /** <head>标签中的自定义项 */
  head: projectInfo.head,
  /** 站点基础url部署路径 */
  base: projectInfo.base,

  // 路由相关
  // 是否删除路径中的.html后缀
  cleanUrls: false,
  // 路由重写
  rewrites: projectInfo.rewrites,

  // 构建
  // 内容源目录，需为根目录，否则public将跟随源目录
  srcDir: ".",
  // 排除文件/目录
  srcExclude: projectInfo.srcExclude,
  // 构建输出目录
  outDir: projectInfo.outDir,
  // 静态资源目录，维持默认即可
  // assetsDir: "static",
  // 缓存目录，维持默认即可
  // cacheDir: ".vitepress/cache",
  // 是否报错死链
  ignoreDeadLinks: false,
  // 是否开启MPA模式
  mpa: false,
  // 站点地图
  sitemap: projectInfo.sitemap,
  // 将页面元数据提取到单独的JS块中，而非内联在初始HTML中
  // metaChunk: true,

  // i18n
  // 详见：https://vitepress.dev/zh/guide/i18n
  locales: projectInfo.locales,

  // 页面全局主题相关
  // 详见：https://vitepress.dev/zh/reference/default-theme-config
  themeConfig: {

    // 继承项目信息中的主题配置
    ...projectInfo.themeConfig,

    // 页面最新更新时间
    lastUpdated: {
      // 格式，有full、medium、short
      formatOptions: {
        // 日期格式用短的
        dateStyle: "short",
        // 时间格式用中等的
        timeStyle: "medium"
      }
    },

    // 搜索框
    search: {
      // 只检索本地内容
      provider: "local",
      // 使用miniSearch进行配置
      options: {
        miniSearch: {
          searchOptions: {
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
          }
        }
      }
    }
  },

  // markdown配置
  markdown: {
    // 继承项目信息中的markdown配置
    ...projectInfo.markdown,
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
      lazyLoad: true
    }
  }

})
