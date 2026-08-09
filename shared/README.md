# 跨端共用工具

> 曲线拟合工具集。设计原则：**base 基础层 + fitting 共享层 + 算法层**三级结构，让每个模块小到可以单独读懂，让每个算法可以独立扩展。

---

## 一、目录结构

```
shared/
├── base/                              ← 跨业务基础工具（任何模块都能用）
│   ├── linalg/
│   │   ├── matrix.ts                  矩阵求逆 / 对角提取等
│   │   └── solver/                    线性方程组求解器
│   │       ├── types.ts               LinearSolver 接口
│   │       └── gaussian-elimination.ts
│   └── validate/
│       └── arrays.ts                  数组长度 / 有限性校验
│
├── fitting/                           ← 拟合业务专属
│   ├── README.md                      ← 你在这里
│   ├── index.ts                       公共 API
│   ├── types.ts                       拟合核心类型（FitResult 等）
│   │
│   ├── validate.ts                    拟合输入校验（复用 base）
│   ├── residual.ts                    残差 + SSE
│   ├── normal-equation.ts             JᵀJ / Jᵀr / 阻尼应用
│   ├── statistics.ts                  R² / RMSE / 协方差 / 标准误
│   │
│   ├── jacobian/                      雅可比计算（可替换后端）
│   │   ├── types.ts                   JacobianProvider 接口
│   │   └── numerical.ts               数值中心差分 + 自适应步长
│   │
│   ├── convergence/                   收敛判据（可组合）
│   │   ├── types.ts                   ConvergenceCheck 接口
│   │   └── default.ts                 三判据 OR 组合
│   │
│   ├── damping/                       λ 调整策略（LM 专用）
│   │   ├── types.ts                   DampingStrategy 接口
│   │   └── marquardt.ts               Marquardt 1963 固定倍数
│   │
│   └── algorithms/                    具体算法层
│       ├── lm/                        Levenberg-Marquardt（非线性）
│       │   ├── README.md              算法详解（数学推导 + 使用示例）
│       │   ├── index.ts
│       │   ├── types.ts               LM 专属配置
│       │   └── levenberg-marquardt.ts 主循环（纯控制流）
│       │
│       └── linear/                    线性最小二乘（闭式解）
│           ├── README.md              算法详解
│           ├── index.ts
│           ├── types.ts               线性专属配置（过原点等）
│           └── linear-least-squares.ts 闭式解实现
└── kinetics/                           ← 动力学专用
```

**已弃用但保留作对照**（未来可删）：

```
shared/fitting/
├── nonlinear-js.ts                    旧版单文件 LM
└── linear-js.ts                       旧版单文件线性拟合
```

---

## 二、设计思想：三级架构

### 2.1 为什么要三级？

```
base/      → 跨业务基础工具（矩阵运算、校验）——任何业务都能用
fitting/   → 拟合专属的共享模块（残差、正规方程、雅可比接口等）
algorithms/→ 具体算法（LM / 线性 / TRF / ...）
```

**原则**：

| 层 | 判据 |
|---|---|
| `base/` | 不依赖任何业务；纯数学/工具 |
| `fitting/`（顶层） | 多个拟合算法共享；离开拟合语境无意义 |
| `fitting/algorithms/X/` | X 算法专属；换算法就用不上 |

**典型例子**：

| 文件 | 为什么在这个层 |
|---|---|
| `base/linalg/matrix.ts` | 矩阵求逆是数学工具，动力学 / 光谱 / 拟合都能用 |
| `base/validate/arrays.ts` | 数组长度校验是通用工具 |
| `fitting/residual.ts` | 残差 = y - f(x)，离开最小二乘无意义 |
| `fitting/normal-equation.ts` | 正规方程 = JᵀJ·Δp = Jᵀr，LM/GN/TRF 共享 |
| `fitting/damping/marquardt.ts` | λ 调整是 LM 专属；但仍是"策略接口"，可换 Nielsen 等 |
| `fitting/algorithms/lm/levenberg-marquardt.ts` | LM 主循环本身；换算法就用不上 |
| `fitting/algorithms/linear/linear-least-squares.ts` | 线性拟合闭式解；和 LM 共享 FitResult 接口 |

