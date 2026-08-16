/**
 * 接触角求解 · 算法主体
 * ---
 * 接触角业务中的"纯计算"逻辑，模块内部分为以下几个业务区域：
 * 0.  导入导出方法
 *     getEllipse() 椭圆拟合算法，即 TIR-DT 算法的完整模块
 * 1.  选框 / 遮罩相关工具方法
 *     computeRect() 选框坐标计算
 *     computeBaseline() 基线计算
 *     computeColLine() 选线方法（轮廓左右两侧的过滤线）
 * 2.  轮廓拟合算法
 *     filterContourPoints() 轮廓点过滤（基线遮罩 + 中心遮罩 + 边缘切边）
 *     baselineFilterContourPoints() 仅基线过滤的版本（步骤 3 用）
 *     getContourPoints() 仅 OpenCV Mat 提取 + 边缘切边 + 中心遮罩（步骤 3 用）
 *     getEllipseOld() 椭圆拟合（已废弃）
 * 3.  接触角角度求解算法
 *     calculateContactAngle() 接触角计算
 * 4.  其它工具函数（位于 ContactAngle-algorithm-dtirdt.ts）
 *
 * 本文件迁移自 .js → .ts，做"宽松转译"：
 * - 保留 JSDoc 注释
 * - 顶层 @typedef 提取为 TS interface / type
 * - 函数签名加返回类型注解（基础类型）
 * - OpenCV 类型从 @techstark/opencv-js 直接 import
 *
 * 注：内部各函数互相独立，无 export 依赖。getEllipse 从 dtirdt.ts re-export。
 */

import type { CV, Mat, MatVector } from "@techstark/opencv-js"
// 从 dtirdt.ts 重导出椭圆拟合主入口
export { getEllipse } from "./ContactAngle-algorithm-dtirdt.ts"

// ================================ 类型定义 ================================

import type { Rect, ColLine, Baseline } from "./types.ts"

// ================================ 1. 选框 / 遮罩相关工具方法 ================================

/**
 * 类型守卫：rect 是否已被初始化（四个边界都非 null）
 * 配合 computeRect 使用，让 TS 在第一次点击后能推断出非 null
 */
function isRectInitialized(
  rect: Rect
): rect is Rect & { xMax: number; yMax: number; xMin: number; yMin: number } {
  return rect.xMax !== null && rect.yMax !== null && rect.xMin !== null && rect.yMin !== null
}

/**
 * computeRect 选框坐标计算
 * 根据点击位置更新选框的 X、Y 坐标边界值
 *
 * - 第一次点击时，以点击位置为中心，生成一个初始矩形框（宽高比约 3:2）
 * - 后续点击时，根据点击位置与当前选框的几何关系，动态调整选框边界：
 *   - 在框外 → 直接扩展对应边界
 *   - 在框内 → 通过"交叉线斜率比较"判断点位于哪个象限，然后缩进对应边界
 *
 * @note 选框的 X、Y 坐标边界值会直接修改传入的 rect 对象
 */
export function computeRect({
  clickX,
  clickY,
  canvasWidth,
  canvasHeight,
  rect,
  RECT_SCALE = 0.5,
  RECT_X_TO_Y = 2 / 3
}: {
  clickX: number
  clickY: number
  canvasWidth: number
  canvasHeight: number
  rect: Rect
  RECT_SCALE?: number
  RECT_X_TO_Y?: number
}): void {
  // 如果选框未初始化，生成初始选框
  if (!isRectInitialized(rect)) {
    const rectHalfX = Math.min(
      canvasWidth * RECT_SCALE * 0.5,
      canvasHeight * RECT_SCALE * 0.5
    )
    const rectHalfY = rectHalfX * RECT_X_TO_Y
    rect.xMax = Math.min(clickX + rectHalfX, canvasWidth)
    rect.yMax = Math.min(clickY + rectHalfY, canvasHeight)
    rect.xMin = Math.max(clickX - rectHalfX, 0)
    rect.yMin = Math.max(clickY - rectHalfY, 0)
    return
  }
  // 已有选框：判断在框内还是框外
  // 此处 isRectInitialized 已缩窄类型，rect.xMax 等都是 number
  let isInRect = 0
  if (clickX >= rect.xMax) {
    rect.xMax = clickX
  } else if (clickX <= rect.xMin) {
    rect.xMin = clickX
  } else {
    isInRect++
  }
  if (clickY >= rect.yMax) {
    rect.yMax = clickY
  } else if (clickY <= rect.yMin) {
    rect.yMin = clickY
  } else {
    isInRect++
  }
  // 至少有一轴在框外 → 已扩展，直接返回
  if (isInRect !== 2) {
    return
  }
  // 两轴都在框内：用交叉线斜率判定象限，缩进对应边界
  const rectSlope = (rect.yMax - rect.yMin) / (rect.xMax - rect.xMin)
  const clickSlopePositive = (clickY - rect.yMin) / (clickX - rect.xMin)
  const clickSlopeNegative = (clickY - rect.yMin) / (clickX - rect.xMax)
  if (clickSlopePositive >= rectSlope) {
    if (clickSlopeNegative <= -rectSlope) {
      rect.yMax = clickY
    } else {
      rect.xMin = clickX
    }
  } else {
    if (clickSlopeNegative <= -rectSlope) {
      rect.xMax = clickX
    } else {
      rect.yMin = clickY
    }
  }
}


