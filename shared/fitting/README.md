# fitting/ — 拟合算法

通用拟合算法与共享模块。**不知道"物化公式"是什么**——只接收 `PredictFn` / `PredictFnODR` 形式的预测函数。

## 三个算法（按复杂度递增）

| 算法 | 适用 | 入口 |
|---|---|---|
| **加权线性（WLS）** | 模型是线性 `y = slope·x + intercept` | `linearLeastSquares(x, y, { weights? })` |
| **Levenberg-Marquardt** | 非线性 + x 精确（只优化 y 残差） | `levenbergMarquardt(fn, init, names, x, y, { sigmaY? })` |
| **正交距离回归（ODR）** | 非线性 + (x, y) 都有误差 | `orthogonalDistanceRegression(fn, init, names, x, y, { sigmaX?, sigmaY? })` |

三个算法共享 `FitResult` 返回结构（见 `types.ts`）。

## 共享模块

| 模块 | 职责 | 可替换性 |
|---|---|---|
| `jacobian/` | 数值雅可比（中心差分） | 是——实现 `JacobianProvider` 即可 |
| `convergence/` | 收敛判据（参数 / SSE 相对 / 梯度） | 是——实现 `ConvergenceCheck` |
| `damping/` | Marquardt 阻尼策略 | 是——实现 `DampingStrategy` |
| `normal-equation.ts` | `(JᵀWJ, JᵀWr)` 构建 + 阻尼应用 | 否——内部基础设施 |
| `residual.ts` | 残差与 SSE 计算 | 否——内部基础设施 |
| `statistics.ts` | R² / RMSE / 协方差矩阵 | 否——内部基础设施 |

## 数学背景速查

**LM**：解 `(JᵀJ + λ·diag(JᵀJ)) Δβ = Jᵀr`，λ 大→保守（接近最速下降），λ 小→激进（接近 Gauss-Newton）。

**ODR**：参数空间扩展为 (β, δ)，用 Schur 补降维：
- 等效权重 `w_eff = w_y·w_x / (w_y·d² + w_x)`（d = ∂f/∂x）
- 等效残差 `r_eff = r_y + d·δ`
- 解 p×p 系统，然后回代求 `Δδ`

σx→0 时 `w_eff → w_y`，δ→0，**数学退化为加权 LM**（已通过 York 退化测试验证）。

## 各子目录 README

- [`algorithms/linear/README.md`](./algorithms/linear/README.md)
- [`algorithms/lm/README.md`](./algorithms/lm/README.md)
- [`algorithms/odr/README.md`](./algorithms/odr/README.md)

## 扩展点（高级用户）

所有"可替换模块"通过依赖注入接收。例：换 Nielsen 阻尼策略：

```typescript
import { levenbergMarquardt } from './algorithms/lm/index.js'

class NielsenDamping {
  current() { /* ... */ }
  onAccept() { /* ... */ }
  onReject() { /* ... */ }
}

const result = levenbergMarquardt(fn, init, names, x, y, {
  damping: new NielsenDamping(),  // ← 注入
})
```
