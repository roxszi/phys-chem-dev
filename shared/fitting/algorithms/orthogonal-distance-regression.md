# ODR（正交距离回归）算法详解

> 同时考虑 x 和 y 误差的非线性拟合算法。LM 的严格推广：σx → 0 时退化为 LM，线性情况下退化为 York 回归。

---

## 一、ODR 要解决什么问题？

**LM 的痛点**：经典 LM 假设 x 精确无误差，只优化 y 残差：

```
S_LM(β) = Σᵢ (yᵢ − f(xᵢ; β))²
```

但物化实验中，**x 也常常有误差**：
- 浓度 c（滴定 / 配样 / 间接测量）→ 误差可达 1-5%
- 温度 T（温度计 / 控温）→ 误差 0.1-1 K
- 时间 t（秒表 / 自动记录）→ 通常较小但非 0

当 x 误差与 y 误差量级相当时，LM 给出的参数有偏（**errors-in-variables bias**）。典型场景：

| 场景 | x 误差 vs y 误差 | LM 是否够用？ |
|---|---|---|
| (t, c) 动力学 | t 小 / c 大 | ✅ LM 够用 |
| (1/T, ln k) Arrhenius | 1/T 小 / ln k 大 | ✅ LM 够用 |
| (c, A) Beer-Lambert 校准 | c ≈ A 量级 | ❌ 需 ODR |
| (c, γ) 表面张力 | c ≈ γ 量级 | ❌ 需 ODR |

ODR 的目标函数同时惩罚 y 残差和 x 修正量：

```
S_ODR(β, δ) = Σᵢ [(yᵢ − f(xᵢ + δᵢ; β))² / σᵧᵢ² + δᵢ² / σₓᵢ²]
```

其中 δᵢ 是 x_i 的辅助修正变量（每个数据点一个）。

---

## 二、参数空间从 p 维变 (p+n) 维

LM 的参数空间：`β = (β₁, ..., βₚ)` —— p 维。

ODR 的参数空间：`z = (β, δ) = (β₁, ..., βₚ, δ₁, ..., δₙ)` —— **(p+n) 维**。

直接构建正规方程会得到 **(p+n)×(p+n)** 系统，每次迭代成本 O((p+n)³) —— 对大数据集不可接受。

**Schur 补技巧（ODRPACK 核心）**：利用 δ 部分的雅可比是对角矩阵这一性质，把 (p+n)×(p+n) 系统降维回 **p×p** 系统，每步成本回到 O(p³ + np²) —— 与 LM 同阶。

---

## 三、数学推导（5 步）

### 记号约定

| 符号 | 含义 |
|---|---|
| `r_y,i = yᵢ − f(xᵢ+δᵢ; β)` | y 残差 |
| `dᵢ = ∂f/∂x | (xᵢ+δᵢ, β)` | 模型对 x 的偏导 |
| `J_β[i][j] = ∂f/∂βⱼ` | 模型对参数的偏导（雅可比） |
| `w_y,i = 1/σᵧᵢ²` | y 权重 |
| `w_x,i = 1/σₓᵢ²` | x 权重（σx=0 时为 ∞） |

### 第 1 步：加权残差向量

把 y 残差和 x 修正量拼接成 2n 维"加权残差向量"：

```
r_aug = [(r_y √w_y)ₙ维, (−δ √w_x)ₙ维]
```

对应"加权预测"：

```
f_aug[i]    = f(xᵢ+δᵢ; β) √w_y,i       (i < n)
f_aug[n+i]  = (xᵢ + δᵢ) √w_x,i          (i < n)
```

### 第 2 步：增广雅可比 (2n × (p+n))

```
              β 列 (p个)              δ 列 (n个)
r_y 行 →    [√w_y · J_β              |  √w_y · d · I ]    
r_x 行 →    [0                       |  √w_x · I     ]    
```

### 第 3 步：增广正规方程

```
[J_βᵀ W_y J_β        J_βᵀ W_y d  ] [Δβ]   [J_βᵀ W_y r_y         ]
[                    ] [   ] = [                     ]
[dᵀ W_y J_β          W_y d² + W_x] [Δδ]   [W_y d · r_y − W_x · δ]
```