### 2.2 接口驱动的可替换性

每个关键模块都是一个 TypeScript 接口，主算法通过依赖注入接收具体实现：

```typescript
// 主算法只依赖接口，不依赖具体实现
function levenbergMarquardt(..., options) {
  const jacobian = options.jacobian ?? createNumericalJacobian()  // 默认值
  const solver   = options.solver   ?? createGaussianEliminationSolver()
  // ...
}
```

**好处**：

| 想做什么 | 只需要 |
|---|---|
| 换 Cholesky 解法 | 新增 `base/linalg/solver/cholesky.ts` 实现 `LinearSolver` |
| 用解析雅可比 | 新增 `fitting/jacobian/analytical.ts` 实现 `JacobianProvider` |
| 升级到 Nielsen λ 策略 | 新增 `fitting/damping/nielsen.ts` 实现 `DampingStrategy` |
| 加梯度收敛判据 | 新增 `fitting/convergence/gradient-only.ts` 实现 `ConvergenceCheck` |
| tfjs GPU 加速 | 新增 `base/linalg/solver/tfjs.ts` 实现 `LinearSolver` |

**接口 = 扩展点**。

### 2.3 纯函数 vs 有状态对象

| 模块 | 风格 | 理由 |
|---|---|---|
| `residual.ts` / `normal-equation.ts` / `statistics.ts` | 纯函数 | 无状态，简单可测 |
| `validate.ts` / `base/validate/arrays.ts` | 纯函数 | 一次性校验，无状态 |
| `base/linalg/matrix.ts` | 纯函数 | 数学函数天生无状态 |
| `base/linalg/solver/` 各实现 | class（有状态但只读） | 接口一致，预留配置空间 |
| `fitting/jacobian/` 各实现 | class | 可携带配置（步长、典型尺度等） |
| `fitting/damping/` 各实现 | class | **有状态**（λ 在迭代中演化） |
| `fitting/convergence/` 各实现 | class | 可携带配置（容差等） |

### 2.4 单一职责 + 小文件

每个文件 50~200 行，只承担一个职责。**设计目标**：每个文件一节晚自习能读完。

---

## 三、算法家族概览

### 3.1 已实现

| 算法 | 适用场景 | 特点 |
|---|---|---|
| **Levenberg-Marquardt** | 通用非线性最小二乘 | 稳健、收敛性好，工业标准 |
| **线性最小二乘** | 线性模型 / 线性化后的非线性 | 闭式解，快 100~1000 倍 |

### 3.2 未来可扩展

| 算法 | 何时考虑 | 共享程度 |
|---|---|---|
| **Gauss-Newton** | LM 的 λ=0 特例，数据噪声极低时 | 共享几乎所有模块 |
| **Trust-Region Reflective (TRF)** | 带参数边界约束 | 共享雅可比 / 求解器 / 收敛判据 |
| **Orthogonal Distance Regression (ODR)** | x 和 y 都有测量误差 | 共享雅可比 / 求解器，需扩展残差 |
| **Powell's Dogleg** | 信任域 + Dogleg 步 | 共享雅可比 / 求解器 |
| **Nelder-Mead** | 无导数信息（fn 不可微） | 几乎不共享（不属于梯度类） |
| **BFGS / L-BFGS** | 通用优化（非最小二乘） | 共享收敛判据，Hessian 不同 |

### 3.3 添加新算法的步骤

以"未来加 TRF"为例：

1. 新建 `algorithms/trust-region-reflective/` 目录
2. 写 `types.ts`（TRF 专属配置，如 bounds）
3. 写 `trust-region-reflective.ts`（主循环）
4. TRF 特有的"反射步"模块可以放 `fitting/reflection.ts`（多个算法共享时）或 `algorithms/trf/reflection.ts`（TRF 独有时）
5. 在顶层 `index.ts` 导出

