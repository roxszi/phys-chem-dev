/**
 * math/matrix - 基础稠密矩阵的契约类型（types.ts）
 * ---
 * 【定位】
 * 本目录只放"基础的、业务无关"的矩阵操作（构造 / 访问 / 算术 / LU / Cholesky）；
 * 只在拟合业务里用到的矩阵操作（加权正规方程归约、阻尼施加、协方差组装等）
 * 不进本目录，写在 fitting\ 的具体业务 ts 文件里（工具函数放文件底部）。
 * ---
 * 【数据布局】
 * 行主序扁平 Float64Array：m.data[i × cols + j] = 第 i 行第 j 列。
 * 与 trust-region/gain-ratio.ts、linear-solver 的 GPU 就绪布局一致——
 * 将来 tfjs 路径只需把 .data 换成 GPU 张量归约的结果，收尾求解共用。
 */

/**
 * 基础稠密矩阵（行主序扁平 Float64Array）
 * - 纯数据结构（无方法），操作一律走本目录的纯函数
 */
export interface Matrix {
  /** 行主序扁平数据，长度恒为 rows × cols */
  data: Float64Array
  /** 行数 */
  rows: number
  /** 列数 */
  cols: number
}

/**
 * 向量（Vector）
 * - 类型即 Float64Array：布局确定 + GPU TypedArray 入场券（与 Matrix.data 同源）
 * - 与 Matrix 的关系：不继承、不包装；行/列向量由操作语义决定，
 *   需要矩阵混合运算时用 construct 的显式转换（如 matrixFrom2D）
 * - 整数索引数组（indices / excluded / LU 置换）语义为整数，不用本类型，保持 number[]
 */
export type Vector = Float64Array

/**
 * 奇异 / 近奇异判定阈值（全项目唯一）
 * - 主元绝对值低于此值视为奇异（求逆 / 求解返回 null）
 */
export const SINGULAR_TOLERANCE = 1e-14
