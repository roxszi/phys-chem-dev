---
# 主页：VitePress布局格式
# 详见：https://vitepress.dev/zh/reference/default-theme-home-page
# 此处先采用VitePress布局格式，优化主题/布局

# 主页布局
layout: home

# 主页主体部分
hero:
  # 彩色标题(name)及黑白标题(text)
  name: "CPU物化助手"
  # text: "A VitePress Site"
  # 副标题/标语
  tagline: 助力物理化学理论与实验教学
  # logo图
  image: logo-pure.webp
  # 操作按钮（链接）
  actions:
    # - theme: brand
    #   text: 理论
    #   link: theory/
    # - theme: brand
    #   text: 实验
    #   link: experiment/
    - theme: brand
      text: 接触角测量
      link: experiment/contact-angle/
    - theme: alt
      text: 关于
      link: about/
    - theme: alt
      text: 测试
      link: test

# 主页特性部分
features:
  - title: 待完善
    icon: 🎓
    details: 待完善
    # link: /news/2024-2025创坞入驻项目公示/
    # linkText: 查看详情
---

