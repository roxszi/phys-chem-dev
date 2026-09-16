/**
 * 预测下降量与增益比（trust-region 的判据基础）
 * ---
 * 预测下降量 = 2·Δᵀg − ΔᵀA·Δ
 *   - 来自 S(x+Δ) ≈ S(x) − 2Δᵀg + ΔᵀAΔ 的一阶泰勒展开
 *   - g 为 Jᵀr，A 为对称的 JᵀJ（阻尼项不参与预测，只影响 Δ 的来源）
 *   - 行主序扁平存储（Float64Array）
 * ---
 * 增益比 ρ = (实际下降 sOld − sNew) / 预测下降
 *   - ρ ≈ 1：线性近似准，步子可以放大
 *   - ρ ≤ 0：实际不降反升，拒绝该步
 */

/**
 * 预测下降量 = 2·Δᵀg − ΔᵀA·Δ
 * @param delta 步长向量（长度 n）
 * @param g 梯度向量 Jᵀr（长度 n）
 * @param A 对称的 JᵀJ（n×n，行主序扁平）
 * @param n 参数个数
 * @returns 预测下降量（标量）
 */
export function predictedReduction(
  delta: Float64Array, g: Float64Array, A: Float64Array, n: number
): number {
  // 一阶项：Δᵀg
  let dotG = 0;
  for (let i = 0; i < n; i++) dotG += delta[i]! * g[i]!;

  // 二次项：ΔᵀAΔ（逐行算 (A·Δ)[i] 再与 Δ[i] 相乘累加）
  let quad = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i * n + j]! * delta[j]!;
    quad += delta[i]! * s;
  }
  // 预测下降量 = 2Δᵀg − ΔᵀAΔ
  return 2 * dotG - quad;
}

/**
 * 增益比。预测不降（predRed ≤ 0）时返回 -1，交由策略当作拒绝处理
 * @param sOld 步前 SSE
 * @param sNew 步后 SSE
 * @param predRed 预测下降量
 * @returns 增益比 ρ；预测不降时为 -1
 */
export function gainRatio(sOld: number, sNew: number, predRed: number): number {
  return predRed <= 0 ? -1 : (sOld - sNew) / predRed;
}
