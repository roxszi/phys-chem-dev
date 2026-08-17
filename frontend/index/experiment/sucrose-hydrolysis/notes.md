# 蔗糖水解皂化反应常数测定助手 · 开发札记

> 本札记按"业务 → 算法 → 工程"三层组织，记录从传统实验痛点出发，到最终交付物——一个可在手机端即扫即用的物化实验数据处理助手——的完整思路与工作量。
>
> 面向读者：想了解本软件设计逻辑的学生 / 教师 / 后续维护者。无需具备非线性拟合背景，叙事线已就着零基础读者的视角铺设。

---

## 一、为什么要做这个软件

### 1.1 传统实验教学的痛点

物理化学实验课（以蔗糖水解为例）的典型节奏：

1. **课内**（2~3 小时）：学生动手配液、调温、用旋光仪测旋光度 α 在不同反应时刻 t 的值。
2. **课外**（课后几天）：学生回宿舍，用 Origin / Excel 把数据画图、做 `ln(α_t - α_∞) ~ t` 线性拟合、算斜率 −k、写报告。

**痛点**：数据的**采集**与**评估**被切成了两个独立阶段，课内只能凭"大致规律"判断数据质量。等回到宿舍才发现"α_∞ 没测准""某几个点明显偏离"——可实验已经结束，没有机会补救了。

**这不是蔗糖水解独有的问题**：黏度法测分子量、电动势法测平衡常数、电导法测弱电解质……所有物化实验都有这个通病。

### 1.2 解决思路：把两段合为一段

我们编写了一系列小工具，把**数据采集**与**数据处理**合二为一：

- 学生测一个点 → 当场录入 → 当场能看到这个点在拟合曲线上的位置；
- 数据有异常 → **立刻**有反馈 → 当场补测或删除坏点；
- 最终拟合 → 一键完成 → 直接看 k 和 R²。

这个具体软件叫"蔗糖水解皂化反应常数测定助手"，是上述系列小工具的一员。

---

## 二、业务设计：把教学痛点翻译成软件需求

### 2.1 用户视角的工作流（happy path）

理想场景下，学生 4 步完成实验数据处理：

1. **录入实验条件**：实验温度（℃）、平衡时刻的旋光度 α_∞（可选）。
2. **录入数据**：每个 (t, α) 一行，随时添加、按 t 自动排序。
3. **数据校验**：发现某点不对，可单行删除或恢复（不影响其他行）。
4. **一键拟合**：在右侧抽屉看到：
   - 原公式 `(α_0 − α_∞)/(α_t − α_∞) = exp(kt)` 的非线性拟合曲线；
   - 线性化形式 `ln(α_t − α_∞) = −kt + ln(α_0 − α_∞)` 的线性图；
   - 拟合参数表（R² / α_0 / α_∞ / k / t(1/2)）。

### 2.2 业务 UI 的几个细节

- **行级激活/删除**（`onSwitchDataActivation`）：表格里每行都有"删除/恢复"按钮，**不真删除数据**，只是标记 `isActivated = false`。拟合时只取激活的行。
- **本地存储**（`localStorage.setItem("SucroseHydrolysisTableDataAoa", ...)`）：刷新页面或误关浏览器，数据不丢。
- **Drawer（侧边抽屉）展示结果**：原页面始终是数据表格，点击"拟合数据"才打开抽屉，避免页面跳转打断学生录入节奏。
- **中英双语**（`SucroseHydrolysis-lang.ts`）：通过 `useLang(langDict)` hook 派生响应式语言包。物理量符号（t / α / min⁻¹ / ℃）不进语言包，自然语言文案才翻译。

### 2.3 业务代码组织

```
frontend/index/experiment/sucrose-hydrolysis/
├── index.md           # 文档说明 + 嵌入 <SucroseHydrolysis /> 组件
├── SucroseHydrolysis.vue   # 视图 + 逻辑（约 500 行）
├── SucroseHydrolysis-lang.ts  # 中英语言包（扁平键 + 函数文案）
└── data.ts            # 示例数据
```

`SucroseHydrolysis.vue` 的核心逻辑就两块：**响应式数据管理**（`onAddData` / `onSwitchDataActivation` / `onDeleteAllData`）+ **拟合流程**（`onDataFitting` + `validateData`）。具体算法 / 公式在 `@shared/equation/` 与 `@shared/fitting/` 共享模块里，与 UI 完全解耦。

---

## 三、数学模型：为什么放弃"传统线性拟合"