/**
 * computeBaseline 选线方法。选择轮廓下方的基线过滤线
 *
 * 将 canvas 水平分为三个区域：左区（35%）、中区（30%）、右区（35%）。
 * - 左区：只调整左截距，通过相似三角形计算新的左截距值
 * - 右区：只调整右截距，同理
 * - 中区：计算当前点击位置对应的基线 Y 值，然后整体上下平移两条截距
 *
 * @note 基线截距会直接修改传入的 baseline 对象
 */
export function computeBaseline({
  clickX,
  clickY,
  canvasWidth,
  canvasHeight,
  baseline
}: {
  clickX: number
  clickY: number
  canvasWidth: number
  canvasHeight: number
  baseline: Baseline
}): void {
  let leftIntercept = baseline.left ?? canvasHeight
  let rightIntercept = baseline.right ?? canvasHeight
  if (clickX < canvasWidth * 0.35) {
    // 左区：相似三角形计算左截距
    leftIntercept =
      canvasWidth / (canvasWidth - clickX)
        * (clickY - rightIntercept)
        + rightIntercept
  } else if (clickX > canvasWidth * 0.65) {
    // 右区：相似三角形计算右截距
    rightIntercept =
      canvasWidth / clickX
        * (clickY - leftIntercept)
        + leftIntercept
  } else {
    // 中区：整体平移
    const baselineSlope = (rightIntercept - leftIntercept) / canvasWidth
    const interceptPointY = baselineSlope * clickX + leftIntercept
    const offsetY = clickY - interceptPointY
    leftIntercept += offsetY
    rightIntercept += offsetY
  }
  baseline.left = leftIntercept
  baseline.right = rightIntercept
}


/**
 * computeColLine 选线方法。选择轮廓左右两侧的过滤线
 *
 * 将 canvas 水平一分为二，点击左半则更新左侧线，右半则更新右侧线。
 *
 * @note 遮罩线坐标会直接修改传入的 colLine 对象
 */
export function computeColLine({
  clickX,
  canvasWidth,
  colLine
}: {
  clickX: number
  canvasWidth: number
  colLine: ColLine
}): void {
  const canvasWidthHalf = canvasWidth / 2
  if (clickX < canvasWidthHalf) {
    colLine.left = Math.ceil(clickX)
  } else {
    colLine.right = Math.floor(clickX)
  }
}

// ================================ 2. 轮廓拟合算法 ================================

/**
 * getContourPoints 获取轮廓点，并滤去明显有问题的杂点
 *
 * 杂点定义：位于 canvas 边缘 1% 区域内的点，及位于中心遮罩框内 / 两边遮罩框外的点
 * 基线遮罩不在这一步过滤（放后面，因学生也会调整基线）
 *
 * @param metVectorContours - OpenCV 轮廓点的 MatVector
 * @param colLine - 左右遮罩线坐标
 * @param rect - 中心遮罩框坐标
 * @param canvasWidth - canvas 实际宽度
 * @param canvasHeight - canvas 实际高度
 * @returns 过滤后的轮廓点坐标数组 [x, y][]
 */
