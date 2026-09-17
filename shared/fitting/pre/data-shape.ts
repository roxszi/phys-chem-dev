/**
 * fitting/pre - 数据结构变换（原始数据范式打样）
 * ---
 * fitting 层的统一数据契约：
 *   xData: DataArray（= Matrix，行主序设计矩阵：rows = 样本数 n，cols = 自变量分量数 m）
 *   + yData: number[]
 * 本文件提供"常见原始数据结构 → 统一契约"的变换范式，当前收录两种：
 *   - pointListToXY：点列表 [x, y][] → { xData, yData }（表格 / 仪器导出最常见的逐点形态）
 *   - singleXToMatrix：单自变量标量数组 number[] → n×1 设计矩阵（单变量业务的最后一跳包装）
 * 消费方是 equation 层（公式实现拟合时把业务数据转成 fitting 契约），fitting 算法自身不使用本文件；
 * 以后出现新的数据范式（如 { x, y, sigma } 对象列表），在本文件追加同款变换落档。
 */

// 矩阵契约与构造（跨模块，走 @shared 别名 + index.ts 唯一入口）
import { createMatrix } from "@shared/math/index.ts"
import type { Matrix } from "@shared/math/index.ts"
// 数据契约（本模块内部文件，相对路径）
import type { DataArray } from "../types.ts"

/**
 * 点列表 → 统一数据契约
 * - 输入：[x, y][] 逐点形态（每个元素是一个数据点）
 * - 输出：xData 为 n×1 设计矩阵（当前打样为单自变量），yData 逐点对应
 * @param points 点列表（只读，不修改入参）
 * @returns fitting 契约形态的 { xData, yData }
 */
export function pointListToXY(
  points: readonly (readonly [number, number])[],
): { xData: DataArray; yData: number[] } {
  /** 自变量设计矩阵（n×1，行主序） */
  const xData = createMatrix(points.length, 1)
  /** 因变量数据 */
  const yData: number[] = []
  /** 行游标 */
  let i = 0
  // 逐点拆分：每点拆成一行自变量分量 + 一个因变量标量
  for (const point of points) {
    // 点必须是 [x, y] 二元组（防御非元组形态混入）
    if (point.length !== 2) {
      throw new Error(`点列表元素必须是 [x, y] 二元组，当前长度 ${ point.length }`)
    }
    xData.data[i] = point[0]
    yData.push(point[1])
    i++
  }
  return { xData, yData }
}

/**
 * 单自变量标量数组 → n×1 设计矩阵
 * - 单变量业务（如时间序列 t[]）包装成 n×1 行主序矩阵：data[i] = xᵢ
 * - 配套用途：fitEquation / levenbergMarquardt 等入口的 xData 均为 DataArray（设计矩阵），
 *   单变量调用方用本函数完成 number[] → n×1 矩阵的最后一跳
 * @param xArr 单自变量标量数组（只读，不修改入参）
 * @returns n×1 设计矩阵（rows = n，cols = 1）
 */
export function singleXToMatrix(xArr: readonly number[]): Matrix {
  /** 样本数 */
  const rows = xArr.length
  // 构造 n×1 矩阵并逐元素填充
  const xData = createMatrix(rows, 1)
  for (let i = 0; i < rows; i++) {
    xData.data[i] = xArr[i]!
  }
  return xData
}
