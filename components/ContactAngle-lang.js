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

root.FunctionIntroductionTitle = "功能简介"
en.FunctionIntroductionTitle = "Function Introduction"

root.FunctionIntroductionContent = [
  "1.  点击读取图片文件。读取的图片文件将直接灰度化。",
  "2.  裁剪图片为合适的尺寸。短按控制边框；长按清空已有选框。",
  "3.  选择基底线、液滴边缘线。"
]
en.FunctionIntroductionContent = [
  "1.  Click to read the image file. The read image file will be directly grayed out.",
  "2.  Crop the image to the appropriate size. Short press to control the border; Long press to clear the existing selection box.",
  "3.  Select the baseline and the edge of the droplet."
]

root.SetpTitle = "步骤"
en.SetpTitle = "Step "

// 步骤1
root.Setp1Content = [
  "首先点击“点击上传图片”读取图片。",
  "读取到的图片会自动进行灰度化渲染。"
]
en.Setp1Content = [
  "First click on the 'Click to upload image' to read the image.",
  "The read image will be automatically rendered in grayscale."
]

// 步骤2
root.Setp2Content = [
  "接下来需要将图片裁剪为合适的尺寸。",
  "点击/触控图片，短按可控制边框；长按可清空已有选框。",
  "可通过下方“裁剪图片”按钮多次裁剪，直到满意后，点击下方“完成裁剪”按钮进入下一步。"
]
en.Setp2Content = [
  "Next, you need to crop the image to the appropriate size.",
  "Click/touch the image, short press to control the border; Long press to clear the existing selection box.",
  "You can crop the image multiple times by clicking the 'Crop Image' button below, and click the 'Finish Cropping' button below to proceed to the next step after you are satisfied."
]

// 步骤3
root.Setp3Content = [
  "接下来寻找液滴的最佳轮廓。",
  "调节滑轨可调整参数并查看轮廓效果；点击图片左部或右部可设置遮罩，被遮罩的轮廓点将不会参与后续拟合。"
]
en.Setp3Content = [
  "Next, find the best contour of the droplet.",
  "Adjust the slider to adjust the parameters and view the contour effect; Click on the left or right side of the image to set the mask, the contour points that are masked will not participate in the subsequent fitting."
]

// 步骤4
root.Setp4Content = [
  "接下来寻找固体基底与液滴接触的“基线”。",
  "点击/触控图片以粗调基线位置；调节滑轨以细调。"
]
en.Setp4Content = [
  "Next, find the baseline where the solid substrate and the droplet contact.",
  "Click / touch the image to coarse tune the baseline position; Adjust the slider to fine tune."
]

root.ContourAlgorithmTitle = "轮廓/边缘检测"
en.ContourAlgorithmTitle = "Contour / Edge Detection"

root.CannyAlgorithmLabel = "Canny算法"
en.CannyAlgorithmLabel = "Canny Algorithm"

root.ThresholdingMethodLabel = "阈值化法"
en.ThresholdingMethodLabel = "Thresholding Method"

