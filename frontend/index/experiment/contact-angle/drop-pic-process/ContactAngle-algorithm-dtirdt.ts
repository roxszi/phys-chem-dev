/**
 * 接触角求解 · TIR-DT 椭圆拟合算法子模块
 * ---
 * 完整的 TIR-DT（双阈值动态容差迭代重加权）算法的实现。
 * 模块内部分为以下几个区域：
 * 0.  类型定义 + 核心算法 getEllipse() 主入口
 * 1.  阳性 / 阴性点集过滤（filterPointsByBaselineDistance / filterPointsByThreshold）
 * 2.  椭圆拟合与相对误差计算（fitPointsToEllipse / computeDeviationMetrics）
 * 3.  双阈值迭代计算（determineDualThresholdWithIter / computeNegativeThreshold）
 * 4.  工具函数（sortArr / getMedian / computeMAD / getPercentile）
 *
 * 本文件迁移自 .js → .ts，做"宽松转译"：
 * - 保留 JSDoc 注释（已含类型信息，作为内部文档）
 * - 顶层 @typedef 提取为 TS interface / type
 * - 函数签名加返回类型注解（基础类型）
 * - OpenCV 类型从 @techstark/opencv-js 直接 import，避免引入全局污染
 *
 * 注：算法主体从 ContactAngle-algorithm.js 重导出（re-export）。
 */

import type { CV, Mat } from "@techstark/opencv-js"

// ================================ 类型定义 ================================

/**
 * 阴性阈值计算的可选参数
 */
export interface NTOptions {
  /** NI 的取值位置。默认 75。取 75 时即 Q3 位数（75% 阳性点位次）。取 0 时取固定值 2/3 PT */
  percent?: number
  /** NI 的经验值（固定值），默认 2/3 */
  fixedNI?: number
  /** NI 的下界，默认 0.35 */
  minNI?: number
  /** NI 的上界，默认 0.85 */
  maxNI?: number
}

/**
 * 阳性和阴性阈值计算的可选参数打包
 */
export interface DualThresholdOptions {
  /**
   * 截断常数 C。取 1 近似 1σ（覆盖 68.26%），取 2 近似 2σ（95.44%），取 3 近似 3σ（99.74%）
   */
  C?: number
  /** 最大迭代次数（安全上限），默认 20 */
  maxIter?: number
  /** 收敛阈值。当 sigma 的相对变化小于此值时判定收敛，默认 0.01 */
  convergenceThreshold?: number
  /** 阴性阈值计算的可选参数 */
  NTOptions?: NTOptions
}

/**
 * 椭圆拟合方法
 * - "default" - fitEllipse（Fitzgibbon 1995）
 * - "ams" - fitEllipseAMS（Approximate Mean Square, Taubin 1991）
 * - "direct" - fitEllipseDirect（Direct least square, Fitzgibbon 1999）
 */
export type EllipseFitMethod = "default" | "ams" | "direct"

/**
 * TIR-DT 椭圆拟合的返回值
 */
export interface GetEllipseResult {
  /** 椭圆对象（OpenCV） */
  ellipse: ReturnType<CV["fitEllipseAMS"]> | null
  /** 总耗时（ms） */
  timeElapsed: number
  /** 迭代过程中的拟合优度 R² 数组 */
  R2Arr: number[]
  /** 每次大迭代里的小迭代次数数组 */
  innerIterationCountArr: number[]
  /** 大迭代次数 */
  outerIterationCount: number
  /** 迭代结果性质："迭代收敛" / "迭代达上限" / "有效点不足" */
  resultType: string
  /** 是否收敛 */
  isConverged: boolean
  /** 点利用情况数组：每次大迭代使用的点的数量 */
  pointUtilizationArr: number[]
  /** 基线参考点 [x, y]：阳性点中 Y 值最大的点（即 canvas 坐标方向下的最低点） */
  baselineReferencePoint: [number, number] | null
}

// ================================ 0. 核心算法主入口 ================================

