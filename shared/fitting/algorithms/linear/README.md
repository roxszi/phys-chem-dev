# 线性最小二乘

> 闭式解线性回归 `y = slope·x + intercept`，LM 算法的线性特例。

---

## 一、什么时候用线性拟合？

| 场景 | 示例 |
|---|---|
| 模型本身是线性的 | Beer-Lambert 定律 A = ε·b·c |
| 非线性模型线性化 | Arrhenius: ln k vs 1/T；一级反应积分式 ln(A/A₀) vs t |
| LM 收敛诊断 | 在最优点附近线性近似，用来快速估算参数标准误 |

**直接用 LM 也能拟合线性模型**，但有几个理由保留独立的线性拟合：

1. **速度**：闭式解无迭代，比 LM 快 100~1000 倍
2. **稳定性**：无雅可比数值误差，无收敛问题
3. **可解释**：协方差矩阵有解析表达式 `(XᵀX)⁻¹σ²`

---

## 二、数学公式

### 2.1 带截距（默认）

```
slope     = Σ[(xᵢ-x̄)(yᵢ-ȳ)] / Σ[(xᵢ-x̄)²]
intercept = ȳ - slope·x̄
R²        = 1 - SSE / SST
RMSE      = √(SSE / n)
σ²        = SSE / (n - 2)        ← 自由度 n - p = n - 2
```

协方差矩阵（设计矩阵 `X = [x | 1]`）：

```
Cov = σ² × (XᵀX)⁻¹ = σ² × [Σx²  Σx]⁻¹
                         [Σx   n ]
```

参数标准误：

```
SE(slope)     = √Cov[0][0]
SE(intercept) = √Cov[1][1]
```

### 2.2 过原点（`fitIntercept: false`）

约束 `intercept = 0`，模型变为 `y = slope·x`：

```
slope = Σ(xᵢyᵢ) / Σ(xᵢ²)
σ²    = SSE / (n - 1)        ← 自由度 n - 1（不是 n - 2）
```

**适用场景**：
- Beer-Lambert 定律（浓度 c=0 时 A=0 是物理要求）
- 光谱基线零点已知
- 任何"截距理论值为 0"的物理模型

**注意**：过原点回归的 R² 公式与带截距时**不同**——
- 带截距 R²：和"y = ȳ"比较
- 过原点 R²：和"y = 0"比较（所以 R² 值通常偏高，不能直接和带截距 R² 对比）

---

## 三、API

### 3.1 最简用法

```typescript
import { linearLeastSquares } from '@/fitting'

const result = linearLeastSquares(xData, yData)
console.log(result.slope)         // 斜率
console.log(result.intercept)     // 截距
console.log(result.rSquared)      // R²
console.log(result.paramErrors)   // { slope: ..., intercept: ... }
```

### 3.2 过原点拟合

```typescript
const result = linearLeastSquares(xData, yData, {
  fitIntercept: false,
})
// result.intercept === 0
// result.dof === n - 1
```

### 3.3 跳过统计量计算（性能优先）

```typescript
// 只需 slope / intercept / R²，不计算协方差 / 标准误
const result = linearLeastSquares(xData, yData, {
  computeStatistics: false,
})
// result.covariance === []
// result.paramErrors === { slope: 0, intercept: 0 }
```

适用于 bootstrap、Monte Carlo 拟合万次的场景。

### 3.4 完整返回值

```typescript
interface LinearLeastSquaresResult extends FitResult {
  slope: number
  intercept: number

  // 继承自 FitResult 的字段：
  params: { slope: number, intercept: number }  // 字典形式
  paramErrors: { slope: number, intercept: number }
  rSquared: number
  rmse: number
  sse: number
  dof: number                // 带 intercept: n-2；过原点: n-1
  residuals: number[]
  predicted: number[]
  covariance: number[][]     // 2×2（带 intercept）或 1×1（过原点）
  converged: true            // 线性拟合不会失败（除非抛错）
  iterations: 1              // 闭式解，无迭代
  gradientNorm: number       // 闭式解的梯度范数（理论应为 0）
}
```

---

## 四、与旧版（`linear-js.ts`）的差异

| 方面 | 旧版 | 新版 |
|---|---|---|
| 返回结构 | 独立的 `LinearFittingResult` | 继承 `FitResult`（与 LM 统一） |
| 截距控制 | 固定带截距 | 可选过原点（`fitIntercept: false`） |
| 协方差 / 标准误 | 无 | 可计算 |
| 自由度 | 无 | 返回（`n - p`） |
| RMSE / SSE | 无 | 返回 |
| 错误信息 | 简短 | 带具体数值 |
| 校验 | 只在函数开头 | 复用 `base/validate/arrays.ts` |

API 不完全兼容旧版；旧版作为 `linear-js.ts` 保留作对照。

---

## 五、常见陷阱

### 5.1 R² 在过原点回归下的解释

过原点回归的 R² 会显著高于带截距回归（因为"总平方和"用了未中心化的 Σy²，分母更大）。

**正确做法**：对比两个拟合时，**不要直接比 R²**；要比 RMSE 或残差分析。

### 5.2 强制过原点可能掩盖系统性偏差

如果数据真实截距 ≠ 0 但被强制设为 0，残差会表现出系统性偏移（不是随机噪声）。

**检查方法**：画残差图，如果残差整体偏正或偏负，说明过原点假设不成立。

### 5.3 x 方差为零时无法拟合

所有 `xᵢ` 相同时 `Σ(xᵢ-x̄)² = 0`，斜率公式除零。函数会抛 `自变量方差为零` 错误。

---

## 六、参考文献

1. **Draper & Smith** — *Applied Regression Analysis*, 3rd ed., Wiley, 1998.
2. **Montgomery** — *Design and Analysis of Experiments*, 10th ed., Wiley, 2019.（线性回归章节）
3. **Casella & Berger** — *Statistical Inference*, 2nd ed., Duxbury, 2002.（闭式解的统计性质推导）
