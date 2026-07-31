# Levenberg-Marquardt 算法详解

> 非线性最小二乘拟合的"工业标准"算法。本文从直觉到公式到代码，完整走一遍。

---

## 一、算法要解决什么问题？

**问题陈述**：给定一组观测数据 `(xᵢ, yᵢ)`，和一个非线性模型 `f(x; p)`，找参数 `p` 让预测值和观测值的"差距"最小。

**"差距"的定义**（残差平方和 SSE）：

```
S(p) = Σᵢ (yᵢ − f(xᵢ; p))²
```

**为什么用平方和**：
1. 正负残差不互相抵消
2. 大残差被"放大"惩罚（强调离群点）
3. 在误差正态分布假设下，等价于极大似然估计

---

## 二、LM 在算法家族里的位置

基于梯度的优化算法可以按"用什么信息"分类：

| 方法 | 用到的信息 | 步长公式 | 速度 | 稳定性 |
|---|---|---|---|---|
| 梯度下降 | 一阶导数 | `Δp = −α·∇S` | 慢 | 很稳 |
| Gauss-Newton | 一阶 + JᵀJ 近似 | `(JᵀJ)·Δp = Jᵀr` | 快 | 病态时发散 |
| **LM** | 一阶 + JᵀJ + 阻尼 | `(JᵀJ + λD)·Δp = Jᵀr` | 中-快 | **稳健** |
| 牛顿法 | 一阶 + 二阶（真实 Hessian） | `H·Δp = −∇S` | 最快 | Hessian 昂贵 |

**LM 的定位**：**最速下降和 Gauss-Newton 的连续混血**，通过阻尼因子 λ 在两者之间连续过渡。

### 关键澄清：LM 不是"二选一"切换器

常见误解：LM 是"根据情况调用 GD 或 GN"的路由器。

**实际**：LM **每次迭代都解同一个方程** `(JᵀJ + λD)·Δp = Jᵀr`，只是 λ 值在迭代中连续变化。

- λ → 0：方程退化为 GN 步 `(JᵀJ)·Δp = Jᵀr`
- λ → ∞：方程退化为最速下降 `Δp ∝ D⁻¹·Jᵀr`（梯度方向）
- 中间任意 λ：两种行为的线性混合

类比：**调光灯旋钮**（连续可调），不是电灯开关（二选一）。

---

## 三、数学推导（4 步）

### 记号约定

| 符号 | 含义 |
|---|---|
| `rᵢ = yᵢ − fᵢ(p)` | 第 i 个数据点的残差 |
| `J[i][j] = ∂fᵢ/∂pⱼ` | 雅可比矩阵元素 |
| `S = Σrᵢ²` | 损失函数（SSE） |
| `∇S` | S 对参数的梯度 |
| `H` | S 对参数的 Hessian 矩阵 |

### 第 1 步：损失函数的梯度

```
∂S/∂pⱼ = ∂/∂pⱼ [Σ(yᵢ − fᵢ)²]
        = 2·Σ(yᵢ − fᵢ)·(−∂fᵢ/∂pⱼ)
        = −2·Σrᵢ·(∂fᵢ/∂pⱼ)
        = −2·(Jᵀr)ⱼ
```

即 `∇S = −2·Jᵀr`。

### 第 2 步：Hessian 近似（Gauss-Newton 技巧）

真实 Hessian：

```
H[j][k] = ∂²S/∂pⱼ∂pₖ
        = 2·Σ[ (∂fᵢ/∂pⱼ)·(∂fᵢ/∂pₖ) − rᵢ·(∂²fᵢ/∂pⱼ∂pₖ) ]
          └────────────────┬───────────────┬───────────────┘
                          JᵀJ             二阶项
```

**GN 近似**：当残差较小（模型已经拟合得不错）时，二阶项可忽略：

```
H ≈ 2·JᵀJ
```

这就是最小二乘专属的红利——**用一阶导数拼出 Hessian，省掉昂贵的二阶导数计算**。

### 第 3 步：Gauss-Newton 步

牛顿法的参数更新：`p_new = p − H⁻¹·∇S`。代入：

```
Δp = −H⁻¹·∇S
   = −(2·JᵀJ)⁻¹·(−2·Jᵀr)
   = (JᵀJ)⁻¹·Jᵀr
```

即 **Gauss-Newton 正规方程**：

```
(JᵀJ)·Δp = Jᵀr
```

注意符号：因为残差定义为 `r = y − f`，梯度是 `−2Jᵀr`，负负得正得到 `+Jᵀr`。

### 第 4 步：LM 加阻尼

GN 步的问题：当 `JᵀJ` 接近奇异（病态模型 / 参数强相关 / 远离极值）时，`(JᵀJ)⁻¹` 爆炸，Δp 大到失控。

LM 的修复：在对角线上加阻尼项 `λD`：

```
(JᵀJ + λD)·Δp = Jᵀr
```