记：
- A = J_βᵀ W_y J_β （p×p）
- B = J_βᵀ W_y d （p×n，注意 d 是对角向量）
- C = diag(w_y d² + w_x) （n×n 对角）
- g_β = J_βᵀ W_y r_y
- g_δ = W_y d · r_y − W_x · δ

### 第 4 步：Schur 补降维（核心技巧）

由于 C 是对角矩阵，可逆性容易保证（只要 σ_y, σ_x, d 都不为零）。Schur 补公式：

```
(A − B C⁻¹ Bᵀ) Δβ = g_β − B C⁻¹ g_δ
```

代入化简（神奇地消去大部分项）：

```
S := A − B C⁻¹ Bᵀ
   = J_βᵀ W_eff J_β

其中 W_eff = diag(w_eff)
w_eff,i = w_y,i · w_x,i / (w_y,i · dᵢ² + w_x,i)
```

右端：

```
b := g_β − B C⁻¹ g_δ
   = J_βᵀ W_eff · r_eff

其中 r_eff,i = r_y,i + dᵢ · δᵢ
```

**最终 p×p 系统**（与加权 LM 同形式）：

```
J_βᵀ W_eff J_β · Δβ = J_βᵀ W_eff · r_eff
```

### 第 5 步：回代求 Δδ

```
Δδ = C⁻¹ (g_δ − Bᵀ Δβ)
```

展开：

```
Δδᵢ = (w_y d / c)ᵢ · (r_y − J_β Δβ)ᵢ − (w_x / c)ᵢ · δᵢ
```

其中 `c = w_y d² + w_x`。

---

## 四、退化性质（重要！）

### 4.1 σx → 0（x 完全精确）→ 退化为加权 LM

当 σx → 0 时 w_x → ∞：
- w_eff → w_y
- c⁻¹ → 0
- Δδ → 0（δ 保持为 0）
- 正规方程退化为 `J_βᵀ W_y J_β · Δβ = J_βᵀ W_y · r_y` —— 标准 LM！

### 4.2 模型对 x 不敏感（d ≈ 0）→ 退化为加权 LM

当 d → 0 时（模型 f 对 x 几乎无依赖）：
- w_eff → w_y
- r_eff → r_y
- 同样退化为加权 LM

### 4.3 线性模型 + σx > 0 → 退化为 York 回归

f(x; a, b) = a + bx 时：
- d = b（常数）
- J_β[i] = [1, xᵢ]
- Schur 补系统退化为 York 1966 的加权正交回归

**这是 York 的单元测试关键**（见 test/york-degeneracy.test.ts）。

---

## 五、算法流程图

```
┌─────────────────────────────────────────────────┐
│  初始化：β₀, δ = 0, λ₀                          │
│                                                 │
│  ┌─── 外层循环 ────────────────────────────┐  │
│  │                                         │  │
│  │  1. x_corr = x + δ                      │  │
│  │  2. y_pred = f(x_corr; β)               │  │
│  │  3. r_y = y − y_pred                    │  │
│  │  4. 计算 J_β 和 d（对 β 和 x 的偏导）   │  │
│  │  5. 计算 w_eff 和 r_eff                 │  │
│  │  6. 构建等效 p×p 系统：                 │  │
│  │       S = J_βᵀ W_eff J_β               │  │
│  │       b = J_βᵀ W_eff r_eff             │  │
│  │                                         │  │
│  │  ┌── 内层 λ 试探 ──────────────────┐   │  │
│  │  │  7. A = S + λ·diag(S)             │   │  │
│  │  │  8. 解 A·Δβ = b                   │   │  │
│  │  │  9. 回代求 Δδ                     │   │  │
│  │  │  10. 试探新 β', δ', x_corr'       │   │  │
│  │  │  11. 算 trial SSE                  │   │  │
│  │  │  12. 接受/拒绝（trust region）    │   │  │
│  │  └────────────────────────────────────┘   │  │
│  │                                         │  │
│  │  退出条件：converged 或 !accepted       │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  最终统计：R² / RMSE / 协方差（用 W_eff）       │
└─────────────────────────────────────────────────┘
```

---

## 六、协方差矩阵

ODR 的协方差矩阵公式与 LM 类似，但权重用 w_eff：

```
Cov(β) = σ² · (J_βᵀ W_eff J_β)⁻¹
σ² = SSE / (n − p)
```

