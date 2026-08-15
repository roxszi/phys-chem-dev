/**
 * 轮廓-比色法业务 · 语言包
 * ---
 * 词条结构：扁平键 + 每条 `{ root, en }` 中英成对
 * - 键名用语义命名，不复制中文原文（改中文文案不必动键名）
 * - 参数符号 / 单位 / 数字 不进入语言包（如 0、255、50%、0.5）
 * - 内部开发者错误不翻译（throw new Error 类）
 * - 加第三语言（如 ja）：每条词条新增 ja 字段即可，TypeScript 会精确指出哪些未补齐
 *
 * 消费侧：const langRef = useLang(langDict) → 模板 / script 里 langRef.Xxx 即可
 */

export const langDict = {

  // ================================ 功能简介 ================================

  /** 功能简介标题 */
  FunctionIntroductionTitle: {
    root: "操作方法",
    en: "Operation Method",
  },
  /** 功能简介正文（数组：每行一项） */
  FunctionIntroductionContent: {
    root: [
      "1. 读取所拍摄的样品图片。",
      "2. 框选并裁剪图片，保留待测区域。",
      "3. 反复调整参数预览，直至参数合适，然后下载详细数据。",
    ],
    en: [
      "1. Read the sample image taken.",
      "2. Frame and crop the image, keeping the area to be measured.",
      "3. Adjust the parameters repeatedly to preview until the parameters are suitable, and then download the detailed data.",
    ],
  },

  // ================================ 步骤说明 ================================

  /** 步骤标题前缀 */
  StepTitle: {
    root: "步骤",
    en: "Step ",
  },
  /** 步骤1内容 */
  Step1Content: {
    root: [
      "首先点击「点击上传图片」读取图片。",
    ],
    en: [
      "First click on the 'Click to upload image' to read the image.",
    ],
  },
  /** 步骤2内容 */
  Step2Content: {
    root: [
      "接下来需要将图片裁剪为合适的尺寸。",
      "点击/触控图片，可控制边框。",
      "可通过下方「裁剪图片」按钮多次裁剪，直到满意后，点击下方「完成裁剪」按钮进入下一步。",
    ],
    en: [
      "Next, you need to crop the image to the appropriate size.",
      "Click/touch the image, press to control the border.",
      "You can crop the image multiple times by clicking the 'Crop Image' button below, and click the 'Finish Cropping' button below to proceed to the next step after you are satisfied.",
    ],
  },
  /** 步骤3内容 */
  Step3Content: {
    root: [
      "为方便采集数据，提供了[二值化阈值]、[近圆度]、[面积滤过率]、[圆径缩放]滑轨。",
      "二值化即以0为黑，255为白。设定一个[二值化阈值]，对于灰度化处理后的照片，每个像素点高于阈值的均赋值为白(255)，低于阈值的均赋值为黑(0)。阈值越低(越黑)，则越多深色像素被定义为白；反之阈值越高(越白)，则越多浅色像素被定义为黑。",
      "面积滤过率即对识别到的轮廓面积进行排序，过滤掉排序低于或高于阈值的轮廓。",
      "圆径缩放即对识别到的轮廓的半径/直径进行缩放，缩放后可更准确地采集数据。建议为0.5。",
    ],
    en: [
      "To facilitate data collection, [Binary Threshold], [Circularity], [Area Filter Rate], and [Diameter Scaling] sliders are provided.",
      "Binarization means taking 0 as black and 255 as white. Set a [binarization threshold]. For the photos after grayscale processing, each pixel above the threshold is assigned a white value (255), and each pixel below the threshold is assigned a black value (0). The lower the threshold (the darker), the more dark pixels are defined as white. Conversely, the higher the threshold (the whiter), the more light-colored pixels are defined as black.",
      "Area Filter Rate is to sort the recognized contour area and filter out the contours that are below or above the threshold.",
      "Diameter Scaling is to scale the radius/diameter of the recognized contour. After scaling, data can be collected more accurately. It is recommended to be 0.5.",
    ],
  },

  // ================================ 步骤2 按钮 ================================

  /** 步骤2：裁剪图片按钮文字 */
  CutPictureButtonText: {
    root: "裁剪图片",
    en: "Cut Picture",
  },
  /** 步骤2：完成裁剪按钮文字 */
  CutPictureCompleteButtonText: {
    root: "裁剪完成",
    en: "Complete Cut",
  },

  // ================================ 步骤3 滑轨标签 ================================

  /** 步骤3：3 个滑轨的标题（与 thresholdNumAoa 一一对应） */
  ThresholdParamsLabel: {
    root: [
      "二值化阈值",
      "面积滤过率(%)",
      "圆径缩放",
    ],
    en: [
      "Binary Threshold",
      "Area Filter Rate (%)",
      "Diameter Scaling",
    ],
  },

  // ================================ 步骤3 数据导出 ================================

  /** 步骤3：下载数据按钮文字 */
  DownloadDataButtonLabel: {
    root: "下载数据",
    en: "Download Data",
  },

  // ================================ 加载 / 错误 / 通用 ================================

  /** OpenCV 启动加载提示 */
  OpenCVLoadingContent: {
    root: "正在启动OpenCV.js计算机视觉模块，请稍候...",
    en: "Starting OpenCV.js computer vision module, please wait...",
  },
  /** 错误提示标题（errorToast 流程使用） */
  ErrorDialogTitle: {
    root: "程序报错",
    en: "Program Error",
  },
  /** 读取照片加载提示 */
  PicLoadingContent: {
    root: "正在读取照片...",
    en: "Loading picture...",
  },

}
