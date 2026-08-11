"use strict"

/**
 * 接触角求解的纯算法模块
 * 接触角业务中的“纯计算”逻辑，模块内部分为以下几个业务区域：
 * 0.  导入导出方法
 *     getEllipse() 椭圆拟合算法，即TIR-DT算法的完整模块
 * 1.  选框/遮罩相关工具方法
 *     computeRect() 选框坐标计算
 *     computeBaseline() 基线计算
 *     computeColLine() 选线方法。选择轮廓左右两侧的过滤线
 * 2.  轮廓拟合算法
 *     filterContourPoints() 轮廓点过滤。拟合之前过滤掉遮罩及基线下方的点
 *     getEllipseOld() 椭圆拟合。旧的椭圆拟合算法，已废弃
 * 3.  接触角角度求解算法
 *     calculateContactAngle() 接触角计算
 * 4.  其它工具函数
 */

// ================================ 0. 导入导出方法 ================================
// 椭圆拟合算法，即TIR-DT算法的完整模块
export { getEllipse } from './ContactAngle-algorithm-dtirdt.js'

/**
 * @typedef { object } Rect canvas元素块选框
 * @property { number } Rect.xMax canvas元素块选框的X坐标大值(亦用于步骤3的遮罩框)
 * @property { number } Rect.yMax canvas元素块选框的Y坐标大值(亦用于步骤3的遮罩框)
 * @property { number } Rect.xMin canvas元素块选框的X坐标小值(亦用于步骤3的遮罩框)
 * @property { number } Rect.yMin canvas元素块选框的Y坐标小值(亦用于步骤3的遮罩框)
 */
/**
 * @typedef { object } ColLine canvas元素块遮罩线
 * @property { number } ColLine.left canvas元素块遮罩线的左侧线X坐标
 * @property { number } ColLine.right canvas元素块遮罩线的右侧线X坐标
 */
/**
 * @typedef { object } Baseline canvas元素基线遮罩线
 * @property { number } Baseline.left canvas元素块基线遮罩线的左侧Y坐标
 * @property { number } Baseline.right canvas元素块基线遮罩线的右侧Y坐标
 */

// ================================ 1. 选框/遮罩相关工具方法 ================================

/**
 * computeRect 选框坐标计算
 * 根据点击位置更新选框的 X、Y 坐标边界值
 * 设计思路：
 *   - 第一次点击时，以点击位置为中心，生成一个初始矩形框（宽高比约 3:2）
 *   - 后续点击时，根据点击位置与当前选框的几何关系，动态调整选框边界：
 *     * 在框外 → 直接扩展对应边界
 *     * 在框内 → 通过"交叉线斜率比较"判断点位于哪个象限，然后缩进对应边界
 * @note 选框的 X、Y 坐标边界值会直接修改传入的 rect 对象
 * @param { object } param
 * @param { number } param.clickX - 点击位置的实际 X 坐标（已乘以缩放比）
 * @param { number } param.clickY - 点击位置的实际 Y 坐标（已乘以缩放比）
 * @param { number } param.canvasWidth - canvas 实际宽度
 * @param { number } param.canvasHeight - canvas 实际高度
 * @param { Rect } param.rect - 当前的选框坐标对象（会被当场修改）
 * @param { number } [param.RECT_SCALE = 0.5] - 画框相对短边的比例，默认为 0.5
 * @param { number } [param.RECT_X_TO_Y = 2 / 3] - 画框的Y比X的值，默认为 2/3
 */
export function computeRect({
  clickX, clickY, canvasWidth, canvasHeight, rect,
  RECT_SCALE = 0.5,
  RECT_X_TO_Y = 2 / 3
}) {
  // 如果选框 X 边界未定义，即第一次点击，生成初始选框
  if (!rect.xMax) {
    // 计算选框半宽/半高：取 canvas 宽高较小值的一半
    const rectHalfX = Math.min(
      canvasWidth * RECT_SCALE * 0.5,
      canvasHeight * RECT_SCALE * 0.5
    )
    // Y 轴半高适当压扁
    const rectHalfY = rectHalfX * RECT_X_TO_Y
    // 根据点击位置记录坐标，并钳制在 canvas 边界内
    // rectXmax和rectYmax：点击位置X坐标 + 选框半宽，有可能大于<canvas>宽，则取两者小值
    rect.xMax = Math.min(clickX + rectHalfX, canvasWidth)
    rect.yMax = Math.min(clickY + rectHalfY, canvasHeight)
    // rectXmin和rectYmin：点击位置X坐标 - 选框半宽，有可能小于0，则取两者大值
    rect.xMin = Math.max(clickX - rectHalfX, 0)
    rect.yMin = Math.max(clickY - rectHalfY, 0)
    // 计算完毕，返回
    return
  }
  // 接下来处理选框边界已定义过的情况：
  // 先声明一个“是否在选框内”的标记，初始化为0
  let isInRect = 0
  // 判断X：在框外/框上则扩展，在框内则标记
  if (clickX >= rect.xMax) {
    rect.xMax = clickX
  } else if (clickX <= rect.xMin) {
    rect.xMin = clickX
  } else {
    // 标记
    isInRect++
  }
  // 判断 Y：同上
  if (clickY >= rect.yMax) {
    rect.yMax = clickY
  } else if (clickY <= rect.yMin) {
    rect.yMin = clickY
  } else {
    // 标记
    isInRect++
  }
  // 如果“是否在选框内”的标记isInRect不等于2，即至少x和y有一个不在框内
  if (isInRect !== 2) {
    // 此时选框点已经更新了，所以直接返回即可
    return
  }
  // 接下来以下处理"点击在选框内"的情况：
  // 思路：比较斜率。有3个斜率：
  // 1.  参考斜率，即选框自身的斜率rectSlope，也就是矩形框的交叉线。
  //     参考斜率有正负值。求1个即可，另一个加负号，即-rectSlope。
  // 2.  选点针对(rect.xMin, rect.yMin)点的斜率。
  //     该斜率和rectSlope比较，如果大于rectSlope，则说明选点在交叉线的上方，反之在下方。
  // 3.  选点针对(rect.xMax, rect.yMin)点的斜率。
  //     该斜率和-rectSlope比较，如果【小于-rectSlope】，则说明选点在交叉线的上方，反之在下方。
  //     这里要注意负数比较，和“2”的正数比较相反。
  // 参考斜率rectSlope，选框自身的交叉线斜率（对角线斜率）
  const rectSlope = (rect.yMax - rect.yMin) / (rect.xMax - rect.xMin)
  // 点击点针对左下角 (xMin, yMin) 的斜率
  const clickSlopePositive = (clickY - rect.yMin) / (clickX - rect.xMin)
  // 点击点针对右下角 (xMax, yMin) 的斜率（负数）
  const clickSlopeNegative = (clickY - rect.yMin) / (clickX - rect.xMax)
  // 判断点的位置，缩进对应边界
  if (clickSlopePositive >= rectSlope) {
    if (clickSlopeNegative <= -rectSlope) {
      // 点在交叉线上方，上边界往下缩
      rect.yMax = clickY
    } else {
      // 点在交叉线左侧，左边界往右缩
      rect.xMin = clickX
    }
  } else {
    if (clickSlopeNegative <= -rectSlope) {
      // 点在交叉线右侧，右边界往左缩
      rect.xMax = clickX
    } else {
      // 点在交叉线下方，下边界往上缩
      rect.yMin = clickY
    }
  }
  // 选框边界更新完毕
  return
}