### 3.1 公式本体

蔗糖水解是一级反应：

$$\frac{\alpha_0 - \alpha_\infty}{\alpha_t - \alpha_\infty} = e^{kt}$$

三个待定参数：**初始旋光度 α_0**、**平衡时刻旋光度 α_∞**、**速率常数 k**。

变形：

$$\alpha_t = \frac{\alpha_0 - \alpha_\infty}{e^{kt}} + \alpha_\infty$$

### 3.2 传统教学的做法（fail）

传统教材把上式线性化：

$$\ln(\alpha_t - \alpha_\infty) = -kt + \ln(\alpha_0 - \alpha_\infty)$$

让学生在坐标系里画 `ln(α_t − α_∞) ~ t`，斜率就是 −k。

**问题 1（致命）**：线性化公式里有 α_∞——但**学生实验课内未必能等到反应完全平衡**（水解 30 min 到 60 min 完成，课内时间紧张）。如果学生没测到 α_∞，整条线性化路径就断了，没法拟合。

**问题 2（方法论偏差）**：线性化改变了误差结构——`(t, α)` 的 y 方向误差经过对数变换后不再等权，却按等权最小二乘拟合，参数估计会偏。

**问题 3（业务痛点）**：α_∞ 误差巨大——反应快结束时旋光度变化已经很小（α 已经趋近 α_∞），学生测出来的 α_∞ 偏差常常 ±20%。如果把它**当常量**塞进线性化公式，这个偏差会污染**所有**数据点的拟合。

### 3.3 我们的方案（fix）

直接对**非线性原公式**做最小二乘拟合，三个参数同时优化：

- α_∞ **不再是常量**，而是参与迭代优化的参数。
- 学生可**可选地**输入 α_∞（作为 t = ∞ 数据点加入拟合）；不输入也能拟合（用末尾两点插值给初值）。
- 拟合算法：**正交距离回归**（ODR）——学生的 t 也会有误差，不能只算 y 残差。

---

## 四、业务驱动的三个算法决策

### 4.1 决策 1：α_∞ 从"常量"变成"迭代优化项"

这是整个软件最具业务洞察的设计。

**传统**：α_∞ 当常量，学生必须测准。测不准 → 拟合全垮。

**我们**：α_∞ 当参数，让数据"自己说话"。

| 场景 | 学生输入 α_∞？ | 拟合行为 |
|---|---|---|
| A | 输入了 | t = ∞ 数据点加入拟合，与 α_0、k 一起优化 |
| B | 没输入 | 用最后两个数据点线性外推得初值；ODR 在初值附近精修 |
| C | 输入了但偏差大 | ODR 用 8~10 个其他数据点的"投票"压住 α_∞，不让一个差值带偏全部 |

代码落在 `shared/equation/sucrose-hydrolysis.ts` 的 `initialParameters` 里：

```typescript
// α_∞ 的初始化（立足业务的插值法）
if (tLast === Infinity) {
  // 学生输入了 α_∞ → 直接用，并从 tArr 里把 ∞ 数据点踢出
  alphaEquilibrium = aLast
} else {
  // 学生没输入 → 用最后两个数据点线性外推
  const [tSecondLast, aSecondLast] = dataAoaSorted[dataAoaSortedLastIndex - 1]!
  const slope = (aLast - aSecondLast) / (tLast - tSecondLast)
  alphaEquilibrium = aLast + slope * (tLast - tSecondLast)
}
```

**教学价值**：学生当场就能看到拟合给出来的 α_∞ 与自己测的 α_∞ 差多少（差超过 ±15% 就要反思是不是没等到反应平衡）。

### 4.2 决策 2：数据校验立足化学反应规律

业务上，蔗糖水解是**旋光度单调递减**的反应（蔗糖右旋 → 葡萄糖 + 果糖 左旋）。

我们在拟合前**先做业务校验**，再让数学校验（无效数字、长度不够）介入：

```typescript
// SucroseHydrolysis.vue 的 validateData
// α 必须严格单调递减
if ((alphaArr[i - 1]! <= alphaArr[i]!) || (alphaArr[i]! <= alphaArr[i + 1]!)) {
  incorrectDataTArr.push(String(tArr[i]))   // 把异常时刻记下来
}
```

校验失败 → 弹窗告诉学生"t 在 X、Y、Z 时刻的数据趋势有误（应单调递减），请检查"——而不是丢一个冷冰冰的数学错误。