/**
 * 迭代拟合获得椭圆对象（DTIR-DT 主入口）
 *
 * 以双层迭代设计了一个"双阈值动态容差迭代重加权算法"：
 *   0. 初始化：[阳性点集 P]、[阴性点集 N]。先用基线距离过滤算法获得 P 与 N。
 *   1. 【大迭代】用全部 P 拟合椭圆。
 *   2. 【小迭代】只迭代数据参数（稳健统计学迭代）获取 sigma，初始化 PT、NT。
 *   3. 使用 PT/NT 把 P、N 各分为"正确 / 错误"两个子集。
 *   4. 重复 1~3。
 *   5. 【收敛条件】达最大迭代次数，或 PF、NF 都为空集。
 *
 * RE（相对误差）算法：每次拟合椭圆后，把点化归到椭圆中心坐标系，计算
 * RE = (点到圆心距离 - 该方向椭圆半径) / 椭圆半径。
 *
 * @param param - 参数对象
 * @param param.cv - OpenCV.js 实例
 * @param param.contourPointAoa - 轮廓点坐标数组
 * @param param.contourPointToBaselineDistanceArr - 各轮廓点到基线的距离
 * @param param.maxIter - 最大迭代次数，默认 100
 * @param param.method - 椭圆拟合方法
 * @param param.options - 迭代参数
 * @returns 椭圆拟合结果对象
 */
export function getEllipse({
  cv,
  contourPointAoa,
  contourPointToBaselineDistanceArr,
  maxIter = 100,
  method,
  options = {}
}: {
  cv: CV
  contourPointAoa: [number, number][]
  contourPointToBaselineDistanceArr: number[]
  maxIter?: number
  method?: EllipseFitMethod
  options?: DualThresholdOptions
}): GetEllipseResult {
  /** 起始时间 */
  const startTime = performance.now()
  // 初始化阳性点集和阴性点集
  const { PPointAoa, NPointAoa } = filterPointsByBaselineDistance({
    contourPointAoa,
    contourPointToBaselineDistanceArr
  })
  // 防 bug：如果阳性点集长度小于 6，则报错
  if (PPointAoa.length < 6) {
    throw new Error("有效数据点不足，无法拟合椭圆。")
  }
  /** 迭代所得的 R² 值数组 */
  const R2Arr: number[] = []
  /** 每次大迭代里的小迭代次数数组 */
  const innerIterationCountArr: number[] = []
  /** 迭代收敛指针 */
  let isConverged = false
  /** 大迭代次数指针 */
  let outerIterationCount = 0
  /** 椭圆对象 */
  let ellipse: GetEllipseResult["ellipse"] = null
  /** 基线参考点：取阳性点中 Y 值最大的点（即 canvas 坐标方向下的最低点） */
  let baselineReferencePoint: GetEllipseResult["baselineReferencePoint"] = null
  /** 数据点的利用情况数组 */
  const pointUtilizationArr: number[] = [contourPointAoa.length]
  // -------- 【大迭代】 --------
  contourPointIterate: while (!isConverged && outerIterationCount < maxIter) {
    outerIterationCount++
    pointUtilizationArr.push(PPointAoa.length)
    // 用阳性点集拟合得到椭圆
    ellipse = fitPointsToEllipse(cv, PPointAoa, method)
    // 阳性相对误差数组及 R² 值
    const { REArr: PREArr, R2 } = computeDeviationMetrics(PPointAoa, ellipse)
    R2Arr.push(R2)
    // 阴性相对误差数组
    const { REArr: NREArr } = computeDeviationMetrics(NPointAoa, ellipse)
    // 获取阳性阈值 PT 和阴性阈值 NT
    const { PT, NT, iterations: innerIterationCount } = determineDualThresholdWithIter(PREArr, options)
    innerIterationCountArr.push(innerIterationCount)
    // 就地更新阳性 / 阴性点集，并判断是否收敛、更新基线参考点
    ;({
      isConverged: isConverged,
      baselineReferencePoint: baselineReferencePoint,
    } = filterPointsByThreshold({
      PT: PT,
      NT: NT,
      PPointAoa: PPointAoa,
      NPointAoa: NPointAoa,
      PREArr: PREArr,
      NREArr: NREArr
    }) as {
      isConverged: boolean
      baselineReferencePoint: [number, number] | null
    })
    // 防 bug：如果阳性点集长度小于 6，则直接退出迭代
    if (PPointAoa.length < 6) {
      console.warn("有效数据点不足，已强行停止迭代。")
      break contourPointIterate
    }
  }
  // 迭代完毕，构造一个迭代结果
  let resultType = ""
  if (isConverged === true) {
    resultType = "迭代收敛"
  } else if (outerIterationCount === maxIter) {
    resultType = "迭代达上限"
  } else {
    resultType = "有效点不足"
  }
  /** 结束时间 */
  const endTime = performance.now()
  /** 耗时 */
  const timeElapsed = endTime - startTime
  return {
    ellipse,
    timeElapsed,
    R2Arr,
    innerIterationCountArr,
    outerIterationCount,
    resultType,
    isConverged,
    pointUtilizationArr,
    baselineReferencePoint
  }
}