/**
 * computeBaseline 选线方法。选择轮廓下方的基线过滤线
 * 根据点击位置更新基线的左右截距
 * 设计思路：
 *   将 canvas 水平分为三个区域：左区（35%）、中区（30%）、右区（35%）。
 *   - 左区：只调整左截距，通过相似三角形计算新的左截距值
 *   - 右区：只调整右截距，同理
 *   - 中区：计算当前点击位置对应的基线 Y 值，然后整体上下平移两条截距
 * @note 基线截距会直接修改传入的 baseline 对象
 * @param { object } param
 * @param { number } param.clickX - 点击位置的实际 X 坐标（已乘以缩放比）
 * @param { number } param.clickY - 点击位置的实际 Y 坐标（已乘以缩放比）
 * @param { number } param.canvasWidth - canvas 实际宽度
 * @param { number } param.canvasHeight - canvas 实际高度
 * @param { Baseline } param.baseline - 当前的基线截距对象（会被就地修改）
 */
export function computeBaseline({ clickX, clickY, canvasWidth, canvasHeight, baseline }) {
  // 基线左右截距，无值则初始化为 canvas 高度
  let leftIntercept = baseline.left ?? canvasHeight
  let rightIntercept = baseline.right ?? canvasHeight
  // 左区：只调整左截距
  if (clickX < canvasWidth * 0.35) {
    // 相似三角形：(左截距 - 右截距) / (clickY - 右截距) = canvasWidth / (canvasWidth - clickX)
    leftIntercept =
      canvasWidth / (canvasWidth - clickX)
        * (clickY - rightIntercept)
        + rightIntercept
  // 右区：只调整右截距
  } else if (clickX > canvasWidth * 0.65) {
    // 相似三角形：(右截距 - 左截距) / (clickY - 左截距) = canvasWidth / clickX
    rightIntercept =
      canvasWidth / clickX
        * (clickY - leftIntercept)
        + leftIntercept
  // 中区：整体平移
  } else {
    // 以目前的截距来平移即可
    // 以当前x值计算截距的y值：
    // y - 左截距 = 基线斜率 * (x - 0)
    // 基线斜率 = (右截距 - 左截距) / canvas.width
    const baselineSlope = (rightIntercept - leftIntercept) / canvasWidth
    // 当前 x 坐标对应的基线 y 值
    const interceptPointY = baselineSlope * clickX + leftIntercept
    // 计算偏移量
    const offsetY = clickY - interceptPointY
    // 左右截距同时加上偏移量
    leftIntercept += offsetY
    rightIntercept += offsetY
  }
  // 赋值
  baseline.left = leftIntercept
  baseline.right = rightIntercept
  return
}


/**
 * computeColLine 选线方法。选择轮廓左右两侧的过滤线
 * 根据点击位置更新轮廓左右两侧遮罩线的 X 坐标
 * 设计思路：
 *   将 canvas 水平一分为二，点击左半则更新左侧线，右半则更新右侧线。
 * @note 遮罩线坐标会直接修改传入的 colLine 对象
 * @param { object } param
 * @param { number } param.clickX - 点击位置的实际 X 坐标（已乘以缩放比）
 * @param { number } param.canvasWidth - canvas 实际宽度
 * @param { ColLine } param.colLine - 当前的左右遮罩线坐标对象（会被就地修改）
 */
export function computeColLine({ clickX, canvasWidth, colLine }) {
  // 接canvas的半宽
  const canvasWidthHalf = canvasWidth / 2
  // 根据点击位置判断更新左侧还是右侧
  // 如果点击位置X坐标小于canvas半宽
  if (clickX < canvasWidthHalf) {
    // 更新左侧线
    colLine.left = Math.ceil(clickX)
  // 否则更新右侧线
  } else {
    colLine.right = Math.floor(clickX)
  }
  return
}


// ================================ 2. 轮廓拟合算法 ================================


/**
 * getContourPoints 获取轮廓点，并会滤去明显有问题的杂点
 * 明显有问题的杂点：位于canvas边缘1%区域内的点，及位于中心遮罩框内、两边遮罩框外的点
 * 基线遮罩不在这一步过滤，而放到后一步。因为最后一步学生也会调整基线，所以基线遮罩框的边界可能会变
 * 设计思路：
 *   1. 从OpenCV的Met数据中提取轮廓点数据
 *   2. 先过滤掉位于canvas边缘1%区域内的点
 *   3. 最后根据中心遮罩过滤掉位于遮罩框内的点
 * @param { object } param - 参数对象
 * @param { CV.MatVector } param.metVectorContours - OpenCV轮廓点的MatVector对象
 * @param { ColLine } param.colLine - 左右遮罩线坐标
 * @param { Rect } param.rect - 中心遮罩框坐标
 * @param { number } param.canvasWidth - canvas实际宽度
 * @param { number } param.canvasHeight - canvas实际高度
 * @returns { [number, number][] } contourPointAoa - 过滤后的轮廓点坐标数组 [x, y][]
 */
