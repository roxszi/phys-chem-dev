# algorithms/linear/ — 加权线性最小二乘（WLS）

**适用**：模型是线性 `y = slope·x + intercept` 的场景。

## 数学公式

闭式解（不需要迭代）：

```
令 X = [1, x]（n×2 设计矩阵），W = diag(wᵢ)，wᵢ = 1/σ_yᵢ²
β = (Xᵀ W X)⁻¹ Xᵀ W y
```

不传 sigmaY 时退化为标准 OLS（等权）。

## 用法

```typescript
import { linearLeastSquares } from './index.js'

// Beer-Lambert 校准：A = ε·b·c + 0（过原点）
const result = linearLeastSquares(
  cData,  // x：浓度
  aData,  // y：吸光度
  // { sigmaY: aSigmaArr }  可选；传 y 的标准差数组，内部自动转 weights = 1/σ²
)
// result.slope      ε·b
// result.intercept  理论上 ≈ 0
// result.slopeStdErr / result.interceptStdErr
// result.rSquared
// result.covariance  [[var(intercept), cov], [cov, var(slope)]]
```

## 传 sigmaY 还是 weights？

**只暴露 sigmaY**（与 LM / ODR 接口统一）：

- 业务层直接传"标准差"数组（学生 / 仪器读数）
- 内部自动转换为 `weights = 1/σ²`
- 不传时退化为等权 OLS（等价于 sigmaY 全 1）

## 主要文件

- `linear-least-squares.ts` — 闭式解实现

## 边界情况

| 输入 | 行为 |
|---|---|
| n < 2 | throw（至少 2 点确定一条直线） |
| n = 2 | dof = 0，**sigma² / covariance / stdErr 全为 NaN**（数学含义："两点定线，参数能算但方差不可估计"） |
| n ≥ 3 | dof = n−2，正常估计方差与标准误 |
| 所有 x 相同 | throw（设计矩阵奇异） |

### 为什么 n=2 时 stdErr 是 NaN 而不是 0？

物化实验教学目标之一：**让学生理解"两点不够、要测更多点才能估误差"**。

- 数学上：dof=0 → 方差估计"不存在"，不是 0
- 教学上：返回 0 会让学生误以为"两点拟合的参数完全精确"——恰恰反教学
- 实践上：UI 把 NaN 渲染成 "—" 或 "不可估"，学生立刻明白需要更多点

## 与其他算法的关系

- 与 LM / ODR 共享 `FitResult` 部分字段（params / paramErrors / rSquared / rmse / sse / dof / residuals / predicted / covariance / converged / iterations）
- 不共享：LM 独有的 `finalLambda`、ODR 独有的 `xCorrection` / `xCorrected` / `mode`

## 教学价值

| 场景 | 直接拟合 vs 线性化 |
|---|---|
| Beer-Lambert 校准 | 直接拟合（A vs c 本身就线性） |
| Arrhenius | 用 `linearLeastSquares(1/T, ln k)` 做线性化——但注意：**这扭曲了误差结构**，更严谨的做法是用非线性 ODR / LM 拟合原始 (T, k) 数据 |
| 一级反应 c = c₀·e^(-kt) | 用 `linearLeastSquares(t, ln c)` 做线性化——同样的警告 |
