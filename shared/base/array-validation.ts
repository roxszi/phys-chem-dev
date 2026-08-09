/**
 * 数组校验原子函数
 *
 * 三个工具：长度一致 / 最小长度 / 元素有限。
 * 抛错而非返回 boolean——让调用方能直接 fail-fast。
 */

/**
 * 校验两个数组长度相同
 * @param a 待校验数组
 * @param b 待校验数组
 * @param nameA 错误信息中 a 的名字
 * @param nameB 错误信息中 b 的名字
 */
export function validateSameLength(a: number[], b: number[], nameA = 'a', nameB = 'b'): void {
  if (a.length !== b.length) {
    throw new Error(
      `${nameA} 与 ${nameB} 长度不匹配：${nameA}.length=${a.length}, ${nameB}.length=${b.length}`,
    )
  }
}

/**
 * 校验数组最小长度
 * @param arr 待校验数组
 * @param min 最小长度
 * @param name 错误信息中数组的名字
 */
export function validateMinLength(arr: number[], min: number, name = 'arr'): void {
  if (arr.length < min) {
    throw new Error(`${name}.length=${arr.length} 小于最小要求 ${min}`)
  }
}

/**
 * 校验数组所有元素为有限数（非 NaN / 非无穷）
 * @param arr 待校验数组
 * @param name 错误信息中数组的名字
 */
export function validateFiniteArray(arr: number[], name = 'arr'): void {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v === undefined || !Number.isFinite(v)) {
      throw new Error(
        `${name}[${i}] 不是有限数：${v === undefined ? 'undefined' : v}`,
      )
    }
  }
}
