/**
 * 接触角计算模块 · 语言包
 * ---
 * 词条结构：扁平键 + 每条 `{ root, en }` 中英成对
 * - 键名用语义命名，不复制中文原文（改中文文案不必动键名）
 * - 参数符号 / 单位 / 数字 不进入语言包（如 0、255、50%、0.5）
 * - 内部开发者错误不翻译（throw new Error 类）
 * - 加第三语言（如 ja）：每条词条新增 ja 字段即可，TypeScript 会精确指出哪些未补齐
 *
 * 消费侧：const langRef = useLang(langDict) → 模板 / script 里 langRef.Xxx 即可
 *
 * 引号约定：中文文案里需要嵌套引号时使用中文全角双引号 ""（U+201C / U+201D），
 * 避免与 ASCII " 字符串边界冲突，省去转义负担。
 */

/** 强强调内容结构：用于算法说明里的 <strong> 标记片段 */
export interface LangStrongContent {
  /** 强强调文本（红色加粗） */
  strong?: string
  /** 普通文本 */
  normal: string
}

export const langDict = {

  // ================================ 功能简介 ================================

  /** 功能简介标题 */
  FunctionIntroductionTitle: {
    root: "功能简介",
    en: "Function Introduction",
  },
  /** 功能简介正文（数组：每行一项） */
  FunctionIntroductionContent: {
    root: [
      "1.  点击读取图片文件。",
      "2.  裁剪图片为合适的尺寸。",
      "3.  以椭圆拟合液滴边缘轮廓。",
      "4.  微调基线，并计算得到接触角。",
    ],
    en: [
      "1.  Click to read the image file.",
      "2.  Crop the image to the appropriate size.",
      "3.  Fit the edge contour of the droplet with an ellipse.",
      "4.  Fine-tune the baseline and calculate the contact angle.",
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
      `首先点击"点击上传图片"读取图片。`,
      "读取到的图片会自动进行灰度化渲染。",
    ],
    en: [
      "First click on the 'Click to upload image' to read the image.",
      "The read image will be automatically rendered in grayscale.",
    ],
  },
  /** 步骤2内容 */
  Step2Content: {
    root: [
      "接下来需要将图片裁剪为合适的尺寸。",
      "点击/触控图片，短按可控制边框；长按可清空已有选框。",
      `可通过下方"裁剪图片"按钮多次裁剪，直到满意后，点击下方"完成裁剪"按钮进入下一步。`,
    ],
    en: [
      "Next, you need to crop the image to the appropriate size.",
      "Click/touch the image, short press to control the border; Long press to clear the existing selection box.",
      "You can crop the image multiple times by clicking the 'Crop Image' button below, and click the 'Finish Cropping' button below to proceed to the next step after you are satisfied.",
    ],
  },
  /** 步骤3内容 */
  Step3Content: {
    root: [
      "接下来寻找液滴的最佳轮廓。",
      "调节滑轨可调整参数并查看轮廓效果；点击图片可设置遮罩，被遮罩的轮廓点将不会参与后续拟合。",
    ],
    en: [
      "Next, find the best contour of the droplet.",
      "Adjust the slider to adjust the parameters and view the contour effect; Click on the image to set the mask, the contour points that are masked will not participate in the subsequent fitting.",
    ],
  },
  /** 步骤4内容 */
  Step4Content: {
    root: [
      `接下来寻找固体基底与液滴接触的"基线"。`,
      "点击/触控图片左、中、右侧以粗调基线位置；调节滑轨以细调。",
    ],
    en: [
      "Next, find the baseline where the solid substrate and the droplet contact.",
      "Click / touch the left, middle and right sides of the image to coarse tune the baseline position; Adjust the slider to fine tune.",
    ],
  },

  // ================================ 步骤3：轮廓算法 ================================

  /** 轮廓/边缘检测标题 */
  ContourAlgorithmTitle: {
    root: "轮廓/边缘检测",
    en: "Contour / Edge Detection",
  },
  /** 轮廓/边缘检测算法选项（Canny / 阈值化） */
  ContourAlgorithmArr: {
    root: ["Canny算法", "阈值化法"],
    en: ["Canny Algorithm", "Thresholding Method"],
  },
  /** 轮廓/边缘检测算法说明（混合数组：含 strong 强调 + 普通字符串） */
  ContourAlgorithmContent: {
    root: [
      {
        strong: "Canny算法",
        normal: `。是一种多阶段的边缘检测算法，由John F. Canny提出。其原理为计算图像中像素色阶变化的梯度及方向，得到"边缘"图案。然后通过给定的两个阈值参数以筛选出合适的轮廓。`,
      },
      {
        normal: `主参数：亦称"高阈值"，所有色阶变化高于此参数的边缘，都将被认定为"轮廓"。`,
      },
      {
        normal: `辅助参数：亦称"低阈值"，对于色阶变化小于"高阈值"、但与轮廓相连的边缘而言，若其色阶变化大于"低阈值"，则也将被认定为轮廓的一部分。以此确保轮廓的完整性。`,
      },
      {
        strong: "阈值化法",
        normal: `。是一种传统的二值化处理方法。其原理为将图像中的像素色阶值与所给定的阈值进行比较，大于阈值的像素值将被设定为"白色"，小于阈值的像素值将被设定为"黑色"。然后将黑白之间的边界线认定为轮廓。`,
      },
      {
        normal: `主参数：亦称"阈值"，所有色阶值高于此参数的像素，都将被认定为"白色"。`,
      }
    ] as LangStrongContent[],
    en: [
      {
        strong: "Canny Algorithm",
        normal: ". is a multi-stage edge detection algorithm proposed by John F. Canny. Its principle is to calculate the gradient and direction of the color grade change of pixels in the image, and get the 'edge' pattern. Then, through the given two threshold parameters, the appropriate contour is filtered out.",
      },
      {
        normal: "Main parameter: also known as 'high threshold', all edges with color grade changes higher than this parameter will be considered as 'contour'.",
      },
      {
        normal: "Auxiliary parameter: also known as 'low threshold', for edges with color grade changes less than 'high threshold' but connected to the contour, if its color grade change is greater than 'low threshold', it will also be considered as part of the contour. This ensures the integrity of the contour.",
      },
      {
        strong: "Thresholding Method",
        normal: ". is a traditional binary processing method. Its principle is to compare the color grade value of the pixel in the image with the given threshold, and pixels with color grade values greater than the threshold will be set to 'white', and pixels with color grade values less than the threshold will be set to 'black'. Then, the boundary line between black and white is regarded as the contour.",
      },
      {
        normal: "Main parameter: also known as 'threshold', all pixels with color grade values higher than this parameter will be considered as 'white'.",
      }
    ] as LangStrongContent[],
  },

  // ================================ 步骤3：遮罩 ================================

  /** 遮罩标题 */
  ContourMaskTitle: {
    root: "遮罩",
    en: "Contour Mask",
  },
  /** 遮罩选项（基线 / 两边 / 中心） */
  ContourMaskContentArr: {
    root: ["基线遮罩", "两边遮罩", "中心遮罩"],
    en: ["Baseline", "Sides", "Central"],
  },
  /** 遮罩说明（混合数组：含 strong 强调 + 普通字符串） */
  ContourMaskContent: {
    root: [
      {
        strong: "基线遮罩",
        normal: "。用于去除轮廓基线及基线下方的误识别伪轮廓。可点集图片左、中、右侧以调整基线。",
      },
      {
        strong: "两边遮罩",
        normal: "。用于去除轮廓两边基线误识别的伪轮廓。可点击图片左部或右部设置遮罩。",
      },
      {
        strong: "中心遮罩",
        normal: "。用于去除轮廓中心因光源投影而产生的伪轮廓。可点击图片以调整边框。",
      },
      {
        normal: "被遮罩覆盖的轮廓点将不会参与后续拟合，长按图片可清空遮罩。",
      }
    ] as LangStrongContent[],
    en: [
      {
        strong: "Baseline Masks",
        normal: ". is used to remove the pseudo contour below the contour baseline. Click on the left, middle or right side of the image to set the mask.",
      },
      {
        strong: "Side Masks",
        normal: ". is used to remove the pseudo contour of the contour base line misrecognition on both sides of the contour. Click on the left or right side of the image to set the mask, the contour points that are masked will not participate in the subsequent fitting.",
      },
      {
        strong: "Central Mask",
        normal: ". is used to remove the pseudo contour of the contour center caused by the projection of the light source. Click on the image, short press to control the border; ",
      },
      {
        normal: "Contour points covered by the mask will not participate in subsequent fitting. Long press the image to clear the mask.",
      }
    ] as LangStrongContent[],
  },

  // ================================ 步骤2 / 3 按钮 ================================

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
  /** 步骤3：主参数滑轨标签（数组，按算法索引） */
  ContourSliderMainParameterLabelArr: {
    root: ["主参数（G色阶变化）：", "主参数（G色阶值）："],
    en: ["Main Parameter (G color grade change): ", "Main Parameter (G color grade value): "],
  },
  /** 步骤3：辅助参数滑轨标签（Canny 算法） */
  ContourSliderAuxiliaryParameterLabel: {
    root: "辅助参数（G色阶变化）：",
    en: "Auxiliary Parameter (G color grade change): ",
  },
  /** 步骤3：切换细调按钮文字 */
  ContourSliderSwitchFineButtonLabel: {
    root: "切换细调",
    en: "Switch Fine Tuning",
  },
  /** 步骤3：切换粗调按钮文字 */
  ContourSliderSwitchCoarseButtonLabel: {
    root: "切换粗调",
    en: "Switch Coarse Tuning",
  },
  /** 步骤3：确认轮廓按钮文字 */
  ContourDetermineButtonLabel: {
    root: "确认轮廓",
    en: "Confirm Contour",
  },

  // ================================ 步骤4 滑轨 ================================

  /** 步骤4：左截距微调滑轨标签 */
  InterceptLeftSliderLabel: {
    root: "【微调】左截距（px）：",
    en: "【Fine Tuning】Left Intercept (px): ",
  },
  /** 步骤4：右截距微调滑轨标签 */
  InterceptRightSliderLabel: {
    root: "【微调】右截距（px）：",
    en: "【Fine Tuning】Right Intercept (px): ",
  },
  /** 步骤4：返回上一步按钮 */
  StepBackButtonLabel: {
    root: "返回上一步",
    en: "Step Back",
  },
  /** 步骤4：确认基线按钮 */
  BaselineConfirmButtonLabel: {
    root: "确认基线",
    en: "Confirm Baseline",
  },

  // ================================ 步骤5 数据结果 ================================

  /** 结果表格表头 */
  ResultTableContent: {
    root: [
      "序号",
      "文件名",
      "接触角 (°)",
      "偏差 (°)",
      "左接触角 (°)",
      "右接触角 (°)",
      "基线角度 (°)",
      "R²",
      "拟合",
    ],
    en: [
      "No.",
      "Filename",
      "Contact Angle (°)",
      "Deviation (°)",
      "Left Contact Angle (°)",
      "Right Contact Angle (°)",
      "Baseline Angle (°)",
      "R²",
      "Fitting Nature",
    ],
  },
  /**
   * 拟合结果类型映射（"迭代收敛" / "迭代达上限" / "有效点不足"）
   * 注：key 是中文短语，与 resultRef 里 resultType 字段对应
   */
  FitNatureStrMap: {
    root: {
      "迭代收敛": "迭代收敛",
      "迭代达上限": "迭代达上限",
      "有效点不足": "有效点不足",
    },
    en: {
      "迭代收敛": "Convergence",
      "迭代达上限": "Iteration Limit",
      "有效点不足": "Insufficient Valid Points",
    },
  },
  /** 结果表格：处理列标题 */
  ResultTableProcessingLabel: {
    root: "处理",
    en: "Process",
  },
  /** 结果表格：删除按钮 */
  ResultTableDeleteButtonLabel: {
    root: "删除",
    en: "Delete",
  },
  /** 结果表格：结果倒序按钮 */
  ResultTableReverseButtonLabel: {
    root: "结果倒序",
    en: "Reverse Order",
  },
  /** 结果表格：结果正序按钮 */
  ResultTableNormalButtonLabel: {
    root: "结果正序",
    en: "Normal Order",
  },
  /** 结果表格：下载结果按钮 */
  ResultTableExportButtonLabel: {
    root: "下载结果",
    en: "Download Result",
  },
  /** 结果表格：清空结果按钮 */
  DeleteAllResultButtonLabel: {
    root: "清空结果",
    en: "Clear Result",
  },

  // ================================ 加载 / 错误 / 通用 ================================

  /** OpenCV 启动加载提示 */
  OpenCVLoadingContent: {
    root: "正在启动OpenCV.js计算机视觉模块，请稍候...",
    en: "Starting OpenCV.js computer vision module, please wait...",
  },
  /** 数据结构被破坏时的错误提示 */
  DataInitErrorContent: {
    root: "数据结构被破坏，错误数据已删除。",
    en: "Data structure is broken, error data has been deleted.",
  },
  /** 读取照片加载提示 */
  PicLoadingContent: {
    root: "正在读取照片...",
    en: "Loading picture...",
  },
  /** 轮廓拟合加载提示 */
  ContourFitLoadingContent: {
    root: "正在拟合液滴轮廓...",
    en: "Fitting droplet contour...",
  },
  /** 轮廓拟合错误提示（点不够） */
  ContourFitErrorContent: {
    root: "轮廓点数据不够，无法拟合。",
    en: "Not enough contour points data, cannot fit.",
  },
  /** 轮廓拟合迭代错误提示 */
  ContourFitIterationErrorContent: {
    root: "有效数据点不足，已强行停止迭代。请仔细权衡本次轮廓拟合结果！",
    en: "Insufficient valid data points, iteration has been forcibly stopped. Please carefully weigh the contour fitting results this time!",
  },
  /** 结果对话框正文（用于拼接接触角数值） */
  ResultDialogContent: {
    root: [
      "本次所测得接触角为 ",
      "° 。可调整参数多次测量，具体结果详见下方数据表格。",
    ],
    en: [
      "The contact angle measured this time is ",
      "°. You can adjust the parameters multiple times to measure, and the specific results can be seen in the data table below.",
    ],
  },
  /** 接触角计算错误提示 */
  ContactErrorMessageContent: {
    root: "计算出错，拟合轮廓与基线无交点。",
    en: "Calculation error, the fitted contour and baseline have no intersection.",
  },
  /** 结果表格 sheet 名（xlsx 导出） */
  ResultSheetLabel: {
    root: "接触角数据",
    en: "Contact_Angle_Data",
  },
  /** 单条删除确认对话框 */
  DeleteUniResultDialogContent: {
    root: "确定要删除该结果吗？",
    en: "Are you sure you want to delete this result?",
  },
  /** 全部删除确认对话框 */
  DeleteAllResultDialogContent: {
    root: "确定要删除全部结果吗？",
    en: "Are you sure you want to delete all results?",
  },
  /** 删除对话框确认按钮 */
  DeleteResultDialogConfirmBtnLabel: {
    root: "确定",
    en: "Confirm",
  },
  /** 删除对话框取消按钮 */
  DeleteResultDialogCancelBtnLabel: {
    root: "取消",
    en: "Cancel",
  },
  /** 单条删除成功消息 */
  DeleteUniResultMessageContent: {
    root: "删除成功！",
    en: "Deleted successfully!",
  },
}