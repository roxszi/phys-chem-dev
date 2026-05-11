"use strict"

// 接触角求解的纯算法模块_初始化TOL和NI部分

// 对于摸条件，几个可选参数：
// 1.  椭圆拟合的公式。3个：
//     ① "default" - fitEllipse
//     ② "ams" - fitEllipseAMS
//     ③ "direct" - fitEllipseDirect
// 2.  阳性阈值的截断常数C，即 μ + C * σ 中的 C
//     μ + 1σ覆盖的概率约为0.6826，μ + 2σ覆盖的概率约为0.9544
//     C = 0.6745 对应50%
//     C = 0.8416 对应60%
//     C = 1.0364 对应70%
//     C = 1.2816 对应80%
//     C = 1.6449 对应90%
//     所以最好要测一下这5个，以及C = 1和 C = 2，一共【7】个
// 3.  阴性阈值
//     百分位数的：40、50、60、70、75、80、90、以及fix的0.67。
//     一共【8】个
//     然后各自再带一个0.35~0.85的约束，就是【8 x 2】，一共【16】个

// 摸条件时候可选的判据参数：
// 1.  迭代过程中，使用到的数据点数的变化。
// 2.  大迭代次数。
// 3.  总耗时。
// 4.  拟合得到的R²。这反映的是剔除噪声点后的拟合精度。
// 5.  迭代结果的性质（是否收敛等）。
// 6.  最后得到的接触角的值。


// ================================ 导入导出方法与类型注释 ================================

/**
 * @typedef { object } NTOptions - 阴性阈值计算的可选参数。
 * @property { number } [percent = 75] - NI的取值位置
 *   - 默认为75。取75时，即Q3位数，即75%的阳性点位次。
 *   - 当取0时，取固定值，即2/3 PT。
 * @property { number } [fixedNI = 2/3] - NI的经验值（固定值）
 * @property { number } [minNI = 0.35] - NI的下界
 * @property { number } [maxNI = 0.85] - NI的上界
 */

/**
 * @typedef { object } DualTptions - 阳性和阴性阈值计算的可选参数打包。
 * @property { number } [C = 2] - 截断常数。
 *   - 取1时，即类似于1σ，μ + 1σ覆盖的概率约为0.6826。
 *   - 取2时，即类似于2σ，μ + 2σ覆盖的概率约为0.9544。
 *   - 取3时，即类似于3σ，μ + 3σ覆盖的概率约为0.9974。
 * @property { number } [maxIter = 20] - 最大迭代次数（安全上限）。
 *   实际通常2 ~ 4次即收敛。以收敛条件为主，maxIter 仅防止无限循环。
 * @property { number } [convergenceThreshold = 0.01] - 收敛阈值。
 *   当sigma的相对变化小于此值时判定收敛并停止迭代。
 * @property { NTOptions } [NTOptions] - 阴性阈值计算的可选参数。
 */

// ================================ 核心算法 ================================

/**
 * 迭代拟合获得椭圆对象
 * 以双层迭代设计了一个[双阈值动态容差迭代重加权算法]（DTIR-DT），具体思路在于：
 *   0. 初始化：[阳性点集P]、[阴性点集N]。最初的[阳性点集P]为全部数据点集，[阴性点集N]为空集。
 *   1. 【大迭代】。用全部[阳性点集P]拟合获取椭圆。
 *   2. 【小迭代】。只迭代数据参数，不重新拟合椭圆：
 *      通过稳健统计学迭代，获取稳健的统计学量（由MAD等效而来的sigma）。
 *      由sigma等，初始化阳性阈值PT（Positive Threshold）、阴性阈值NT（Negative threshold）。
 *      这部分不涉及椭圆的重新拟合，即都是在用同一批拟合数据。
 *   3. 使用阳性阈值PT和阴性阈值NT，对[阳性点集P]、[阴性点集N]的点进行判断，获得:
 *      [阳性·正确点集PT]、[阳性·错误点集PF]、[阴性·正确点集NT]、[阴性·错误点集NF]。
 *   4. 重复1~3操作。
 *   5. 【收敛条件】：达到最大迭代次数，或[阳性·错误点集PF]、[阴性·错误点集NF]为空集。
 * 算法需要计算RD，即点相对椭圆圆心位置的半径的相对偏差，步骤细节如下：
 *   1. 每次拟合得到的椭圆参数用于构建以圆心为的坐标系。
 *   2. 每个点化归到该坐标系（去中心化 + 逆旋转）然后计算距离、方向等。
 * @param { object } param - 参数对象
 * @param { CV } param.cv - OpenCV.js 实例
 * @param { [number, number][] } param.contourPointAoa - 轮廓点坐标数组
 * @param { number[] } param.contourPointToBaselineDistanceArr - 各轮廓点到基线的距离
 * @param { number } [param.maxIter = 100] - 最大迭代次数，默认100
 * @param { "default" | "ams" | "direct" } [param.method] - 椭圆拟合方法
 * @param { DualTptions } [param.options] - 用于迭代的可选参数
 * @returns {{
 *   ellipse: CV.Ellipse,
 *   timeElapsed: number,
 *   R2Arr: number[],
 *   innerIterationCountArr: number[],
 *   outerIterationCount: number,
 *   resultType: string,
 *   isConverged: boolean,
 *   pointUtilizationArr: number[],
 *   baselineReferencePoint: [number, number]
 * }} 输出结果对象：
 *   - ellipse：椭圆对象；
 *   - timeElapsed：总耗时；
 *   - R2Arr：迭代过程中的拟合优度数组；
 *   - innerIterationCountArr：迭代过程中的小迭代次数数组；
 *   - outerIterationCount：大迭代次数；
 *   - resultType：迭代结果性质种类；
 *   - isConverged：迭代是否收敛；
 *   - pointUtilization：点利用情况数组，即每次大迭代使用的点的数量；
 *   - baselineReferencePoint：基线参考点，取阳性点中Y值最大的点（即最低点）
 */