// ================================ 1. 阳性 / 阴性点集过滤 ================================

/**
 * filterPointsByBaselineDistance 用基线距离筛选点
 *
 * 这是根据物理经验而非根据统计做出的预处理操作，专门用于第一次拟合的约束。
 * 步骤：升序排序 → 取 90%~95% 位次防大值杂点 → 取首末段距离基准值 →
 *       以 0.2× / 1.0× 距离段筛出稳健的阳性 / 阴性点集。
 *
 * @returns { NPointAoa, PPointAoa }
 */
function filterPointsByBaselineDistance({
  contourPointAoa,
  contourPointToBaselineDistanceArr,
  options = {}
}: {
  contourPointAoa: [number, number][]
  contourPointToBaselineDistanceArr: number[]
  options?: {
    frontIndex?: number
    backIndex?: number
    frontDistance?: number
    backDistance?: number
  }
}): { NPointAoa: [number, number][]; PPointAoa: [number, number][] } {
  const {
    frontIndex = 0,
    backIndex = 95,
    frontDistance = 0.2,
    backDistance = 1
  } = options
  /** 升序的距离数组 */
  const sortedDistanceArr = sortArr(contourPointToBaselineDistanceArr)
  /** 前位次值 */
  const distanceFront = getPercentile(sortedDistanceArr, frontIndex)
  /** 后位次值 */
  const distanceBack = getPercentile(sortedDistanceArr, backIndex)
  /** 前后位次的距离差值 */
  const distanceDelta = distanceBack - distanceFront
  /** 距离最小值阈值 */
  const smallDistanceThreshold = distanceFront + frontDistance * distanceDelta
  /** 距离最大值阈值 */
  const bigDistanceThreshold = distanceFront + backDistance * distanceDelta
  /** 阳性点集 */
  const PPointAoa: [number, number][] = []
  /** 阴性点集 */
  const NPointAoa: [number, number][] = []
  for (let i = 0; i < contourPointAoa.length; i++) {
    if (
      (contourPointToBaselineDistanceArr[i]! < smallDistanceThreshold)
      || (contourPointToBaselineDistanceArr[i]! > bigDistanceThreshold)
    ) {
      NPointAoa.push(contourPointAoa[i]!)
    } else {
      PPointAoa.push(contourPointAoa[i]!)
    }
  }
  return { PPointAoa: PPointAoa, NPointAoa: NPointAoa }
}


/**
 * filterPointsByThreshold 用阈值筛选点
 * 会根据双阈值处理阳性和阴性点集，并返回收敛状态
 *
 * @returns isConverged + baselineReferencePoint
 * @note 各点集数组对象、距离数组对象，会被就地修改
 */