export function getContourPoints({
  metVectorContours, colLine, rect, canvasWidth, canvasHeight
}) {
  /** 过滤线阈值，1% 切边 */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  /** 声明一个数组用来接所有轮廓点 @type { [number, number][] } */
  const contourPointAoa = []
  // 如果指定了过滤线，宽按两边遮罩过滤线来；否则按canvas宽来
  const filterWidthMin = colLine.left ?? Math.ceil(canvasWidth * CANVAS_EDGE_PERCENTAGE)
  const filterWidthMax = colLine.right ?? Math.floor(canvasWidth * (1 - CANVAS_EDGE_PERCENTAGE))
  // 顶部过滤边界和顶部边界
  const filterHeightMin = Math.ceil(canvasHeight * CANVAS_EDGE_PERCENTAGE)
  const filterHeightMax = Math.floor(canvasHeight * (1 - CANVAS_EDGE_PERCENTAGE))
  // 接遮罩框：遮罩里的点是要剔除的，所以遮罩无值的时候，相当于不遮罩
  // 无值的时候，就取反过来的“一定能达到”的值即可
  const maskWidthMin = rect.xMin ?? filterWidthMax
  const maskHeightMin = rect.yMin ?? filterHeightMax
  const maskWidthMax = rect.xMax ?? filterWidthMin
  const maskHeightMax = rect.yMax ?? filterHeightMin
  // 遍历所有轮廓点
  forEachContour: for (let i = 0; i < metVectorContours.size(); i++) {
    // 挨个获取轮廓
    const metContour = metVectorContours.get(i)
    // 获取坐标
    forEachContourPoint: for (let j = 0; j < metContour.rows; j++) {
      // 接X和Y坐标
      const pointX = metContour.data32S[j * 2]
      const pointY = metContour.data32S[j * 2 + 1]
      // 如果坐标点在边缘1%位置外，或过滤遮罩位置外
      if (
        (pointX <= filterWidthMin) || (pointX >= filterWidthMax)
          || (pointY <= filterHeightMin) || (pointY >= filterHeightMax)
      ) {
        // 跳过本次循环，即滤去该点
        continue forEachContourPoint
      }
      // 中心遮罩区域（不在遮罩框内的点才保留）
      // 同时满足在框内的4个条件，不如满足在框外的任意4个条件中的1个
      if (
        (pointX < maskWidthMin) || (pointX > maskWidthMax)
          || (pointY < maskHeightMin) || (pointY > maskHeightMax)
      ) {
        // 装箱轮廓点集合P(0)
        contourPointAoa.push([pointX, pointY])
      }
    }
    // 释放当前轮廓的WASM内存
    metContour.delete()
  }
  // 最后，返回轮廓点集合
  return contourPointAoa
}


/**
 * baselineFilterContourPoints 用基线过滤轮廓点
 * 设计思路：
 *   1. 先根据基线遮罩（如有）过滤掉位于基线下方的点（通过斜率比较）
 *   2. 同时计算每个保留点到基线的距离，供后续椭圆拟合使用
 * @param { object } param
 * @param { [number, number][] } param.rawContourPointAoa - 轮廓点坐标数组 [x, y][]
 * @param { Baseline } param.baseline - 基线截距坐标，canvas视角。
 * @param { number } param.canvasWidth - canvas 实际宽度
 * @param { number } param.canvasHeight - canvas 实际高度
 * @param { boolean } [param.isBaselineConvertToCanvas] - 基线是否已转换到canvas视角
 * @returns {{ contourPointAoa: [number, number][], contourPointToBaselineDistanceArr: number[] }}
 *   - newContourPointAoa - 过滤后的轮廓点坐标数组 [x, y][]
 *   - contourPointToBaselineDistanceArr - 各轮廓点到基线的距离数组
 * @note 基线截距坐标默认canvas视角，如从滑轨Ref对象取值，则需显式转换。
 */
export function baselineFilterContourPoints({
  rawContourPointAoa, baseline, canvasWidth, canvasHeight, isBaselineConvertToCanvas = true
}) {
  /** 声明一个数组用来接所有轮廓点，即集合P(0) @type { [number, number][] } */
  const newContourPointAoa = []
  /** 声明一个数组用来接轮廓点到基线的距离 @type { number[] } */
  const contourPointToBaselineDistanceArr = []
  // 初始化基线左右截距
  /** 过滤线阈值，1%切边 */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  /** 顶部边界，作为基线截距回退值 */
  const filterHeightMax = Math.floor(canvasHeight * (1 - CANVAS_EDGE_PERCENTAGE))
  /** 基线左截距 */
  const filterBaselineLeft = baseline.left ?? filterHeightMax
  /** 基线右截距 */
  const filterBaselineRight = baseline.right ?? filterHeightMax
  /** 基线截距差 */
  const filterBaselineDifference = filterBaselineRight - filterBaselineLeft
  /** 基线斜率 */
  const filterBaselineSlope = filterBaselineDifference / canvasWidth
  // 轮廓点到底部基线的距离²的计算公式：
  // |(x2 - x1)(y - y1) - (y2 - y1)(x - x1)|² / ((x2 - x1)² + (y2 - y1)²)
  // 其中(x1, y1)是基线左截距点，(x2, y2)是基线右截距点，(x, y)是轮廓点
  // (x2 - x1) = canvasWidth
  // (y2 - y1) = filterBaselineRight - filterBaselineLeft = filterBaselineDifference
  /** 轮廓点到底部基线的距离²的计算用分母 */
  const distanceSquareDenominator = canvasWidth ** 2 + filterBaselineDifference ** 2
  // 遍历所有轮廓点
  forEachContourPoint: for (const contourPoint of rawContourPointAoa) {
    // 接X和Y坐标
    const pointX = contourPoint[0]
    const pointY = contourPoint[1]
    // 基线过滤：
    // 计算相对于基线的相对斜率（此前把pointX = 0排除掉了）
    const pointToBaselineSlope = (pointY - filterBaselineLeft) / pointX
    // 如果斜率大于基线斜率，即点在基线遮罩范围下方（即canvas上方）
    if (pointToBaselineSlope > filterBaselineSlope) {
      // 跳过本次循环
      continue forEachContourPoint
    }
    // 过滤完毕，则装箱轮廓点集合P(0)
    newContourPointAoa.push([pointX, pointY])
    // 计算点到基线的距离：|Ax + By + C| / sqrt(A² + B²)
    /** 轮廓点到底部基线的距离²的计算用分子 */
    const distanceSquareNumerator =
      (canvasWidth * (pointY - filterBaselineLeft) - filterBaselineDifference * pointX) ** 2
    /** 点到基线的距离 */
    const distance = Math.sqrt(distanceSquareNumerator / distanceSquareDenominator)
    // 装箱点到基线的距离集合
    contourPointToBaselineDistanceArr.push(distance)
  }
  // 最后，返回轮廓点集合和距离集合
  return {
    contourPointAoa: newContourPointAoa,
    contourPointToBaselineDistanceArr: contourPointToBaselineDistanceArr
  }
}


