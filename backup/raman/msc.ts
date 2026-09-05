/**
 * MSC - 多元散射校正（Multiplicative Scatter Correction）
 * ---
 * 算法核心思路（Geladi et al., 1985）：
 * - 假设每条光谱 x_i 可表示为参考谱 x_ref 的仿射变换：
 *     x_i = a_i + b_i * x_ref + e_i
 * - 其中，a_i 为加性偏移（baseline），b_i 为乘性系数（path length / scatter），e_i 为残差。
 * ---
 * 步骤：
 * 1.  对每条光谱 x_i，用最小二乘拟合 x_i = a + b * x_ref，得到 a_i、b_i
 *     b_i = Σ(x_ref - x̄_ref)(x_i - x̄_i) / Σ(x_ref - x̄_ref)²
 *     a_i = x̄_i - b_i * x̄_ref
 * 2.  校正：x_i_corrected = (x_i - a_i) / b_i
 * ---
 * 参考谱选择：
 * - 默认：所有光谱的均值（colMeans）
 * - 可通过 options.reference 自定义
 * ---
 * 参考文献：
 * - Geladi, P., MacDougall, D., & Martens, H. (1985).
 * - Linearization and Scatter-Correction for Near-Infrared Reflectance Spectra.
 * - Applied Spectroscopy, 39(2), 245-260.
 * ---
 * 实现说明：
 * - 算法不直接 import tfjs，由调用方通过 tf: TensorBackend 注入
 * - 大量使用 tf.tidy() 自动释放中间张量，避免 GPU 内存泄漏
 * - 矩阵运算批处理：所有样本一次性算均值（O(n) 而不是 O(n²)）
 */

import type {
  PreprocessResult,
  Preprocessor,
  TensorBackend,
} from './types.ts'

/**
 * MSC 算法的额外元数据
 */
export interface MscExtras {
  /** 使用的参考谱 */
  reference: number[]
  /** 每条光谱的拟合斜率（用于诊断） */
  slopes?: number[]
  /** 每条光谱的拟合截距（用于诊断） */
  intercepts?: number[]
}

export function createMSC(tf: TensorBackend): Preprocessor {
  return {
    name: 'MSC',

    apply(dataset, options = {}): PreprocessResult {
      // 参数校验：所有光谱必须等长
      const len = dataset.wavelengths.length
      for (let i = 0; i < dataset.spectra.length; i++) {
        const spectrum = dataset.spectra[i]
        if (!spectrum || spectrum.length !== len) {
          throw new Error(
            `[MSC] 光谱 ${dataset.sampleIds[i] ?? i} 长度 ${spectrum?.length ?? 0} 与波长轴 ${len} 不匹配`
          )
        }
      }

      return tf.tidy(() => {
        // 1. 确定参考谱
        let reference: number[]
        if (options.reference && options.reference.length === len) {
          reference = options.reference
        } else {
          // 默认 = 全部光谱的列均值
          // 数据矩阵 shape = [nSamples, nWavelengths]
          // 列均值 = 沿 axis=0 求 mean → shape = [nWavelengths]
          const spectraTensor = tf.tensor2d(dataset.spectra)
          const meanTensor = spectraTensor.mean(0)
          const meanResult = meanTensor.arraySync()
          // 1D 向量：arraySync() 实际返回 number[]
          reference = meanResult as number[]
        }

        // 2. 准备参考谱张量（仅一次）
        const refTensor = tf.tensor1d(reference)
        const refMeanScalar = refTensor.mean()
        const refMeanArr = refMeanScalar.arraySync()
        // 标量 tensor：arraySync() 实际返回 number[]（长度为 1）或 number
        const refMean = Array.isArray(refMeanArr)
          ? (refMeanArr[0] ?? 0)
          : (refMeanArr as number)
        const refCentered = refTensor.sub(refMeanScalar)
        const refCenteredSq = refCentered.square()
        const refCenteredSqSum = refCenteredSq.sum()

        // 3. 逐条光谱拟合 + 校正
        const corrected: number[][] = []
        const slopes: number[] = []
        const intercepts: number[] = []

        for (let i = 0; i < dataset.spectra.length; i++) {
          const spectrum = dataset.spectra[i]!
          const xTensor = tf.tensor1d(spectrum)
          const xMeanScalar = xTensor.mean()
          const xMeanArr = xMeanScalar.arraySync()
          const xMean = Array.isArray(xMeanArr)
            ? (xMeanArr[0] ?? 0)
            : (xMeanArr as number)
          const xCentered = xTensor.sub(xMeanScalar)

          // 最小二乘：b = Σ(ref_centered * x_centered) / Σ(ref_centered²)
          const numerator = refCentered.mul(xCentered).sum()
          const slopeScalar = numerator.div(refCenteredSqSum)
          const slopeArr = slopeScalar.arraySync()
          const slope = Array.isArray(slopeArr)
            ? (slopeArr[0] ?? 0)
            : (slopeArr as number)
          const intercept = xMean - slope * refMean

          // 校正：(x - intercept) / slope
          const correctedTensor = xTensor.sub(intercept).div(slopeScalar)
          const correctedArr = correctedTensor.arraySync()
          corrected.push(correctedArr as number[])

          slopes.push(slope)
          intercepts.push(intercept)

          // tidy 自动处理
        }

        const extras: MscExtras = { reference, slopes, intercepts }
        return {
          dataset: {
            ...dataset,
            spectra: corrected,
          },
          meta: {
            algorithm: 'MSC',
            extras: extras as unknown as Record<string, unknown>,
          },
        }
      })
    },
  }
}