function filterPointsByThreshold(param: {
  PT: [number, number]
  NT: [number, number]
  PPointAoa: [number, number][]
  NPointAoa: [number, number][]
  PREArr: number[]
  NREArr: number[]
}): { isConverged: boolean; baselineReferencePoint: [number, number] | null } {
  const {
    PT,
    NT,
    PPointAoa,
    NPointAoa,
    PREArr,
    NREArr
  } = param
  /** 阳性-正确数组（将继续保持阳性） */
  const PTPointAoa: [number, number][] = []
  /** 阳性-错误数组（将降为阴性） */
  const PFPointAoa: [number, number][] = []
  /** 阴性-正确数组（将继续保持阴性） */
  const NTPointAoa: [number, number][] = []
  /** 阴性-错误数组（将复活为阳性） */
  const NFPointAoa: [number, number][] = []
  /** 基线参考点：取阳性点中 Y 值最大的点 */
  let baselineReferencePoint: [number, number] = [0, 0]
  // 遍历阳性点集
  for (let i = 0; i < PPointAoa.length; i++) {
    const PRE = PREArr[i]!
    if ((PRE < PT[0]) || (PRE > PT[1])) {
      PFPointAoa.push(PPointAoa[i]!)
    } else {
      PTPointAoa.push(PPointAoa[i]!)
    }
    if (baselineReferencePoint[1] < PPointAoa[i]![1]) {
      baselineReferencePoint = [...PPointAoa[i]!] as [number, number]
    }
  }
  // 遍历阴性点集
  for (let i = 0; i < NPointAoa.length; i++) {
    const NRE = NREArr[i]!
    if ((NRE < NT[0]) || (NRE > NT[1])) {
      NTPointAoa.push(NPointAoa[i]!)
    } else {
      NFPointAoa.push(NPointAoa[i]!)
    }
  }
  // 判断收敛：PF 和 NF 同时为空
  if ((PFPointAoa.length === 0) && (NFPointAoa.length === 0)) {
    return { isConverged: true, baselineReferencePoint: baselineReferencePoint }
  } else {
    // 就地更新
    PPointAoa.length = 0
    PPointAoa.push(...PTPointAoa, ...NFPointAoa)
    NPointAoa.length = 0
    NPointAoa.push(...PFPointAoa, ...NTPointAoa)
    return { isConverged: false, baselineReferencePoint: baselineReferencePoint }
  }
}

// ================================ 2. 椭圆拟合与相对误差计算 ================================

/**
 * fitPointsToEllipse 拟合椭圆
 * 使用 OpenCV 的椭圆拟合算法，由点集拟合出椭圆对象
 *
 * @param cv - OpenCV 对象
 * @param pointAoa - 点的原始坐标 [x, y][]
 * @param method - 拟合方法，默认为 "ams"
 * @returns 椭圆对象
 * @note 必须在前置步骤确保点集的长度大于 5
 */
function fitPointsToEllipse(
  cv: CV,
  pointAoa: [number, number][],
  method: EllipseFitMethod = "ams"
): ReturnType<CV["fitEllipseAMS"]> {
  /** 把轮廓坐标点转为 cv.Mat 对象 */
  const metContourPoints = cv.matFromArray(
    pointAoa.length,
    1,
    cv.CV_32SC2,
    pointAoa.flat()
  ) as Mat
  let ellipse: ReturnType<CV["fitEllipseAMS"]>
  if (method === "ams") {
    ellipse = cv.fitEllipseAMS(metContourPoints)
  } else if (method === "direct") {
    ellipse = cv.fitEllipseDirect(metContourPoints)
  } else {
    ellipse = cv.fitEllipse(metContourPoints)
  }
  metContourPoints.delete()
  return ellipse
}


/**
 * computeDeviationMetrics 计算点集的相对误差（RE）数组（原始顺序）及拟合优度 R²
 *
 * 步骤：
 *   1. 将点去中心化 + 旋转，迁移到标准椭圆坐标系
 *   2. 计算点相对椭圆圆心方向上的椭圆半径，以及点与椭圆的距离
 *   3. 以上述的半径作为参考，计算点相对椭圆的相对误差
 *
 * @returns REArr（原始顺序的相对误差数组）+ R²（拟合优度）
 */