/**
 * filterContourPoints 过滤轮廓点，滤去明显有问题的杂点
 * 设计思路：
 *   1. 先过滤掉位于 canvas 边缘 1% 区域内的点
 *   2. 再根据基线遮罩过滤掉位于基线下方的点（通过斜率比较）
 *   3. 最后根据中心遮罩过滤掉位于遮罩框内的点
 *   4. 同时计算每个保留点到基线的距离，供后续椭圆拟合使用
 * @param { object } param
 * @param { CV.MatVector } param.metVectorContours - OpenCV轮廓点的MatVector对象
 * @param { ColLine } param.colLine - 左右遮罩线坐标
 * @param { Rect } param.rect - 中心遮罩框坐标
 * @param { Baseline } param.baseline - 基线截距坐标
 * @param { number } param.canvasWidth - canvas 实际宽度
 * @param { number } param.canvasHeight - canvas 实际高度
 * @returns {{ contourPointAoa: [number, number][], contourPointToBaselineDistanceArr: number[] }}
 *   - contourPointAoa - 过滤后的轮廓点坐标数组 [x, y][]
 *   - contourPointToBaselineDistanceArr - 各轮廓点到基线的距离数组
 * @throws { Error } 轮廓点不足6个时抛出异常
 */
export function filterContourPoints({
  metVectorContours, colLine, rect, baseline, canvasWidth, canvasHeight
}) {
  /** 过滤线阈值，1%切边 */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  /** 声明一个数组用来接所有轮廓点，即集合P(0) @type { [number, number][] } */
  const contourPointAoa = []
  /** 声明一个数组用来接轮廓点到基线的距离 @type { number[] } */
  const contourPointToBaselineDistanceArr = []
  // 如果指定了过滤线，宽按两边遮罩过滤线来；否则按canvas宽来
  const filterWidthMin = colLine.left ?? Math.ceil(canvasWidth * CANVAS_EDGE_PERCENTAGE)
  const filterWidthMax = colLine.right ?? Math.floor(canvasWidth * (1 - CANVAS_EDGE_PERCENTAGE))
  // 顶部过滤边界
  const filterHeightMin = Math.ceil(canvasHeight * CANVAS_EDGE_PERCENTAGE)
  // 底部过滤边界（含左右两个截距，兼容基线遮罩）
  const filterHeightMax = Math.floor(canvasHeight * (1 - CANVAS_EDGE_PERCENTAGE))
  const filterHeightMaxLeft = baseline.left ?? filterHeightMax
  const filterHeightMaxRight = baseline.right ?? filterHeightMax
  // 用于参考的底部区域（高度最大值）的斜率：y / x
  const heightDifference = filterHeightMaxRight - filterHeightMaxLeft
  const filterHeightMaxSlope = heightDifference / canvasWidth
  // 接遮罩框：这里是删除区，所以无值的时候，取值和过滤区要反过来
  const maskWidthMin = rect.xMin ?? filterWidthMax
  const maskHeightMin = rect.yMin ?? filterHeightMax
  const maskWidthMax = rect.xMax ?? filterWidthMin
  const maskHeightMax = rect.yMax ?? filterHeightMin
  // 轮廓点到底部基线的距离²的计算公式：
  // |(x2 - x1)(y - y1) - (y2 - y1)(x - x1)|² / ((x2 - x1)² + (y2 - y1)²)
  // 其中(x1, y1)是基线左截距点，(x2, y2)是基线右截距点，(x, y)是轮廓点
  // (x2 - x1) = canvas.width
  // (y2 - y1) = canvasHeightMaxRight - canvasHeightMaxLeft = canvasHeightDifference
  // 先计算一个分母，后面每个轮廓点都复用
  const distanceSquareDenominator = canvasWidth ** 2 + heightDifference ** 2
  // 遍历所有轮廓点
  forEachContour: for (let i = 0; i < metVectorContours.size(); i++) {
    // 挨个获取轮廓
    const metContour = metVectorContours.get(i)
    // 获取坐标
    forEachContourPoint: for (let j = 0; j < metContour.rows; j++) {
      // 接X和Y坐标
      const pointX = metContour.data32S[j * 2]
      const pointY = metContour.data32S[j * 2 + 1]
      // 如果坐标点在边缘1%位置外，或过滤遮罩位置外
      if (pointX <= filterWidthMin || pointX >= filterWidthMax || pointY <= filterHeightMin) {
        // 跳过本次循环，即滤去改点
        continue forEachContourPoint
      }
      // 继续过滤：基线遮罩区域（通过斜率比较判断点是否在基线下方）
      // 计算相对于基线的相对斜率（已经在上一步把pointX = 0排除掉了）
      const pointToBaselineSlope = (pointY - filterHeightMaxLeft) / pointX
      // 如果斜率大于基线斜率，即点在基线遮罩范围下方（即canvas上方）
      if (pointToBaselineSlope > filterHeightMaxSlope) {
        // 跳过本次循环
        continue forEachContourPoint
      }
      // 过滤3：中心遮罩区域（不在遮罩框内的点才保留）
      if (
        pointX < maskWidthMin || pointX > maskWidthMax ||
        pointY < maskHeightMin || pointY > maskHeightMax
      ) {
        // 装箱轮廓点集合P(0)
        contourPointAoa.push([pointX, pointY])
        // 计算点到基线的距离：|Ax + By + C| / sqrt(A² + B²)
        const distanceSquareNumerator =
          (canvasWidth * (pointY - filterHeightMaxLeft) - heightDifference * pointX) ** 2
        // 装箱点到基线的距离集合
        contourPointToBaselineDistanceArr.push(
          Math.sqrt(distanceSquareNumerator / distanceSquareDenominator)
        )
      }
    }
    // 释放当前轮廓的 WASM 内存
    metContour.delete()
  }
  // 最后，返回轮廓点集合P(0)，以及点到基线的距离
  return { contourPointAoa, contourPointToBaselineDistanceArr }
}


