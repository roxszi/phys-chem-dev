# 加权线性最小二乘（WLS）

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
import { linearLeastSquares } from '@shared/fitting/index.ts'

// Beer-Lambert 校准：A = ε·b·c + b₀（不过原点）
const result = linearLeastSquares({
  xData: cData,            // x：浓度（一元标量数组）
  yData: aData,            // y：吸光度（number[] | Float64Array）
  // sigmaY: aSigmaArr,     // 可选；传 y 的标准差数组，内部自动转 weights = 1/σ²
})
// result.slope      ε·b
// result.intercept  截距
// result.slopeStdErr / result.interceptStdErr
// result.rSquared
// result.covariance  2×2 自研 Matrix（matrixGet(covariance, 1, 1) = var(slope)）
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

- 语义字段（slope / intercept / rSquared / rmse / sse / dof / residuals / predicted / covariance）与 LM / ODR 的 FitResult 对齐，但形态不同：线性模型参数就是 slope / intercept 两个标量，无 params 字典与 paramErrors
- 闭式解无迭代：无 isConverged / iterations / finalLambda（LM 独有）、无 xCorrection / xCorrected / mode（ODR 独有）

## 教学价值

| 场景 | 直接拟合 vs 线性化 |
|---|---|
| Beer-Lambert 校准 | 直接拟合（A vs c 本身就线性） |
| Arrhenius | 用 `linearLeastSquares(1/T, ln k)` 做线性化——但注意：**这扭曲了误差结构**，更严谨的做法是用非线性 ODR / LM 拟合原始 (T, k) 数据 |
| 一级反应 c = c₀·e^(-kt) | 用 `linearLeastSquares(t, ln c)` 做线性化——同样的警告 |
