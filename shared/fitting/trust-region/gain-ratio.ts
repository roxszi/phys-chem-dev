/**
 * 预测下降量与增益比（trust-region 策略的判据基础）（gain-ratio.ts）
 * ---
 * 【背景：为什么需要"预测下降量"】
 * Gauss-Newton 类算法在当前参数点 β 处，对残差平方和 S 做二阶泰勒近似
 * （真 Hessian 用 JᵀJ 代替，即 Gauss-Newton 近似）：
 *   S(β + Δ) ≈ S(β) − 2·Δᵀg + ΔᵀA·Δ
 *   其中 g = Jᵀr（梯度），A = JᵀJ（对称近似 Hessian），Δ 为试探步长。
 * 把近似式右端与 S(β) 相减，得到"如果线性近似完全成立，这步能降多少"：
 *   预测下降量 predRed = 2·Δᵀg − ΔᵀA·Δ
 * ---
 * 【增益比 ρ：预测与实际的比值】
 *   ρ = (sOld − sNew) / predRed = 实际 SSE 下降量 / 预测下降量
 * 直觉：ρ 是"线性近似准确度评分"——
 *   ρ ≈ 1    ：预测基本兑现，模型在该处接近线性，步子可信、可放大；
 *   0 < ρ < 1：确实在降，但没降够（二阶效应明显），步子可信但不宜放大；
 *   ρ ≤ 0    ：不降反升，线性近似失效，必须拒绝该步并收紧。
 * 约定：predRed ≤ 0 时直接返回 -1——"连预测都不降"本身就是坏步的信号，
 * 交由策略函数（classic / nielsen）按拒绝处理。
 * ---
 * 数据布局：A 为行主序扁平存储的 Float64Array（与 linear-solver/normal-equation-new.ts
 * 的 GPU 就绪布局一致）；n 为参数个数。
 */

/**
 * 预测下降量 = 2·Δᵀg − ΔᵀA·Δ
 * @param delta 步长向量（长度 n）
 * @param g 梯度向量 Jᵀr（长度 n）
 * @param A 对称的 JᵀJ（n×n，行主序扁平 Float64Array）
 * @param n 参数个数
 * @returns 预测下降量（标量）
 */
export function predictedReduction(
  delta: Float64Array, g: Float64Array, A: Float64Array, n: number
): number {
  // 一阶项 dotG = Δᵀg = Σᵢ Δᵢ·gᵢ（泰勒展开的线性主项：沿梯度方向走 Δ 能降多少）
  let dotG = 0;
  for (let i = 0; i < n; i++) dotG += delta[i]! * g[i]!;

  // 二次项 quad = ΔᵀAΔ = Σᵢ Δᵢ·(A·Δ)ᵢ（曲率修正：考虑"越走越平/越陡"的二阶效应）
  // 逐行算矩阵向量积 (A·Δ)ᵢ 再与 Δᵢ 相乘累加
  let quad = 0;
  for (let i = 0; i < n; i++) {
    // (A·Δ)ᵢ = 第 i 行与 Δ 的点积；行主序下 A 的第 [i][j] 元素存放在 A[i*n + j]
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i * n + j]! * delta[j]!;
    quad += delta[i]! * s;
  }
  // 预测下降量 = 线性主项 − 曲率修正
  // （系数 2 来自 S = Σr² 在链式法则求导时产生的因子 2）
  return 2 * dotG - quad;
}

/**
 * 增益比 ρ = 实际下降 / 预测下降
 * - 预测不降（predRed ≤ 0）时返回 -1，交由策略当作拒绝处理
 * @param sOld 步前 SSE
 * @param sNew 步后 SSE
 * @param predRed 预测下降量（predictedReduction 的返回值）
 * @returns 增益比 ρ；预测不降时为 -1
 */
export function gainRatio(sOld: number, sNew: number, predRed: number): number {
  // 分子 sOld − sNew：> 0 表示真的降了；分母用带符号的 predRed，
  // 保证 ρ 的符号同时反映"实际是否下降"与"预测是否下降"
  return predRed <= 0 ? -1 : (sOld - sNew) / predRed;
}