/**
 * 迭代拟合获得椭圆对象（旧版）
 * @deprecated 已废弃
 * 设计思路：
 *   算法核心是一个"双层迭代"结构：
 *   - 外层：收紧容差值（toleranceValue × ITERATION_WEIGHT）
 *   - 内层：将轮廓点分为"阳性点集"（拟合良好）和"阴性点集"（偏离过大），
 *           每轮用阳性点集拟合椭圆，再给阴性点一个"复活赛"机会。
 *   收敛条件：阳性/阴性点集不再变化，且 R² ≥ 阈值 或容差值已收紧至最小。
 * 算法细节：
 *   1. 每次拟合得到的椭圆参数用于构建中心坐标系（去中心化 + 逆旋转）
 *   2. 在该坐标系下计算每个点到椭圆的径向距离偏差
 *   3. 同时考虑点到基线的距离作为辅助筛选条件
 * @param { object } param
 * @param { CV } param.cv - OpenCV.js 实例
 * @param { [number, number][] } param.contourPointAoa - 轮廓点坐标数组
 * @param { number[] } param.contourPointToBaselineDistanceArr - 各轮廓点到基线的距离
 * @returns {{
 *   ellipse: CV.Ellipse,
 *   R2: number,
 *   baselineReferencePoint: [number, number]
 * }}
 *   - ellipse - 椭圆对象
 *   - R2 - 拟合优度
 *   - baselineReferencePoint - 基线参考点：取阳性点中 Y 值最大的点（即最低点）
 */
