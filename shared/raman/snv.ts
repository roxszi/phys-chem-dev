/**
 * SNV - 标准正态变换（Standard Normal Variate）
 * ---
 * 算法核心思路（Barnes, Dhanoa & Lister, 1989）：
 * - 对每条光谱 x_i 独立做行内中心化 + 标准化：
 *     x_i_corrected = (x_i - mean(x_i)) / std(x_i)
 * - 其中 mean(x_i) 和 std(x_i) 是该条光谱自身的均值和标准差（逐行）。
 * ---
 * 与 MSC 的区别：
 * - SNV 不需要参考谱，逐条独立处理
 * - MSC 用所有光谱的均值作为参考，会受异常样本影响
 * - 实际效果相近，但 SNV 更稳健（无需指定 reference）
 * ---
 * 参考文献：
 * - Barnes, R.J., Dhanoa, M.S., & Lister, S.J. (1989).
 * - Standard Normal Variate Transformation and De-Trending of Near-Infrared
 * - Diffuse Reflectance Spectra. Applied Spectroscopy, 43(5), 772-777.
 * ---
 * 实现说明：
 * - 同样不直接 import tfjs，由调用方注入
 * - SNV 没有矩阵运算，每条光谱独立，简单循环即可
 */

// 导入类型
import type {
  PreprocessResult,
  Preprocessor,
  TensorBackend,
} from './types.ts'

/**
 * SNV 算法的额外元数据（每条光谱的 mean / std）
 *   用于诊断异常样本
 */
export interface SnvExtras {
  means: number[]
  stds: number[]
}

export function createSNV(tf: TensorBackend): Preprocessor {
  return {
    name: 'SNV',

    apply(dataset): PreprocessResult {
      // 参数校验：所有光谱必须等长
      const len = dataset.wavelengths.length
      for (let i = 0; i < dataset.spectra.length; i++) {
        const spectrum = dataset.spectra[i]
        if (!spectrum || spectrum.length !== len) {
          throw new Error(
            `[SNV] 光谱 ${dataset.sampleIds[i] ?? i} 长度 ${spectrum?.length ?? 0} 与波长轴 ${len} 不匹配`
          )
        }
      }

      return tf.tidy(() => {
        const corrected: number[][] = []
        const means: number[] = []
        const stds: number[] = []

        for (let i = 0; i < dataset.spectra.length; i++) {
          const spectrum = dataset.spectra[i]!
          const xTensor = tf.tensor1d(spectrum)
          const meanScalar = xTensor.mean()
          const meanArr = meanScalar.arraySync()
          const mean = Array.isArray(meanArr)
            ? (meanArr[0] ?? 0)
            : (meanArr as number)

          // std = sqrt(mean((x - mean)²))
          const centered = xTensor.sub(meanScalar)
          const varianceScalar = centered.square().mean()
          const stdScalar = varianceScalar.sqrt()
          const stdArr = stdScalar.arraySync()
          const std = Array.isArray(stdArr)
            ? (stdArr[0] ?? 0)
            : (stdArr as number)

          // 校正：(x - mean) / std
          const correctedTensor = centered.div(stdScalar)
          const correctedArr = correctedTensor.arraySync()
          corrected.push(correctedArr as number[])

          means.push(mean)
          stds.push(std)
          // tidy 自动处理
        }

        const extras: SnvExtras = { means, stds }
        return {
          dataset: {
            ...dataset,
            spectra: corrected,
          },
          meta: {
            algorithm: 'SNV',
            extras: extras as unknown as Record<string, unknown>,
          },
        }
      })
    },
  }
}