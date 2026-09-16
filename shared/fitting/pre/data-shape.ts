/**
 * fitting/pre - 数据结构变换（原始数据范式打样）
 * ---
 * fitting 层的统一数据契约：
 *   xData: number[][]（行主序，第 i 行 = 第 i 个样本的自变量向量）+ yData: number[]
 * 本文件提供"常见原始数据结构 → 统一契约"的变换范式，当前收录两种：
 *   - pointListToXY：点列表 [x, y][] → { xData, yData }（表格 / 仪器导出最常见的逐点形态）
 *   - singleXToRows：单自变量标量数组 number[] → number[][]（单变量业务的一行包装）
 * 消费方是 equation 层（公式实现拟合时把业务数据转成 fitting 契约），fitting 算法自身不使用本文件；
 * 以后出现新的数据范式（如 { x, y, sigma } 对象列表），在本文件追加同款变换落档。
 */

/**
 * 点列表 → 统一数据契约
 * - 输入：[x, y][] 逐点形态（每个元素是一个数据点）
 * - 输出：xData 每行一个自变量向量（当前打样为单自变量，每行 [xᵢ]），yData 逐点对应
 * @param points 点列表（只读，不修改入参）
 * @returns fitting 契约形态的 { xData, yData }
 */
export function pointListToXY(
  points: readonly (readonly [number, number])[],
): { xData: number[][]; yData: number[] } {
  /** 自变量数据（行主序） */
  const xData: number[][] = []
  /** 因变量数据 */
  const yData: number[] = []
  // 逐点拆分：每点拆成一行自变量向量 + 一个因变量标量
  for (const point of points) {
    // 点必须是 [x, y] 二元组（防御非元组形态混入）
    if (point.length !== 2) {
      throw new Error(`点列表元素必须是 [x, y] 二元组，当前长度 ${ point.length }`)
    }
    xData.push([point[0]])
    yData.push(point[1])
  }
  return { xData, yData }
}

/**
 * 单自变量标量数组 → 行主序自变量数据
 * - 单变量业务（如时间序列 t[]）一行包装成 [[t₀], [t₁], …]
 * - 配套用途：fitEquation / levenbergMarquardt 等入口的 xData 均为 number[][]，
 *   单变量调用方用本函数完成 number[] → number[][] 的最后一跳
 * @param xArr 单自变量标量数组（只读，不修改入参）
 * @returns 行主序自变量数据（每行恰 1 个分量）
 */
export function singleXToRows(xArr: readonly number[]): number[][] {
  return xArr.map(x => [x])
}
