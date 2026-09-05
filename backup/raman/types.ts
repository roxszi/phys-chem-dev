/**
 * 类型契约层 - 整个项目的 TypeScript 类型源头
 *
 * 设计思路：
 *   - 业务数据结构（Dataset / PreprocessResult）保持稳定
 *   - tfjs 依赖通过 TensorBackend 接口隔离（算法不直接 import tfjs）
 *   - 这样算法代码可在前端 / Node / 测试 mock 任意环境下复用
 *
 * Zod 预留：
 *   - 当前业务纯前端，无运行时校验需求
 *   - 当未来需要从 URL 参数 / 外部文件加载算法配置时，加 Zod schema
 *   - 位置：src/lib/schemas.ts（暂不存在）
 */

/**
 * 业务核心数据结构（化学计量学视角）
 *
 *   - wavelengths: X 轴（波长 / 波数 / 时间），长度 = 每条光谱的点数
 *   - spectra:     二维矩阵，行 = 样本，列 = 波长点
 *                  spectra[i][j] = 第 i 个样本在第 j 个波长点的信号强度
 *   - sampleIds:   每条光谱的标识（列名）
 *                  例：'1-1-1' = 第1样品 - 第1次取样 - 第1次采集
 */
export interface Dataset {
  wavelengths: number[]
  spectra: number[][] // [nSamples][nWavelengths]
  sampleIds: string[]
}

/**
 * 算法处理结果
 */
export interface PreprocessResult {
  dataset: Dataset
  meta: {
    algorithm: string
    extras?: Record<string, unknown>
  }
}

/**
 * 算法配置基类
 */
export interface PreprocessOptions {
  /** MSC 算法专用：自定义参考谱（默认 = 全部光谱均值） */
  reference?: number[]
}

/**
 * 算法接口（Strategy 模式）
 */
export interface Preprocessor {
  readonly name: string
  apply(dataset: Dataset, options?: PreprocessOptions): PreprocessResult
}

/**
 * TensorBackend 接口 - tfjs 依赖的抽象层
 *
 * 设计思路：
 *   - 算法不直接 import '@tensorflow/tfjs'
 *   - 由调用方注入具体的 tf 实例（前端 webgpu/wasm/cpu；未来可注入 tfjs-node）
 *   - 测试时可注入 mock backend
 *
 * arraySync 返回 unknown：
 *   - 1D 实际是 number[]，2D 是 number[][]，scalar 是 number
 *   - 调用方负责类型断言（避免复杂 union 类型）
 */
export interface Tensor {
  shape: number[]
  dtype: 'float32' | 'int32' | 'bool' | 'string'
  /** 同步读取值。维度不同返回类型不同，调用方负责断言 */
  arraySync(): unknown
  /** 加法（标量或张量） */
  add(b: Tensor | number): Tensor
  sub(b: Tensor | number): Tensor
  div(b: Tensor | number): Tensor
  mul(b: Tensor | number): Tensor
  square(): Tensor
  sqrt(): Tensor
  mean(axis?: number): Tensor
  sum(): Tensor
  dispose(): void
}

export interface TensorBackend {
  // 1D 张量
  tensor1d(values: number[]): Tensor
  // 2D 张量（行 = 样本）
  tensor2d(values: number[][]): Tensor
  // 标量（实际是 0 维 Tensor，arraySync 返回 number）
  scalar(value: number): Tensor
  // 工具
  tidy<T>(fn: () => T): T
  dispose(t: Tensor | Tensor[]): void
}

/**
 * tfjs 加载状态
 *   - 'pending': 初始化中
 *   - 'webgpu' / 'wasm' / 'cpu': 已选定的 backend
 *   - 'failed':  所有 backend 都失败
 */
export type TfjsBackend = 'webgpu' | 'wasm' | 'cpu'
export type TfjsLoadStatus = 'pending' | TfjsBackend | 'failed'