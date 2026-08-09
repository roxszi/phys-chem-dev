# algorithms/lm/ — Levenberg-Marquardt

**适用**：x 精确无误差（或误差 << y 误差），只优化 y 残差的非线性拟合。

## 数学公式

每次迭代解：

```
(JᵀJ + λ·diag(JᵀJ)) · Δp = Jᵀr
```

- λ 大 → 接近最速下降（保守、稳定）
- λ 小 → 接近 Gauss-Newton（激进、快）
- trust-region（试探 + 升降 λ）在两者间自适应切换

## 用法

```typescript
import { levenbergMarquardt } from './index.js'

const result = levenbergMarquardt(
  (p) => tData.map(t => p.A * Math.exp(-p.k * t)),  // PredictFn: 只接 params
  { A: 1, k: 0.1 },                                  // 初始猜测
  ['A', 'k'],                                         // 参数名
  tData, cData,
  {
    sigmaY: cSigma,   // 可选；weights = 1/σ² 自动转换
    weights: wArr,    // 可选；优先级高于 sigmaY
  },
)
```

## 关键实现点

1. **一阶最优性预检查**（Nocedal & Wright 标准做法）
   在 λ 试探之前检查 `|∇S| = |Jᵀr|`，若已足够小直接判收敛。
   避免"初值即真值"时 `trial SSE ≈ current SSE` 永远拒绝的死循环。

2. **Marquardt 阻尼形式**（不是经典 λI）
   `JᵀJ + λ·diag(JᵀJ)` 按参数尺度自适应阻尼，
   对跨尺度参数（如 A=10⁴ 和 K=10⁻⁶ 同时拟合）更稳健。

3. **加权支持**（v0.2.0+）
   `sigmaY?: number[]` 与 `weights?: number[]` 二选一。
   `weights` 优先级更高（已经是 1/σ² 形式时用这个）。

## 主要文件

- `levenberg-marquardt.ts` — 主算法
- `types.ts` — `LevenbergMarquardtOptions` / `LevenbergMarquardtResult`

## 何时不该用 LM

- x 也有显著测量误差 → 改用 **ODR**（见 `../odr/`）
- 模型是线性 `y = slope·x + intercept` → 改用 **linearLeastSquares**（闭式解，更快更准）