export function getContourPoints({
  metVectorContours,
  colLine,
  rect,
  canvasWidth,
  canvasHeight
}: {
  metVectorContours: MatVector
  colLine: ColLine
  rect: Rect
  canvasWidth: number
  canvasHeight: number
}): [number, number][] {
  /** 过滤线阈值，1% 切边 */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  /** 过滤后的轮廓点坐标数组 */
  const contourPointAoa: [number, number][] = []
  const filterWidthMin = colLine.left ?? Math.ceil(canvasWidth * CANVAS_EDGE_PERCENTAGE)
  const filterWidthMax = colLine.right ?? Math.floor(canvasWidth * (1 - CANVAS_EDGE_PERCENTAGE))
  const filterHeightMin = Math.ceil(canvasHeight * CANVAS_EDGE_PERCENTAGE)
  const filterHeightMax = Math.floor(canvasHeight * (1 - CANVAS_EDGE_PERCENTAGE))
  const maskWidthMin = rect.xMin ?? filterWidthMax
  const maskHeightMin = rect.yMin ?? filterHeightMax
  const maskWidthMax = rect.xMax ?? filterWidthMin
  const maskHeightMax = rect.yMax ?? filterHeightMin
  for (let i = 0; i < metVectorContours.size(); i++) {
    const metContour = metVectorContours.get(i) as unknown as OpenCVMat
    for (let j = 0; j < metContour.rows; j++) {
      const pointX = metContour.data32S[j * 2]!
      const pointY = metContour.data32S[j * 2 + 1]!
      // 边缘 1% 切边
      if (
        (pointX <= filterWidthMin) || (pointX >= filterWidthMax)
          || (pointY <= filterHeightMin) || (pointY >= filterHeightMax)
      ) {
        continue
      }
      // 中心遮罩：在框外才保留
      if (
        (pointX < maskWidthMin) || (pointX > maskWidthMax)
          || (pointY < maskHeightMin) || (pointY > maskHeightMax)
      ) {
        contourPointAoa.push([pointX, pointY])
      }
    }
    metContour.delete()
  }
  return contourPointAoa
}


/**
 * baselineFilterContourPoints 用基线过滤轮廓点（步骤 3 用版本）
 *
 * 1. 根据基线遮罩（如有）过滤掉位于基线下方的点（通过斜率比较）
 * 2. 同时计算每个保留点到基线的距离
 *
 * @returns { contourPointAoa, contourPointToBaselineDistanceArr }
 */
export function baselineFilterContourPoints({
  rawContourPointAoa,
  baseline,
  canvasWidth,
  canvasHeight
}: {
  rawContourPointAoa: [number, number][]
  baseline: Baseline
  canvasWidth: number
  canvasHeight: number
}): { contourPointAoa: [number, number][]; contourPointToBaselineDistanceArr: number[] } {
  const newContourPointAoa: [number, number][] = []
  const contourPointToBaselineDistanceArr: number[] = []
  /** 过滤线阈值，1% 切边 */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  const filterHeightMax = Math.floor(canvasHeight * (1 - CANVAS_EDGE_PERCENTAGE))
  const filterBaselineLeft = baseline.left ?? filterHeightMax
  const filterBaselineRight = baseline.right ?? filterHeightMax
  const filterBaselineDifference = filterBaselineRight - filterBaselineLeft
  const filterBaselineSlope = filterBaselineDifference / canvasWidth
  /** 轮廓点到底部基线的距离²的计算用分母 */
  const distanceSquareDenominator = canvasWidth ** 2 + filterBaselineDifference ** 2
  for (const contourPoint of rawContourPointAoa) {
    const pointX = contourPoint[0]
    const pointY = contourPoint[1]
    const pointToBaselineSlope = (pointY - filterBaselineLeft) / pointX
    if (pointToBaselineSlope > filterBaselineSlope) {
      continue
    }
    newContourPointAoa.push([pointX, pointY])
    const distanceSquareNumerator =
      (canvasWidth * (pointY - filterBaselineLeft) - filterBaselineDifference * pointX) ** 2
    const distance = Math.sqrt(distanceSquareNumerator / distanceSquareDenominator)
    contourPointToBaselineDistanceArr.push(distance)
  }
  return {
    contourPointAoa: newContourPointAoa,
    contourPointToBaselineDistanceArr: contourPointToBaselineDistanceArr
  }
}


/**
 * filterContourPoints 过滤轮廓点，滤去明显有问题的杂点（步骤 4 用版本）
 *
 * 1. 过滤掉位于 canvas 边缘 1% 区域内的点
 * 2. 根据基线遮罩过滤掉位于基线下方的点（通过斜率比较）
 * 3. 根据中心遮罩过滤掉位于遮罩框内的点
 * 4. 同时计算每个保留点到基线的距离
 *
 * @throws 轮廓点不足 6 个时抛出异常
 */