export function getEllipse({
  cv, contourPointAoa, contourPointToBaselineDistanceArr,
  maxIter = 100, method, options
}) {
  // 防bug：如果阳性点集长度小于6，则报错
  if (contourPointAoa.length < 6) {
    throw new Error("有效数据点不足，无法拟合椭圆。")
  }
  /** 起始时间 */
  const startTime = performance.now()
  /** 阳性点集：拟合良好的点 */
  const PPointAoa = [...contourPointAoa]
  /** 阴性点集：偏离较大的点 @type { [number, number][] } */
  const NPointAoa = []
  /** 阳性点集到基线的距离 */
  const PDistanceArr = [...contourPointToBaselineDistanceArr]
  /** 阴性点集到基线的距离 @type { number[] }  */
  const NDistanceArr = []
  /** 迭代所得的R²值数组 @type { number[] } */
  const R2Arr = []
  /** 迭代所得的小迭代次数数组 @type { number[] } */
  const innerIterationCountArr = []
  /** 迭代收敛指针 */
  let isConverged = false
  /** 大迭代次数指针 */
  let outerIterationCount = 0
  /** 椭圆对象 @type { CV.Ellipse } */
  let ellipse = null
  /** 基线参考点：取阳性点中Y值最大的点（即canvas坐标方向下的最低点） @type { [number, number] } */
  let baselineReferencePoint = null
  /** 数据点的利用情况数组 @type { number[] } */
  const pointUtilizationArr = []
  // -------- 【大迭代】 --------
  // 拟合不收敛 且 迭代次数不超过最大迭代次数时执行
  contourPointIterate: while (!isConverged && (outerIterationCount < maxIter)) {
    // 防bug：如果阳性点集长度小于6，则直接退出迭代
    if (PPointAoa.length < 6) {
      console.warn("有效数据点不足，已强行停止迭代。")
      break contourPointIterate
    }
    // 开始迭代，迭代次数+1
    outerIterationCount++
    // 把本次要用的阳性点存入“数据点的利用情况数组”
    pointUtilizationArr.push(PPointAoa.length)
    // 用阳性点集拟合得到椭圆
    ellipse = fitPointsToEllipse(cv, PPointAoa, method)
    // 阳性偏差数组及R²值
    const { ADArr: PADArr, RDArr: PRDArr, R2 } = computeDeviationMetrics(PPointAoa, ellipse)
    // 把当前R²值存入数组
    R2Arr.push(R2)
    // 阴性相对偏差数组
    const { ADArr: NADArr, RDArr: NRDArr } = computeDeviationMetrics(NPointAoa, ellipse)
    // 获取阳性阈值PT和阴性阈值NT
    const { PT, NT, iterations: innerIterationCount } = determineDualThresholdWithIter(PRDArr, options)
    // 把当前小迭代的次数存入数组
    innerIterationCountArr.push(innerIterationCount);
    // 就地更新阳性点集和阴性点集，并判断是否收敛、更新基线参考点
    ({
      isConverged: isConverged,
      baselineReferencePoint: baselineReferencePoint,
    } = filterPointsByThreshold({
      PT: PT, NT: NT,
      PPointAoa: PPointAoa, NPointAoa: NPointAoa,
      PDistanceArr: PDistanceArr, NDistanceArr: NDistanceArr,
      PRDArr: PRDArr, NRDArr: NRDArr, PADArr: PADArr, NADArr: NADArr
    }))
  }
  // 迭代完毕，构造一个迭代结果
  /** 迭代结果性质种类 @type { string } */
  let resultType = ""
  // 收敛
  if (isConverged === true) {
    resultType = "收敛"
  // 不收敛：源于迭代次数达到上限
  } else if (outerIterationCount === maxIter) {
    resultType = "迭代次数达到上限"
  // 不收敛：源于有效数据点不足
  } else {
    resultType = "有效数据点不足"
  }
  /** 结束时间 */
  const endTime = performance.now()
  /** 耗时 */
  const timeElapsed = endTime - startTime
  // 返回结果
  return {
    ellipse, timeElapsed, R2Arr,
    innerIterationCountArr, outerIterationCount,
    resultType, isConverged, pointUtilizationArr,
    baselineReferencePoint
  }
}


