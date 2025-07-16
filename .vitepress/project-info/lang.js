"use strict"

/**
 * @i18n的多语言词汇表
 * 包含VitePress常用功能键的翻译配置
 * TDsign的翻译不在这里
 */

export default {

  /** 默认语言，即中文 @type { import("vitepress").DefaultTheme.Config } */
  root: {

    // 右上角的浅色/深色模式切换
    darkModeSwitchLabel: "护眼模式切换",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",

    // 文本中的“[[toc]]”大纲标题文字
    outlineTitle: "本页目录",
    // 返回顶部按钮
    returnToTopLabel: "返回顶部",
    // 文本底部的“最后更新”
    lastUpdatedText: "最后更新时间",

    // 404页面
    notFound: {
      // 标题
      code: "未找到页面",
      title: "抱歉，您访问的页面不存在",
      // 描述
      quote: "请检查您输入的网址是否正确，或者点击下面的链接返回首页",
      // 返回首页
      linkLabel: "返回首页",
      linkText: "返回首页"
    },

    // 没见到过的按钮
    langMenuLabel: "多语言",
    sidebarMenuLabel: "网站地图", // 也有叫“菜单”的
    skipToContentLabel: "跳转到内容",
    docFooter: {
      prev: "上一页",
      next: "下一页"
    },
    outline: {
      label: "页面导航"
    },

    // 搜索框
    search: { options: {
      placeholder: "搜索内容",
      translations: {
        button: {
          buttonText: "搜索内容",
          buttonAriaLabel: "搜索内容"
        },
        modal: {
          searchBox: {
            resetButtonTitle: "清除查询条件",
            resetButtonAriaLabel: "清除查询条件",
            cancelButtonText: "取消",
            cancelButtonAriaLabel: "取消"
          },
          startScreen: {
            recentSearchesTitle: "搜索历史",
            noRecentSearchesText: "没有搜索历史",
            saveRecentSearchButtonTitle: "保存至搜索历史",
            removeRecentSearchButtonTitle: "从搜索历史中移除",
            favoriteSearchesTitle: "收藏",
            removeFavoriteSearchButtonTitle: "从收藏中移除"
          },
          errorScreen: {
            titleText: "无法获取结果",
            helpText: "你可能需要检查你的网络连接"
          },
          footer: {
            selectText: "选择",
            navigateText: "切换",
            closeText: "关闭",
            searchByText: "搜索提供者"
          },
          noResultsScreen: {
            noResultsText: "无法找到相关结果",
            suggestedQueryText: "你可以尝试查询",
            reportMissingResultsText: "你认为该查询应该有结果？",
            reportMissingResultsLinkText: "点击反馈"
          }
        }
      }
    }}
  },

  /** 英文 @type { import("vitepress").DefaultTheme.Config } */
  en: {},

}