export function filterContourPoints({
  metVectorContours,
  colLine,
  rect,
  baseline,
  canvasWidth,
  canvasHeight
}: {
  metVectorContours: MatVector
  colLine: ColLine
  rect: Rect
  baseline: Baseline
  canvasWidth: number
  canvasHeight: number
}): { contourPointAoa: [number, number][]; contourPointToBaselineDistanceArr: number[] } {
  /** 过滤线阈值，1% 切边 */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  const contourPointAoa: [number, number][] = []
  const contourPointToBaselineDistanceArr: number[] = []
  const filterWidthMin = colLine.left ?? Math.ceil(canvasWidth * CANVAS_EDGE_PERCENTAGE)
  const filterWidthMax = colLine.right ?? Math.floor(canvasWidth * (1 - CANVAS_EDGE_PERCENTAGE))
  const filterHeightMin = Math.ceil(canvasHeight * CANVAS_EDGE_PERCENTAGE)
  const filterHeightMax = Math.floor(canvasHeight * (1 - CANVAS_EDGE_PERCENTAGE))
  const filterHeightMaxLeft = baseline.left ?? filterHeightMax
  const filterHeightMaxRight = baseline.right ?? filterHeightMax
  const heightDifference = filterHeightMaxRight - filterHeightMaxLeft
  const filterHeightMaxSlope = heightDifference / canvasWidth
  const maskWidthMin = rect.xMin ?? filterWidthMax
  const maskHeightMin = rect.yMin ?? filterHeightMax
  const maskWidthMax = rect.xMax ?? filterWidthMin
  const maskHeightMax = rect.yMax ?? filterHeightMin
  const distanceSquareDenominator = canvasWidth ** 2 + heightDifference ** 2
  for (let i = 0; i < metVectorContours.size(); i++) {
    const metContour = metVectorContours.get(i) as unknown as OpenCVMat
    for (let j = 0; j < metContour.rows; j++) {
      const pointX = metContour.data32S[j * 2]!
      const pointY = metContour.data32S[j * 2 + 1]!
      // 边缘 1% 切边
      if (pointX <= filterWidthMin || pointX >= filterWidthMax || pointY <= filterHeightMin) {
        continue
      }
      // 基线遮罩：相对斜率超过基线斜率 → 在基线下方
      const pointToBaselineSlope = (pointY - filterHeightMaxLeft) / pointX
      if (pointToBaselineSlope > filterHeightMaxSlope) {
        continue
      }
      // 中心遮罩：在框外才保留
      if (
        pointX < maskWidthMin || pointX > maskWidthMax ||
        pointY < maskHeightMin || pointY > maskHeightMax
      ) {
        contourPointAoa.push([pointX, pointY])
        const distanceSquareNumerator =
          (canvasWidth * (pointY - filterHeightMaxLeft) - heightDifference * pointX) ** 2
        contourPointToBaselineDistanceArr.push(
          Math.sqrt(distanceSquareNumerator / distanceSquareDenominator)
        )
      }
    }
    metContour.delete()
  }
  return { contourPointAoa, contourPointToBaselineDistanceArr }
}

/**
 * 旧版椭圆拟合（已废弃，仅保留以备不时之需）
 *
 * 算法核心是"双层迭代"结构：
 * - 外层：收紧容差值（toleranceValue × ITERATION_WEIGHT）
 * - 内层：将轮廓点分为"阳性点集"（拟合良好）和"阴性点集"（偏离过大），
 *         每轮用阳性点集拟合椭圆，再给阴性点一个"复活赛"机会。
 * - 收敛条件：阳性/阴性点集不再变化，且 R² ≥ 阈值 或容差值已收紧至最小。
 *
 * @deprecated 由 dtirdt.ts 的 getEllipse 替代
 */