/**
 * filterPointsByThreshold 用阈值筛选点
 * 会根据双阈值处理阳性和阴性点集，并返回收敛状态
 * @param { object } param - 参数对象
 * @param { number } param.PT - 阳性阈值
 * @param { number } param.NT - 阴性阈值
 * @param { [number, number][] } param.PPointAoa - 阳性点集
 * @param { [number, number][] } param.NPointAoa - 阴性点集
 * @param { number[] } param.PDistanceArr - 阳性点到基线的距离数组
 * @param { number[] } param.NDistanceArr - 阴性点到基线的距离数组
 * @param { number[] } param.PRDArr - 阳性相对偏差数组
 * @param { number[] } param.NRDArr - 阴性相对偏差数组
 * @param { number[] } param.PADArr - 阳性绝对偏差数组
 * @param { number[] } param.NADArr - 阴性绝对偏差数组
 * @return {{ isConverged: boolean, baselineReferencePoint: [number, number] }}
 *   isConverged：是否收敛；baselineReferencePoint：基线参考点[x, y]
 * @note 各点集数组对象、距离数组对象，会被就地修改
 */
function filterPointsByThreshold(param) {
  // 解构传参对象
  const {
    PT, NT,
    PPointAoa, NPointAoa,
    PDistanceArr, NDistanceArr,
    PRDArr, NRDArr, PADArr, NADArr
  } = param
  // 构建几个过程临时数组对象：阳性-正确、阳性-错误、阴性-正确、阴性-错误
  /** 阳性-正确数组（将继续保持阳性） @type { [number, number][] } */
  const PTPointAoa = []
  /** 阳性-错误数组（将降为阴性） @type { [number, number][] } */
  const PFPointAoa = []
  /** 阴性-正确数组（将继续保持阴性） @type { [number, number][] } */
  const NTPointAoa = []
  /** 阴性-错误数组（将复活为阳性） @type { [number, number][] } */
  const NFPointAoa = []
  /** 阳性-正确点集到基线的距离数组（将继续保持阳性） @type { number[] } */
  const PTDistanceArr = []
  /** 阴性-正确点集到基线的距离数组（将继续保持阴性） @type { number[] } */
  const NTDistanceArr = []
  /** 阳性-错误点集到基线的距离数组（将降为阴性） @type { number[] } */
  const PFDistanceArr = []
  /** 阴性-错误点集到基线的距离数组（将复活为阳性） @type { number[] } */
  const NFDistanceArr = []
  /** 基线参考点：取阳性点中Y值最大的点（即canvas坐标方向下的最低点） @type { [number, number] } */
  let baselineReferencePoint = [0, 0]
  // 遍历阳性点集，筛选出符合要求的点
  for (let i = 0; i < PPointAoa.length; i++) {
    if (PDistanceArr[i] < PADArr[i]) {
      console.log([PDistanceArr[i], PADArr[i]])
    }
    
    // 点到基线的距离比到拟合点的距离还小；或者RD超过阈值，则推进阳性-错误数组
    if ((PDistanceArr[i] < PADArr[i]) || (PRDArr[i] > PT)) {
      PFPointAoa.push(PPointAoa[i])
      PFDistanceArr.push(PDistanceArr[i])
    // 否则推进阳性-正确数组
    } else {
      PTPointAoa.push(PPointAoa[i])
      PTDistanceArr.push(PDistanceArr[i])
    }
    // 更新基线参考点：取Y值最大的点（canvas坐标系中Y向下为正，即最低点）
    if (baselineReferencePoint[1] < PPointAoa[i][1]) {
      baselineReferencePoint = [...PPointAoa[i]]
    }
  }
  // 遍历阴性点集，筛选出符合要求的点
  for (let i = 0; i < NPointAoa.length; i++) {
    // 点到基线的距离比到拟合点的距离还小；或者RD超过阈值，则推进阴性-正确数组
    if ((NDistanceArr[i] < NADArr[i]) || (NRDArr[i] > NT)) {
      NTPointAoa.push(NPointAoa[i])
      NTDistanceArr.push(NDistanceArr[i])
    // 否则推进阴性-错误数组
    } else {
      NFPointAoa.push(NPointAoa[i])
      NFDistanceArr.push(NDistanceArr[i])
    }
  }
  // 看看是否收敛：阳性-错误数组长度为0，并且阴性-错误数组长度为0
  if ((PFPointAoa.length === 0) && (NFPointAoa.length === 0)) {
    // 收敛，不用再更新阴/阳性点集，直接返回
    return { isConverged: true, baselineReferencePoint: baselineReferencePoint }
  // 不收敛
  } else {
    // 就地更新阳性、阴性点集
    PPointAoa.length = 0
    PPointAoa.push(...PTPointAoa, ...NFPointAoa)
    NPointAoa.length = 0
    NPointAoa.push(...PFPointAoa, ...NTPointAoa)
    // 就地更新距离数组
    PDistanceArr.length = 0
    PDistanceArr.push(...PTDistanceArr, ...NFDistanceArr)
    NDistanceArr.length = 0
    NDistanceArr.push(...PFDistanceArr, ...NTDistanceArr)
    // 返回不收敛状态
    return { isConverged: false, baselineReferencePoint: baselineReferencePoint }
  }
}


