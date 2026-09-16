/**
 * math/matrix - Cholesky 分解族（cholesky.ts）
 * ---
 * 【适用】对称正定方阵（如阻尼后的正规方程 JᵀJ + λD）。
 * Cholesky 分解 A = L·Lᵀ（L 下三角）利用正定性：
 *   - 计算量是 LU 的一半（n³/3 vs 2n³/3 flops）；
 *   - 不需要选主元（正定性保证数值稳定）。
 * ---
 * 【非正定兜底的诚实声明】
 * 对角开方前发现 ≤ 0 时压到 DIAGONAL_FLOOR。这不是数学上正确的处理
 * （正确的做法是报错或转 SVD），但在 LM 语境下是合理的工程折中——
 * λ > 0 时理论上不可能发生；发生的唯一途径是 λ = 0 且 J 秩亏，
 * 此时返回一个"保守的大步长"交给外层 ρ 判据拒绝，
 * 比直接抛异常打断迭代更符合信赖域框架的容错设计。
 * ---
 * 【数据布局】行主序扁平 Float64Array，与全项目 GPU 就绪布局一致。
 */

/**
 * 阻尼下限：防止某参数的列全零（模型未用到该参数）时 D 对角元为 0，
 * λD 救不了它，Cholesky 开方负数直接 NaN。兜底成小正数保证可解。
 */
export const DIAGONAL_FLOOR = 1e-12

/**
 * Cholesky 分解（原地，只写 A 的下三角含对角）
 * - 调用后 a 的下三角（含对角）= L，上三角保留分解前的旧值（垃圾）——
 *   choleskySolve 全程只读下三角；若未来复用上三角务必先知道这一点
 * @param a 对称方阵数据（行主序扁平，长度 n×n，被原地覆盖）
 * @param n 阶数
 */
export function choleskyDecomposeInPlace(a: Float64Array, n: number): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      // 从原始 A[i][j] 出发，减去已算出的 L 元素的贡献
      let s = a[i * n + j]!
      for (let k = 0; k < j; k++) {
        s -= a[i * n + k]! * a[j * n + k]!
      }
      if (i === j) {
        // 对角元：开方；非正定兜底（见文件头声明）
        if (s <= 0) s = DIAGONAL_FLOOR
        a[i * n + i] = Math.sqrt(s)
      } else {
        // 非对角：除以 L[j][j]
        a[i * n + j] = s / a[j * n + j]!
      }
    }
  }
}

/**
 * 用分解好的 L 解 L·Lᵀ·x = g（前代 + 回代，结果写进调用方预分配的 out）
 * - 单独导出的原因：tfjs GPU 路径的 A、g 在 GPU 上归约完成后直接下载，
 *   不经过 CPU 的"形成 JᵀJ"阶段，但收尾的 Cholesky 求解是共用的——
 *   p×p 小矩阵，CPU 微秒级
 * @param l choleskyDecomposeInPlace 产出的下三角（行主序扁平）
 * @param g 右端项（长度 n）
 * @param n 阶数
 * @param out 解向量（长度 n，调用方预分配，原地写入）
 */
export function choleskySolve(
  l: Float64Array,
  g: Float64Array,
  n: number,
  out: Float64Array,
): void {
  // 前代 L·y = g（下三角，自上而下）
  for (let i = 0; i < n; i++) {
    let s = g[i]!
    for (let j = 0; j < i; j++) {
      s -= l[i * n + j]! * out[j]!
    }
    out[i] = s / l[i * n + i]!
  }
  // 回代 Lᵀ·x = y（上三角转置视角，自下而上；
  // out 前 i 项此刻是中间量 y，两段共用同一缓冲是安全的）
  for (let i = n - 1; i >= 0; i--) {
    let s = out[i]!
    for (let j = i + 1; j < n; j++) {
      s -= l[j * n + i]! * out[j]!
    }
    out[i] = s / l[i * n + i]!
  }
}
