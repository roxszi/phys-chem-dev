"use strict"

/**
 * @接触角计算模块的语言包
 */

// 从VitePress导出用户数据方法，便于在运行时实现多语言切换
export { useData } from "vitepress"

// 定义并导出语言包
const root = {}
const en = {}
export const langAll = { root, en }

// ----语言包内容----

root.FunctionIntroductionTitle = "操作方法"
en.FunctionIntroductionTitle = "Operation Method"

root.FunctionIntroductionContent = [
  "1. 读取所拍摄的样品图片。",
  "2. 滑动阈值调节选框，并预览处理后的图片。",
  "3. 可反复调整参数预览，直至参数合适，然后下载详细数据。"
]
en.FunctionIntroductionContent = [
  "1. Read the sample image taken.",
  "2. Slide the threshold adjustment box and preview the processed image.",
  "3. Adjust the parameters repeatedly to preview until the parameters are suitable, and then download the detailed data."
]

root.SetpTitle = "步骤"
en.SetpTitle = "Step "

// 步骤1
root.Setp1Content = [
  "首先点击“点击上传图片”读取图片。",
]
en.Setp1Content = [
  "First click on the 'Click to upload image' to read the image.",
]

// 步骤2
root.Setp2Content = [
  "接下来需要将图片裁剪为合适的尺寸。",
  "点击/触控图片，可控制边框。",
  "可通过下方“裁剪图片”按钮多次裁剪，直到满意后，点击下方“完成裁剪”按钮进入下一步。"
]
en.Setp2Content = [
  "Next, you need to crop the image to the appropriate size.",
  "Click/touch the image, press to control the border.",
  "You can crop the image multiple times by clicking the 'Crop Image' button below, and click the 'Finish Cropping' button below to proceed to the next step after you are satisfied."
]

// 步骤3
root.Setp3Content = [
  "为方便采集数据，提供了[二值化阈值]、[近圆度]、[面积滤过率]、[圆径缩放]滑轨。",
  "二值化即以0为黑，255为白。设定一个[二值化阈值]，对于灰度化处理后的照片，每个像素点高于阈值的均赋值为白(255)，低于阈值的均赋值为黑(0)。阈值越低(越黑)，则越多深色像素被定义为白；反之阈值越高(越白)，则越多浅色像素被定义为黑。",
  "近圆度即[轮廓面积] ÷ [最小外接圆面积]。对于一个完美的圆形，其近圆度应为1。",
  "面积滤过率即对识别到的轮廓面积进行排序，过滤掉排序低于或高于阈值的轮廓。",
  "圆径缩放即对识别到的轮廓的半径/直径进行缩放，缩放后可更准确地采集数据。"
]
en.Setp3Content = [
  "To facilitate data collection, [Binary Threshold], [Circularity], [Area Filter Rate], and [Diameter Scaling] sliders are provided.",
  "Binarization means taking 0 as black and 255 as white. Set a [binarization threshold]. For the photos after grayscale processing, each pixel above the threshold is assigned a white value (255), and each pixel below the threshold is assigned a black value (0). The lower the threshold (the darker), the more dark pixels are defined as white. Conversely, the higher the threshold (the whiter), the more light-colored pixels are defined as black.",
  "Circularity is [Contour Area] ÷ [Minimum Enclosing Circle Area]. For a perfect circle, its circularity should be 1.",
  "Area Filter Rate is to sort the recognized contour area and filter out the contours that are below or above the threshold.",
  "Diameter Scaling is to scale the radius/diameter of the recognized contour. After scaling, data can be collected more accurately."
]

root.CutPictureButtonText = "裁剪图片"
en.CutPictureButtonText = "Cut Picture"

root.CutPictureCompleteButtonText = "裁剪完成"
en.CutPictureCompleteButtonText = "Complete Cut"

root.ThresholdParamsLabel = [
  "二值化阈值",
  // "近圆度",
  "面积滤过率(%)",
  "圆径缩放"
]
en.ThresholdParamsLabel = [
  "Binary Threshold",
  // "Circularity",
  "Area Filter Rate (%)",
  "Diameter Scaling"
]

root.DownloadDataButtonLabel = "下载数据"
en.DownloadDataButtonLabel = "Download Data"

// ------------------------------

root.OpenCVLoadingContent = "正在启动OpenCV.js计算机视觉模块，请稍候..."
en.OpenCVLoadingContent = "Starting OpenCV.js computer vision module, please wait..."

root.ErrorDialogTitle = "程序报错"
en.ErrorDialogTitle = "Program Error"

root.ErrorDialogContent = "欢迎向软件开发人员（13611580728 司承运）主动告知此bug，以便及时修复。"
en.ErrorDialogContent = "Welcome to inform the software development personnel (+8613611580728 SI_Cheng-Yun) of this bug actively so that it can be repaired in time. "

root.PicLoadingContent = "正在读取照片..."
en.PicLoadingContent = "Loading picture..."
