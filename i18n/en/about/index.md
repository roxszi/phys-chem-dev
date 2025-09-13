# About

[[toc]]

## Introduction

This online software (WebApp) focuses on the physical chemistry education and teaching at China Pharmaceutical University. It aims to address various demands in the process of physical chemistry theory and experiment education and teaching by leveraging various digital technologies (such as statistical machine learning methods, computer vision methods, and various neural network deep learning methods).

The ongoing work stacks are:

1. Tool software for "Determination of Surface Tension Isotherms (Contact Angle Method)".

If you have any questions, please feel free to contact us at any time!

## Technology Stack

With the [VitePress](https://vitepress.dev/zh/) framework, combining [TDesign (@Vue3)](https://tdesign.tencent.com) to build online software (WebApp).

Extremely safe. After opening the business page, you can operate it offline immediately. All content runs on the user's computer or mobile phone, and no data is sent to any server at all. There is absolutely no backend or backdoor.

In terms of computer vision, the [OpenCV.js](https://opencv.ac.cn/) technology stack was mainly adopted. OpenCV (Open Computer Vision, Open Computer Vision Library) is the most widely used open-source computer vision library in both industrial and academic research fields, and it is also one of the most popular libraries in the field of computer vision.

Deep learning business, choose the [Keras (@TensorFlow.js)](https://tensorflow.google.cn/js?hl=zh-cn) technology stack. Using TensorFlow.js native to Keras [API](https://js.tensorflow.org/api/latest/?hl=zh-cn), the convenient and universal model layer structures, And enable WebGPU hardware acceleration with the TensorFlow.js runtime layer to completely eliminate complex deployment issues and the reliance on CUDA hardware.

Machine learning business, mainly use the stack [ml.js](https://github.com/mljs/ml) technology, based on implementation of machine learning.

Data table processing and download, choose the stack [SheetJS](https://docs.sheetjs.com/) technology, in order to realize the convenient and universal form processing and the data download function.

For detailed information, please refer to the links of each business.

Everything is aimed at learning. Warmly welcome bug feedback and all kinds of technical/knowledge exchanges!

## Open Source Code

The application source code links to: [https://atomgit.com/cpuer/phys-chem-admin](https://atomgit.com/cpuer/phys-chem-admin)

The copyright of this application belongs to SI_Cheng-Yun @ China Pharmaceutical University. The source code and documentation of this online software (WebApp) follow the [MulanPSL-2.0](https://license.coscl.org.cn/MulanPSL2).

The third-party open-source libraries relied upon by this application are as follows (in no particular order):

- [**VitePress**](https://vitepress.dev/)

  The page framework of this application. A static site generator driven by [Vite](https://cn.vitejs.dev/) and [Vue](https://cn.vuejs.org/).

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
