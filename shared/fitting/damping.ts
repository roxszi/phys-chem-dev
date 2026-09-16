/**
 * fitting - 阻尼策略：Marquardt 1963 固定倍数（damping.ts）
 * ---
 * 阻尼因子 λ 控制 LM 在"最速下降"和"Gauss-Newton"之间的过渡：
 *   - λ 大：保守（接近最速下降），步长小但稳定
 *   - λ 小：激进（接近 GN），步长大但可能发散
 * 本策略：接受步 → λ 降固定倍数；拒绝步 → λ 升固定倍数；λ 恒约束在 [lambdaMin, lambdaMax]。
 * 简单稳定，是 LM 的默认选择；基于增益比 ρ 的自适应策略见 trust-region/ 子模块（待接入）。
 * ---
 * 实现形态：工厂函数 + 闭包持有 λ 状态（无 class 原型链开销；
 * 行为形状由 DampingStrategy 接口在编译期约束，运行时零额外负担）。
 */

/**
 * LM 阻尼策略接口
 *
 * 可替换模块。默认实现见 createMarquardtDamping 工厂；
 * trust-region/ 子模块的 ρ 驱动策略（classic / Nielsen）待拍板后接入同一接口。
 */
export interface DampingStrategy {
  /** 当前阻尼因子 */
  current(): number
  /** 步长被接受（SSE 下降）→ 降 λ */
  onAccept(): void
  /** 步长被拒绝（SSE 上升）→ 升 λ */
  onReject(): void
}

/** 阻尼策略的配置 */
export interface DampingOptions {
  /** 初始 λ（默认 1e-3） */
  lambdaInit?: number
  /** 接受时乘的因子（默认 0.3） */
  lambdaDown?: number
  /** 拒绝时乘的因子（默认 5） */
  lambdaUp?: number
  /** λ 上限（防止溢出，默认 1e12） */
  lambdaMax?: number
  /** λ 下限（防止退化，默认 1e-12） */
  lambdaMin?: number
}

/**
 * 工厂函数：创建 Marquardt 1963 固定倍数阻尼策略
 * - 闭包持有当前 λ 与四个边界常数
 * @param options 配置（可选，全部有默认值）
 * @returns DampingStrategy 实例
 */
export function createMarquardtDamping(
  options: DampingOptions = {},
): DampingStrategy {
  // ── 配置解析 ──
  const lambdaInit = options.lambdaInit ?? 1e-3
  const lambdaDown = options.lambdaDown ?? 0.3
  const lambdaUp = options.lambdaUp ?? 5
  const lambdaMax = options.lambdaMax ?? 1e12
  const lambdaMin = options.lambdaMin ?? 1e-12

  // ── 完整边界校验（构造期一次性做完，运行时零检查开销） ──
  // 初始 λ：正有限数
  if (lambdaInit <= 0 || !Number.isFinite(lambdaInit)) {
    throw new Error(`lambdaInit 必须为正有限数：${ lambdaInit }`)
  }
  // 下降因子：必须在 (0, 1)（=1 永不下降，>1 接受步反而升 λ）
  if (lambdaDown <= 0 || lambdaDown >= 1) {
    throw new Error(`lambdaDown 必须在 (0, 1) 区间：${ lambdaDown }`)
  }
  // 上升因子：必须 > 1 的有限数（=1 永不上升）
  if (lambdaUp <= 1 || !Number.isFinite(lambdaUp)) {
    throw new Error(`lambdaUp 必须为 > 1 的有限数：${ lambdaUp }`)
  }
  // λ 下限：正有限数
  if (lambdaMin <= 0 || !Number.isFinite(lambdaMin)) {
    throw new Error(`lambdaMin 必须为正有限数：${ lambdaMin }`)
  }
  // λ 上限必须严格大于下限
  if (lambdaMax <= lambdaMin) {
    throw new Error(`lambdaMax(${ lambdaMax }) 必须 > lambdaMin(${ lambdaMin })`)
  }
  // 初始 λ 必须落在 [min, max] 区间内
  if (lambdaInit < lambdaMin || lambdaInit > lambdaMax) {
    throw new Error(
      `lambdaInit(${ lambdaInit }) 必须在 [${ lambdaMin }, ${ lambdaMax }] 内`,
    )
  }

  /** 当前阻尼因子（闭包内可变状态，仅本策略内部读写） */
  let lambda = lambdaInit

  return {
    /** 当前阻尼因子 */
    current(): number {
      return lambda
    },

    /** 接受步：λ 降固定倍数，受 lambdaMin 托底（防止退化到纯 GN 后无法回升灵敏度） */
    onAccept(): void {
      lambda = Math.max(lambdaMin, lambda * lambdaDown)
    },

    /** 拒绝步：λ 升固定倍数，受 lambdaMax 封顶（防止溢出为 Infinity） */
    onReject(): void {
      lambda = Math.min(lambdaMax, lambda * lambdaUp)
    },
  }
}