/**
 * fittingEllipse 拟合椭圆
 * 使用OpenCV的椭圆拟合算法，由点集拟合出椭圆对象
 * @param { CV } cv - OpenCV对象
 * @param { [number, number][] } pointAoa - 点的原始坐标 [x, y][]
 * @param { "default" | "ams" | "direct" } [method = "ams"] - 拟合方法，默认为 "fitEllipseAMS"
 * @returns { CV.Ellipse } 椭圆对象
 * @note 必须在前置步骤确保点集的长度大于5
 */
function fitPointsToEllipse(cv, pointAoa, method = "ams") {
  // OpenCV工厂方法，把轮廓坐标点positivePointAoa转为轮廓Mat对象
  /** 以轮廓坐标点positivePointAoa生成的cv.Mat对象 */
  const metContourPoints = cv.matFromArray(
    // rows，行数：双通道，所以行数就是[x, y]作为一个Point的行数
    pointAoa.length,
    // cols，列数：1列，即一个Point维度
    1,
    // type，数据类型：CV_32SC2，即32位有符号整数，但是有2个通道（x，y）
    cv.CV_32SC2,
    // array，用于创建Mat对象的数组，即把轮廓坐标点的AOA数组扁平化后传进去
    pointAoa.flat(),
  )
  /** 椭圆对象 @type { CV.Ellipse } */
  let ellipse
  // 根据传入的拟合方法，调用不同的OpenCV方法
  // AMS：Approximate Mean Square，Taubin 1991
  if (method === "ams") {
    ellipse = cv.fitEllipseAMS(metContourPoints)
  // Direct least square，Fitzgibbon 1999
  } else if (method === "direct") {
    ellipse = cv.fitEllipseDirect(metContourPoints)
  // Fitzgibbon 1995
  } else {
    ellipse = cv.fitEllipse(metContourPoints)
  }
  // 拟合结束，删除metContourPoints释放WASM内存
  metContourPoints.delete()
  // 返回椭圆对象
  return ellipse
}


/**
 * computeDeviationMetrics 计算点集的相对偏差（Relative Deviation, RD）数组（原始顺序）及拟合优度R²
 * 计算思路：
 * 1. 将点去中心化 + 旋转，迁移到标准椭圆坐标系
 * 2. 计算点相对椭圆圆心方向上的椭圆半径，以及点与椭圆的距离
 * 3. 以上述的半径作为参考，计算点相对椭圆的相对偏差
 * @param { [number, number][] } pointAoa - 点的原始坐标 [x, y][]
 * @param { CV.Ellipse } ellipse - 椭圆对象
 * @returns {{ ADArr: number[], RDArr: number[], R2: number }} 结果对象：
 *   - ADArr: 绝对偏差（Absolute Deviation, AD）数组（原始顺序）
 *   - RDArr：相对偏差（Relative Deviation, RD）数组（原始顺序）
 *   - R2：拟合优度R²
 */
