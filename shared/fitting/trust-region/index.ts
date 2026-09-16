/**
 * trust-region 阻尼/信赖域子模块（聚合出口）
 * ---
 * ⚠️ 本子模块处于"策略函数就位、编排接口未定"阶段：
 *   - classic / nielsen / gain-ratio 三个纯函数实现已就位（均已逐行注释）；
 *   - StepController 编排接口（本目录 types.ts）尚未定稿、未接主循环；
 *   - 当前 LM/ODR 主循环仍使用 ../damping.ts 的 Marquardt 固定倍数策略。
 * ---
 * ==================== 批次 2.1 材料：三种阻尼策略对比（供拍板） ====================
 *
 * 【共同背景】LM 每轮的步长 Δp 来自线性近似 (JᵀJ + λ·diag(JᵀJ))·Δp = Jᵀr。
 * λ 的角色是"信赖域半径旋钮"：λ 大 → 步子保守；λ 小 → 步子激进。
 * 三种策略的差别只在"怎么旋动 λ"。
 *
 * ─────────────────────────────────────────────────────────────
 * 1. Marquardt 固定倍数（现状，damping.ts）
 *    思路：只看 SSE 降没降。接受 → λ *= 0.3；拒绝 → λ *= 5。不看降的程度。
 *    流程：内层试探 → SSE 下降即接受并降 λ；否则拒绝升 λ，重试。
 *    利：实现最简；每步零额外计算（不算 ρ）；参数少不易调坏。
 *    弊：对"降得勉强"与"降得漂亮"一视同仁——接受后同样激进降 λ，
 *        临近极值点时容易在"大幅降 λ → 步子过大 → 拒绝"间震荡。
 *
 * 2. classic 三段式增益比（classic.ts，经典信赖域教材方案）
 *    思路：算 ρ = 实际下降 / 预测下降，按 ρ 三分处置：
 *      ρ ≥ 0.75 → 接受 + 缩 λ；ρ < 1e-4 → 拒绝 + 放 λ；中间 → 接受但 λ 不动。
 *    流程：试探 → gainRatio 算 ρ → classicJudge 三段判据 → 接受/拒绝 + λ 升/降/不动。
 *    利：比固定倍数"有分辨力"——勉强够格的步不再触发激进降 λ，收敛后期更平稳；
 *        逻辑分段明确，易教学、易调试。
 *    弊：每步多一次 predRed 计算（Δᵀg + ΔᵀAΔ，O(p²)；A 即已有的 JᵀWJ，物化场景
 *        p ≤ 5，开销可忽略）；四个阈值需理解后调参（有文献默认值兜底）。
 *
 * 3. Nielsen 1999 自适应（nielsen.ts，现代 LM 事实标准）
 *    思路：λ 更新量随 ρ 连续变化：
 *      接受步 λ *= max(1/3, 1−(2ρ−1)³)；拒绝步 λ *= v、v *= 2（连续失败指数收紧），
 *      接受后 v 复位 2。
 *    流程：同 2，但 λ 更新是连续函数而非分段跳变。
 *    利：ρ 高时降 λ 比 classic 更快，收敛通常更快；连续拒绝的"倍增收紧"
 *        比固定 ×5 更会看情况；MINPACK 系长期实证。
 *    弊：多一个内部状态 v（init/reset 需管理）；公式不如分段直观，教学讲解成本略高。
 * ─────────────────────────────────────────────────────────────
 * 【对比小结】
 *   每步额外开销：1（零）< 2 ≈ 3（一次 O(p²)，可忽略）
 *   收敛稳健性：1 < 2 < 3（病态 / 临近极值时差距明显）
 *   教学直观性：1 > 2 > 3
 *   实现状态：1 已接入主循环；2 / 3 纯函数已就位待接
 *
 * 【接入方案草案（批次 2.2 拍板项）】
 *   A. createStepController(options) 按 options.strategy 返回 { init, judge } 闭包；
 *      init() 复位内部状态（Nielsen 的 v）并返回初始 λ；judge(rho, lambda) 出决策。
 *   B. 主循环改动点（LM / ODR 同构）：
 *      - 阻尼注入位（DampingStrategy）与 StepController 的关系二选一：
 *        B1. 新增独立注入位 stepController（damping 保留，二选一互斥）；
 *        B2. 将 DampingStrategy 接口扩展为带 judge 的统一接口，替换旧策略；
 *      - 每次试探成功后：ρ = gainRatio(currentSSE, trialSSE, predRed)，
 *        predRed = predictedReduction(deltaP, jtr, jtj 扁平化, p)——
 *        需把 jtj（ml-matrix Matrix）一次性扁平化为行主序 Float64Array；
 *      - 接受判据从 trialSSE < currentSSE 改为 decision.accept
 *        （ρ > 0 蕴含 SSE 下降，语义兼容）。
 *   C. 默认策略建议：教学场景保留 Marquardt 为默认（直观），"nielsen" /
 *      "classic" 作为算法配置的高级选项；基线回归通过后再决定 damping.ts 去留。
 * =====================================================================================
 */

// 类型定义
export type {
  StepStrategy,
  StepControlOptions,
  StepDecision,
  StepController,
} from "./types.ts"

// classic 策略：三段式增益比判据
export { classicJudge, CLASSIC_DEFAULTS } from "./classic.ts"
export type { ClassicParams } from "./classic.ts"

// 增益比：预测下降量 + ρ 计算
export { predictedReduction, gainRatio } from "./gain-ratio.ts"

// Nielsen 策略：1999 自适应 λ 更新
export { nielsenCreateState, nielsenJudge } from "./nielsen.ts"
