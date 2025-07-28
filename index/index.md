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
    # - theme: alt
      # text: 测试
      # link: test

# 主页特性部分
features:
  - title: 接触角测量助手
    icon: 📷
    details: 接触角测量前，手机需进行的垂直校准操作。
    link: experiment/contact-angle/vertical-calibration.md
    linkText: 进入应用
  - title: 接触角图片处理助手
    icon: 💦
    details: 接触角测量后，需对图片进行的各类处理工作，以最终获得接触角数据。
    link: experiment/contact-angle/drop-pic-process.md
    linkText: 进入应用
---

