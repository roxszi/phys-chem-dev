/** 
 * 接触角业务的数据类型定义
 */

/** canvas元素块选框（亦用于步骤3的遮罩框） */
export interface Rect {
  /** 选框的X坐标大值 */
  xMax: number | null
  /** 选框的Y坐标大值 */
  yMax: number | null
  /** 选框的X坐标小值 */
  xMin: number | null
  /** 选框的Y坐标小值 */
  yMin: number | null
}

/** canvas元素块遮罩线 */
export interface ColLine {
  /** 遮罩线的左侧线X坐标 */
  left: number | null
  /** 遮罩线的右侧线X坐标 */
  right: number | null
}

/** canvas元素基线遮罩线 */
export interface Baseline {
  /** 基线的左侧Y坐标 */
  left: number | null
  /** 基线的右侧Y坐标 */
  right: number | null
}