**为什么业务校验要在数学校验之前**：
- 业务校验 0 成本（5~20 个数据点一次遍历）；
- 通过业务校验后，学生已经修对了数据，再去做数学拟合才有意义；
- 业务校验失败时让学生先处理"是不是真的测错了"，而不是让拟合器"努力"拟合一个错误的趋势。

### 4.3 决策 3：参数初始化也立足业务

非线性拟合最大的坑是**初值**——初值离真值太远，迭代可能不收敛或收敛到局部最优。

`shared/equation/sucrose-hydrolysis.ts` 里 `initialParameters` 给出了一套**完全立足业务**的初值估计：

| 参数 | 初始化策略 | 业务依据 |
|---|---|---|
| α_0 | t = 0 数据点直接用；否则前两点线性外推 | 反应开始时刻旋光度最大（蔗糖未水解） |
| α_∞ | t = ∞ 数据点直接用；否则末两点线性外推 | 反应末态旋光度最小（蔗糖完全水解） |
| k | 对每个数据点算 `k = ln[(α_0 − α_∞)/(α_t − α_∞)] / t`，取平均 | 一级反应每个时间点算出来的 k 理论相同，平均是稳健估计 |

这套初值估计**几乎免迭代**——10 个以内数据点通常 3~5 步 ODR 就收敛。

---

## 五、算法选择：为什么是 ODR 而不是 LM？

### 5.1 学生测 t 也有误差——LM 不够用

经典 Levenberg-Marquardt（LM）算法假设**自变量 x 精确无误差**，只优化 y 残差：

$$S_{LM}(\beta) = \sum_i (y_i - f(x_i; \beta))^2$$

但物化实验中，**学生按下秒表读 t**也是有误差的（0.5 s 量级，反应时间越长累积越多）。

`SucroseHydrolysis.vue` 调 `fitEquation(sucroseHydrolysis, tArr, alphaArr, {})` 时**不传 `sigmaX`**——ODR 算法检测到 σx 全 0，**自动退化为加权 LM**。这是因为：

- **当前业务场景**：学生 t 误差远小于 α 误差（旋光仪读数 ±0.005° vs 秒表 ±0.5 s），LM 够用；
- **未来扩展点**：如果做浓度动力学（c 配样误差与 A 仪器误差相当），业务层传 `sigmaX` 就走 ODR 路径，无需改算法。

> 一个接口，两种行为——这就是 ODR 退化性质带来的工程红利。

### 5.2 ODR 的核心思想（科普向）

LM 把数据点竖直投影到拟合曲线；**ODR 把数据点垂直投影到拟合曲线**。

```
        LM                  ODR
                                
        |   ←-ry            ↙  ←-正交距离
       ry                   ↙
  点 •→|  f(x;β)         •→→  f(x+δ;β)
        |                   ↘
                            δ
```

数学上：

$$S_{ODR}(\beta, \delta) = \sum_i \left[ \frac{(y_i - f(x_i + \delta_i; \beta))^2}{\sigma_{y,i}^2} + \frac{\delta_i^2}{\sigma_{x,i}^2} \right]$$

其中 **δᵢ 是 x_i 的辅助修正量**——本质上是问"如果把 x_i 挪一点，挪到哪里误差最小"。

参数空间从 LM 的 p 维（只优化 β）扩展到 **(p + n) 维**（β + δ）。直接解 (p+n)×(p+n) 系统成本爆炸（O((p+n)³)），但 ODR 用 **Schur 补技巧**降回 p×p 系统——每步成本回到 **O(p³ + np²)**，与 LM 同阶。

> 这就是 ODRPACK（Boggs, Byrd, Schnabel 1987）的核心 trick，业务层完全不用关心。

### 5.3 ODR 的退化性质（关键工程价值）

`shared/fitting/algorithms/odr/orthogonal-distance-regression.ts` 在入口处自动检测：

```typescript
// 判断模式：sigmaX 全为 0 时退化为 LM
const hasXError = sigmaXY.some((s) => s > 0)
const mode: 'lm' | 'odr' = hasXError ? 'odr' : 'lm'
```

三种退化路径：

| 条件 | 退化为 | 业务场景 |
|---|---|---|
| σx → 0 (w_x → ∞) | **加权 LM** | 当前蔗糖水解（学生 t 误差很小） |
| 模型对 x 不敏感 (d ≈ 0) | **加权 LM** | （本软件未触发） |
| 模型线性 + σx > 0 | **York 回归** | （本软件未触发） |