export function getEllipseOld({ cv, contourPointAoa, contourPointToBaselineDistanceArr }) {
  // -------- 超参数设置 --------
  /** 初始容差：阳性点转阴性点的距离偏差阈值（相对值） */
  const TOLERANCE_VALUE_INIT = 0.2
  /** 最小容差：容差收紧的下限 */
  const TOLERANCE_VALUE_MIN = 0.001
  /** 阴性点复活难度系数：阴性点需要以更严格的容差才能复活 */
  const NP_TO_PP_THRESHOLD = 0.7
  /** 容差收紧加权因子 */
  const ITERATION_WEIGHT = 0.7
  /** R² 收敛阈值 */
  const R2_THRESHOLD = 0.99
  /** 最大迭代次数 */
  const ITERATION_COUNT_MAX = 100
  // 从起始值开始接一个迭代筛选时候的容差，也就是阳性点转阴性点的阈值
  let toleranceValue = TOLERANCE_VALUE_INIT
  // 阳性点集：拟合良好的点
  const positivePointAoa = contourPointAoa
  const positiveDistanceArr = contourPointToBaselineDistanceArr
  // 阴性点集：偏离过大的点
  const negativePointAoa = []
  const negativeDistanceArr = []
  // 迭代所得的R²值
  let R2 = null
  // 迭代收敛指针
  let isConverge = false
  // 迭代次数指针
  let iterationCount = 0
  /** 椭圆对象 @type { CV.Ellipse } */
  let ellipse = null
  /** 基线参考点：取阳性点中 Y 值最大的点（即最低点） @type { [number, number] } */
  let baselineReferencePoint = [0, 0]
  // -------- 外层迭代：收紧容差 --------
  // 拟合不收敛 且 迭代次数不超过最大迭代次数时执行
  // 迭代需要做的事情：
  // 1.  用positivePointAoa计算得到椭圆方程
  // 2.  根据椭圆方程，筛选出新的positivePointAoa和negativePointAoa
  // 3.  判断是否收敛
  contourPointIterate: while (!isConverge && iterationCount < ITERATION_COUNT_MAX) {
    // 开始迭代，迭代次数+1
    iterationCount++
    // 用阳性点集拟合椭圆
    // OpenCV工厂方法，把轮廓坐标点positivePointAoa转为轮廓Mat对象
    const metContourPoints = cv.matFromArray(
      // rows，行数：双通道，所以行数就是[x, y]作为一个Point的行数
      positivePointAoa.length,
      // cols，列数：1列，即一个Point维度
      1,
      // type，数据类型：CV_32SC2，即32位有符号整数，但是有2个通道（x，y）
      cv.CV_32SC2,
      // array，用于创建Mat对象的数组，即把轮廓坐标点的AOA数组扁平化后传进去
      positivePointAoa.flat(),
    )
    // 获得椭圆对象
    ellipse = cv.fitEllipseAMS(metContourPoints)
    // 删除metContourPoints释放WASM内存
    metContourPoints.delete()
    // 处理椭圆方程，得到新的positivePointAoa和negativePointAoa
    // 新的分区数组
    const PTPointAoa = []   // 阳性-正确（继续保持阳性）
    const PFPointAoa = []   // 阳性-错误（降为阴性）
    const NTPointAoa = []   // 阴性-正确（继续阴性）
    const NFPointAoa = []   // 阴性-错误（复活为阳性）
    // 对应的距离数组，各点到基线距离的数组
    const PTDistanceArr = []
    const PFDistanceArr = []
    const NTDistanceArr = []
    const NFDistanceArr = []
    // 统计数据（用于 R² 计算）
    const statisticDataArr = []
    let statisticPointRSum = 0
    // 椭圆参数，长轴w、短轴h、以及两者平方乘积/4，以简化后面r的计算公式
    const ellipseW = ellipse.size.width
    const ellipseH = ellipse.size.height
    const ellipseHalfHWSquare = (ellipseW ** 2) * (ellipseH ** 2) / 4
    // 接椭圆中心点坐标
    const ellipseCenterX = ellipse.center.x
    const ellipseCenterY = ellipse.center.y
    // 接椭圆旋转角
    // 逆旋转角（canvas 顺时针为正，Y 向下为正，数学公式对称可用）
    const ellipseAngle = -ellipse.angle
    // canvas的椭圆旋转角是顺时针为正的，同时Y向下为正，那么数学公式应该刚好对称可用
    const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
    const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
    /**
     * 打包椭圆参数，方便后面筛选点时传递
     * @type { [number, number, number, number, number, number, number] }
     */
    const ellipseParamArr = [
      ellipseH, ellipseW, ellipseHalfHWSquare,
      ellipseCenterX, ellipseCenterY,
      ellipseAngleSin, ellipseAngleCos
    ]
    // ---- 筛选阳性点集中的点 ----
    forEachPositivePoint: for (let i = 0; i < positivePointAoa.length; i++) {
      // 筛选点。对阳性点集来说，阳性点集当中的阳性 == PT，阳性点集当中的阴性 == PF
      const [pointR, ellipseR] = _pointFilter(
        positivePointAoa[i], toleranceValue,
        positiveDistanceArr[i], 1,
        PTPointAoa, PFPointAoa, PTDistanceArr, PFDistanceArr,
        ellipseParamArr
      )
      // 收集统计数据用于 R²
      statisticDataArr.push([pointR, ellipseR])
      statisticPointRSum += pointR
    }
    // ---- 筛选阴性点集中的点（复活赛） ----
    forEachNegativePoint: for (let i = 0; i < negativePointAoa.length; i++) {
      _pointFilter(
        negativePointAoa[i], toleranceValue * NP_TO_PP_THRESHOLD,
        negativeDistanceArr[i], NP_TO_PP_THRESHOLD,
        NFPointAoa, NTPointAoa, NFDistanceArr, NTDistanceArr,
        ellipseParamArr
      )
    }
    // ---- 计算 R² ----
    // R² = 1 - SSE / SST = SSR / SST
    //    = 1 - 平方和[(r拟合值 - r个体值)²] / 平方和[(r个体值 - r均值)²]
    //    = 平方和[(r拟合值 - r均值)²] / 平方和[(r个体值 - r均值)²]
    // 获取数据样本数量、r均值、声明SSR、SST
    const pointLength = statisticDataArr.length
    const pointRAve = statisticPointRSum / pointLength
    let SSR = 0
    let SST = 0
    // 遍历以计算SSR和SST
    for (let i = 0; i < pointLength; i++) {
      const [pointR, ellipseR] = statisticDataArr[i]
      SSR += (ellipseR - pointRAve) ** 2
      SST += (pointR - pointRAve) ** 2
    }
    // 更新R²
    R2 = SSR / SST
    // ---- 判断收敛 ----
    // 阳性-错误 和 阴性-错误 都为空 → 收敛
    if (PFPointAoa.length === 0 && NFPointAoa.length === 0) {
      // 如果当前收敛了，就再看看R²是否满足要求，筛选容差还能不能再降
      // R²达标 或 容差已收紧到底
      if (R2 >= R2_THRESHOLD || toleranceValue < TOLERANCE_VALUE_MIN) {
        isConverge = true
      // 否则上强度：收紧容差
      } else {
        toleranceValue *= ITERATION_WEIGHT
      }
    // 如果当前没收敛
    } else {
      // 更新阳性、阴性点数组
      positivePointAoa.length = 0
      positivePointAoa.push(...PTPointAoa, ...NFPointAoa)
      negativePointAoa.length = 0
      negativePointAoa.push(...PFPointAoa, ...NTPointAoa)
      // 更新阳性、阴性点距离基线距离数组
      positiveDistanceArr.length = 0
      positiveDistanceArr.push(...PTDistanceArr, ...NFDistanceArr)
      negativeDistanceArr.length = 0
      negativeDistanceArr.push(...PFDistanceArr, ...NTDistanceArr)
    }
    // 这个涉及到语言包，放到vue模块里执行
    // // 如果当前迭代没收敛，但是positivePointAoa数组长度小于等于5了，那么还是得强行收敛，否则报错
    // if (!isConverge && positivePointAoa.length <= 5) {
    //   // 强行收敛
    //   isConverge = true
    //   // 返回一个标记供调用方处理
    //   console.warn("有效数据点不足，已强行停止迭代。")
    // }
  }
  // 迭代完毕，把最后一次的R²、椭圆参数返回
  return { ellipse, R2, baselineReferencePoint }
  // ========================================================
  // 内部函数：根据椭圆参数筛选单个点
  // 维持嵌套，因为它引用了外层的 ellipseParamArr 和基线参考点
  // ========================================================
  /**
   * 筛选单个点：将其归入"阳性"或"阴性"点集
   * 设计思路：
   *   1. 将点去中心化 + 逆旋转，迁移到标准椭圆坐标系
   *   2. 计算点的径向距离 pointR 和该方向上椭圆的径向距离 ellipseR
   *   3. 以 pointR 与 ellipseR 的相对偏差作为主要筛选条件
   *   4. 以点到基线的距离作为辅助筛选条件（距离太远的点更可能是噪声）
   * @param { [number, number] } point - 点的原始坐标 [x, y]
   * @param { number } tolerance - 容差（相对值）
   * @param { number } pointToBaselineDistance - 点到基线的距离
   * @param { number } distanceCoefficient - 距离系数（阴性点用更严格的系数）
   * @param { number[][] } PPointAoa - 阳性点集（接收数组）
   * @param { number[][] } NPointAoa - 阴性点集（接收数组）
   * @param { number[] } PDistanceArr - 阳性点距离数组（接收数组）
   * @param { number[] } NDistanceArr - 阴性点距离数组（接收数组）
   * @param { [number, number, number, number, number, number, number] } eParam - 椭圆参数数组
   * @returns { [number, number] } [pointR, ellipseR] 点的径向距离和椭圆径向距离
   */
  function _pointFilter(
    [pointX, pointY], tolerance, pointToBaselineDistance, distanceCoefficient,
    PPointAoa, NPointAoa, PDistanceArr, NDistanceArr,
    [eH, eW, eHalfHWSquare, eCenterX, eCenterY, eAngleSin, eAngleCos]
  ) {
    // 去中心化
    const pointXCentered = pointX - eCenterX
    const pointYCentered = pointY - eCenterY
    // 旋转迁移，完成化归
    // x' = xcosθ - ysinθ
    // y' = xsinθ + ycosθ
    const pointXNormalized = pointXCentered * eAngleCos - pointYCentered * eAngleSin
    const pointYNormalized = pointXCentered * eAngleSin + pointYCentered * eAngleCos
    // 计算点的径向距离
    const pointR = Math.sqrt(pointXNormalized ** 2 + pointYNormalized ** 2)
    // 计算点的极角（弧度）
    const pointRad = Math.atan2(pointYNormalized, pointXNormalized)
    // 通过极角计算椭圆在该方向上的径向距离：
    // 椭圆方程 r²·{[(cosθ)/(w/2)]² + [(sinθ)/(h/2)]²} = 1
    // => r² = (w²·h²/4) / [(h·cosθ)² + (w·sinθ)²]
    const ellipseRSquare = eHalfHWSquare /
      (((eH * Math.cos(pointRad)) ** 2) + ((eW * Math.sin(pointRad)) ** 2))
    // 计算椭圆在该方向的半径：r = r² ** 0.5
    const ellipseR = Math.sqrt(ellipseRSquare)
    // 点与椭圆的绝对偏差
    const pointToEllipseDistance = Math.abs(pointR - ellipseR)
    // 点与椭圆的相对偏差
    const pointRRelative = pointToEllipseDistance / ellipseR
    // 筛选：超过容差或距离基线太远 → 阴性
    if (
      pointRRelative > tolerance ||
      pointToEllipseDistance > pointToBaselineDistance / distanceCoefficient
    ) {
      // 不好的点，把初始坐标数据、距离数据丢进阴性点集
      NPointAoa.push([pointX, pointY])
      NDistanceArr.push(pointToBaselineDistance)
    } else {
      // 好的点，把初始坐标数据、距离数据丢进阳性点集
      PPointAoa.push([pointX, pointY])
      PDistanceArr.push(pointToBaselineDistance)
      // 更新基线参考点：取 Y 值最大的点（canvas 坐标系中 Y 向下为正，即最低点）
      if (baselineReferencePoint[1] < pointY) {
        baselineReferencePoint = [pointX, pointY]
      }
    }
    // 返回点半径和椭圆半径
    return [pointR, ellipseR]
  }
}