整个过程**不需要动 `algorithms/lm/`**，也不需要动 `fitting/` 共享层（除非引入新的共享概念）。

---

## 四、模块依赖图

```
       base/                          fitting/（共享层）
       ──────                         ──────────────────
   ┌────────────┐               ┌──────────────────┐
   │ linalg/    │ ◄───────────  │ normal-equation  │
   │  matrix.ts │               │  residual.ts     │
   │  solver/   │ ◄───────────  │  statistics.ts   │
   └────────────┘               └──────────────────┘
                                        ▲
   ┌────────────┐                        │
   │ validate/  │ ◄──────────────────────┤
   │  arrays.ts │                        │
   └────────────┘                        │
                                         │
                  ┌──────────────────────┤
                  │                      │
                  ▼                      ▼
           ┌──────────────┐       ┌──────────────┐
           │ jacobian/    │       │ convergence/ │
           │ damping/     │       │ (可组合)     │
           └──────────────┘       └──────────────┘
                  ▲                      ▲
                  │                      │
                  └──────────┬───────────┘
                             │
                             ▼
                ┌─────────────────────────────┐
                │ fitting/algorithms/         │
                │   lm/                       │  ←── 主循环：组装以上所有模块
                │     levenberg-marquardt.ts  │
                │   linear/                   │  ←── 闭式解（主要用 base，
                │     linear-least-squares.ts │       不需要雅可比/阻尼）
                └─────────────────────────────┘
```

---

## 五、快速上手

### 5.1 非线性拟合（LM）

```typescript
import { levenbergMarquardt } from '@shared/fitting'

// 定义模型
const fn = (p) => xData.map(x => p.A * Math.exp(-p.k * x) + p.C)

const result = levenbergMarquardt(
  fn,
  { A: 1, k: 0.1, C: 0 },       // 初始猜测
  ['A', 'k', 'C'],               // 参数名
  xData, yData,
)

console.log(result.params)        // 最终参数
console.log(result.paramErrors)   // 参数标准误
console.log(result.rSquared)      // 决定系数
console.log(result.converged)     // 是否收敛
```

### 5.2 线性拟合（闭式解）

```typescript
import { linearLeastSquares } from '@/fitting'

const result = linearLeastSquares(xData, yData)
console.log(result.slope, result.intercept)
console.log(result.rSquared)
console.log(result.paramErrors)   // { slope, intercept }
```

### 5.3 自定义 LM 模块

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
    typicalValues: { A: 100, k: 0.01 },  // 跨尺度参数的典型尺度
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

### 5.4 实现自定义模块

以"自定义只看梯度的收敛判据"为例：

```typescript
import type { ConvergenceCheck } from '@/fitting'

class GradientOnlyConvergence implements ConvergenceCheck {
  constructor(private readonly tol = 1e-8) {}
  check(state) {
    const gradNorm = Math.max(...state.gradient.map(Math.abs))
    return gradNorm < this.tol
  }
}

const result = levenbergMarquardt(fn, init, names, xData, yData, {
  /* 注意：当前 LM 主循环还没开放 convergence 对象注入，
     目前只接受 ConvergenceOptions 配置默认判据。
     未来可以扩展为接受完整的 ConvergenceCheck 对象。 */
})
```

---

## 六、与旧版（`nonlinear-js.ts` / `linear-js.ts`）的差异

本目录下的 `nonlinear-js.ts` 和 `linear-js.ts` 是**重构前的单文件版本**，保留作对照。

### 6.1 LM 重构修复的 bug