业务层只调一个 `fitEquation`，ODR 内部根据输入自动选择——**一个算法接口，覆盖三种数学场景**。

### 5.4 "基础拟合上的层层优化"

ODR 不是凭空冒出来的——它是 LM 的严格推广，LM 又是 Gauss-Newton 的信赖域扩展。在 `shared/fitting/` 里，三个算法沿着"复杂度递增"排列：

| 算法 | 适用 | 实现 |
|---|---|---|
| `linearLeastSquares` | y = slope·x + intercept | 闭式解（`algorithms/linear/`） |
| `levenbergMarquardt` | 非线性 + 只 y 残差 | 信赖域迭代（`algorithms/lm/`） |
| `orthogonalDistanceRegression` | 非线性 + (x, y) 都有误差 | Schur 补 + 信赖域（`algorithms/odr/`） |

它们共享：

- **同一套 `FitResult` 接口**（`types.ts`）——`params / paramErrors / rSquared / rmse / sse / dof / residuals / predicted / covariance / converged / iterations`；
- **同一套子模块**（`damping/marquardt.ts` 阻尼、`convergence/default.ts` 收敛判据、`jacobian/numerical.ts` 数值雅可比、`matrix/solve.js` 高斯消元）；
- **同一套输入校验**（`validate.ts`）。

LM 和 ODR 各自**继承**这套基础设施，但 ODR 还多了一块**自己的** ODR 雅可比（同时算 ∂f/∂β 和 ∂f/∂x）。

#### 5.4.1 阻尼策略（`damping/marquardt.ts`）

LM 信赖域的核心是 λ——**大 λ 偏向最速下降（稳）**，**小 λ 偏向 Gauss-Newton（快）**：

```typescript
onAccept(): void { this.lambda = max(lambdaMin, lambda * lambdaDown) }  // 默认 0.3
onReject(): void { this.lambda = min(lambdaMax, lambda * lambdaUp) }    // 默认 5
```

**两层保险**：`λ ∈ [1e-12, 1e12]` 防止数值溢出（教学数据小到几乎不会出现，但保险必须有）。

#### 5.4.2 收敛判据（`convergence/default.ts`）

三判据 OR 组合：

1. **参数相对变化 < 1e-8**——`max(|Δp_j| / max(|p_j|, 1e-12))`
2. **SSE 绝对值 < 1e-8**（等权场景）或 **相对首次 SSE 下降到 1e-8 倍**（加权场景）
3. **梯度无穷范数 < 1e-8**

判据 1 的实现细节很关键：用"每个参数的相对变化取最大值"——避免跨尺度参数（A=10⁴ 和 K=10⁻⁶ 同时拟合时）A 的微小变化掩盖 K 的大相对变化。

#### 5.4.3 一阶最优性预检查（关键工程优化）

LM 和 ODR 主循环开头都做了一次**梯度范数预检查**：

```typescript
// 一阶最优性预检查（与 LM 一致）
//   若梯度范数已足够小，说明已经在极值点附近，直接判收敛。
//   这避免初值恰好接近真值时"trial SSE ≈ current SSE 永远拒绝"的死循环。
if (preCheckGradNorm < (convOptions?.gradientTolerance ?? 1e-8)) {
  converged = true
  break
}
```

**踩坑背景**：学生数据用业务初始化后，初值往往**非常接近**真值。此时 LM 内层试探 `trialSSE < currentSSE` 会因为 SSE 变化小于浮点精度而**永远拒绝**——直到 maxIterations 才停。这一行预检查就是为这种场景加的"早停"。

#### 5.4.4 数值雅可比（`jacobian/numerical.ts`）

中心差分 + 自适应步长：

$$J[i][j] = \frac{f(p + h_j e_j) - f(p - h_j e_j)}{2 h_j}$$

$$h_j = \text{relativeStep} \times \max(|p_j|,\ \text{typicalValue}_j,\ 1)$$

**自适应步长的必要性**：

固定步长 `h = 1e-6` 对跨尺度参数（α_0 ~ 10 和 k ~ 0.05 同时拟合）几乎一定挂——k 的扰动 `1e-6 * 0.05 = 5e-8` 太小，被浮点噪声淹没。**每个参数按自己的尺度计算绝对步长**才能稳健。

ODR 的雅可比（`algorithms/odr/numerical-jacobian.ts`）还要额外算 `d[i] = ∂f/∂x`（对自变量的偏导）——这是 ODR 与 LM 的核心差异，用于 Schur 补和 δ 回代。