function computeDeviationMetrics(pointAoa, ellipse) {
  // 如果点集为空，直接返回空数组，多见于第一次的阴性点集
  if (pointAoa.length === 0) {
    return { ADArr: [], RDArr: [], R2: 0 }
  }
  // 接椭圆参数，简化后面的计算公式
  /** 椭圆长轴w */
  const ellipseW = ellipse.size.width
  /** 椭圆短轴h */
  const ellipseH = ellipse.size.height
  /** 椭圆长轴w、短轴h的平方乘积/4，方便后面计算引用 */
  const ellipseHalfHWSquare = (ellipse.size.width ** 2) * (ellipse.size.height ** 2) / 4
  /** 椭圆中心点x坐标 */
  const ellipseCenterX = ellipse.center.x
  /** 椭圆中心点y坐标 */
  const ellipseCenterY = ellipse.center.y
  /** 椭圆旋转角：逆旋转角（canvas顺时针为正，Y向下为正，所以得取负号） */
  const ellipseAngle = -ellipse.angle
  /** 椭圆旋转角sin值 */
  const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
  /** 椭圆旋转角cos值 */
  const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
  /** 绝对偏差（Absolute Deviation, RD）数组 @type { number[] } */
  const ADArr = []
  /** 相对偏差（Relative Deviation, RD）数组 @type { number[] } */
  const RDArr = []
  /** 点到椭圆圆心的径向距离数组 @type { number[] } */
  const pointRArr = []
  /** 椭圆在每个点方向的半径数组 @type { number[] } */
  const ellipseRArr = []
  /** 所有点到椭圆圆心的径向距离之和 */
  let pointRSum = 0
  // 遍历点集，计算每个点的相对偏差
  for (const positivePoint of pointAoa) {
    // 去中心化
    /** 点去中心化后的X坐标 */
    const pointXCentered = positivePoint[0] - ellipseCenterX
    /** 点去中心化后的Y坐标 */
    const pointYCentered = positivePoint[1] - ellipseCenterY
    // 旋转迁移，完成点从自身坐标系到椭圆坐标系的化归
    // x' = xcosθ - ysinθ
    // y' = xsinθ + ycosθ
    /** 点化归到椭圆坐标系的X坐标 */
    const pointXNormalized = pointXCentered * ellipseAngleCos - pointYCentered * ellipseAngleSin
    /** 点化归到椭圆坐标系的Y坐标 */
    const pointYNormalized = pointXCentered * ellipseAngleSin + pointYCentered * ellipseAngleCos
    /** 点到椭圆圆心的径向距离 */
    const pointR = Math.sqrt(pointXNormalized ** 2 + pointYNormalized ** 2)
    /** 点相对椭圆圆心的极角（弧度） */
    const pointRad = Math.atan2(pointYNormalized, pointXNormalized)
    // 通过极角计算椭圆在该方向上的径向距离：
    // 椭圆方程 r²·{[(cosθ)/(w/2)]² + [(sinθ)/(h/2)]²} = 1
    // => r² = (w²·h²/4) / [(h·cosθ)² + (w·sinθ)²]
    const ellipseRSquare = ellipseHalfHWSquare /
      (((ellipseH * Math.cos(pointRad)) ** 2) + ((ellipseW * Math.sin(pointRad)) ** 2))
    /** 椭圆在该点方向的半径：r = r² ** 0.5 */
    const ellipseR = Math.sqrt(ellipseRSquare)
    /** 点与椭圆该方向半径的绝对偏差 */
    const pointToEllipseDistance = Math.abs(pointR - ellipseR)
    // 把绝对偏差AD丢进数组
    ADArr.push(pointToEllipseDistance)
    /** 点与椭圆该方向半径的相对偏差RD */
    const pointRD = pointToEllipseDistance / ellipseR
    // 把相对偏差RD丢进数组
    RDArr.push(pointRD)
    // 接下来处理R²相关计算
    // 把r个体值丢进数组
    pointRArr.push(pointR)
    // 把r拟合值丢进数组
    ellipseRArr.push(ellipseR)
    // 把点到椭圆圆心的径向距离累加，用于计算r均值
    pointRSum = pointRSum + pointR
  }
  // ---- 计算R² ----
  // R² = 1 - SSE / SST
  //    = 1 - 平方和[(r拟合值 - r真实值)²] / 平方和[(r真实值 - r真实值均值)²]
  /** 所有点的平均径向距离，r均值 */
  const pointRMean = pointRSum / pointAoa.length
  /** 总平方和（Sum of Squared Total, SST） */
  let SST = 0
  /** 残差平方和（Sum of Squares due to Error, SSE） */
  let SSE = 0
  // 遍历以计算SSR和SST
  for (let i = 0; i < pointRArr.length; i++) {
    SST = SST + (pointRArr[i] - pointRMean) ** 2
    SSE = SSE + (pointRArr[i] - ellipseRArr[i]) ** 2
  }
  /** R² */
  const R2 = 1 - SSE / SST
  // 返回
  return { ADArr: ADArr, RDArr: RDArr, R2: R2 }
}


