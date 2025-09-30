# Physical Chemistry Learning Helper @ CPU

## [**简体中文**](./README.md) | **English**

> Project source code: [https://github.com/roxszi/phys-chem-admin](https://github.com/roxszi/phys-chem-admin)
> 
> Project source code (specifically for Chinese mainland): [https://atomgit.com/cpuer/phys-chem-admin](https://atomgit.com/cpuer/phys-chem-admin)
>
> **Project showcase page:** [**https://roxszi.github.io/phys-chem/en/**](https://roxszi.github.io/phys-chem/en/)
>
> Project showcase page (specifically for Chinese mainland): [https://cpuer.atomgit.net/phys-chem/](https://cpuer.atomgit.net/phys-chem/)

A physical chemistry learning tool project built with [VitePress](https://vitepress.dev/zh/), incorporating the [TDsign](https://tdesign.tencent.com/vue-next/overview) component library and [VueUse](https://vueuse.nodejs.cn/) utility set to achieve richer interactive effects. Aimed at learning.

## 1. Technology Stack Selection

### 1.1 VitePress Development and Packaging

- VitePress is an SSG (Static Site Generator) framework based on Vite and Markdown, and supports the Vue ecosystem.

- VitePress official documentation: [https://vitepress.dev/](https://vitepress.dev/)

### 1.2 Deep Learning Library: Frontend Development/Build with TensorFlowJS

- For future educational / research-oriented products (such as WebApps), the original intention of this project was to allow students to directly apply and train models using their mobile phones or web browsers (with WebGPU/WebGL hardware acceleration). The reasons for this design are threefold:

  1. It can leverage the computing power of each student's device to complete teaching and simple research tasks.

  1. It can break through the limitations of Nvidia GPUs/CUDA platforms. Core graphics cards, integrated graphics cards, or even mobile phones can achieve hardware-accelerated computation as long as they support WebGPU/WebGL.

  2. It can be deployed for free via the [Pages service](https://docs.github.com/en/pages), and with Vite, the process is very convenient. There is no need for application distribution (copying to students or requiring them to download) or installation guidance (writing tutorials or teaching students how to install, deploy, or configure), which greatly reduces the workload.

- Based on the above considerations, to further reduce the various additional workloads between development and productization and focus as much as possible on the business, this project naturally chose the [**TensorFlowJS**](https://github.com/tensorflow/tfjs) technology stack. Most of its development and building are frontend-based, and minor data preprocessing and code debugging can also be easily completed with NodeJS on the backend without involving cross-language issues, which significantly reduces the project development workload.

- The drawback of pure web development with TensorFlowJS is the lack of code comments, which is compensated by Vite. The Node development environment under Vite can directly install and call the TensorFlowJS library to obtain official code comments during project development; it can also use dev(/serve) to run/render code in the browser and directly call WebGPU/WebGL for hardware acceleration. This ensures both development and runtime efficiency.

### 1.3 Computer Vision Library: OpenCV.js

- OpenCV (Open Computer Vision) is the most widely used open-source computer vision library in both industry and academic research, and one of the most popular libraries in the field of computer vision.

- [**OpenCV.js Official API Introduction**](https://docs.opencv.org/4.10.0/d5/d10/tutorial_js_root.html)

- In terms of invocation, the OpenCV.js provided by the official does not support modular invocation, which is relatively inefficient in application development and deployment. Therefore, we chose the OpenCV.js version on NPM that supports MJS: [@techstark/opencv-js](https://www.npmjs.com/package/@techstark/opencv-js).

### 1.4 Machine Learning Library: ml.js

- For machine learning tasks, the ml.js library was primarily selected, and basic machine learning tasks have already been implemented.

- [**ml.js Git Link**](https://github.com/mljs/ml)

## 2. Project Structure

### 2.1 Project File Directory

- This project is built and generated with VitePress and has been deeply customized. The current project structure is as follows:

      Root Directory
        ├─ node_modules Node package folder
        │   └─ ... Various Node packages
        ├─ backup Backup folder
        │   └─ xxx.xx Some backup files, not involved in VitePress packaging
        ├─ components Various component files
        │   ├─ myComponents My custom components
        │   │   └─ MyXxx.vue Various custom component files
        │   └─ xxx.vue Various business components
        ├─ index Main page markdown file tree
        │   ├─ index.md Entry file
        │   └─ xxx.md Markdown files organized in a web directory structure
        ├─ i18n Multilingual version of the page markdown file tree
        │   ├─ en English version of the page
        │   │   ├─ index.md Entry file
        │   │   └─ xxx.md Markdown files organized in a web directory structure
        │   └─ xx Multilingual version of the page
        ├─ dist Deployment directory
        ├─ public Public folder
        │   ├─ favicon.ico Web icon file
        │   ├─ robots.txt Robots protocol file
        │   └─ ... Various public files
        ├─ utils Various utility function/method folders
        │   ├─ opencvLoader.js OpenCV library loader
        │   ├─ myFunc.js Global methods of this project
        │   └─ xxx.js Various utility functions/methods
        ├─ .gitignore Git ignore list, content not synchronized during Git synchronization
        ├─ auto-imports.d.ts Automatically imported type annotation file (auto-generated)
        ├─ components.d.ts Automatically imported component type annotation file (auto-generated)
        ├─ LICENSE License file
        ├─ jsconfig.json JavaScript project configuration file
        ├─ package.json Project dependency list file
        └─ package-lock.json Project dependency tree file

### 2.2 Naming Convention and Symbol Connection Rules

- **Files**, **Folders**, etc.:

  Mainly use kebab-case, combined with snake\_case when necessary. Specifically:

  For phrases with complete and independent meanings, kebab-case is used between words.

  For terms or phrases with clearly different semantic categories, snake\_case is used.

  Kebab-case is the default, and snake_case is used in special\_cases.

- **Variables**, **Objects**, **Functions**, **Methods**, etc.:

  All use camelCase uniformly.

## 3. Quick Start

### 3.1 Fork This Project

Fork this project directly.

### 3.2 Create a New VitePress Project

- npm initialization

  ```shell
  npm init
  ```

- Install VitePress dependencies

  ```shell
  npm i -D vitepress
  ```

- Initialize VitePress project

  ```shell
  npx vitepress init
  ```

- Start development server

  ```shell
  npm run docs:dev
  ```

- Build static files

  ```shell
  npm run docs:build
  ```

## 4. Some Backups

- [VitePress Native Styles](https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/styles/vars.css)

## Copyright & License

The application source code links to: [https://github.com/roxszi/phys-chem-admin](https://github.com/roxszi/phys-chem-admin)

The copyright of this application belongs to SI_Cheng-Yun @ China Pharmaceutical University. The source code and documentation of this online software (WebApp) follow the [MulanPSL-2.0](https://license.coscl.org.cn/MulanPSL2).

The third-party open-source libraries relied upon by this application are as follows (in no particular order):

- [**VitePress**](https://vitepress.dev/)

  The page framework of this application. A static site generator driven by [Vite](https://vite.dev/) and [Vue](https://vuejs.org/).

  Follow the [MIT](/LICENSES/vitepress.txt) open source license.

- [**TDesign**](https://tdesign.tencent.com/)

  The component library is a UI design system launched by the Tencent business team. This application uses the specific [vue-next](https://tdesign.tencent.com/vue-next/overview) component library.

  Follow the [MIT](/LICENSES/vitepress.txt) open source license.

- [**OpenCV.js**](https://docs.opencv.org/4.12.0/d5/d10/tutorial_js_root.html)

  Computer vision library.

  Follow the [Apache-2.0](/LICENSES/opencv.txt) open source license.

- [**SheetJS**](https://docs.sheetjs.com/)

  Excel table library.

  Follow the [Apache-2.0](/LICENSES/opencv.txt) open source license.

- [**Vue.js**](https://cn.vuejs.org/)

  A runtime framework for JavaScript application development.

  Follow the [MIT](/LICENSES/vitepress.txt) open source license.

- [**VueUse**](https://vueuse.org/)

  A composite toolset suitable for Vue project development.

  Follow the [MIT](/LICENSES/vitepress.txt) open source license.

- [**unplugin-auto-import**](https://www.npmjs.com/package/unplugin-auto-import)

  Driven by [unplugin](https://unplugin.unjs.io/), which can realize automatic import component of the plug-in.

  Follow the [MIT](/LICENSES/vitepress.txt) open source license.

- [**unplugin-vue-components**](https://www.npmjs.com/package/unplugin-vue-components)

  A plugin that can automatically register the imported Vue components.

  Follow the [MIT](/LICENSES/vitepress.txt) open source license.