export function getEllipseOld({
  cv,
  contourPointAoa,
  contourPointToBaselineDistanceArr
}: {
  cv: CV
  contourPointAoa: [number, number][]
  contourPointToBaselineDistanceArr: number[]
}): { ellipse: OpenCVEllipse | null; R2: number; baselineReferencePoint: [number, number] } {
  /** 初始容差 */
  const TOLERANCE_VALUE_INIT = 0.2
  /** 最小容差 */
  const TOLERANCE_VALUE_MIN = 0.001
  /** 阴性点复活难度系数 */
  const NP_TO_PP_THRESHOLD = 0.7
  /** 容差收紧加权因子 */
  const ITERATION_WEIGHT = 0.7
  /** R² 收敛阈值 */
  const R2_THRESHOLD = 0.99
  /** 最大迭代次数 */
  const ITERATION_COUNT_MAX = 100
  let toleranceValue = TOLERANCE_VALUE_INIT
  const positivePointAoa = contourPointAoa
  const positiveDistanceArr = contourPointToBaselineDistanceArr
  const negativePointAoa: [number, number][] = []
  const negativeDistanceArr: number[] = []
  let R2: number | null = null
  let isConverge = false
  let iterationCount = 0
  let ellipse: OpenCVEllipse | null = null
  let baselineReferencePoint: [number, number] = [0, 0]
  contourPointIterate: while (!isConverge && iterationCount < ITERATION_COUNT_MAX) {
    iterationCount++
    const metContourPoints = cv.matFromArray(
      positivePointAoa.length,
      1,
      cv.CV_32SC2,
      positivePointAoa.flat()
    ) as Mat
    ellipse = cv.fitEllipseAMS(metContourPoints) as unknown as OpenCVEllipse
    metContourPoints.delete()
    const PTPointAoa: [number, number][] = []
    const PFPointAoa: [number, number][] = []
    const NTPointAoa: [number, number][] = []
    const NFPointAoa: [number, number][] = []
    const PTDistanceArr: number[] = []
    const PFDistanceArr: number[] = []
    const NTDistanceArr: number[] = []
    const NFDistanceArr: number[] = []
    const statisticDataArr: [number, number][] = []
    let statisticPointRSum = 0
    const ellipseW = ellipse.size.width
    const ellipseH = ellipse.size.height
    const ellipseHalfHWSquare = (ellipseW ** 2) * (ellipseH ** 2) / 4
    const ellipseCenterX = ellipse.center.x
    const ellipseCenterY = ellipse.center.y
    const ellipseAngle = -ellipse.angle
    const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
    const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
    /**
     * 打包椭圆参数：[h, w, halfHWSquare, centerX, centerY, angleSin, angleCos]
     */
    const ellipseParamArr: [number, number, number, number, number, number, number] = [
      ellipseH, ellipseW, ellipseHalfHWSquare,
      ellipseCenterX, ellipseCenterY,
      ellipseAngleSin, ellipseAngleCos
    ]
    forEachPositivePoint: for (let i = 0; i < positivePointAoa.length; i++) {
      const [pointR, ellipseR] = _pointFilter(
        positivePointAoa[i]!,
        toleranceValue,
        positiveDistanceArr[i]!,
        1,
        PTPointAoa, PFPointAoa, PTDistanceArr, PFDistanceArr,
        ellipseParamArr
      )
      statisticDataArr.push([pointR, ellipseR])
      statisticPointRSum += pointR
    }
    forEachNegativePoint: for (let i = 0; i < negativePointAoa.length; i++) {
      _pointFilter(
        negativePointAoa[i]!,
        toleranceValue * NP_TO_PP_THRESHOLD,
        negativeDistanceArr[i]!,
        NP_TO_PP_THRESHOLD,
        NFPointAoa, NTPointAoa, NFDistanceArr, NTDistanceArr,
        ellipseParamArr
      )
    }
    const pointLength = statisticDataArr.length
    const pointRAve = statisticPointRSum / pointLength
    let SSR = 0
    let SST = 0
    for (let i = 0; i < pointLength; i++) {
      const data = statisticDataArr[i]!
      SSR += (data[1] - pointRAve) ** 2
      SST += (data[0] - pointRAve) ** 2
    }
    R2 = SSR / SST
    if (PFPointAoa.length === 0 && NFPointAoa.length === 0) {
      if (R2 >= R2_THRESHOLD || toleranceValue < TOLERANCE_VALUE_MIN) {
        isConverge = true
      } else {
        toleranceValue *= ITERATION_WEIGHT
      }
    } else {
      positivePointAoa.length = 0
      positivePointAoa.push(...PTPointAoa, ...NFPointAoa)
      negativePointAoa.length = 0
      negativePointAoa.push(...PFPointAoa, ...NTPointAoa)
      positiveDistanceArr.length = 0
      positiveDistanceArr.push(...PTDistanceArr, ...NFDistanceArr)
      negativeDistanceArr.length = 0
      negativeDistanceArr.push(...PFDistanceArr, ...NTDistanceArr)
    }
  }
  return { ellipse, R2: R2 ?? 0, baselineReferencePoint }

  /**
   * 筛选单个点：将其归入"阳性"或"阴性"点集
   */
  function _pointFilter(
    [pointX, pointY]: [number, number],
    tolerance: number,
    pointToBaselineDistance: number,
    distanceCoefficient: number,
    PPointAoa: [number, number][],
    NPointAoa: [number, number][],
    PDistanceArr: number[],
    NDistanceArr: number[],
    [eH, eW, eHalfHWSquare, eCenterX, eCenterY, eAngleSin, eAngleCos]: [number, number, number, number, number, number, number]
  ): [number, number] {
    const pointXCentered = pointX - eCenterX
    const pointYCentered = pointY - eCenterY
    const pointXNormalized = pointXCentered * eAngleCos - pointYCentered * eAngleSin
    const pointYNormalized = pointXCentered * eAngleSin + pointYCentered * eAngleCos
    const pointR = Math.sqrt(pointXNormalized ** 2 + pointYNormalized ** 2)
    const pointRad = Math.atan2(pointYNormalized, pointXNormalized)
    const ellipseRSquare = eHalfHWSquare /
      (((eH * Math.cos(pointRad)) ** 2) + ((eW * Math.sin(pointRad)) ** 2))
    const ellipseR = Math.sqrt(ellipseRSquare)
    const pointToEllipseDistance = Math.abs(pointR - ellipseR)
    const pointRRelative = pointToEllipseDistance / ellipseR
    if (
      pointRRelative > tolerance ||
      pointToEllipseDistance > pointToBaselineDistance / distanceCoefficient
    ) {
      NPointAoa.push([pointX, pointY])
      NDistanceArr.push(pointToBaselineDistance)
    } else {
      PPointAoa.push([pointX, pointY])
      PDistanceArr.push(pointToBaselineDistance)
      if (baselineReferencePoint[1] < pointY) {
        baselineReferencePoint = [pointX, pointY]
      }
    }
    return [pointR, ellipseR]
  }
}