/**
 * determineDualThresholdWithIter 确定双阈值（dual-tolerance, DT）及迭代次数
 * 这里最大的难点就是噪声点的处理，所以这里需要用到【稳健估计】的相关方法：
 * 1.  用中位数median来替代平均值μ，用MAD（中位数绝对偏差）来替代标准差σ。
 * 2.  正态分布下，σ（sigma） ≈ 1.4826 × MAD（即MAD ≈ 0.6745 x σ）。因此可以引入sigma的相关判据方法：
 *     以正态分布的置信区间（μ + nσ），对噪声点进行判据。
 * 3.  实际上，初次计算得到的MAD并不足以代表sigma，因此需要通过迭代的方法，排除极端值，让MAD更稳健。
 * 4.  迭代方面，参考Tukey bisquare M-估计思路，并将计算简化为 迭代截尾均值（Iterated Trimmed Mean），具体在于：
 *     参考Tukey的阈值常数C的做法，结合单尾正态分布的实际情况，设定一个阈值常数C：
 *     单尾下，当标准化残差r ≤ C时，保留该点，否则剔除该点。
 * 5.  剔除极端值后，重新计算MAD，直到MAD收敛（实际计算时，用sigma收敛代替，以降低心智负担）。
 * 6.  收敛后，TOL = median + C * sigma，公式形式等同于 μ + nσ
 * @param { number[] } RDArr - 相对偏差（Relative Deviation, RD）数组（原始顺序）
 * @param { object } [options] - 可选参数
 * @param { number } [options.C = 2] - 截断常数。
 *   - 取1时，即类似于1σ，μ + 1σ覆盖的概率约为0.6826。
 *   - 取2时，即类似于2σ，μ + 2σ覆盖的概率约为0.9544。
 *   - 取3时，即类似于3σ，μ + 3σ覆盖的概率约为0.9974。
 * @param { number } [options.maxIter = 20] - 最大迭代次数（安全上限）。
 *   实际通常2 ~ 4次即收敛。以收敛条件为主，maxIter 仅防止无限循环。
 * @param { number } [options.convergenceThreshold = 0.01] - 收敛阈值。
 *   当sigma的相对变化小于此值时判定收敛并停止迭代。
 * @param { NTOptions } [options.NTOptions] - 阴性阈值计算的可选参数。
 * @returns {{ PT: number, NT: number, iterations: number }}
 *   PT: 阳性阈值；NT: 阴性阈值；iterations: 迭代次数
 */
