# CPU物化助手

## **简体中文** | [**English**](./README.en.md)

> 项目源码：[https://gitcode.com/roxszi/phys-chem-dev](https://gitcode.com/roxszi/phys-chem-dev)
>
> 项目源码（国外访问）：[https://github.com/roxszi/phys-chem-dev](https://github.com/roxszi/phys-chem-dev)
> 
> **项目展示页面：**[**https://cpuer.atomgit.net/phys-chem**](https://cpuer.atomgit.net/phys-chem)
>
> 项目展示页面（国外访问）：[https://roxszi.github.io/phys-chem/en/](https://roxszi.github.io/phys-chem/en/)

以[VitePress](https://vitepress.dev/zh/)构建的物理化学学习工具项目，引入了[TDsign](https://tdesign.tencent.com/vue-next/overview)组件库与[VueUse](https://vueuse.nodejs.cn/)工具集以实现更为丰富的交互效果。旨在学习。

## 1. 技术栈选型说明

### 1.1 VitePress开发及打包

- VitePress是一个立足Vite、Markdown的SSG（静态站点生成）框架，并支持Vue生态。

- VitePress官方文档：[https://vitepress.dev/zh/](https://vitepress.dev/zh/)

### 1.2 深度学习库：TensorFlowJS的前端开发/构建

- 后续面向教学/科研的产品(WebApp等服务)，本项目最初的打算就是直接让学生用手机/电脑浏览器实现模型的应用及训练(WebGPU/WebGL硬件加速)。这样设计的原因有3：

  1. 可借助学生每个人手上的算力资源，完成教学及简单的科研任务。

  2. 可突破Nvidia显卡/CUDA平台的限制，核心显卡/集成显卡甚至手机，只要支持WebGPU/WebGL即可实现硬件加速运算。

  3. 可免费通过[AtomGit平台的Pages服务](https://docs.atomgit.com/app/pages/)实现部署，配合Vite，操作极为方便。且无需应用分发(拷贝给学生或要求学生下载)或安装部署指导(写教程或教学生如何安装/部署/设置等)，极大降低海量的工作量。

- 在上述考虑的基础上，为进一步降低开发和产品化间的各种额外工作量，尽可能专注于业务，本项目就毫无悬念的选用了[**TensorFlowJS**](https://tensorflow.google.cn/js)这一技术栈，其开发及构建几乎都基于前端，少数的数据预处理、代码调试工作也可借助NodeJS在后端简单完成而不涉及跨语言的问题，这极大降低了项目开发的工作量。

- TensorFlowJS纯网页开发的缺点是缺乏代码注释，而Vite则弥补了这一问题。Vite下的Node开发环境，其能直接安装调用TensorFlowJS库，以获得项目开发时的官方代码注释；也能借助dev(/serve)在浏览器端运行/渲染代码，直接调用WebGPU/WebGL实现硬件加速。这样开发效率、运行效率都得到了保障。

### 1.3 计算机视觉库：OpenCV.js

- OpenCV（Open Computer Vision，开放计算机视觉库）是工业与学术研究领域使用最广泛的开源计算机视觉库，也是计算机视觉领域最受欢迎的库之一。

- [**OpenCV.js官网API介绍**](https://docs.opencv.org/4.10.0/d5/d10/tutorial_js_root.html)

- 在调用方面，OpenCV官方提供的OpenCV.js不支持模块化调用，这在应用开发及发布方面是较为低效的。因此，我们选用了NPM平台支持MJS的OpenCV.js发行版：[@techstark/opencv-js](https://www.npmjs.com/package/@techstark/opencv-js)。

### 1.4 机器学习库：ml.js

- 机器学习业务方面，主要选用了ml.js库，已实现基础的机器学习业务。

- [**ml.js的Git链接**](https://github.com/mljs/ml)

## 2. 项目框架

### 2.1 项目文件目录

- 本项目以VitePress构建生成，并进行了深入定制，目前项目框架为：

      根目录
        ├─ node_modules Node包文件夹
        │   └─ ... 各类Node包
        ├─ backup 备份文件夹
        │   └─ xxx.xx 一些备份文件，不涉及VitePress打包
        ├─ components 各类组件文件
        │   ├─ myComponents 我自己封装的组件
        │   │   └─ MyXxx.vue 各类自己封装的组件文件
        │   └─ xxx.vue 各类业务组件
        ├─ index 主页面markdown文件树
        │   ├─ index.md 入口文件
        │   └─ xxx.md 以网页目录结构组织的markdown文件
        ├─ i18n 多语言版本的页面markdown文件树
        │   ├─ en 英文版页面
        │   │   ├─ index.md 入口文件
        │   │   └─ xxx.md 以网页目录结构组织的markdown文件
        │   └─ xx 多语言版本的页面
        ├─ dist 发布目录
        ├─ public 公共/公开文件夹
        │   ├─ favicon.ico 网页标志，图标文件
        │   ├─ robots.txt robots协议文件
        │   └─ ... 各类公开文件
        ├─ utils 各类工具函数/方法文件夹
        │   ├─ opencvLoader.js OpenCV库的加载器
        │   ├─ myFunc.js 本项目的全局方法
        │   └─ xxx.js 各类工具函数/方法
        ├─ .gitignore Git忽略列表，Git同步时不同步的内容
        ├─ auto-imports.d.ts 自动导入的类型注释文件（自动生成）
        ├─ components.d.ts 自动导入组件的类型注释文件（自动生成）
        ├─ LICENSE 许可证文件
        ├─ jsconfig.json JavaScript项目的配置文件
        ├─ package.json 项目依赖库的列表文件
        └─ package-lock.json 项目依赖库的依赖关系树文件

### 2.2 连接符号暨命名法规则

- **文件**、**文件夹**等：

  采用以烤肉串命名法kebab-case为主，结合蛇形命名法snake\_case的方法。具体在于：

  通常情况下，具有完整独立涵义的短语，其内部的单词之间用烤肉串命名法kebab-case；

  而表述涵义的类别性质明显不同的词汇或短语的之间，则用蛇形命名法snake\_case。

  一般默认用烤肉串命名法kebab-case，特殊情况用蛇形命名法snake\_case。

- **变量**、**对象**、**函数**、**方法**等：

  统一采用小驼峰命名法camelCase。

## 3. 快速上手

### 3.1 Fork本项目

直接Fork本项目即可。

### 3.2 新建VitePress项目

- npm初始化

  ```shell
  npm init
  ```

- 安装VitePress依赖

  ```shell
  npm i -D vitepress
  ```

- 初始化VitePress项目

  ```shell
  npx vitepress init
  ```

- 启动开发服务器

  ```shell
  npm run docs:dev
  ```

- 构建静态文件

  ```shell
  npm run docs:build
  ```

## 4. 一些备份

- [VitePress原生样式](https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/styles/vars.css)

## 版权&许可证

本应用的版权/著作权归 司承运@中国药科大学 所有。

源码及文档以 [木兰宽松许可证, 第2版](https://license.coscl.org.cn/MulanPSL2) 开源。

本应用依赖的第三方开源库如下（排名不分先后）：

- [**VitePress**](https://vitepress.dev/)

  本应用的页面框架，由 [Vite](https://cn.vitejs.dev/) 和 [Vue](https://cn.vuejs.org/) 驱动的静态站点生成器。

  遵循 [MIT](/LICENSES/vitepress.txt) 开源协议。

- [**TDesign**](https://tdesign.tencent.com/)

  组件库，腾讯业务团队推出的一套UI设计体系。本应用具体使用了其中的 [vue-next](https://tdesign.tencent.com/vue-next/overview) 组件库。

  遵循 [MIT](/LICENSES/tdsign.txt) 开源协议。

- [**OpenCV.js**](https://docs.opencv.org/4.12.0/d5/d10/tutorial_js_root.html)

  计算机视觉库。

  遵循 [Apache-2.0](/LICENSES/opencv.txt) 开源协议。

- [**SheetJS**](https://docs.sheetjs.com/)

  Excel表格库。

  遵循 [Apache-2.0](/LICENSES/sheetjs.txt) 开源协议。

- [**Vue.js**](https://cn.vuejs.org/)

  JavaScript应用开发的运行时框架。

  遵循 [MIT](/LICENSES/vuejs.txt) 开源协议。

- [**VueUse**](https://vueuse.org/)

  适用于Vue项目开发的组合式工具集。

  遵循 [MIT](/LICENSES/vueuse.txt) 开源协议。

- [**unplugin-auto-import**](https://www.npmjs.com/package/unplugin-auto-import)

  由 [unplugin](https://unplugin.unjs.io/) 驱动的可实现自动导入组件的插件。

  遵循 [MIT](/LICENSES/unplugin-auto-import.txt) 开源协议。

- [**unplugin-vue-components**](https://www.npmjs.com/package/unplugin-vue-components)

  可实现自动注册所导入的Vue组件的插件。

  遵循 [MIT](/LICENSES/unplugin-vue-components.txt) 开源协议。
