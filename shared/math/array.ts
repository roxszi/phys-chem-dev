/**
 * 数组相关方法
 */


/**
 * 数组排序
 * - 按照默认的升序排序方法（小 -> 大）对数组进行排序
 * - 会产生一阶深拷贝的新数组
 */
export function sortArr(arr: number[]): number[] {
  /** 一阶深拷贝 */
  const arrCopy = [...arr]
  // 排序
  arrCopy.sort((a, b) => a - b)
  // 返回排序后的数组
  return arrCopy
}
