# base 模块

> 整个项目跨业务共享的最基础工具。**纯数学/通用工具，不含任何业务概念**。

## 设计原则

**"base 层只放真正整个项目都会用的东西"**——不是"理论上通用"，而是"现实中已经被多个业务消费，或明确预期会被多个业务消费"。

判断标准：

| 是 base | 不是 base |
|---|---|
| 矩阵求逆（kinetics 解 ODE、fitting 解正规方程都会用） | 雅可比计算（目前只 fitting 用，接口含拟合概念） |
| 线性方程组求解（任何数值计算都会用） | 残差/SSE（拟合专属） |
| 数组校验工具（任何业务都要校验输入） | 收敛判据（和拟合的 IterationState 耦合） |

如果未来 kinetics 或其他业务开始需要雅可比、收敛判据等，再从 fitting 上提到 base。**不要预先创建"可能有用"的抽象**（YAGNI）。

## 当前内容

```
base/
├── README.md              ← 你在这里
├── index.ts               公共 API
│
├── linalg/                线性代数
│   ├── matrix.ts          矩阵运算（求逆、标量乘、对角操作）
│   ├── solver/            线性方程组求解
│   │   ├── types.ts       LinearSolver 接口
│   │   ├── gaussian-elimination.ts
│   │   └── index.ts
│   └── index.ts
│
└── validate/              通用输入校验
    ├── arrays.ts          数组校验工具（长度、有限性、同长度等）
    └── index.ts
```

## 使用示例

```typescript
import { invertMatrix, createGaussianEliminationSolver } from '@/base'

const A = [[1, 2], [3, 4]]
const A_inv = invertMatrix(A)

const solver = createGaussianEliminationSolver()
const x = solver.solve(A, [5, 6])
```

## 扩展原则

添加新模块到 base 之前，先问自己：

1. **是否能被多个业务消费**？kinetics / fitting / 未来其他业务——至少 2 个
2. **是否真的不含业务概念**？接口里不应该出现 `params`、`residuals`、`FitResult` 等业务术语
3. **是否依赖其他业务模块**？base 不应该 import fitting 或 kinetics 的任何东西

三个问题都"是"才提到 base。否则留在业务层。
