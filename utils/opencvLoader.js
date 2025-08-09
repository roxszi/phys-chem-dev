"use strict"

/**
 * OpenCV.js 加载器
 * opencv.js文件放在 `/public/opencv.js` 路径下
 * opencv.js不支持模块化导入，所以需要动态加载
 * OpenCV.js会默认加载进window.cv全局对象
 */

// 导入运行时方法，用于动态创建<script>标签的url
import { withBase } from "vitepress"

// OpenCV加载状态对象，用于确保模块不卸载的话只加载一次就够
let opencvPromise = null

/**
 * 加载OpenCV的Promise方法
 * @returns { Promise<import("@techstark/opencv-js")> }
 * @note 本质上是将OpenCV.js加载进window.cv，并将window.cv作为返回值
 * @note 而window.cv是个Promise对象，因此返回值需用then()方法异步等待
 */
export function loadOpenCV() {
  // 如果已经存在opencvPromise对象，即模块被调用过一次了，则直接返回结果
  if (opencvPromise) { return opencvPromise }
  // 封装一个Promise对象，用于加载OpenCV.js，并赋值给opencvPromise
  opencvPromise = new Promise((resolve) => {
    // 如果OpenCV.js已开始加载，即获得了全局cv对象，则直接返回
    if (window.cv && (typeof window.cv !== "undefined")) {
      // 直接返回cv即可
      resolve(window.cv)
    // 如果OpenCV.js未开始加载，则动态创建<script>标签加载OpenCV.js
    } else {
      // 动态创建<script>标签
      const script = document.createElement("script")
      // 设置属性：异步加载
      script.async = true
      // 设置属性：javascript文本文件
      script.type = "text/javascript"
      // 设置属性：OpenCV.js的URL
      script.src = withBase("/opencv.js")
      // 设置属性：OpenCV.js加载完成的回调
      script.onload = (event) => {
        // 返回cv
        resolve(window.cv)
      }
      // 将<script>标签添加到<head>标签中
      document.head.appendChild(script)
    }
  })
  // 返回Promise对象
  return opencvPromise
}