| bug | 修复方式 |
|---|---|
| converged 字段误报（"内层失败"被报告为收敛） | 主循环退出时严格区分 converged 和 !accepted |
| iterations 字段多算一次（跑满 maxIterations 时报告 +1） | 改用独立计数器 iterationsUsed |
| 协方差段重复计算雅可比 | 统一在主循环结束后重算一次 finalJacobian |
| fn 返回长度不校验（NaN 静默污染） | 入口 validateInputs 一次性校验 |
| 参数相对变化判据分母用"全局最大"导致跨尺度误判 | 改成每个参数自己的相对变化取 max |
| 雅可比前向差分公式的 stepSize 选择 | 中心差分 + 自适应步长 |
| λ 无上限（病态模型时膨胀） | MarquardtDamping 加 lambdaMax |

### 6.2 架构改进

| 方面 | 旧版 | 新版 |
|---|---|---|
| 文件组织 | 单文件 475 行（LM） + 112 行（线性） | 按职责拆成 20+ 个小文件，三级架构 |
| 通用工具 | 在 LM 内部重复实现 | 提到 `base/` 跨业务复用 |
| 可替换性 | 写死高斯消元、写死数值雅可比 | 接口注入，可换 Cholesky / 解析 / tfjs |
| 可测试性 | 主函数耦合所有逻辑 | 每个模块可独立单元测试 |
| 可扩展性 | 加新算法要从头写 | 共享层已就绪，新算法只写差异部分 |

### 6.3 线性拟合扩展

| 能力 | 旧版 `linear-js.ts` | 新版 `linear/` |
|---|---|---|
| 过原点拟合（fitIntercept=false） | ✗ | ✓ |
| 协方差矩阵 | ✗ | ✓ |
| 参数标准误 | ✗ | ✓ |
| 与 LM 共用 FitResult 接口 | ✗（独立接口） | ✓ |
| 自由度返回 | ✗ | ✓ |

---

## 七、性能说明

### 7.1 当前实现适合的场景

- **数据点数 n**：1 ~ 10⁴
- **参数个数 p**：1 ~ 50
- **fn 评估成本**：单次 < 100ms（典型物化解析模型）

### 7.2 什么时候需要优化

| 场景 | 推荐优化方向 |
|---|---|
| n > 10⁴ | 矩阵运算用 TypedArray（Float64Array） |
| fn 调用 > 10ms | fn 内部优化（向量化、缓存） |
| 同一模型拟合成千上万个数据集 | 并行化（Web Worker / GPU） |
| p > 50 | 稀疏雅可比 / 大规模优化算法 |

### 7.3 关于 tfjs / WebGPU

不建议直接把整个 LM 搬到 GPU。推荐方式：

- **CPU 控制流 + GPU 矩阵运算**：实现一个 `TfjsLinearSolver`，作为 `LinearSolver` 接口的 GPU 后端（放 `base/linalg/solver/`）
- **fn 是神经网络 forward pass 时**：fn 本身用 tfjs，雅可比和矩阵运算仍在 CPU
- **典型物化场景**（解析 fn + 中等数据量）：CPU 足够，不需要 GPU

---

## 八、迁移指南（从旧版到新版）

### 8.1 LM API 签名对比

签名**完全一致**，可以直接替换：

```typescript
// 旧版
import { levenbergMarquardt } from '@/fitting/nonlinear-js'

// 新版
import { levenbergMarquardt } from '@/fitting'
// 或显式从算法层导入：
// import { levenbergMarquardt } from '@/fitting/algorithms/lm'
```

### 8.2 线性拟合 API 不完全兼容

```typescript
// 旧版
import { linearFitting } from '@/fitting/linear-js'
const { slope, intercept, rSquared } = linearFitting(xData, yData)

// 新版
import { linearLeastSquares } from '@/fitting'
const { slope, intercept, rSquared, paramErrors, covariance } = linearLeastSquares(xData, yData)
```

新版返回的字段是旧版的超集；旧版独立返回类型 `LinearFittingResult` 被改为继承 `FitResult`。

### 8.3 LM options 差异

旧版的 `options` 字段全部保留兼容：

