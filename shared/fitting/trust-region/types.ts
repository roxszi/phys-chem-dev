/**
 * trust-region - 共用契约类型与策略装配工厂（types.ts）
 * ---
 * 【本文件职责】
 * - 契约类型：DampingStrategy（策略接口）/ StepDecision（单步决策）
 *   / NielsenDampingOptions / ClassicDampingOptions（策略配置）；
 * - 策略装配工厂：createNielsenDamping / createClassicDamping——
 *   把各方法文件（nielsen.ts / classic.ts）的纯函数判据装配成统一契约的闭包实现。
 * ---
 * 【目录分工（一方法一文件）】
 * - nielsen.ts：Nielsen 1999 判据数学；
 * - classic.ts：classic 三段式判据数学 + 默认参数；
 * - gain-ratio.ts：增益比 ρ 计算工具（predRed / ρ）；
 * - types.ts（本文件）：共用契约 + 装配工厂；
 * - index.ts：统一导出。
 * 方法文件对本文件仅 import type（编译期擦除），运行时依赖单向：types → 方法文件。
 * ---
 * 【契约语义：ρ 驱动的信赖域步控】
 * 主循环每试探一步解出 Δp 后，计算增益比 ρ（实际 SSE 下降 / 预测 SSE 下降，
 * 见 gain-ratio.ts），把 ρ 与当前 λ 交给策略 judge，得到"是否接受 + 新 λ"：
 *   - λ 大 → 步子保守（接近最速下降）；λ 小 → 步子激进（接近 Gauss-Newton）
 *   - ρ ≈ 1：预测兑现 → 接受并降 λ（下轮放胆）
 *   - ρ ≤ 0：预测失真 → 拒绝并升 λ（下轮收紧）
 * ---
 * 【主体：Nielsen 1999（用户拍板选型）；兼容：classic 三段式】
 * 状态分工：λ 由主循环持有并逐轮回传（finalLambda 直接读主循环变量，
 * 不在策略内冗余持有，避免两处状态失同步）；策略闭包只维护自有内部状态
 * （Nielsen 的 v）。实现形态：工厂函数 + 闭包（无 class 原型链开销；
 * 行为形状由 DampingStrategy 接口在编译期约束）。
 */

// 各方法文件的纯函数判据（运行时装配依赖）
import { nielsenJudge } from "./nielsen.ts"
import { classicJudge, CLASSIC_DEFAULTS } from "./classic.ts"
import type { ClassicParams } from "./classic.ts"

// ==================== 契约类型 ====================

/**
 * 单步决策：是否接受该步 + 下一轮使用的阻尼因子
 */
export interface StepDecision {
  /** 下一轮使用的阻尼因子 λ（已经过策略内部护栏约束） */
  lambda: number
  /** 是否接受该步 */
  accept: boolean
}

/**
 * 阻尼策略统一契约（LM / ODR 主循环消费）
 */
export interface DampingStrategy {
  /**
   * 每次 fit 开始时调用：复位内部状态（Nielsen 的 v 等），返回初始 λ。
   * 之所以需要它：闭包里带状态，同一个策略实例若被多次 fit 复用，
   * 不复位会把上一次拟合的策略状态泄漏进本次拟合。
   */
  init(): number
  /**
   * 依据增益比 ρ 与当前 λ，决定是否接受该步、并给出新的 λ。
   * 约定：ρ = -1 表示"预测不降"（含正规方程奇异、连试探步都解不出的情形），
   * 策略按拒绝处理（收紧 λ）。
   */
  judge(rho: number, lambda: number): StepDecision
}

/**
 * Nielsen 策略配置（当前仅初始 λ 可调）
 * - λ 的数值护栏 [1e-12, 1e12] 固定在 nielsen.ts 内部（与 classic 同档位）：
 *   过小退化为纯 Gauss-Newton（激进），过大退化为纯最速下降（保守）。
 */
export interface NielsenDampingOptions {
  /** 初始 λ（默认 1e-3，须为正有限数且落在策略护栏区间内） */
  lambdaInit?: number
}

/**
 * classic 策略配置（三段式阈值 + 初始 λ；缺省用文献常用值）
 */
export interface ClassicDampingOptions {
  /** 初始 λ（默认 1e-3） */
  lambdaInit?: number
  /** ρ ≥ rhoGood：接受该步并缩小 λ（默认 0.75） */
  rhoGood?: number
  /** ρ < rhoBad：拒绝该步并放大 λ（默认 1e-4） */
  rhoBad?: number
  /** 接受步 λ 的缩小系数（默认 1/3） */
  shrink?: number
  /** 拒绝步 λ 的放大系数（默认 5） */
  grow?: number
}