function computeDeviationMetrics(
  pointAoa: [number, number][],
  ellipse: ReturnType<CV["fitEllipseAMS"]>
): { REArr: number[]; R2: number } {
  if (pointAoa.length === 0) {
    return { REArr: [], R2: 0 }
  }
  /** 椭圆长轴 w */
  const ellipseW = ellipse.size.width
  /** 椭圆短轴 h */
  const ellipseH = ellipse.size.height
  /** w² × h² / 4 */
  const ellipseHalfHWSquare = (ellipse.size.width ** 2) * (ellipse.size.height ** 2) / 4
  /** 椭圆中心点 x 坐标 */
  const ellipseCenterX = ellipse.center.x
  /** 椭圆中心点 y 坐标 */
  const ellipseCenterY = ellipse.center.y
  /** 椭圆逆旋转角（canvas 顺时针为正，Y 向下为正，所以取负号） */
  const ellipseAngle = -ellipse.angle
  const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
  const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
  /** 相对误差数组 */
  const REArr: number[] = []
  /** 点到椭圆圆心的径向距离数组 */
  const pointRArr: number[] = []
  /** 椭圆在每个点方向的半径数组 */
  const ellipseRArr: number[] = []
  let pointRSum = 0
  for (const positivePoint of pointAoa) {
    const pointXCentered = positivePoint[0] - ellipseCenterX
    const pointYCentered = positivePoint[1] - ellipseCenterY
    const pointXNormalized = pointXCentered * ellipseAngleCos - pointYCentered * ellipseAngleSin
    const pointYNormalized = pointXCentered * ellipseAngleSin + pointYCentered * ellipseAngleCos
    const pointR = Math.sqrt(pointXNormalized ** 2 + pointYNormalized ** 2)
    const pointRad = Math.atan2(pointYNormalized, pointXNormalized)
    const ellipseRSquare = ellipseHalfHWSquare /
      (((ellipseH * Math.cos(pointRad)) ** 2) + ((ellipseW * Math.sin(pointRad)) ** 2))
    const ellipseR = Math.sqrt(ellipseRSquare)
    const pointRE = (pointR - ellipseR) / ellipseR
    REArr.push(pointRE)
    pointRArr.push(pointR)
    ellipseRArr.push(ellipseR)
    pointRSum = pointRSum + pointR
  }
  // ---- 计算 R² ----
  const pointRMean = pointRSum / pointAoa.length
  let SST = 0
  let SSE = 0
  for (let i = 0; i < pointRArr.length; i++) {
    SST = SST + (pointRArr[i]! - pointRMean) ** 2
    SSE = SSE + (pointRArr[i]! - ellipseRArr[i]!) ** 2
  }
  const R2 = 1 - SSE / SST
  return { REArr: REArr, R2: R2 }
}

// ================================ 3. 双阈值迭代计算 ================================

/**
 * determineDualThresholdWithIter 确定双阈值（DT）及迭代次数
 *
 * 用稳健统计学方法（Median + MAD）迭代计算 sigma，正态分布下 σ ≈ 1.4826 × MAD。
 * 收敛后 TOL = median + C × sigma。
 *
 * @param REArr - 相对误差数组（原始顺序）
 * @param options - 可选参数
 * @returns PT（阳性阈值）、NT（阴性阈值）、iterations（迭代次数）
 */
function determineDualThresholdWithIter(
  REArr: number[],
  options: DualThresholdOptions = {}
): { PT: [number, number]; NT: [number, number]; iterations: number } {
  const {
    C = 1.5,
    maxIter = 20,
    convergenceThreshold = 0.01,
    NTOptions = {}
  } = options
  /** 排序后的数组 */
  const sortedREArr = sortArr(REArr)
  let median = 0
  let MAD = 0
  // 计算初始的 MAD 和 median
  ;({ median: median, MAD: MAD } = computeMAD(sortedREArr))
  /** 假设正态分布情况下的等效标准差 sigma */
  let sigma = MAD * 1.4826
  // =============== 退化处理，确保 sigma 不为 0 ===============
  if (sigma === 0) {
    const q1 = getPercentile(sortedREArr, 25)
    const spreadLeft = median - q1
    if (spreadLeft > 0) {
      sigma = spreadLeft * 1.4826
    } else if (median !== 0) {
      sigma = Math.abs(median * 0.1)
    } else {
      sigma = 0.01
    }
  }
  // =============== 迭代优化 ===============
  let actualIter = 0
  const iterSortedREArr: number[] = []
  whileIter: while (actualIter < maxIter) {
    actualIter++
    iterSortedREArr.length = 0
    for (const sortedRE of sortedREArr) {
      const absR = Math.abs(sortedRE - median) / sigma
      if (absR <= C) {
        iterSortedREArr.push(sortedRE)
      }
    }
    const { median: newMedian, MAD: newMAD } = computeMAD(iterSortedREArr)
    const newSigma = newMAD * 1.4826
    const sigmaRelativeChangeRate = Math.abs(newSigma - sigma) / sigma
    sigma = newSigma
    median = newMedian
    if ((newSigma === 0) || (sigmaRelativeChangeRate < convergenceThreshold)) {
      break whileIter
    }
  }
  /** 阳性阈值 */
  const PT: [number, number] = [(median - C * sigma), (median + C * sigma)]
  /** 阴性阈值 */
  const NT = computeNegativeThreshold(iterSortedREArr, PT, NTOptions)
  return {
    PT: PT,
    NT: NT,
    iterations: actualIter,
  }
}