D 有两种选择：

| 形式 | D 的取值 | 行为 |
|---|---|---|
| 经典 LM | `D = I`（单位矩阵） | 所有参数方向均匀阻尼 |
| **Marquardt 改进** | `D = diag(JᵀJ)` | **按参数尺度自适应** |

本实现采用 **Marquardt 改进形式**（实现上是对 JᵀJ 对角元素乘 `(1 + λ)`）。

### 阻尼项的双重作用

1. **数值稳定**：让矩阵永远可逆（λ > 0 时 `(JᵀJ + λD)` 严格正定）
2. **步长控制**：λ 大时 Δp 小（保守，接近最速下降），λ 小时 Δp 大（激进，接近 GN）

---

## 四、迭代流程

```
┌─────────────────────────────────────────────────┐
│  初始化：p₀, λ₀                                 │
│                                                 │
│  ┌─── 外层循环（每次重新算雅可比）────────────┐ │
│  │                                            │ │
│  │  1. 算残差 r = y − f(p)                    │ │
│  │  2. 算雅可比 J = ∂f/∂p                     │ │
│  │  3. 构建 JᵀJ 和 Jᵀr                       │ │
│  │                                            │ │
│  │  ┌── 内层循环（λ 试探）────────────────┐  │ │
│  │  │                                     │  │ │
│  │  │  4. A = JᵀJ + λ·diag(JᵀJ)           │  │ │
│  │  │  5. 解 A·Δp = Jᵀr                   │  │ │
│  │  │  6. 试探 p_trial = p + Δp            │  │ │
│  │  │  7. 算 trial_SSE                     │  │ │
│  │  │                                     │  │ │
│  │  │  ┌── trial_SSE < current_SSE？ ──┐  │  │ │
│  │  │  │                                │  │  │ │
│  │  │  │ 是：接受步长                   │  │  │ │
│  │  │  │     p ← p_trial                │  │  │ │
│  │  │  │     λ ← λ × lambdaDown         │  │  │ │
│  │  │  │     检查收敛                    │  │  │ │
│  │  │  │     退出内层                    │  │  │ │
│  │  │  │                                │  │  │ │
│  │  │  │ 否：拒绝步长                   │  │  │ │
│  │  │  │     λ ← λ × lambdaUp           │  │  │ │
│  │  │  │     继续内层                    │  │  │ │
│  │  │  └────────────────────────────────┘  │  │ │
│  │  └─────────────────────────────────────┘  │ │
│  │                                            │ │
│  │  外层退出条件：converged 或 !accepted     │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  最终统计量：R² / RMSE / 协方差 / 标准误        │
└─────────────────────────────────────────────────┘
```

---

## 五、收敛判据

本实现采用三个判据 OR 组合（任一满足即收敛）：

| 判据 | 公式 | 物理含义 |
|---|---|---|
| 参数相对变化 | `max_j |Δpⱼ / pⱼ| < paramTol` | 参数几乎不动 |
| 损失绝对值 | `SSE < costTol` | 模型完美拟合 |
| 梯度无穷范数 | `max_j |(Jᵀr)ⱼ| < gradTol` | 一阶必要条件：极值点梯度为零 |

**重要细节**：参数相对变化用"每个参数自己的相对变化取最大"，**不是**"最大绝对变化 / 最大参数值"。后者会让跨尺度参数互相掩盖。

---

## 六、协方差矩阵和参数标准误

收敛后，用以下公式估计参数的不确定性：

### 残差方差估计

```
σ² = SSE / (n − p)
```

`n − p` 是自由度（数据点数减参数个数）。

### 协方差矩阵

```
Cov = σ² · (JᵀJ)⁻¹
```

### 参数标准误

```
SE(pⱼ) = √Cov[j][j]
```

95% 置信区间约为 `pⱼ ± 2·SE(pⱼ)`。

### 协方差公式的三个前提假设

1. **模型正确**（残差是随机噪声，不是系统偏差）
2. **残差接近线性**（GN 近似有效）
3. **残差独立同分布**（无时间 / 空间相关性）

任一不满足，协方差和标准误都不可信。R² 和 RMSE 仍然有效（不依赖这些假设）。

---

## 七、本实现的模块组成

| 职责 | 实现位置 | 接口 |
|---|---|---|
| 模型评估 | 用户提供 `fn` | `PredictFn` |
| 残差 + SSE | `shared/residual.ts` | 纯函数 |
| 雅可比计算 | `shared/jacobian/numerical.ts` | `JacobianProvider` |
| 正规方程构建 | `shared/normal-equation.ts` | 纯函数 |
| 阻尼应用 | `shared/normal-equation.ts` `applyDamping` | 纯函数 |
| 线性方程组求解 | `shared/solver/gaussian-elimination.ts` | `LinearSolver` |
| λ 调整策略 | `shared/damping/marquardt.ts` | `DampingStrategy` |
| 收敛判据 | `shared/convergence/default.ts` | `ConvergenceCheck` |
| 最终统计量 | `shared/statistics.ts` | 纯函数 |
| 主循环协调 | `algorithms/lm/levenberg-marquardt.ts` | 函数 |