root.ContourAlgorithmContent = [
  {
    strong: root.CannyAlgorithmLabel,
    normal: "。是一种多阶段的边缘检测算法，由John F. Canny提出。其原理为计算图像中像素色阶变化的梯度及方向，得到“边缘”图案。然后通过给定的两个阈值参数以筛选出合适的轮廓。"
  },
  "主参数：亦称“高阈值”，所有色阶变化高于此参数的边缘，都将被认定为“轮廓”。",
  "辅助参数：亦称“低阈值”，对于色阶变化小于“高阈值”、但与轮廓相连的边缘而言，若其色阶变化大于“低阈值”，则也将被认定为轮廓的一部分。以此确保轮廓的完整性。",
  {
    strong: root.ThresholdingMethodLabel,
    normal: "。是一种传统的二值化处理方法。其原理为将图像中的像素色阶值与所给定的阈值进行比较，大于阈值的像素值将被设定为“白色”，小于阈值的像素值将被设定为“黑色”。然后将黑白之间的边界线认定为轮廓。"
  },
  "主参数：亦称“阈值”，所有色阶值高于此参数的像素，都将被认定为“白色”。"
]
en.ContourAlgorithmContent = [
  {
    strong: en.CannyAlgorithmLabel,
    normal: ". is a multi-stage edge detection algorithm proposed by John F. Canny. Its principle is to calculate the gradient and direction of the color grade change of pixels in the image, and get the 'edge' pattern. Then, through the given two threshold parameters, the appropriate contour is filtered out."
  },
  "Main parameter: also known as 'high threshold', all edges with color grade changes higher than this parameter will be considered as 'contour'.",
  "Auxiliary parameter: also known as 'low threshold', for edges with color grade changes less than 'high threshold' but connected to the contour, if its color grade change is greater than 'low threshold', it will also be considered as part of the contour. This ensures the integrity of the contour.",
  {
    strong: en.ThresholdingMethodLabel,
    normal: ". is a traditional binary processing method. Its principle is to compare the color grade value of the pixel in the image with the given threshold, and pixels with color grade values greater than the threshold will be set to 'white', and pixels with color grade values less than the threshold will be set to 'black'. Then, the boundary line between black and white is regarded as the contour."
  },
  "Main parameter: also known as 'threshold', all pixels with color grade values higher than this parameter will be considered as 'white'."
]

root.ContourMaskTitle = "遮罩"
en.ContourMaskTitle = "Contour Mask"

root.ContourMaskSideLabel = "两边遮罩"
en.ContourMaskSideLabel = "Side Masks"

root.ContourMaskCentralLabel = "中心遮罩"
en.ContourMaskCentralLabel = "Central Mask"

root.ContourMaskContent = [
  {
    strong: root.ContourMaskSideLabel,
    normal: "。用于去除轮廓两边基线误识别的伪轮廓。"
  },
  "点击图片左部或右部设置遮罩，被遮罩的轮廓点将不会参与后续拟合。",
  {
    strong: root.ContourMaskCentralLabel,
    normal: "。用于去除轮廓中心因光源投影而产生的伪轮廓。"
  },
  "点击图片，短按可控制边框；边框所包围区域内的轮廓点将不会参与后续拟合。"
]
en.ContourMaskContent = [
  {
    strong: en.ContourMaskSideLabel,
    normal: ". is used to remove the pseudo contour of the contour base line misrecognition on both sides of the contour."
  },
  "Click on the left or right side of the image to set the mask, the contour points that are masked will not participate in the subsequent fitting.",
  {
    strong: en.ContourMaskCentralLabel,
    normal: ". is used to remove the pseudo contour of the contour center caused by the projection of the light source."
  },
  "Click on the image, short press to control the border; the contour points within the border will not participate in the subsequent fitting."
]

root.CutPictureButtonText = "裁剪图片"
en.CutPictureButtonText = "Cut Picture"

root.CutPictureCompleteButtonText = "裁剪完成"
en.CutPictureCompleteButtonText = "Complete Cut"


root.ContourSliderMainParameterChangeLabel = "主参数（G色阶变化）："
en.ContourSliderMainParameterChangeLabel = "Main Parameter (G color grade change): "

root.ContourSliderMainParameterValueLabel = "主参数（G色阶值）："
en.ContourSliderMainParameterValueLabel = "Main Parameter (G color grade value): "

root.ContourSliderAuxiliaryParameterLabel = "辅助参数（G色阶变化）："
en.ContourSliderAuxiliaryParameterLabel = "Auxiliary Parameter (G color grade change): "

root.ContourSliderSwitchFineButtonLabel = "切换细调"
en.ContourSliderSwitchFineButtonLabel = "Switch Fine Tuning"

root.ContourSliderSwitchCoarseButtonLabel = "切换粗调"
en.ContourSliderSwitchCoarseButtonLabel = "Switch Coarse Tuning"

root.ContourDetermineButtonLabel = "确认轮廓"
en.ContourDetermineButtonLabel = "Confirm Contour"

root.InterceptLeftSliderLabel = "【微调】左截距（px）："
en.InterceptLeftSliderLabel = "【Fine Tuning】Left Intercept (px): "