#### 5.4.5 模块化解耦

每个子模块都是接口 + 默认实现的分离：

```typescript
// 阻尼：可替换
damping?: DampingStrategy    // MarquardtDamping / NielsenDamping / 自定义
// 收敛：可替换
convergence?: ConvergenceCheck  // DefaultConvergence / 自定义
// 雅可比：可替换
jacobian?: JacobianProvider  // 数值 / 解析 / 自动微分
// 求解器：可替换
solver?: LinearSolver        // 高斯消元 / LU / QR
```

**业务价值**：将来接入 tfjs 自动微分（解析雅可比）、改用 QR 分解提升数值稳定性、加自适应阻尼——全都改模块不改主循环。

---

## 六、业务 → 算法的桥接：fitEquation

业务代码（`SucroseHydrolysis.vue`）调一个函数：

```typescript
const fitResultRaw = fitEquation(sucroseHydrolysis, tArr, alphaArr, {})
```

`fitEquation` 在 `shared/equation/index.ts` 定义，做三件事：

1. 调 `equation.initialParameters(x, y)` 拿到参数初值（业务逻辑）；
2. 调 `bindModel(equation, x)` 把公式烘焙成 PredictFn（接口桥接）；
3. 调 `levenbergMarquardt` 或 `orthogonalDistanceRegression`（算法）。

```typescript
export function fitEquation(equation, xData, yData, options = {}) {
  const { algorithm = "odr", sigmaX, sigmaY } = options ?? {}
  const paramNames = getParamNames(equation)
  const initParams = getInitialParams(equation, xData, yData)

  if (algorithm === "lm") {
    const fn = bindModel(equation, xData)   // LM 需要 x 通过闭包绑定
    return { algorithm: "lm", ...levenbergMarquardt(fn, initParams, paramNames, xData, yData, { sigmaY }) }
  }

  // 默认 ODR（sigmaX 全 0 时自动退化为 LM）
  return { algorithm: "odr", ...orthogonalDistanceRegression(
    (x, p) => equation.model(x, ...), initParams, paramNames, xData, yData, { sigmaX, sigmaY }
  ) }
}
```

**学生 / 教师不需要懂这些**——他们看到的就是按钮「拟合数据」+ 抽屉里出现的 R² / k / t(1/2)。但他们能享受到"业务创新 + 算法严谨"的双重红利。

---

## 七、工程巧思：从代码到可交付的产品

### 7.1 VitePress 选型理由

最终选型 **VitePress 2.0.0-alpha.19**，理由：

| 需求 | VitePress 对应能力 |
|---|---|
| 实验文档天然形态（公式 / 图表 / 代码） | Markdown + Vue 组件混编 |
| 手机 / 平板 / 电脑统一体验 | 响应式布局（VitePress 默认） |
| 校内 Pages 静态托管，无需后端 | **SSG（Static Site Generation）首屏** |
| 客户端跳转不打断数据录入 | **SPA 前端路由** |
| 数学公式 `α_0 / α_∞ / e^{kt}` 渲染 | markdown-it-mathjax3（项目自带 `overrides` 锁 juice 8.1.0） |
| 站内搜索 | miniSearch + 模糊匹配 |
| 中英双语 | i18n locales（root / en） |

SSG + SPA 看似矛盾，实际是**双优组合**：每个页面首屏是预渲染的静态 HTML（秒开），跳转走客户端路由（不刷新）。这正好契合"实验文档 + 嵌入式工具"的混合场景。

### 7.2 即扫即用 + 手机优先

物化实验室场景下，学生用手机或平板打开链接就行，**不需要装任何东西**：

- **静态化部署**：构建产物是纯静态文件，任何 Pages / CDN / 实验室电脑都能跑；
- **gzip 预压缩**（`shared/gzip.js`，构建后跑）：`.js / .css / .wasm / .html` 全部 level 9 压缩成 `.gz`，增量构建（mtime 检查，跳过已压缩的）；
- **TDesign Mobile Vue**（`tdesign-vue-next` 1.20.6）：移动端 UI 组件库，按钮 / 输入框 / 抽屉都是 mobile-first 设计；
- **响应式**：同一套组件在 360px 手机屏到 1920px 桌面屏都可用。

学生扫一下二维码（实验讲义上印好），进入页面，输入数据，拟合结果，关闭页面——总耗时不超过 3 分钟。