主循环函数只剩纯控制流（约 100 行），所有数学细节都在对应模块里。

---

## 八、使用示例

### 最简用法（全用默认值）

```typescript
import { levenbergMarquardt } from '@/fitting'

// 模型：单指数衰减 y = A·exp(−k·t) + C
const fn = (p: Record<string, number>) =>
  tData.map(t => p.A * Math.exp(-p.k * t) + p.C)

const result = levenbergMarquardt(
  fn,
  { A: 1, k: 0.1, C: 0 },           // 初始猜测
  ['A', 'k', 'C'],                   // 参数名（顺序固定）
  tData, yData,
)

console.log(result.params)           // 最终参数
console.log(result.paramErrors)      // 参数标准误
console.log(result.rSquared)         // 决定系数
console.log(result.converged)        // 是否真正收敛
```

### 高级用法（注入自定义模块）

```typescript
import {
  levenbergMarquardt,
  createNumericalJacobian,
  createMarquardtDamping,
} from '@/fitting'

const result = levenbergMarquardt(fn, init, names, xData, yData, {
  maxIterations: 200,
  jacobian: createNumericalJacobian({
    relativeStep: 1e-6,
    typicalValues: { A: 100, k: 0.01, C: 1 },   // 跨尺度参数的典型尺度
  }),
  damping: createMarquardtDamping({
    lambdaInit: 1e-2,
    lambdaUp: 5,
    lambdaDown: 0.3,
  }),
  convergence: {
    paramTolerance: 1e-10,
    gradientTolerance: 1e-10,
  },
})
```

---

## 九、常见问题排查

### 不收敛 / 迭代次数跑满

| 症状 | 可能原因 | 排查方向 |
|---|---|---|
| `converged: false` 且 `iterations: maxIterations` | 初始猜测太远 | 改初始猜测 |
| `converged: false` 且 `gradientNorm` 大 | 模型对参数不敏感 | 检查参数相关性、减少自由参数 |
| `finalLambda` 跑到 `1e12` | 矩阵严重病态 | 检查参数尺度差、是否需要归一化 |
| 收敛但 R² 很低 | 模型本身不合适 | 换模型 / 检查数据 |

### 收敛但结果明显错

- **局部极值**：LM 只找局部最优。换不同初始猜测多跑几次，看是否一致。
- **数据噪声大**：R² 看起来还行，但参数标准误也很大。检查 `paramErrors / params` 比值。
- **参数强相关**：协方差矩阵接近奇异，标准误膨胀。检查 `covariance` 矩阵的非对角元素。

### 协方差矩阵为空

说明 `JᵀJ` 奇异（`invertMatrix` 返回 null）。常见原因：
- 参数强相关（如 `A·exp(−k·t)` 中 A 和 k 相关性强）
- 参数冗余（模型过度参数化）
- 数据点太少（`n − p` 太小）

---

## 十、性能考虑

### 单次迭代成本

| 步骤 | fn 调用次数 | 备注 |
|---|---|---|
| 雅可比（中心差分） | 2p | 每个参数两次扰动 |
| 试探评估 | 最多 maxInnerIterations | 通常 1-3 次 |
| 统计计算 | 1 | 最终雅可比 |

总成本 ≈ `iterations × (2p + 内层试探数 + 1)` 次 fn 调用。

### 什么时候考虑 GPU 加速

- **fn 本身是 GPU 密集型**（如神经网络 forward pass）→ 推荐 tfjs
- **n 很大（> 10⁴）且 fn 简单** → 矩阵运算的 GPU 加速开始有收益
- **典型物化场景**（n < 1000, p < 10, fn 是解析公式）→ CPU 足够

---

## 十一、参考文献

1. **Levenberg 1944** — "A Method for the Solution of Certain Non-Linear Problems in Least Squares". *Quarterly of Applied Mathematics* 2: 164-168.
2. **Marquardt 1963** — "An Algorithm for Least-Squares Estimation of Nonlinear Parameters". *SIAM J. Appl. Math.* 11: 431-441.
3. **Moré 1978** — "The Levenberg-Marquardt Algorithm: Implementation and Theory". *Numerical Analysis, Lecture Notes in Mathematics* 630. （MINPACK lmder 的理论基础）
4. **Nielsen 2003** — "MARQ: A Generic Levenberg-Marquardt Method for Solving Nonlinear Least Squares Problems". IMM DTU Technical Report.
5. **Nocedal & Wright** — *Numerical Optimization*, 2nd ed., Springer, 2006. Chapter 10 (Least-Squares Problems).
6. **Press et al.** — *Numerical Recipes*, 3rd ed., Cambridge, 2007. Section 15.5 (Levenberg-Marquardt Method).
