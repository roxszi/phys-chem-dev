---
# 主页：VitePress布局格式
# 详见：https://vitepress.dev/zh/reference/default-theme-home-page
# 此处先采用VitePress布局格式，优化主题/布局

# 主页布局
layout: home

# 主页主体部分
hero:
  # 彩色标题(name)及黑白标题(text)
  name: "Physical Chemistry Learning Helper"
  # text: "A VitePress Site"
  # 副标题/标语
  tagline: Helper in the theoretical and experimental teaching of physical chemistry.
  # logo图
  # image: logo-pure.webp
  # 操作按钮（链接）
  actions:
    - theme: brand
      text: Contact Angle
      link: experiment/contact-angle/
    - theme: brand
      text: Dynamics
      link: experiment/outline-colorimetric/
    - theme: alt
      text: About
      link: about/

# 主页特性部分
features:
  - title: 蔗糖水解皂化反应助手
    icon: ⌨️
    details: 蔗糖水解皂化反应常数的测定实验的数据实时处理。
    link: experiment/sucrose-hydrolysis/
    linkText: Enter Application
  - title: Contact Angle Measurement Assistant
    icon: 📷
    details: The vertical calibration operation that the mobile phone needs to perform before the contact Angle measurement.
    link: en/experiment/contact-angle/vertical-calibration.md
    linkText: Enter Application
  - title: Contact Angle Image Processing Assistant
    icon: 💦
    details: After the contact Angle measurement, various processing works need to be carried out on the image to finally obtain the contact Angle data.
    link: en/experiment/contact-angle/drop-pic-process.md
    linkText: Enter Application
  - title: Contour processing colorimetric method
    icon: 🎨
    details: Contour processing colorimetric function.
    link: experiment/outline-colorimetric/
    linkText: Enter Application
---
