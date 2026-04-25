# 物化助手 (Physical Chemistry Learning Helper)

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/roxszi/phys-chem-dev)

## **简体中文** | [**English**](./README.en.md)

> 📦 项目源码：[https://gitcode.com/roxszi/phys-chem-dev](https://gitcode.com/roxszi/phys-chem-dev)
>
> 🌐 项目源码（国外访问）：[https://github.com/roxszi/phys-chem-dev](https://github.com/roxszi/phys-chem-dev)
> 
> 📦 **项目展示页面**：[**https://www.phys-chem.top**](https://www.phys-chem.top)
>
> 🌐 项目展示页面（国外访问）：[https://roxszi.github.io/phys-chem/en/](https://roxszi.github.io/phys-chem/en/)

---

## 📖 项目简介

物化助手是一个基于 [VitePress](https://vitepress.dev/zh/) 构建的物理化学学习工具项目，旨在通过数字化技术（统计机器学习、计算机视觉、深度学习等）解决物理化学理论与实验教育教学过程中的各类需求。

### ✨ 主要特点

- 🔒 **隐私安全**：所有计算均在用户本地设备完成，无需上传数据至服务器
- ⚡ **高性能**：支持 WebGPU/WebGL 硬件加速，充分利用设备算力
- 📱 **跨平台**：支持桌面浏览器和移动浏览器访问
- 🎨 **现代化 UI**：基于 [TDesign](https://tdesign.tencent.com/vue-next/overview) 组件库
- 🌍 **多语言**：支持中英文双语界面

### 🎯 核心功能

| 功能模块 | 描述 | 状态 |
|---------|------|------|
| 接触角测量 | 通过图像处理计算液滴接触角，支持设备校准和图片处理 | ✅ 已完成 |
| 化学计量学工具 | Andor 拉曼光谱数据批量处理、机器学习分析 | ✅ 已完成 |
| 深度学习演示 | 神经网络模型训练和预测演示 | 🚧 开发中 |
| 垂直校准 | 设备垂直度校准工具 | ✅ 已完成 |

---

## 🛠️ 技术栈

### 前端框架
- **VitePress** - VitePress是一个立足Vite、Markdown的SSG（静态站点生成）框架，并支持Vue生态。VitePress官方文档：[https://vitepress.dev/zh/](https://vitepress.dev/zh/)
- **Vue 3** - 渐进式 JavaScript 框架
- **TDesign (Vue Next)** - 企业级 UI 设计体系
- **VueUse** - Vue 组合式工具集

### 深度学习（TensorFlow.js）
- 后续面向教学/科研的产品(WebApp等服务)，本项目最初的打算就是直接让学生用手机/电脑浏览器实现模型的应用及训练(WebGPU/WebGL硬件加速)。这样设计的原因有2：
1. 可借助学生每个人手上的算力资源，完成教学及简单的科研任务。
2. 可突破Nvidia显卡/CUDA平台的限制，核心显卡/集成显卡甚至手机，只要支持WebGPU/WebGL即可实现硬件加速运算。
- 在上述考虑的基础上，为进一步降低开发和产品化间的各种额外工作量，尽可能专注于业务，本项目就毫无悬念的选用了[**TensorFlowJS**](https://tensorflow.google.cn/js)这一技术栈，其开发及构建几乎都基于前端，少数的数据预处理、代码调试工作也可借助NodeJS在后端简单完成而不涉及跨语言的问题，这极大降低了项目开发的工作量。  
- TensorFlowJS纯网页开发的缺点是缺乏代码注释，而Vite则弥补了这一问题。Vite下的Node开发环境，其能直接安装调用TensorFlowJS库，以获得项目开发时的官方代码注释；也能借助dev(/serve)在浏览器端运行/渲染代码，直接调用WebGPU/WebGL实现硬件加速。这样开发效率、运行效率都得到了保障。
- **tfjs-vis** - TensorFlow.js 可视化工具

### 计算机视觉（OpenCV.js）
- OpenCV（Open Computer Vision，开放计算机视觉库）是工业与学术研究领域使用最广泛的开源计算机视觉库，也是计算机视觉领域最受欢迎的库之一。
- [**OpenCV.js官网API介绍**](https://docs.opencv.org/4.10.0/d5/d10/tutorial_js_root.html)
- 在调用方面，OpenCV官方提供的OpenCV.js不支持模块化调用，这在应用开发及发布方面是较为低效的。因此，我们选用了NPM平台支持MJS的OpenCV.js发行版：[@techstark/opencv-js](https://www.npmjs.com/package/@techstark/opencv-js)。

### 数据处理
- **SheetJS** - Excel 表格处理库

---

## 📁 项目结构

```
phys-chem/
├── components/              # Vue 组件
│   ├── chemometrics/       # 化学计量学组件
│   ├── experiment/         # 实验组件
│   └── myComponents/       # 自定义通用组件
├── utils/                  # 工具函数
│   ├── tfjs/              # TensorFlow.js 相关工具
│   ├── deeplearning-*.js  # 深度学习工具
│   └── myFunc.js          # 全局方法
├── index/                  # 主页面文档
│   ├── about/             # 关于页面
│   ├── chemometrics/      # 化学计量学页面
│   └── experiment/        # 实验页面
├── i18n/                   # 多语言文档
│   └── en/                # 英文版页面
├── public/                 # 静态资源
└── docs/                   # 项目文档
    ├── API.md             # API 文档
    ├── DEVELOPMENT.md     # 开发指南
    ├── FAQ.md             # 常见问题
    └── CHANGELOG.md       # 更新日志
```

### 命名规范
- **文件/文件夹**：主要使用烤肉串命名法（kebab-case），特殊情况使用蛇形命名法（snake_case）
- **变量/函数/方法**：统一使用小驼峰命名法（camelCase）
- **组件**：使用 PascalCase 命名

---


## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤
1. **克隆项目**
   ```bash
   git clone https://gitcode.com/roxszi/phys-chem-dev.git
   cd phys-chem-dev
   ```
2. **安装依赖**
   ```bash
   npm install
   ```
3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问 http://localhost:8080 查看项目
4. **构建生产版本**
   ```bash
   # 构建根目录版本
   npm run build:root

   # 构建子页面版本
   npm run build:subpage

   # 构建所有版本
   npm run build
   ```

### 项目脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 8080） |
| `npm run build:root` | 构建根目录版本 |
| `npm run build:subpage` | 构建子页面版本 |
| `npm run build` | 构建所有版本 |

---

## 📚 文档导航

- [API 文档](./docs/API.md) - 工具函数和组件 API 说明
- [开发指南](./docs/DEVELOPMENT.md) - 项目开发规范和贡献指南
- [常见问题](./docs/FAQ.md) - 使用过程中的常见问题解答
- [更新日志](./docs/CHANGELOG.md) - 版本更新历史

---

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果您想为项目做出贡献，请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 代码风格遵循 [ESLint](https://eslint.org/) 规则
- 使用 JSDoc 风格注释
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

---

## 📄 许可证

本项目采用 [木兰宽松许可证, 第2版](https://license.coscl.org.cn/MulanPSL2) 开源。

版权所有 © [司承运](https://github.com/roxszi) @ 中国药科大学

---

## 🙏 致谢

感谢以下开源项目：

- [VitePress](https://vitepress.dev/) - 静态站点生成框架
- [TDesign](https://tdesign.tencent.com/) - UI 组件库
- [TensorFlow.js](https://tensorflow.google.cn/js) - 深度学习框架
- [OpenCV.js](https://opencv.org/) - 计算机视觉库
- [Vue.js](https://cn.vuejs.org/) - JavaScript 框架
- [VueUse](https://vueuse.org/) - Vue 工具集
- [SheetJS](https://docs.sheetjs.com/) - Excel 处理库

完整的第三方库列表和许可证信息请参见 [LICENSES](./public/LICENSES/) 目录。

---

## 📮 联系方式

如有任何问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/roxszi/phys-chem-dev/issues)
- 发送邮件至项目维护者

---

## 📊 项目统计

![GitHub stars](https://img.shields.io/github/stars/roxszi/phys-chem-dev?style=social)
![GitHub forks](https://img.shields.io/github/forks/roxszi/phys-chem-dev?style=social)
![GitHub license](https://img.shields.io/github/license/roxszi/phys-chem-dev)
![npm](https://img.shields.io/npm/v/phys-chem-helper)

---

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**
