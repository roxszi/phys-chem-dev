/**
 * 通用数组校验工具
 *
 * 这些校验函数与"拟合"或任何具体业务无关，
 * 任何业务都可以用它们做最基本的输入校验。
 */

/**
 * 校验两个数组长度相同
 *
 * @throws 长度不一致时
 */
export function validateSameLength(a: unknown[], b: unknown[], names: [string, string] = ['a', 'b']): void {
  if (a.length !== b.length) {
    throw new Error(
      `${names[0]} 和 ${names[1]} 长度不一致：${names[0]}=${a.length}, ${names[1]}=${b.length}`,
    )
  }
}

/**
 * 校验数组长度 >= 指定最小值
 *
 * @throws 长度不足时
 */
export function validateMinLength(arr: unknown[], min: number, name = 'arr'): void {
  if (arr.length < min) {
    throw new Error(
      `${name} 至少需要 ${min} 个元素，当前为 ${arr.length}`,
    )
  }
}

/**
 * 校验数组中所有元素都是有限数（非 NaN / Infinity）
 *
 * @throws 存在非有限元素时
 */
export function validateFiniteArray(arr: number[], name = 'arr'): void {
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) {
      throw new Error(
        `${name}[${i}] 不是有限数：${arr[i]}`,
      )
    }
  }
}