| 字段 | 旧版 | 新版 |
|---|---|---|
| `lambdaInit`, `lambdaUp`, `lambdaDown` | 顶层 | 移到 `dampingOptions` 下 |
| `maxIterations` | 顶层 | 顶层（不变） |
| `paramTolerance`, `costTolerance` | 顶层 | 移到 `convergence` 下 |
| `stepSize` | 顶层 | 移到 `jacobian` 的 options 下（`relativeStep`） |

**迁移示例**：

```typescript
// 旧版
levenbergMarquardt(fn, init, names, xData, yData, {
  lambdaInit: 1e-3,
  paramTolerance: 1e-10,
  stepSize: 1e-6,
})

// 新版
levenbergMarquardt(fn, init, names, xData, yData, {
  dampingOptions: { lambdaInit: 1e-3 },
  convergence: { paramTolerance: 1e-10 },
  jacobian: createNumericalJacobian({ relativeStep: 1e-6 }),
})
```

如果想用默认值，不传任何 options 即可。

---

## 九、开发约定

### 9.1 命名

- **接口名**：单数名词（`JacobianProvider`、`LinearSolver`、`DampingStrategy`）
- **实现类名**：具体技术 + 接口名（`NumericalJacobian`、`GaussianEliminationSolver`）
- **工厂函数**：`create` + 接口名（`createNumericalJacobian`）
- **纯函数**：动词开头（`buildJtj`、`computeResiduals`、`applyDamping`）

### 9.2 错误处理

- **入口校验失败**：throw 带详细数值的 `Error`
- **运行时异常**（矩阵奇异、fn 返回错误）：throw 或返回 null（由调用方决定）
- **不静默吞错**：禁止 `?? 0` / `!` 非空断言等掩盖错误的写法

### 9.3 测试

每个模块都应该有单元测试。推荐测试用例：

| 模块 | 测试 |
|---|---|
| `base/validate/arrays.ts` | 各类非法输入 |
| `base/linalg/matrix.ts` | 一般矩阵 / 奇异矩阵 / 非方阵 |
| `base/linalg/solver/gaussian-elimination.ts` | 一般矩阵 + 奇异矩阵 |
| `fitting/validate.ts` | 各类非法输入 |
| `fitting/residual.ts` | 残差 / SSE 数值正确性 |
| `fitting/normal-equation.ts` | 对照手算结果 |
| `fitting/jacobian/numerical.ts` | 对照解析雅可比（已知导数公式的模型） |
| `fitting/convergence/default.ts` | 边界条件 |
| `fitting/damping/marquardt.ts` | λ 演化正确 |
| `fitting/statistics.ts` | 对照已知结果（线性拟合的协方差有解析解） |
| `fitting/algorithms/lm/levenberg-marquardt.ts` | 线性模型 / 指数衰减 / 不收敛场景 |
| `fitting/algorithms/linear/linear-least-squares.ts` | 已知斜率数据 + 过原点 + 强制截距 |

---

## 十、参考文献

### 算法理论

1. **Marquardt 1963** — "An Algorithm for Least-Squares Estimation of Nonlinear Parameters". *SIAM J. Appl. Math.* 11: 431-441.
2. **Nocedal & Wright** — *Numerical Optimization*, 2nd ed., Springer, 2006. Chapter 10.
3. **Press et al.** — *Numerical Recipes*, 3rd ed., Cambridge, 2007. Section 15.5.
4. **Nielsen 2003** — "MARQ: A Generic Levenberg-Marquardt Method". IMM DTU Technical Report.
5. **Draper & Smith** — *Applied Regression Analysis*, 3rd ed., Wiley, 1998.（线性回归章节）

### 工程实现参考

6. **MINPACK** — Argonne National Laboratory 的工业级 LM 实现（lmder / lmdif）
7. **SciPy least_squares** — Python 的 SciPy 库，含 LM / TRF / dogbox 三种实现

---

## 十一、联系与反馈

- 发现 bug：在本仓库开 issue
- 想加新算法：先读本文 §三·3（添加新算法的步骤）
- 想换求解器后端（如 Cholesky / tfjs）：实现对应接口即可