### 7.3 动态 base 路径（部署灵活）

`project-info/index.ts` 里：

```typescript
const buildKind = processEnv["VITE_BUILD_KIND"] ?? "root"
export const base = (buildKind === "root") ? "/" : "/phys-chem/"
```

通过 `VITE_BUILD_KIND` 环境变量切换：
- `root`：部署到域名根路径（自建服务器场景）；
- `subpage`：部署到 Pages 服务的子路径（`/phys-chem/`）。

同一份代码，两种部署目标，无需手动改任何配置。

### 7.4 自动导入 + TDesign 解析器

`.vitepress/config.ts` 里：

```typescript
AutoImport({
  imports: [{
    "@utils/myPlugin.ts": ["myLoading", "myDialog", "myMessage", "myError", "myWait"],
    "vue": ["ref", "shallowRef", "useTemplateRef", "onMounted", "watch", "computed", ...],
    "vitepress": ["useData", "withBase", "useRouter"],
  }],
  dirs: ["composables"],   // composables/ 下所有文件自动按命名导出
  resolvers: [TDesignResolver({ library: "vue-next" })],
})
```

业务代码里直接写 `ref(...)` / `onMounted(...)` / `myDialog({...})`，不用 import。`<t-input>` / `<t-button>` 等 TDesign 组件也无需手动引入——VitePress 插件自动按需加载。

**业务代码可读性大幅提升**：专注于业务逻辑，不被 import 噪音淹没。

### 7.5 拟合层与业务层完全解耦

```
shared/fitting/        ← 算法（与"蔗糖水解"无关）
  algorithms/linear/  ← 加权线性最小二乘
  algorithms/lm/      ← Levenberg-Marquardt
  algorithms/odr/      ← 正交距离回归
  damping/             ← 阻尼策略
  convergence/         ← 收敛判据
  jacobian/            ← 雅可比计算
  matrix/  numeric/    ← 矩阵 + 数值基础（被算法层调用）

shared/equation/       ← 公式模型（业务专属）
  types.ts             ← EquationModel schema
  bind.ts              ← LM 桥接
  index.ts             ← fitEquation 便捷入口
  sucrose-hydrolysis.ts ← 蔗糖水解公式（业务）
  backup/              ← 老版本（归档）
```

**新加一个物化实验只需**：
1. 在 `equation/` 下新增 `<新实验>.ts`，实现 `validateData` / `initialParameters` / `model` 三个函数；
2. 在 `frontend/index/experiment/<新实验>/` 下新增 `*.vue` + `index.md`；
3. 不需要动 `fitting/` 一行代码。

---

## 八、工作量小计

| 模块 | 大致代码量 | 备注 |
|---|---|---|
| 业务 UI（`SucroseHydrolysis.vue` + lang + data + index.md） | ~500 行 | 包含响应式数据管理 + 抽屉 + 图表 + i18n |
| 公式模型（`sucrose-hydrolysis.ts` + schema + bind + 便捷入口） | ~350 行 | 含 `defineEquationModel` 工厂、`fitEquation` 一键入口 |
| 拟合算法（线性 / LM / ODR + 子模块） | ~1500 行 | 三套算法共享统计量 / 校验 / 正规方程 |
| 工程基础设施（VitePress 配置 + 自动导入 + gzip + composables） | ~1000 行 | 含 TDesign 解析、动态 base、i18n 等 |

> 这不是"AI 一键生成"的产物。每个数值的含义、每个接口的设计、每条业务校验的必要性，**都立足蔗糖水解的具体场景**——这才是教学软件的核心。

---

## 九、写在最后

回头看，这个软件最有价值的不是算法本身（ODR 是 1987 年就有的经典算法），而是**让算法服务于教学业务**的每一步决策：

- α_∞ 当迭代项而不是常量——**让数据自己说话**；
- 数据校验先业务后数学——**让学生先理解反应规律，再谈拟合**；
- 参数初始化立足业务——**让初值几乎免迭代**；
- 一个 `fitEquation` 接口覆盖三种数学场景——**业务层永远不需要懂算法**；
- ODR 退化 LM——**算法自动适应业务复杂度**；
- VitePress SSG + SPA + gzip + TDesign Mobile + 动态 base——**让手机扫码即用成为可能**。

每一条决策都不是凭空来的——都来自"如果让学生在实验课内用这套工具，哪些坑要提前填好"的反复追问。

> 软件是给学生用的，不是给作者炫技的。