/**
 * computeNegativeThreshold 确定阴性阈值（NT）
 * 阴性阈值 NT = 阳性阈值 PT × 阴性系数 NI
 *
 * 两种得到 NI 的方法：
 *   1. 迭代优化得到 PT 过程中，取最后一轮阳性数组的某个分位数（如 Q3 即 75% 位次）作为参考
 *   2. 兜底经验值 NI = 2/3
 *
 * @returns 阴性阈值 NT（无量纲）
 */
function computeNegativeThreshold(
  sortedREArr: number[],
  PT: [number, number],
  options: NTOptions = {}
): [number, number] {
  const {
    percent = 75,
    fixedNI = 2 / 3,
    minNI = 0.35,
    maxNI = 0.85
  } = options
  if ((typeof percent !== "number") || (percent < 0) || (percent > 100)) {
    throw new Error("percentile 参数必须是一个 0 到 100 之间的数字")
  }
  if (percent === 0) {
    const PTMedian = (PT[1] + PT[0]) / 2
    const NTRangeHalf = (PT[1] - PT[0]) * fixedNI / 2
    return [PTMedian - NTRangeHalf, PTMedian + NTRangeHalf]
  }
  const percentFront = (100 - percent) / 2
  const percentBack = (100 + percent) / 2
  const percentileFront = getPercentile(sortedREArr, percentFront)
  const percentileBack = getPercentile(sortedREArr, percentBack)
  const percentileNIFront = percentileFront / PT[0]
  const percentileNIBack = percentileBack / PT[1]
  const constrainedNIFront = Math.min(maxNI, Math.max(minNI, percentileNIFront))
  const constrainedNIBack = Math.min(maxNI, Math.max(minNI, percentileNIBack))
  return [PT[0] * constrainedNIFront, PT[1] * constrainedNIBack]
}

// ================================ 4. 工具函数 ================================

/**
 * sortArr 按照默认的升序排序方法对数组进行排序
 */
function sortArr(arr: number[]): number[] {
  const arrCopy = [...arr]
  arrCopy.sort((a, b) => a - b)
  return arrCopy
}


/**
 * getMedian 从已排序的数组中获取中位数
 * 会根据长度奇偶性取中间值或中间两值的平均
 */
function getMedian(sortedArr: number[]): number {
  const arrLength = sortedArr.length
  if (arrLength === 0) {
    throw new Error("数组长度为 0，无法计算中位数")
  }
  const midIndex = sortedArr.length / 2
  if ((midIndex % 1) === 0) {
    return (sortedArr[midIndex - 1]! + sortedArr[midIndex]!) / 2
  } else {
    return sortedArr[Math.floor(midIndex)]!
  }
}


/**
 * computeMAD 计算数组的中位绝对偏差（MAD）
 * MAD = median(|x_i - median(x)|)
 * 正态分布下，σ ≈ 1.4826 × MAD。
 */
function computeMAD(sortedArr: number[]): { MAD: number; median: number } {
  const median = getMedian(sortedArr)
  const deviationArr: number[] = []
  for (const value of sortedArr) {
    deviationArr.push(Math.abs(value - median))
  }
  const sortedDeviationArr = sortArr(deviationArr)
  const MAD = getMedian(sortedDeviationArr)
  return { MAD: MAD, median: median }
}


/**
 * getPercentile 计算数组指定分位数值
 * 对于分位 index 不是整数的情况，使用线性插值法
 */
function getPercentile(sortedArr: number[], percentage: number): number {
  const arrLength = sortedArr.length
  if (arrLength === 0) { return 0 }
  const index = (percentage / 100) * (arrLength - 1)
  const lowIndex = Math.floor(index)
  const highIndex = Math.ceil(index)
  if (lowIndex === highIndex) {
    return sortedArr[index]!
  } else {
    const value =
      (index - lowIndex)
        / (highIndex - lowIndex)
        * (sortedArr[highIndex]! - sortedArr[lowIndex]!)
        + sortedArr[lowIndex]!
    return value
  }
}