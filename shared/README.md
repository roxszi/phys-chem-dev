# shared/ — 跨端共用工具

> 设计原则：**通用层 + 数值方法层 + 业务层**三级结构；通用层零依赖、数值方法层依赖通用层、业务层依赖数值方法层。每个模块小到可以单独读懂，每个算法可独立扩展。

---

## 一、目录结构

```
shared/
├── matrix/                              ← Tier 0 纯线性代数（无依赖）
│   ├── types.ts                         Matrix / Vector 类型
│   ├── basic.ts                         数乘 / 转置 / 矩阵×向量 / 矩阵×矩阵
│   ├── inverse.ts                       求逆（Gauss-Jordan + 部分主元）
│   ├── solve.ts                         LinearSolver 接口 + 高斯消元默认实现
│   └── covariance.ts                    协方差矩阵 = σ² × M⁻¹（涉及矩阵的高阶函数）
│
├── numeric/                             ← Tier 0 通用数值统计（仅标量）
│   ├── stats.ts                         mean（其他聚合函数已删除——调用方按需内联）
│   ├── residual.ts                      residuals / sse（单次遍历直接实现）
│   ├── regression.ts                    rSquared / rmse / sigma2 / gradientNorm
│   ├── finite-difference.ts             centralDiff 原语（被 jacobian 复用）
│   └── validate.ts                      多合一数组校验（单次遍历同时查多项）
│
├── fitting/                             ← Tier 1 拟合算法与共享基础设施
│   ├── index.ts                         公共 API
│   ├── types.ts                         PredictFn / FitResult / IterationState
│   │
│   ├── validate.ts                      拟合输入校验（拟合专属）
│   ├── normal-equation.ts               JᵀJ / Jᵀr 构建 + 阻尼
│   ├── statistics.ts                    拟合统计拼装（调用 numeric/ + matrix/）
│   │
│   ├── jacobian/                        雅可比计算（可替换）
│   │   ├── types.ts                     JacobianProvider 接口
│   │   └── numerical.ts                 数值中心差分（调 numeric/centralDiff）
│   │
│   ├── convergence/                     收敛判据（可替换）
│   │   ├── types.ts                     ConvergenceCheck 接口
│   │   └── default.ts                   三判据 OR 组合
│   │
│   ├── damping/                         LM 阻尼策略（可替换）
│   │   ├── types.ts                     DampingStrategy 接口
│   │   └── marquardt.ts                 Marquardt 1963 固定倍数
│   │
│   └── algorithms/                      Tier 1 算法层
│       ├── index.ts                     algorithms/ 集合入口
│       ├── linear/                      闭式加权线性最小二乘
│       ├── lm/                          Levenberg-Marquardt（非线性）
│       └── odr/                         正交距离回归（非线性 + x、y 都有误差）
│
├── equation/                            ← Tier 2 物化公式
│   ├── index.ts                         一键拟合 fitEquation + 公式 re-export
│   ├── types.ts                         EquationModel schema
│   ├── bind.ts                          equation ↔ fitting 桥接
│   └── sucrose-hydrolysis.ts            蔗糖水解（折光法）
│
└── tfjs/                                ← Tier 3 tfjs 集成（可选）
    ├── index.ts
    ├── loadTFjs.ts                      后端加载（webgpu > webgl > cpu）
    └── jacobian.ts                      TfjsODRJacobian（占位）
```

---

## 二、设计原则

### 2.1 依赖方向（单向，从上到下）

```
matrix/        ──→ （零依赖）
numeric/       ──→ matrix/（仅当函数以矩阵为核心数据结构时；当前 numeric 不依赖 matrix）
fitting/       ──→ matrix/ + numeric/
equation/      ──→ fitting/
tfjs/          ──→ fitting/
```

**绝不能反向依赖**——matrix/ 不应 import numeric/，numeric/ 不应 import fitting/，依此类推。

### 2.2 每级目录都有自己的入口

避免"越级导入"。调用方通过 `fitting/index.ts` 拿整个 fitting 模块，通过 `fitting/algorithms/index.ts` 拿三个算法集合，逐级向下。

### 2.3 通用 vs 业务归属判定

函数归属 = **数据类型归属**，不是字面归属。

| 函数 | 输入是？ | 归属 |
|---|---|---|
| `mean` | `number[]` | numeric/ |
| `covarianceFromM(Matrix, σ²)` | `Matrix` + 矩阵求逆 | matrix/ |
| `rSquared` | `number[]` | numeric/ |
| `residualsAndSse` 之类的双遍历函数 | 已删除——按需在业务循环中合并 | — |

### 2.4 校验函数设计原则

| 复杂度 | 处理 |
|---|---|
| **1~2 行能搞定的**（如 `arr.length === 0` 检查） | 调用方直接写 |
| **单次遍历同时查多项**（如 x、y 长度匹配 + 全部有限） | numeric/validate.ts 提供 |
| **业务专属**（如 paramNames 不重复、fn 返回长度匹配） | fitting/validate.ts |

**不**做"代码工程师之耻"的薄函数（如 `validateSameLength`、`validateFiniteArray` 单遍历只查一件事）。**不**做死代码函数（无调用方）。

### 2.5 接口驱动的可替换性

每个关键模块都是 TypeScript 接口 + 默认实现：

| 接口 | 默认实现 | 扩展点示例 |
|---|---|---|
| `JacobianProvider` | `NumericalJacobian`（中心差分） | `AnalyticalJacobian`（解析偏导）、`TfjsJacobian`（自动微分） |
| `ConvergenceCheck` | `DefaultConvergence`（三判据 OR） | `GradientOnlyConvergence`、`MaxIterationsConvergence` |
| `DampingStrategy` | `MarquardtDamping`（固定倍数） | `NielsenDamping`（基于增益比 ρ） |
| `LinearSolver` | `GaussianEliminationSolver` | `CholeskySolver`（对称正定）、`TfjsLinearSolver` |

主算法通过依赖注入接收具体实现，外部可零成本替换。

---

## 三、依赖图（详细）

```
shared/matrix/             (无依赖)
   ├── types.ts
   ├── basic.ts
   ├── inverse.ts
   ├── solve.ts
   └── covariance.ts        → matrix/inverse (内部)

shared/numeric/            (无外部依赖；仅与 stats.ts 内部共享 mean)
   ├── stats.ts             → 无
   ├── residual.ts          → 无
   ├── regression.ts        → numeric/stats
   ├── finite-difference.ts → 无
   └── validate.ts          → 无

shared/fitting/
   ├── validate.ts          → numeric/validate
   ├── normal-equation.ts   → matrix/types
   ├── statistics.ts        → numeric/regression + matrix/covariance
   ├── jacobian/numerical.ts → numeric/finite-difference
   ├── convergence/         → fitting/types
   ├── damping/             → 内部
   └── algorithms/
       ├── linear/linear-least-squares.ts → matrix/{inverse,basic} + numeric/validate
       ├── lm/levenberg-marquardt.ts      → matrix/solve + numeric/residual
       │                                    + fitting/{validate,statistics,jacobian,convergence,damping}
       └── odr/orthogonal-distance-regression.ts → matrix/{solve,inverse}
                                              + numeric/{validate,finite-difference}
                                              + fitting/{normal-equation,convergence,damping,types,jacobian}

shared/equation/           → fitting/{types,algorithms/lm,algorithms/odr}
shared/tfjs/               → fitting/{types,algorithms/odr/types}
```

---

## 四、迁移日志

每次目录 / 依赖重构的细节都记录在 `backup/archive/MIGRATION_LOG.md`。