// ================================ 3. 接触角角度数值求解 ================================

/**
 * 接触角计算结果
 */
export interface ContactAngleResult {
  /** 平均接触角 */
  contactAngleAverage: number
  /** 左接触角 */
  contactAngleLeft: number
  /** 右接触角 */
  contactAngleRight: number
  /** 角度偏差 */
  contactAngleDeviation: number
  /** 基线角度 */
  interceptAngle: number
}

/**
 * calculateContactAngle 计算接触角（纯数学部分）
 *
 * 1. 把基线的 2 个截距点迁移到标准椭圆坐标系
 * 2. 以 2 个截距点构建基线方程 y = ax + b
 * 3. 基线方程变换为 r ~ θ 关系
 * 4. 与椭圆方程联立，得到关于 cotθ 的二次方程
 * 5. 由 cotθ 得到 θ，得到两边的切线斜率
 * 6. 计算两切线斜率和基线截距之间的夹角，即为接触角
 *
 * @throws 方程判别式 ≤ 0 时抛出异常
 */
export function calculateContactAngle({
  ellipse,
  leftIntercept,
  rightIntercept,
  canvasWidth,
  canvasHeight
}: {
  ellipse: OpenCVEllipse
  leftIntercept: number
  rightIntercept: number
  canvasWidth: number
  canvasHeight: number
}): ContactAngleResult {
  // 将截距从用户视角转回 canvas 视角
  const interceptPoint1X = 0
  const interceptPoint1Y = canvasHeight - leftIntercept
  const interceptPoint2X = canvasWidth
  const interceptPoint2Y = canvasHeight - rightIntercept
  const interceptAngle = Math.atan2(
    interceptPoint2Y - interceptPoint1Y,
    interceptPoint2X - interceptPoint1X
  ) * 180 / Math.PI * -1
  // ---- 迁移截距点到标准椭圆坐标系 ----
  const ellipseAngle = -ellipse.angle
  const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
  const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
  const ellipseCenterX = ellipse.center.x
  const ellipseCenterY = ellipse.center.y
  const p1xCentered = interceptPoint1X - ellipseCenterX
  const p1yCentered = interceptPoint1Y - ellipseCenterY
  const p2xCentered = interceptPoint2X - ellipseCenterX
  const p2yCentered = interceptPoint2Y - ellipseCenterY
  const newP1X = p1xCentered * ellipseAngleCos - p1yCentered * ellipseAngleSin
  const newP1Y = p1xCentered * ellipseAngleSin + p1yCentered * ellipseAngleCos
  const newP2X = p2xCentered * ellipseAngleCos - p2yCentered * ellipseAngleSin
  const newP2Y = p2xCentered * ellipseAngleSin + p2yCentered * ellipseAngleCos
  // ---- 联立基线方程与椭圆方程 ----
  const w = ellipse.size.width
  const h = ellipse.size.height
  const kx = newP2X - newP1X
  const ky = newP2Y - newP1Y
  const kmix = newP2X * newP1Y - newP1X * newP2Y
  const a = (ky ** 2) - ((2 * kmix / w) ** 2)
  const b = -2 * kx * ky
  const c = (kx ** 2) - ((2 * kmix / h) ** 2)
  const delta = b ** 2 - 4 * a * c
  if (delta <= 0) {
    throw Error("方程没有 2 个解")
  }
  const cot1 = (-b + Math.sqrt(delta)) / (2 * a)
  const cot2 = (-b - Math.sqrt(delta)) / (2 * a)
  const slope1 = -cot1 * ((h / w) ** 2)
  const slope2 = -cot2 * ((h / w) ** 2)
  const baselineSlope = ky / kx
  let oldAngleTangent1 = (Math.atan(slope1) * 180 / Math.PI - ellipseAngle) % 180
  let oldAngleTangent2 = (Math.atan(slope2) * 180 / Math.PI - ellipseAngle) % 180
  let oldAngleBaseline = (Math.atan(baselineSlope) * 180 / Math.PI - ellipseAngle) % 180
  oldAngleTangent1 = _normalizeAngle(oldAngleTangent1)
  oldAngleTangent2 = _normalizeAngle(oldAngleTangent2)
  oldAngleBaseline = _normalizeAngle(oldAngleBaseline)
  // ---- 判断接触角是否为钝角 ----
  const baselineEllipseCenterY =
    (interceptPoint2Y - interceptPoint1Y) / interceptPoint2X * ellipseCenterX
      + interceptPoint1Y
  const isContactAngleObtuse = baselineEllipseCenterY > ellipseCenterY
  let contactAngleLeft: number
  let contactAngleRight: number
  if (!isContactAngleObtuse) {
    if (oldAngleTangent1 > oldAngleTangent2) {
      contactAngleLeft = -(oldAngleTangent2 - oldAngleBaseline)
      contactAngleRight = oldAngleTangent1 - oldAngleBaseline
    } else {
      contactAngleLeft = -(oldAngleTangent1 - oldAngleBaseline)
      contactAngleRight = oldAngleTangent2 - oldAngleBaseline
    }
  } else {
    if (oldAngleTangent1 > oldAngleTangent2) {
      contactAngleLeft = 180 - (oldAngleTangent1 - oldAngleBaseline)
      contactAngleRight = 180 + (oldAngleTangent2 - oldAngleBaseline)
    } else {
      contactAngleLeft = 180 - (oldAngleTangent2 - oldAngleBaseline)
      contactAngleRight = 180 + (oldAngleTangent1 - oldAngleBaseline)
    }
  }
  contactAngleLeft = _clampAngle(contactAngleLeft)
  contactAngleRight = _clampAngle(contactAngleRight)
  const contactAngleAverage = (contactAngleLeft + contactAngleRight) / 2
  const contactAngleDeviation = Math.abs(contactAngleLeft - contactAngleRight)
  return {
    contactAngleAverage,
    contactAngleLeft,
    contactAngleRight,
    contactAngleDeviation,
    interceptAngle,
  }

  /** 将角度修正到 [-90°, 90°] 范围 */
  function _normalizeAngle(angle: number): number {
    if (angle > 90) return angle - 180
    if (angle <= -90) return angle + 180
    return angle
  }
  /** 将接触角修正到 (0°, 180°) 范围 */
  function _clampAngle(angle: number): number {
    if (angle < 0) return angle + 180
    if (angle > 180) return angle - 180
    return angle
  }
}