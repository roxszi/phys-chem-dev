# 物化助手 (Physical Chemistry Learning Helper)

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNIDEyIDRMNCAxMkwxMiA0IiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/roxszi/phys-chem-dev)

## **简体中文** | [**English**](./README.en.md)

> 📦 项目源码：[AtomGit（国内访问）](https://atomgit.com/roxszi/phys-chem-dev) · [GitHub（国外访问）](https://github.com/roxszi/phys-chem-dev)
>
> 🌐 项目站（国内访问）：[https://phys-chem.top](https://phys-chem.top)
>
> 🌐 项目站（国外访问）：[https://roxszi.github.io/phys-chem/en/](https://roxszi.github.io/phys-chem/en/)

---

## 📖 项目简介

**物化助手**（Physical Chemistry Learning Helper）是一个面向**物理化学理论与实验教学**的 WebApp 工具集，基于 [VitePress](https://vitepress.dev/zh/) 构建。它通过**统计机器学习、计算机视觉、深度学习**等数字化手段，把"实验数据采集"和"实验数据处理"两个阶段合二为一——学生可以在实验进行中**当场评估**数据质量、识别离群点、补测有效数据，把"问题发现时机"从"课后写报告时"前移到"实验课堂上"。

### ✨ 主要特点

- 🔒 **隐私优先**：所有计算（拟合 / CV / ML）均在用户浏览器/手机端本地完成，**不向任何服务器上传数据**，无后端依赖、无后门
- ⚡ **硬件加速**：基于 TensorFlow.js WebGPU/WebGL 后端、OpenCV.js WASM SIMD 多线程构建，CPU/GPU/集显/手机端 NPU 都能跑
- 📱 **跨平台**：桌面浏览器与移动浏览器开箱即用，无须安装 App
- 🎨 **现代化 UI**：基于 [TDesign vue-next](https://tdesign.tencent.com/vue-next/overview) 组件库 + 自封装基础组件
- 🌍 **中英双语**：内置 i18n，中文站与英文站独立部署
- 📦 **零服务器部署**：SSG 静态站点，构建产物直接放到 Pages 服务即可

### 🎯 核心功能

| 功能模块 | 描述 | 状态 |
|---------|------|------|
| 蔗糖水解皂化反应助手 | 一级反应动力学的实时拟合（αₜ ~ t），离群点增删 | ✅ 已完成 |
| 接触角测量助手（垂直校准） | 利用手机重力/方向传感器校准设备垂直度 | ✅ 已完成 |
| 接触角测量助手（液滴照片处理） | OpenCV.js 边缘检测 + 椭圆拟合 + 自研迭代过滤算法 + 基线/中心/两边遮罩 | ✅ 已完成 |
| 接触角测量助手（多图批量处理） | `ContactAngleMulti` 批处理多张液滴照片 | ✅ 已完成 |
| 轮廓处理比色法 | 计算机视觉动力学比色实验：识别样品轮廓、计算面积与中心、导出 R/G/B 均值与标准差 | ✅ 已完成 |
| Andor 拉曼光谱数据处理 | `.sif` → `.asc` → `.xlsx` 一键批处理流水线 | ✅ 已完成 |
| 非线性拟合算法库 | LM、ODR、加权线性最小二乘；接口可扩展 | ✅ 已完成 |
| 物化公式模型 | 一级反应动力学等公式的 schema 化封装 + 一键拟合 | ✅ 已完成 |
| Hono 后端骨架 | 服务端 Hono 工程化占位（待扩展业务） | 🚧 占位 |
| 机器学习小工具 | S-G 插值平滑等 Origin 没有的功能 | 📝 占位 |
| 深度学习 Demo | 基于 tfjs 的演示 Demo | 📝 占位 |

---

## 🛠️ 技术栈

### 前端框架

| 类别 | 选型 |
|---|---|
| 静态站点生成 | [VitePress 2.0 (alpha)](https://vitepress.dev/zh/) — `2.0.0-alpha.19`，SSG + Vue 运行时双层衔接 |
| 视图框架 | [Vue 3.5+](https://cn.vuejs.org/) — `<script setup>` + Composition API |
| UI 组件库 | [TDesign vue-next](https://tdesign.tencent.com/vue-next/overview) — 按需自动引入 |
| 自封装基础组件 | `frontend/components/My*.vue` — `MyBadge` / `MyButton` / `MyDrawer` / `MyFeatures` / `MyNoticeBar` / `MyPicHead` / `MyRadio` / `MySlider` / `MySymbolLineChart` / `MyTable` / `MyTeamMembers` / `MyUpload` |
| 工具集 | [VueUse](https://vueuse.org/) + 自封装 `frontend/utils/myPlugin.ts`（`myLoading` / `myDialog` / `myMessage` / `myError` / `myWait`） |
| 自动引入 | [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import) + [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components) |
| 路径解析 | [vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths) — 复用 `tsconfig.paths` |

### 计算引擎（浏览器内本地推理）

| 类别 | 选型 | 用途 |
|---|---|---|
| 深度学习 | [TensorFlow.js 4.22](https://tensorflow.google.cn/js) + `tfjs-backend-webgpu` + `tfjs-backend-webgl` + `tfjs-backend-cpu` | 三 backend 按 `webgpu > webgl > cpu` 优先级加载；模块级 singleton |
| 计算机视觉 | [OpenCV.js 5.0 (`@techstark/opencv-js`)](https://docs.opencv.org/5.0/js_tutorials/js_tutorials.html) | WASM 多变体构建（`fallback` / `simd` / `simd.pthreads`），自动 fallback |
| 数学公式 | [markdown-it-mathjax3](https://github.com/oclero/markdown-it-mathjax3) | VitePress 内嵌公式 |
| 图表 | [ECharts 6](https://echarts.apache.org/) + [vue-echarts 8](https://github.com/echarts/vue-echarts) | 数据可视化 |
| 表格 | [SheetJS xlsx](https://docs.sheetjs.com/) | `.xlsx` 导出 |

### 前后端共享的纯 TS 库（核心新增）

`shared/` 目录是**跨端共用的纯 TypeScript 数值/算法库**，前端 Vue 与后端 Node 都可直接引用：

| Tier | 目录 | 职责 |
|---|---|---|
| **Tier 0** | `shared/matrix/` | 纯线性代数（`Matrix` 类型、`inverse`、`LinearSolver`、`covariance`），零依赖 |
| **Tier 0** | `shared/math/` | 通用数值统计（`mean` / `rSquared` / `rmse` / `sigma²` / `finite-difference`） |
| **Tier 1** | `shared/fitting/` | 拟合算法 + 共享基础设施（`JacobianProvider` / `ConvergenceCheck` / `DampingStrategy` / `LinearSolver` 均为可替换接口） |
| └ | `fitting/algorithms/linear/` | 加权线性最小二乘（闭式解） |
| └ | `fitting/algorithms/lm/` | Levenberg-Marquardt 非线性最小二乘 |
| └ | `fitting/algorithms/odr/` | 正交距离回归（x、y 都有误差；σx → 0 自动退化为 LM） |
| **Tier 2** | `shared/equation/` | 物化公式模型 schema + `defineEquationModel` 工厂 + 一键拟合 `fitEquation` |
| └ | `equation/sucrose-hydrolysis.ts` | 蔗糖水解一级反应动力学模型（含 `α₀`/`α∞`/`k` 三参数初始化启发式） |
| **Tier 3** | `shared/tfjs/` | tfjs 集成占位（后端加载 + tfjs 雅可比接口） |

**依赖方向**（单向）：`matrix/ → math/ → fitting/ → equation/ → tfjs/`。详见 [`shared/README.md`](./shared/README.md)。

### 后端

| 类别 | 选型 |
|---|---|
| Web 框架 | [Hono 4](https://hono.dev/) |
| 运行时 | [Node.js 24+](https://nodejs.org/) + [`@hono/node-server`](https://github.com/honojs/node-server) |
| 数据库 | 未引入（当前仅有 `Hello Hono!` 路由占位，后续按业务再选型） |

---

## 📁 项目结构

```
phys-chem/
├── frontend/                          # 前端（VitePress 2.0 + Vue 3.5）
│   ├── .vitepress/                    # VitePress 配置
│   │   ├── theme/                     # VitePress 主题样式（bridge.css / tdesign-theme.css）
│   │   ├── layouts/                   # 自定义 BaseLayout
│   │   └── config.ts                  # VitePress 工程化配置
│   ├── components/                    # 自封装基础组件（MyBadge / MyButton / MyTable ...）
│   ├── composables/                   # Vue3 组合式函数
│   │   ├── useLang.ts                 # i18n 切换
│   │   ├── useTFjs.ts                 # tfjs 后端加载（webgpu > webgl > cpu，状态机）
│   │   └── useOpenCV.ts               # OpenCV WASM 多变体加载 + 自动 fallback
│   ├── index/                         # 站点页面（Markdown + Vue Components）
│   │   ├── about/                     # 关于
│   │   ├── chemometrics/              # 化学计量学
│   │   │   └── andor-raman/           # Andor 拉曼 .sif → .xlsx
│   │   ├── experiment/                # 物化实验
│   │   │   ├── sucrose-hydrolysis/    # 蔗糖水解一级反应动力学
│   │   │   ├── contact-angle/         # 接触角（含 ContactAngle + ContactAngleMulti）
│   │   │   └── outline-colorimetric/  # 轮廓处理比色法
│   │   ├── i18n/en/                   # 英文站页面
│   │   ├── test/                      # 内部测试页
│   │   └── index.md                   # 首页
│   ├── project-info/                  # 解耦出的项目元数据（footer/nav/sidebar/social/i18n）
│   ├── public/
│   │   ├── LICENSES/                  # 第三方库许可证全文
│   │   └── assets/                    # 静态资源（含 Andor `.pgm` 脚本）
│   └── utils/
│       ├── myPlugin.ts                # 自封装 TDesign 插件（Loading/Dialog/Message）
│       ├── xlsx.ts                    # SheetJS 封装
│       ├── file.ts                    # File 工具
│       └── opencv/                    # OpenCV 构建（min/all × fallback/simd/simd.pthreads）
│
├── backend/                           # 后端（Hono）
│   └── index.ts                       # 占位：Hello Hono! 路由（端口 3000）
│
├── shared/                            # 跨端共用纯 TS 库（详见上一节"技术栈"）
│   ├── matrix/                        # Tier 0：纯线性代数
│   ├── math/                          # Tier 0：通用数值统计
│   ├── fitting/                       # Tier 1：拟合算法（linear/lm/odr）
│   ├── equation/                      # Tier 2：物化公式模型（含蔗糖水解）
│   ├── tfjs/                          # Tier 3：tfjs 集成（占位）
│   ├── format.ts                      # 格式化工具
│   ├── constants.ts                   # 共享常量
│   ├── distFrontendGzip.ts            # 构建产物 .gz 增量压缩脚本
│   └── README.md                      # shared/ 详细文档
│
├── .npmrc                             # pnpm / npm 配置（含 better-sqlite3 镜像等）
├── .gitignore                         # 不参与git版本控制的文件目录
├── pnpm-workspace.yaml                # pnpm 工作区配置（含 `allowBuilds`）
├── tsconfig.json                      # 根 tsconfig
├── tsconfig.base.json                 # 共享编译选项
├── tsconfig.frontend.json             # 前端运行时 tsconfig
├── tsconfig.backend.json              # 后端运行时 tsconfig
├── globals.d.ts                       # 全局数据类型声明
├── package.json                       # 根 package.json（脚本、依赖）
├── pnpm-lock.yaml                     # pnpm 依赖锁
└── license                            # MulanPSL-2.0 许可证全文
```

### 命名规范

| 类别 | 命名约定 |
|---|---|
| 文件 / 文件夹 | kebab-case 为主，特殊场景（如 `MyXxx.vue`）用 PascalCase |
| 变量 / 函数 / 方法 | camelCase |
| 组件 | PascalCase（`MyButton.vue`） |
| 类型 | PascalCase 不加前缀 |
| 常量 | UPPER_SNAKE_CASE |

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 24.0.0（package.json `engines.node`）
- **pnpm** ≥ 11.0.0（package.json `engines.pnpm`，实测 11.7+）

### 安装

```bash
# 克隆仓库
git clone https://atomgit.com/roxszi/phys-chem-dev.git
# 进入仓库目录
cd phys-chem-dev
# 安装依赖
pnpm install
```

### 开发

```bash
# 启动前端 VitePress dev server（默认端口 5173，可通过 vitepress dev --port <n> 调整）
pnpm dev

# 启动后端 Hono dev server（端口 3000）
pnpm dev:backend
```

### 构建

```bash
# === 前端构建 ===
# 构建中文站（root 版，部署到一级域名，如 https://phys-chem.top/）
pnpm build:frontend:root

# 构建英文站（subpage 版，部署到 Pages 子路径，如 https://roxszi.github.io/phys-chem/）
pnpm build:frontend:subpage

# 同时构建 root + subpage 两个版本
pnpm build

# 构建后再对 dist-frontend-* 产物做增量 .gz 压缩（生产部署建议开启）
pnpm build:frontend:gzip

# === 后端构建 ===
pnpm build:backend          # tsc → dist/
pnpm start:backend          # node dist/index.js
```

### 项目脚本速查

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 启动 VitePress dev server |
| `pnpm dev:backend` | 启动 Hono dev server（`tsx watch`） |
| `pnpm build` | 构建前端 root + subpage 两个版本 |
| `pnpm build:frontend` | 同上 |
| `pnpm build:frontend:root` | 仅构建中文 root 版（输出 `dist-frontend-root/`） |
| `pnpm build:frontend:subpage` | 仅构建英文 subpage 版（输出 `dist-frontend-subpage/`） |
| `pnpm build:frontend:gzip` | 对 root + subpage 产物做增量 `.gz` 压缩 |
| `pnpm build:frontend:gzip:root` | 仅压缩 root 版 |
| `pnpm build:frontend:gzip:subpage` | 仅压缩 subpage 版 |
| `pnpm preview:frontend` | VitePress preview（预览构建产物） |
| `pnpm build:backend` | 后端 tsc 编译到 `dist/` |
| `pnpm start:backend` | 启动编译后的后端 |

> 💡 产物压缩说明：构建产物 `.js` / `.css` / `.wasm` / `.html` 在 `shared/distFrontendGzip.ts` 脚本里以 `level 9` 增量压缩成 `.gz`（已有且比源文件新的 `.gz` 会被跳过），供 Nginx `gzip_static` 直接命中。

---

## 📚 文档导航

- [`shared/README.md`](./shared/README.md) — 跨端共用拟合库详细文档（三层依赖关系、可替换接口、算法矩阵）
- [`shared/fitting/algorithms/odr/README.md`](./shared/fitting/algorithms/odr/README.md) — ODR 算法详解（含数学推导与退化性质）
- [`shared/fitting/algorithms/linear/README.md`](./shared/fitting/algorithms/linear/README.md) — 加权线性最小二乘（含 n=2 时 stdErr 为 NaN 的教学说明）
- [`frontend/components/`](./frontend/components) — 自封装基础组件
- [`frontend/composables/`](./frontend/composables) — `useTFjs` / `useOpenCV` 浏览器计算引擎加载逻辑

---

## 📄 许可证

本项目采用 [木兰宽松许可证，第 2 版 (MulanPSL-2.0)](https://license.coscl.org.cn/MulanPSL2) 开源。

版权所有 © [司承运 (SI Cheng-Yun)](https://github.com/roxszi) @ 中国药科大学 理学院 化学实验中心

---

## 🙏 致谢

感谢以下开源项目（完整许可证信息见 [`frontend/public/LICENSES/`](./frontend/public/LICENSES/)）：

| 项目 | 用途 |
|---|---|
| [VitePress](https://vitepress.dev/) | 静态站点生成 |
| [Vue.js](https://cn.vuejs.org/) | 视图框架 |
| [TDesign](https://tdesign.tencent.com/) | UI 组件库 |
| [VueUse](https://vueuse.org/) | Vue 组合式工具集 |
| [TensorFlow.js](https://tensorflow.google.cn/js) | 浏览器端深度学习 |
| [OpenCV.js](https://opencv.org/) | 浏览器端计算机视觉 |
| [ECharts](https://echarts.apache.org/) + [vue-echarts](https://github.com/echarts/vue-echarts) | 图表可视化 |
| [markdown-it-mathjax3](https://github.com/oclero/markdown-it-mathjax3) | Markdown 数学公式 |
| [SheetJS](https://docs.sheetjs.com/) | `.xlsx` 表格处理 |
| [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import) + [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components) | Vite 插件 |
| [vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths) | 路径解析 |
| [Hono](https://hono.dev/) + [`@hono/node-server`](https://github.com/honojs/node-server) | 后端框架（占位业务） |

---

## 📮 联系方式

- 提交 [Issue](https://atomgit.com/roxszi/phys-chem-dev/issues)
- 邮件：[sichengyun@163.com](mailto:sichengyun@163.com)

---

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**
