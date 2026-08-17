---
# 主页：VitePress布局格式
# 详见：https://vitepress.dev/zh/reference/default-theme-home-page
# 此处先采用VitePress布局格式，优化主题/布局

# 主页布局
layout: home

# 主页主体部分
hero:
  # 彩色标题(name)及黑白标题(text)
  name: "物化助手"
  # 副标题
  # text: "A VitePress Site"
  # 标语
  tagline: 助力物理化学理论与实验教学
  # logo图
  # image: logo-pure.webp
  # 操作按钮（链接）
  actions:
    - theme: brand
      text: 物化实验
      link: experiment/
    - theme: brand
      text: 化学计量学
      link: chemometrics/
    - theme: brand
      text: 接触角
      link: experiment/contact-angle/
    - theme: alt
      text: 关于
      link: about/
    - theme: alt
      text: 测试
      link: test/

# 主页特性部分
features:
# 🧮 ✏️ 📊 🧪 🌡️ ⚗️ 🔬
- title: 蔗糖水解皂化反应助手
  icon: ⌨️
  details: 蔗糖水解皂化反应常数的测定实验的数据实时处理。
  link: experiment/sucrose-hydrolysis/
  linkText: 进入应用
- title: 接触角测量助手
  icon: 📷
  details: 接触角测量前，手机需进行的垂直校准操作。
  link: experiment/contact-angle/vertical-calibration/
  linkText: 进入应用
- title: 接触角图片处理助手
  icon: 💦
  details: 接触角测量后，需对图片进行的各类处理工作，以最终获得接触角数据。
  link: experiment/contact-angle/drop-pic-process/
  linkText: 进入应用
- title: 轮廓处理比色法
  icon: 🎨
  details: 轮廓处理比色法功能。
  link: experiment/outline-colorimetric/
  linkText: 进入应用
- title: 拉曼数据处理助手
  icon: ✨
  details: Andor拉曼光谱仪的sif文件数据转为excel表格的一键批处理工具。
  link: chemometrics/andor-raman/
  linkText: 进入应用
---