**注意**：这里 SSE 是加权 SSE（含 y 和 x 两部分），与 LM 的纯 y SSE 不同。

三个前提假设：
1. 模型正确
2. 残差接近线性
3. σx, σy 的估计值正确（关键！）

第三个假设是 ODR 特有的：如果 σx, σy 估计严重偏离实际，结果不可信。

---

## 七、使用示例

### 7.1 ODR 完整调用

```typescript
import { orthogonalDistanceRegression } from '@/fitting/algorithms/odr'

// 模型：一级反应动力学带平衡浓度
//   c(t) = c∞ + (c0 − c∞) · exp(−k·t)
const fn = (t: number[], p: Record<string, number>) =>
  t.map(ti => p.c_inf + (p.c0 - p.c_inf) * Math.exp(-p.k * ti))

// 浓度误差 ±0.005 mol/L，时间误差 ±0.5 s
const sigmaY = cData.map(() => 0.005)
const sigmaX = tData.map(() => 0.5)

const result = orthogonalDistanceRegression(
  fn,
  { c0: 0.1, c_inf: 0.01, k: 0.005 },  // 初始猜测
  ['c0', 'c_inf', 'k'],
  tData,
  cData,
  { sigmaX, sigmaY },
)

console.log(result.params)        // 最终参数
console.log(result.xCorrection)   // 每个点 x 的修正量
console.log(result.converged)
console.log(result.mode)          // 'odr'
```

### 7.2 LM 退化模式（sigmaX 全 0）

```typescript
const result = orthogonalDistanceRegression(
  fn, init, names, xData, yData,
  { sigmaY: sy },  // 不传 sigmaX 等价于全 0
)
console.log(result.mode)  // 'lm'
console.log(result.xCorrection)  // 全 0（δ 不更新）
```

---

## 八、与 LM 的对比

| 维度 | LM | ODR |
|---|---|---|
| x 误差 | 假设 0 | 显式建模 |
| 参数空间 | p 维 | (p+n) 维（实际计算降回 p 维） |
| 每步成本 | O(p³ + np²) | O(p³ + np²)（同阶！） |
| 必须的输入 | x, y | x, y, σx, σy |
| 退化 | —— | σx=0 → LM |
| 单元测试 | 闭式对照 | 退化到 LM / York 检验 |

---

## 九、常见问题

### 9.1 σx, σy 怎么估？

- **仪器精度**：分光计 ±0.001 Abs；温度计 ±0.1 K；秒表 ±0.1 s
- **重复测量**：3 次测量取标准差
- **方法验证**：ICH Q2(R1) 重复性 / 中间精密度

### 9.2 σx = 0 和 σx 很小的区别？

- σx = 0：w_x = ∞，δ 强制为 0，完全退化为 LM
- σx 很小但非 0：δ 可以略微浮动，对 β 有小修正

**实践建议**：如果 σx 不确定，宁可设大一点（保守），避免假精度。

### 9.3 不收敛怎么办？

| 症状 | 排查 |
|---|---|
| 迭代满 maxIterations | 初始猜测太远 |
| finalLambda 跑到 1e12 | 参数尺度悬殊 → 加 typicalValues |
| δ 爆炸（>10×σx） | σx 估计严重偏小 |
| 模式切换到 lm 但期望 odr | sigmaX 全 0 检测 |

---

## 十、参考文献

1. **Boggs, Byrd, Schnabel (1987)** — "A Stable and Efficient Algorithm for Nonlinear Orthogonal Distance Regression". *SIAM J. Sci. Stat. Comput.* 8(6). —— ODRPACK 理论基础
2. **Boggs, Donaldson, Byrd, Schnabel (1989)** — "ODRPACK — Software for Weighted Orthogonal Distance Regression". *ACM Trans. Math. Softw.* 15(6). —— ODRPACK 用户指南
3. **York (1966)** — "Least-squares fitting of a straight line". *Can. J. Phys.* 44(5). —— 线性 ODR 奠基
4. **York, Evensen, Martinez, Delgado (2004)** — "Unified equations for the slope, intercept, and standard errors of the best straight line". *Am. J. Phys.* 72(3). —— York 终极版
5. **Nocedal & Wright** — *Numerical Optimization*, 2nd ed., Springer, 2006. Chapter 10.