// ==================== 策略装配工厂 ====================

/** Nielsen 失败倍增系数初值（Nielsen 1999 推荐值） */
const NIELSEN_V_INIT = 2

/**
 * 工厂函数：装配 Nielsen 1999 自适应阻尼策略（主体，LM/ODR 默认策略）
 * - 闭包持有连续失败倍增系数 v；λ 本体由主循环持有
 * @param options 配置（可选，全部有默认值）
 * @returns DampingStrategy 实现
 */
export function createNielsenDamping(
  options: NielsenDampingOptions = {},
): DampingStrategy {
  // ── 配置解析与校验（构造期一次做完，运行时零检查开销） ──
  const lambdaInit = options.lambdaInit ?? 1e-3
  // 初始 λ：正有限数
  if (lambdaInit <= 0 || !Number.isFinite(lambdaInit)) {
    throw new Error(`lambdaInit 必须为正有限数：${ lambdaInit }`)
  }
  // 初始 λ 须落在策略护栏区间内（nielsenJudge 内部 LAMBDA_MIN/MAX）
  if (lambdaInit < 1e-12 || lambdaInit > 1e12) {
    throw new Error(`lambdaInit(${ lambdaInit }) 必须在策略护栏 [1e-12, 1e12] 内`)
  }

  /** 连续失败倍增系数 v（拒绝步 λ *= v 后翻倍；接受步复位为初值） */
  let v = NIELSEN_V_INIT

  return {
    /** 每次 fit 开始：复位 v，返回初始 λ */
    init(): number {
      v = NIELSEN_V_INIT
      return lambdaInit
    },

    /** 转发 Nielsen 纯函数判据，闭包内部更新 v */
    judge(rho: number, lambda: number): StepDecision {
      const { decision, nextV } = nielsenJudge(rho, lambda, v)
      v = nextV
      return decision
    },
  }
}

/**
 * 工厂函数：装配 classic 三段式阻尼策略（兼容维护项）
 * - 无跨步内部状态（纯转发），init 仅返回初始 λ
 * @param options 配置（可选，全部有默认值）
 * @returns DampingStrategy 实现
 */
export function createClassicDamping(
  options: ClassicDampingOptions = {},
): DampingStrategy {
  // ── 配置解析 ──
  const lambdaInit = options.lambdaInit ?? 1e-3
  /** 三段式判据参数（逐字段解析，保留用户部分自定义的能力） */
  const params: ClassicParams = {
    rhoGood: options.rhoGood ?? CLASSIC_DEFAULTS.rhoGood,
    rhoBad: options.rhoBad ?? CLASSIC_DEFAULTS.rhoBad,
    shrink: options.shrink ?? CLASSIC_DEFAULTS.shrink,
    grow: options.grow ?? CLASSIC_DEFAULTS.grow,
  }

  // ── 校验（构造期一次做完） ──
  // 初始 λ：正有限数且落在策略护栏区间内（classicJudge 内部 LAMBDA_MIN/MAX）
  if (lambdaInit <= 0 || !Number.isFinite(lambdaInit)) {
    throw new Error(`lambdaInit 必须为正有限数：${ lambdaInit }`)
  }
  if (lambdaInit < 1e-12 || lambdaInit > 1e12) {
    throw new Error(`lambdaInit(${ lambdaInit }) 必须在策略护栏 [1e-12, 1e12] 内`)
  }
  // 三段式阈值次序：0 < rhoBad < rhoGood < 1（否则分段逻辑失效）
  if (!(params.rhoBad > 0 && params.rhoBad < params.rhoGood && params.rhoGood < 1)) {
    throw new Error(
      `classic 阈值须满足 0 < rhoBad(${ params.rhoBad }) < rhoGood(${ params.rhoGood }) < 1`,
    )
  }
  // 缩放系数语义：接受步缩小 (0, 1)
  if (!(params.shrink > 0 && params.shrink < 1)) {
    throw new Error(`shrink 必须在 (0, 1) 区间：${ params.shrink }`)
  }
  // 缩放系数语义：拒绝步放大（> 1 的有限数）
  if (!(params.grow > 1 && Number.isFinite(params.grow))) {
    throw new Error(`grow 必须为 > 1 的有限数：${ params.grow }`)
  }

  return {
    /** 无内部状态，直接返回初始 λ */
    init(): number {
      return lambdaInit
    },

    /** 转发 classic 三段式纯函数判据 */
    judge(rho: number, lambda: number): StepDecision {
      return classicJudge(rho, lambda, params)
    },
  }
}