// ================================ 3. 接触角角度数值求解 ================================


/**
 * calculateContactAngle 计算接触角（纯数学部分）
 * 设计思路：
 * 1.  把基线的2个截距点迁移到标准椭圆坐标系
 * 2.  以2个截距点构建基线方程 y = ax + b
 * 3.  基线方程变换为 r ~ θ 关系：
 *     y = r·sinθ；x = r·cosθ
 * 4.  基线方程与椭圆方程联立。椭圆方程：
 *     r²·{[(cosθ)/(w/2)]² + [(sinθ)/(h/2)]²} = 1
 * 5.  解3和4的方程，消去r后得到关于cotθ的二次方程：
 *     a·cot²θ + b·cotθ + c = 0
 * 6.  由cotθ得到θ，得到两边的切线斜率
 *     斜率 = - (1 / tanθ) · (h / w)²
 * 7.  计算两切线斜率和基线截距之间的夹角，即为接触角
 * @param { object } param
 * @param { CV.Ellipse } param.ellipse - 椭圆对象
 * @param { number } param.leftIntercept - 左截距（用户视角 Y 坐标，即 canvas.height - canvasY）
 * @param { number } param.rightIntercept - 右截距（用户视角 Y 坐标）
 * @param { number } param.canvasWidth - canvas 实际宽度
 * @param { number } param.canvasHeight - canvas 实际高度
 * @returns {{
 *   contactAngleAverage: number,
 *   contactAngleLeft: number,
 *   contactAngleRight: number,
 *   contactAngleDeviation: number,
 *   interceptAngle: number
 * }} 接触角计算结果：
 *   - contactAngleAverage: 平均接触角
 *   - contactAngleLeft: 左接触角
 *   - contactAngleRight: 右接触角
 *   - contactAngleDeviation: 角度偏差
 *   - interceptAngle: 基线角度
 * @throws { Error } 方程判别式 ≤ 0 时抛出异常
 */