root.InterceptRightSliderLabel = "【微调】右截距（px）："
en.InterceptRightSliderLabel = "【Fine Tuning】Right Intercept (px): "

root.StepBackButtonLabel = "返回上一步"
en.StepBackButtonLabel = "Step Back"

root.BaselineConfirmButtonLabel = "确认基线"
en.BaselineConfirmButtonLabel = "Confirm Baseline"

root.ResultTableContent = [
  "序号",
  "文件名",
  "接触角 (°)",
  "偏差 (°)",
  "左接触角 (°)",
  "右接触角 (°)",
  "基线角度 (°)",
  "椭圆拟合R²"
]
en.ResultTableContent = [
  "No.",
  "Filename",
  "Contact Angle (°)",
  "Deviation (°)",
  "Left Contact Angle (°)",
  "Right Contact Angle (°)",
  "Baseline Angle (°)",
  "Ellipse Fitting R²"
]

root.ResultTableProcessingLabel = "处理"
en.ResultTableProcessingLabel = "Process"

root.ResultTableDeleteButtonLabel = "删除"
en.ResultTableDeleteButtonLabel = "Delete"

root.ResultTableExportButtonLabel = "下载结果"
en.ResultTableExportButtonLabel = "Download Result"

root.DeleteAllResultButtonLabel = "清空结果"
en.DeleteAllResultButtonLabel = "Clear Result"

// ------------------------------

root.OpenCVLoadingContent = "正在启动OpenCV.js计算机视觉模块，请稍候..."
en.OpenCVLoadingContent = "Starting OpenCV.js computer vision module, please wait..."

root.ErrorDialogTitle = "程序报错"
en.ErrorDialogTitle = "Program Error"

root.ErrorDialogContent = "欢迎向软件开发人员（13611580728 司承运）主动告知此bug，以便及时修复。"
en.ErrorDialogContent = "Welcome to inform the software development personnel (+8613611580728 SI_Cheng-Yun) of this bug actively so that it can be repaired in time. "

root.PicLoadingContent = "正在读取照片..."
en.PicLoadingContent = "Loading picture..."

root.ContourFitLoadingContent = "正在拟合液滴轮廓..."
en.ContourFitLoadingContent = "Fitting droplet contour..."

root.ContourFitErrorContent = "轮廓点数据不够，无法拟合。"
en.ContourFitErrorContent = "Not enough contour points data, cannot fit."

root.ContourFitIterationErrorContent = "有效数据点不足，已强行停止迭代。请仔细权衡本次轮廓拟合结果！"
en.ContourFitIterationErrorContent = "Insufficient valid data points, iteration has been forcibly stopped. Please carefully weigh the contour fitting results this time!"

root.ResultDialogContent = [
  "本次所测得接触角为 ",
  "° 。可调整参数多次测量，具体结果详见下方数据表格。"
]
en.ResultDialogContent = [
  "The contact angle measured this time is ",
  "° . You can adjust the parameters multiple times to measure, and the specific results can be seen in the data table below."
]

root.ContactErrorMessageContent = "计算出错，拟合轮廓与基线无交点。"
en.ContactErrorMessageContent = "Calculation error, the fitted contour and baseline have no intersection."

root.ResultSheetLabel = "接触角数据"
en.ResultSheetLabel = "Contact_Angle_Data"

root.DeleteUniResultDialogContent = "确定要删除该结果吗？"
en.DeleteUniResultDialogContent = "Are you sure you want to delete this result?"

root.DeleteAllResultDialogContent = "确定要删除全部结果吗？"
en.DeleteAllResultDialogContent = "Are you sure you want to delete all results?"

root.DeleteResultDialogConfirmBtnLabel = "确定"
en.DeleteResultDialogConfirmBtnLabel = "Confirm"

root.DeleteResultDialogCancelBtnLabel = "取消"
en.DeleteResultDialogCancelBtnLabel = "Cancel"

root.DeleteUniResultMessageContent = "删除成功！"
en.DeleteUniResultMessageContent = "Deleted successfully!"