function determineDualThresholdWithIter(RDArr, options = {}) {
  // 初始化参数
  const {
    C = 2,
    maxIter = 20,
    convergenceThreshold = 0.01,
    NTOptions = {}
  } = options
  /** 排序后的数组 */
  const sortedRDArr = sortArr(RDArr)
  /** 数组长度 */
  const N = RDArr.length
  /** 中位数 @type { number } */
  let median
  /** 中位绝对偏差 @type { number } */
  let MAD
  // 计算初始的中位绝对偏差和中位数，并解构赋值
  ({ median: median, MAD: MAD } = computeMAD(sortedRDArr))
  /** 假设正态分布情况下的等效标准差sigma */
  let sigma = MAD * 1.4826
  // =============== 退化处理，确保sigma不为0 ===============
  // sigma = MAD = 0，说明超过一半的RD值相同，需要回退到更保守的替代估计方法：
  if (sigma === 0) {
    // 正态分布下，μ到Q1等于0.6745 * σ，因此用左侧展幅法：
    /** Q1值，即25%位置的值 */
    const q1 = getPercentile(sortedRDArr, 25)
    /** 左展幅，中位数 - Q1位数 */
    const spreadLeft = median - q1
    // 如果左侧展幅为正，即中位数大于Q1位数，则用左侧展幅法计算sigma
    if (spreadLeft > 0) {
      sigma = spreadLeft * 1.4826
    // 否则左侧展幅为0，说明Q1也和μ相同，数据极端集中，则再次退化。若中位数为正：
    } else if (median > 0) {
      // sigma取中位数median的10%：即如果主体RE都相同，"合理偏差范围"大致是RE中心值的10%量级
      sigma = median * 0.1
    // 若中位数也为0，则再次退化
    } else {
      // "合理偏差范围"只能给一个默认值，1%
      sigma =  0.01
    }
  }
  // =============== 迭代优化 ===============
  /** 迭代次数 */
  let actualIter = 0
  /** 迭代使用的相对偏差数组 */
  const iterSortedRDArr = []
  // 开始迭代优化阳性阈值
  whileIter: while (actualIter < maxIter) {
    // 迭代次数加1
    actualIter++
    // 初始化迭代使用的相对偏差数组
    iterSortedRDArr.length = 0
    // 遍历相对偏差数组，判断是否将该点纳入稳健估计
    for (let i = 0; i < N; i++) {
      /** 标准化残差 */
      const r = (sortedRDArr[i] - median) / sigma
      // 判断是否保留该点
      if (r <= C) {
        // 单尾情况下，小于等于C即可保留
        iterSortedRDArr.push(sortedRDArr[i])
      }
    }
    // 更新中位数、中位绝对偏差
    const { median: newMedian, MAD: newMAD } = computeMAD(iterSortedRDArr)
    /** 新的等效标准差sigma */
    const newSigma = newMAD * 1.4826
    /** sigma的相对变化率 */
    const sigmaRelativeChangeRate = Math.abs(newSigma - sigma) / sigma
    // 更新sigma
    sigma = newSigma
    // 更新中位数
    median = newMedian
    // 若新的sigma为0，说明所有点都相等；或相对变化率小于收敛阈值
    if ((newSigma === 0) || (sigmaRelativeChangeRate < convergenceThreshold)) {
      // 退出迭代
      break whileIter
    }
  }
  // 迭代结束
  /** 阳性阈值 */
  const PT = median + C * sigma
  /** 阴性阈值 */
  const NT = computeNegativeThreshold(iterSortedRDArr, PT, NTOptions)
  // 返回结果
  return {
    PT: PT,
    NT: NT,
    iterations: actualIter,
  }
}


/**
 * computeNegativeThreshold 确定阴性阈值（Negative-Tolerance, NT）
 * 阴性阈值NT = 阳性阈值PT * 阴性系数NI
 * 阴性系数NI类似“施密特触发器”（Schmitt trigger），用一个难度更高的阈值来防止迭代过程中的数据点振荡，
 * 可以有2种得到NI的方法：
 * 1.  迭代优化得到PT过程中，取最后一轮的阳性数组，获取某个位数（如Q3即75%位次的那个数），以该数为阴性阈值NT的参考。
 *     即门槛提高到75%的阳性点位次，以此为参考，计算得到一个阴性系数NI值。
 *     （可选）得到NI值之后，用预设的NI的上界（maxNI）和下界（minNI）对NI进行约束，防止NI太大造成迭代振荡。
 * 2.  采用一个兜底的经验值：NI = 2/3，以此计算得到NT。
 * @param { number[] } sortedRDArr 已排序的相对偏差数组
 * @param { number } PT 阳性阈值（Positive-Tolerance, PT）
 * @param { NTOptions } [options] - 可选参数
 * @returns { number } 阴性阈值NT（无量纲）
 */
function computeNegativeThreshold(sortedRDArr, PT, options = {}) {
  // 初始化参数
  const {
    percent = 75,
    fixedNI = 2/3,
    minNI = 0.35,
    maxNI = 0.85
  } = options
  // 如果percent不是数字，或不在0~100之间，则报错
  if ((typeof percent !== "number") || (percent < 0) || (percent > 100)) {
    throw new Error("percentile参数必须是一个0到100之间的数字")
  }
  // 如果percent为0，即方法为“fix”
  if (percent === 0) {
    /** 以固定值计算的NT */
    const NT = PT * fixedNI
    // 返回
    return NT
  }
  /** 从已排序的数组中获取的分位数 */
  const percentile = getPercentile(sortedRDArr, percent)
  /** 分位数计算得到的NI */
  const percentileNI = percentile / PT
  /** 上下限约束后的NI */
  const constrainedNI = Math.min(maxNI, Math.max(minNI, percentileNI))
  /** 以百分位数计算的NT */
  const NT = PT * constrainedNI
  // 返回
  return NT
}