export function calculateContactAngle({
  ellipse, leftIntercept, rightIntercept, canvasWidth, canvasHeight
}) {
  // 将截距从用户视角转回canvas视角
  // 接左、右截距点的X和Y坐标
  const interceptPoint1X = 0
  const interceptPoint1Y = canvasHeight - leftIntercept
  const interceptPoint2X = canvasWidth
  const interceptPoint2Y = canvasHeight - rightIntercept
  // 计算基线角度（取反，因为 canvas Y 向下为正）
  const interceptAngle = Math.atan2(
    interceptPoint2Y - interceptPoint1Y,
    interceptPoint2X - interceptPoint1X
  ) * 180 / Math.PI * -1
  // ---- 迁移截距点到标准椭圆坐标系 ----
  // 准备逆旋转角及相关数值
  const ellipseAngle = -ellipse.angle
  const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
  const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
  // 椭圆中心点坐标
  const ellipseCenterX = ellipse.center.x
  const ellipseCenterY = ellipse.center.y
  // 去中心化
  const p1xCentered = interceptPoint1X - ellipseCenterX
  const p1yCentered = interceptPoint1Y - ellipseCenterY
  const p2xCentered = interceptPoint2X - ellipseCenterX
  const p2yCentered = interceptPoint2Y - ellipseCenterY
  // 把截距点逆旋转到标准椭圆坐标系
  // x' = x·cosθ - y·sinθ
  // y' = x·sinθ + y·cosθ
  const newP1X = p1xCentered * ellipseAngleCos - p1yCentered * ellipseAngleSin
  const newP1Y = p1xCentered * ellipseAngleSin + p1yCentered * ellipseAngleCos
  const newP2X = p2xCentered * ellipseAngleCos - p2yCentered * ellipseAngleSin
  const newP2Y = p2xCentered * ellipseAngleSin + p2yCentered * ellipseAngleCos
  // 解方程计算θ
  // 基线截距的方程形式：(y - p1y) / (x - p1x) = (p2y - p1y) / (p2x - p1x)
  // 防止分母为0，则更安全的写法为：(y - p1y) · (p2x - p1x) = (p2y - p1y) · (x - p1x)
  // 令：kx = p2x - p1x；ky = p2y - p1y，则：
  // kx · (y - p1y) = ky · (x - p1x)
  // 又有：x = r · cosθ，y = r · sinθ，则有：
  // kx · (r · sinθ - p1y) = ky · (r · cosθ - p1x)
  // 化简得式①：r · (kx · sinθ - ky · cosθ) = (kx · p1y - ky · p1x)
  // 而椭圆自身方程式②： 4 · r² · [(cosθ / w)² + (sinθ / h)²] = 1
  // r必不为0，则①、②两式联立消除r，然后把sinθ、cosθ合并为cotθ，得：
  // (这里需要考虑θ为0°的情况)
  // 在一个 a · cot²θ + b · cotθ + c = 0 的二次方程中：
  //   a = (p2y - p1y)² - 4 · (p2x · p1y - p1x · p2y)² / w²
  //   b = - 2 · (p2x - p1x) · (p2y - p1y)
  //   c = (p2x - p1x)² - 4 · (p2x · p1y - p1x · p2y)² / h²
  // 这里面，(p2x - p1x)、(p2y - p1y)、(p2x · p1y - p1x · p2y)²都是可复用的
  // 令：
  //   kx = p2x - p1x；
  //   ky = p2y - p1y；
  //   kmix = p2x · p1y - p1x · p2y；
  // 则有：
  //   a = ky² - (2 · kmix / w)²
  //   b = - 2 · kx · ky
  //   c = kx² - (2 · kmix / h)²
  // 接参数，现在要尽可能简化参数名称
  const w = ellipse.size.width
  const h = ellipse.size.height
  const kx = newP2X - newP1X
  const ky = newP2Y - newP1Y
  const kmix = newP2X * newP1Y - newP1X * newP2Y
  const a = (ky ** 2) - ((2 * kmix / w) ** 2)
  const b = -2 * kx * ky
  const c = (kx ** 2) - ((2 * kmix / h) ** 2)
  // 然后开始解方程
  // 对于 ax² + bx + c = 0 的二次方程：
  // 判别式：Δ = delta = b² - 4ac
  // 求根公式：(-b ± sqrt(delta)) / 2a
  const delta = b ** 2 - 4 * a * c
  // 如果判别式小于0，则方程无解；等于0，有1个解，都不行
  if (delta <= 0) {
    throw Error("方程没有2个解")
  }
  // 接下来处理正常情况：
  // 获取cot(θ)的两个解
  const cot1 = (-b + Math.sqrt(delta)) / (2 * a)
  const cot2 = (-b - Math.sqrt(delta)) / (2 * a)
  // 计算切线斜率
  // 切线斜率 = - (1 / tanθ) · (h / w)² = - cotθ · (h / w)²
  const slope1 = -cot1 * ((h / w) ** 2)
  const slope2 = -cot2 * ((h / w) ** 2)
  // 基线斜率
  const baselineSlope = ky / kx
  // 转回原始坐标系的切线角和基线角
  // Math.atan()方法返回[-90°, 90°]的弧度值，叠加ellipseAngle后，结果会超过阈值
  // 所以需通过增减180，让结果在[-90°, 90°]之间
  let oldAngleTangent1 = (Math.atan(slope1) * 180 / Math.PI - ellipseAngle) % 180
  let oldAngleTangent2 = (Math.atan(slope2) * 180 / Math.PI - ellipseAngle) % 180
  let oldAngleBaseline = (Math.atan(baselineSlope) * 180 / Math.PI - ellipseAngle) % 180
  // 将角度修正到 [-90°, 90°] 范围
  oldAngleTangent1 = _normalizeAngle(oldAngleTangent1)
  oldAngleTangent2 = _normalizeAngle(oldAngleTangent2)
  oldAngleBaseline = _normalizeAngle(oldAngleBaseline)
  // ---- 判断接触角是否为钝角 ----
  // 以原始基线而言，其x = 椭圆圆心x时，y是在椭圆圆心上方还是下方？
  // 如果y在椭圆圆心上方（y小于椭圆圆心），则接触角小于90°；
  // 如果y在椭圆圆心下方（y小大于椭圆圆心），则接触角大于90°
  // 基线-圆心计算y
  // 基线在椭圆中心 x 处的 y 值：如果在中心下方（y > centerY），则为钝角
  const baselineEllipseCenterY =
    (interceptPoint2Y - interceptPoint1Y) / interceptPoint2X * ellipseCenterX
      + interceptPoint1Y
  // 用迁移量来判断是否为钝角
  const isContactAngleObtuse = baselineEllipseCenterY > ellipseCenterY
  // ---- 计算左右接触角 ----
  // 目前不出意外，基线角度很小。会有一个切线大于90°，一个切线小于90°。需要判断情况：
  // 对于接触角小于90°的情况：
  //   左侧切线角度为负，右侧切线角度为正。
  //   更严谨的说，左侧切线角 < 右侧切线角，未必分正负
  //   左接触角 =  - (左侧切线角度(负) - 基线角度)
  //   右接触角 =  + (右侧切线角度(正) - 基线角度)
  // 对于接触角大于90°的情况：
  //   左侧切线角度为正，右侧切线角度为负：
  //   更严谨的说，左侧切线角 > 右侧切线角，未必分正负
  //   左接触角 = 180 - (左侧切线角度(正) - 基线角度)
  //   右接触角 = 180 - (- (右侧切线角度(负) - 基线角度)) = 180 + (右侧切线角度(负) - 基线角度)
  // 事实上，存在同正同负的情况。
  // 下面开始判断
  let contactAngleLeft, contactAngleRight
  // 如果不是钝角
  if (!isContactAngleObtuse) {
    // 锐角或直角的情况下：以正负大小判断左右，角度小的在左侧
    if (oldAngleTangent1 > oldAngleTangent2) {
      // 1 > 2 => 左-2，右-1
      contactAngleLeft = -(oldAngleTangent2 - oldAngleBaseline)
      contactAngleRight = oldAngleTangent1 - oldAngleBaseline
    } else {
      // 2 > 1 => 左-1，右-2
      contactAngleLeft = -(oldAngleTangent1 - oldAngleBaseline)
      contactAngleRight = oldAngleTangent2 - oldAngleBaseline
    }
  // 如果是钝角
  } else {
    // 钝角情况：角度大的在左侧
    if (oldAngleTangent1 > oldAngleTangent2) {
      // 1 > 2 => 左-1，右-2
      contactAngleLeft = 180 - (oldAngleTangent1 - oldAngleBaseline)
      contactAngleRight = 180 + (oldAngleTangent2 - oldAngleBaseline)
    } else {
      // 1 < 2 => 左-2，右-1
      contactAngleLeft = 180 - (oldAngleTangent2 - oldAngleBaseline)
      contactAngleRight = 180 + (oldAngleTangent1 - oldAngleBaseline)
    }
  }
  // 将接触角修正到 (0°, 180°) 范围
  // 在近乎钝角（1个是钝角，1个是锐角）的情况下，会出现接触角为负数的情况，需要修正
  contactAngleLeft = _clampAngle(contactAngleLeft)
  contactAngleRight = _clampAngle(contactAngleRight)
  // 接触角均值和偏差
  const contactAngleAverage = (contactAngleLeft + contactAngleRight) / 2
  const contactAngleDeviation = Math.abs(contactAngleLeft - contactAngleRight)
  // 返回结果
  return {
    contactAngleAverage,
    contactAngleLeft,
    contactAngleRight,
    contactAngleDeviation,
    interceptAngle,
  }
  // ---- 内部工具函数 ----
  /**
   * 将角度修正到 [-90°, 90°] 范围
   * @param { number } angle
   * @returns { number }
   */
  function _normalizeAngle(angle) {
    if (angle > 90) return angle - 180
    if (angle <= -90) return angle + 180
    return angle
  }
  /**
   * 将接触角修正到 (0°, 180°) 范围
   * @param { number } angle
   * @returns { number }
   */
  function _clampAngle(angle) {
    if (angle < 0) return angle + 180
    if (angle > 180) return angle - 180
    return angle
  }
}


// ================================ 4. 工具函数 ================================
