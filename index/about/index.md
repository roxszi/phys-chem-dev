# 关于

[[toc]]

## 简介

本在线软件（WebApp）以中国药科大学的物理化学教育教学为着眼点，拟借助各类数字化技术（统计机器学习方法、计算机视觉方法、各类神经网络深度学习方法等），旨在解决物理化学理论与实验教育教学过程中的各类需求。

目前正在开展的工作栈有：

1. 《表面张力等温线的测定(接触角法)》的工具软件。

如有任何问题，请随时联系我们！

## 技术栈

以 [VitePress](https://vitepress.dev/zh/) 框架，结合 [TDesign (@Vue3)](https://tdesign.tencent.com) 构建的在线软件 (WebApp) 。

极端安全。业务页面打开之后即可断网操作，一切内容均在用户的电脑/手机端运行，完全不会往任何服务器发送数据，绝无后端/后门。

计算机视觉方面，主要选用了 [OpenCV.js](https://www.npmjs.com/package/@techstark/opencv-js) 技术栈。OpenCV（Open Computer Vision，开放计算机视觉库）是工业与学术研究领域使用最广泛的开源计算机视觉库，也是计算机视觉领域最受欢迎的库之一。

深度学习业务方面，选用了 [Keras (@TensorFlow.js)](https://tensorflow.google.cn/js?hl=zh-cn) 技术栈。借助TensorFlow.js原生对Keras [API](https://js.tensorflow.org/api/latest/?hl=zh-cn) 的实现，完成便捷且通用的模型层搭建，并以TensorFlow.js运行层开启WebGPU硬件加速，彻底杜绝复杂的部署问题及对CUDA硬件的依赖问题。

机器学习业务方面，主要选用了 [ml.js](https://github.com/mljs/ml)技术栈，以实现基础的机器学习业务。

具体介绍详见各业务链接。

一切旨在学习。热烈欢迎bug反馈及各类技术/知识交流！

## 源码

本应用的源码托管在 [AtomGit平台](https://atomgit.com) 上，源码链接为：

[https://atomgit.com/cpuer/phys-chem-admin](https://atomgit.com/cpuer/phys-chem-admin)

## 版权

本在线软件（WebApp）的源码及文档，遵循 [MulanPSL-2.0](https://license.coscl.org.cn/MulanPSL2) 协议。