// ================================ 工具函数 ================================


/**
 * sortArr 按照默认的升序排序方法对数组进行排序
 * @param { number[] } arr 待排序的数值数组
 * @returns { number[] } 已排序的数值数组
 */
function sortArr(arr) {
  /** 原始数组的拷贝 */
  const arrCopy = [...arr]
  // 就地排序
  arrCopy.sort((a, b) => a - b)
  // 返回排序后的数组
  return arrCopy
}


/**
 * getMedian 从已排序的数组中获取中位数
 * 会根据长度奇偶性取中间值或中间两值的平均
 * @param { number[] } sortedArr 已排序的数值数组
 * @returns { number } 中位数
 */
function getMedian(sortedArr) {
  /** 数组长度 */
  const arrLength = sortedArr.length
  // 如果数组长度为0，则报错
  if (arrLength === 0) {
    throw new Error("数组长度为0，无法计算中位数")
  }
  /** 中间位次 */
  const midIndex = sortedArr.length / 2
  // 如果中间位次是整数，即数组长度为偶数，则取中间两个值的平均
  if ((midIndex % 1) === 0) {
    /** 中间两个值的均值，即中间值 */
    const median = (sortedArr[midIndex - 1] + sortedArr[midIndex]) / 2
    // 返回均值
    return median
  // 否则中间位次不是整数，即数组长度为奇数，则直接取中间值
  } else {
    /** 中间值 */
    const median = sortedArr[Math.floor(midIndex)]
    // 返回中间值
    return median
  }
}


/**
 * computeMAD 计算数组的中位绝对偏差（Median Absolute Deviation, MAD）
 * MAD = median(|x_i - median(x)|)。
 * MAD是稳健的尺度估计量，崩溃点约50%（对称污染模型下）。
 * 这意味着即使数据中混入20% ~ 30%的异常值，MAD仍由主体分布决定。
 * 正态分布下，σ（sigma） ≈ 1.4826 × MAD（即MAD ≈ 0.6745 x σ）。
 * @param { number[] } sortedArr 已排序的数值数组
 * @returns {{ MAD: number, median: number }}
 *   MAD: 中位绝对偏差（≥ 0）, median: 中位数
 */
function computeMAD(sortedArr) {
  /** 中位数 */
  const median = getMedian(sortedArr)
  /** 每个点到中位数的偏差绝对值 */
  const deviationArr = []
  for (const value of sortedArr) {
    deviationArr.push(Math.abs(value - median))
  }
  /** 对偏差绝对值数组进行排序 */
  const sortedDeviationArr = sortArr(deviationArr)
  /** 偏差绝对值的中位数，即MAD */
  const MAD = getMedian(sortedDeviationArr)
  // 返回MAD和中位数
  return { MAD: MAD, median: median }
}


/**
 * percentile 计算数组指定分位数值。
 * 对于分位index不是整数的情况，使用线性插值法：
 *   (index - lowIndex) / (highIndex - lowIndex) === (value - lowValue) / (highValue - lowValue)
 * @param { number[] } sortedArr 已排序的数组
 * @param { number } percentage 百分位数（0 ~ 100）
 * @returns { number } 分位数值
 */
function getPercentile(sortedArr, percentage) {
  /** 数组长度 */
  const arrLength = sortedArr.length
  // 如果数组长度为0，则返回0
  if (arrLength === 0) { return 0 }
  /** 插值位置 */
  const index = (percentage / 100) * (arrLength - 1)
  /** 插值向下取整位置 */
  const lowIndex = Math.floor(index)
  /** 插值向上取整位置 */
  const highIndex = Math.ceil(index)
  // 如果向上取整和向下取整相等，即插值为整数
  if (lowIndex === highIndex) {
    // 直接返回该位置的值
    return sortedArr[index]
  // 否则应使用线性插值法
  } else {
    /** 线性插值计算得到的值 @type { number } */
    const value =
      (index - lowIndex)
        / (highIndex - lowIndex)
        * (sortedArr[highIndex] - sortedArr[lowIndex])
        + sortedArr[lowIndex]
    // 返回
    return value
  }
}
