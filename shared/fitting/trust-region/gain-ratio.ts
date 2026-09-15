/**
 * 预测下降量 = 2·Δᵀg − ΔᵀA·Δ
 * A 为对称的 JᵀJ（阻尼项不参与预测，只影响 Δ 的来源），行主序扁平存储。
 */
export function predictedReduction(
  delta: Float64Array, g: Float64Array, A: Float64Array, n: number
): number {
  let dotG = 0;
  for (let i = 0; i < n; i++) dotG += delta[i] * g[i];

  let quad = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i * n + j] * delta[j];
    quad += delta[i] * s;
  }
  return 2 * dotG - quad;
}

/** 增益比。预测不降（predRed ≤ 0）时返回 -1，交由策略当作拒绝处理 */
export function gainRatio(sOld: number, sNew: number, predRed: number): number {
  return predRed <= 0 ? -1 : (sOld - sNew) / predRed;
}
