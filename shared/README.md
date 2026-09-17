# shared — 前后端共用代码

phys-chem 的核心业务代码全部在此，前端（VitePress / Vue）与后端（Hono / tsx）共同消费。语言：TypeScript（ESM，`import` 带 `.ts` 后缀）。

---

## 模块总览

| 模块 | 职责 | 入口 |
|---|---|---|
| `equation/` | 公式实体层：Equation schema（参数元信息 + preprocess 前处理 + model 模型函数）+ `fitEquation` 一键拟合入口 | `equation/index.ts` |
| `fitting/` | 拟合算法层：LM / ODR / LLS 三个算法及全套可替换子模块 | `fitting/index.ts` |
| `math/` | 数学原语层：自研矩阵 / 向量 + 数组操作 + 基础统计 + 数值校验 | `math/index.ts` |

**依赖方向（单向，禁止反向）**：`equation → fitting → math`。外部运行时依赖仅剩 Node 内置模块与前端框架（ml-matrix 已移除，矩阵运算全部由自研 `math/matrix` 承担）。

---

## 导入规范

- 跨模块：一律 `from "@shared/<模块>/index.ts"`（别名 + `.ts` 后缀 + index.ts 唯一入口）
- 模块内部子目录之间：相对路径
- `types.ts` 是模块内部契约文件，仅向同级 `index.ts` 导出，外部不得直接 import

---

## equation/ — 公式实体层

| 文件 | 职责 |
|---|---|
| `types.ts` | Equation schema：`defineEquation` 工厂、`PreprocessResult`（含锚点观测踢除路径）、`tfModel`（tfjs 计算图模型挂载点） |
| `sucrose-hydrolysis.ts` | 蔗糖水解动力学公式（一级反应 + Guggenheim 变体；t=0 → α₀、t=∞ → α∞ 作为参数锚定观测消费） |
| `index.ts` | 类型与公式导出 + `fitEquation(equation, xData, yData, options?)` 一键拟合（内部合流固定参数后调 LM / ODR） |

`fitEquation` 是业务侧的推荐入口：公式作者只写 preprocess + model，拟合算法、雅可比、统计全部由 fitting 层接管。

---

## fitting/ — 拟合算法层

```
fitting/
├── types.ts            数据契约：DataArray（= Matrix，行主序设计矩阵）/ ModelFunction /
│                       ParamValues / IterationState / FitResult 等
├── index.ts            统一导出（外部唯一入口）
├── algorithms/         三个算法，一方法一 ts 文件 + 同名 md 原理文档
│   ├── levenberg-marquardt.ts      LM：非线性最小二乘主力（+ .md）
│   ├── orthogonal-distance-regression.ts   ODR：x/y 误差同拟（+ .md）
│   └── linear-least-squares.ts     LLS：一元线性闭式解（+ .md）
├── pre/                前置处理：validateInputs 校验、sigmaToWeights、data-shape 数据形态变换
├── jacobian/           数值雅可比：参数方向（LM）+ 参数/自变量双向（ODR），中心差分批量化
├── trust-region/       阻尼策略：Nielsen 1999（默认）/ classic 三段式 + 增益比 ρ + 预测下降量
├── linear-solver/      正规方程构建（加权 gram）+ 求解器：LU（默认，奇异→null 契约）/ Cholesky
└── post/               后置处理：收敛判据（三判据 OR）+ 统计拼装（协方差 / 参数标准误 / R²）
```

设计要点：

- **算法可替换（依赖注入）**：雅可比 / 线性求解器 / 阻尼策略 / 收敛判据都是接口 + 工厂函数，options 里可注入自定义实现；默认组合开箱即用
- **参数两分语义**：`initialParams` 全参数字典（含固定参数）+ `paramNames` 自由参数子集；固定参数不参与迭代但透传给模型函数
- **对象式传参**：LM / ODR 收单一 input 对象（数据五字段 + options 嵌套），LLS 仅 3 字段直接拍平
- **λ 由主循环持有**，阻尼策略只做 `init()` + `judge(rho, lambda)` 纯决策
- 拟合专属矩阵操作（协方差组装、加权正规方程、阻尼施加）作为业务工具函数写在 `post/` 与 `linear-solver/` 的具体文件底部，不进 `math/`

---

## math/ — 数学原语层

| 文件 / 目录 | 职责 |
|---|---|
| `matrix/` | 自研矩阵库：`Matrix = { data: Float64Array, rows, cols }` 行主序；构造 / 算术 / LU / Cholesky / 向量子文件；奇异判定容差 1e-14 全项目唯一 |
| `array.ts` | 数组操作（排序等基础方法，返回深拷贝新数组） |
| `statistics.ts` | 基础统计（求和 / 均值 / 方差等，只读遍历） |
| `validate.ts` | 数值校验（正有限 / 非负有限等断言，统一报错格式） |

分层原则：`math/` 只放业务无关的基础操作；拟合专属的矩阵运算写在 fitting 层文件底部，不下沉。

---

## 相关防线与文档

- 回归防线：`pnpm verify:fitting`（8 用例基线对比，脚本与基线在 `scripts/fitting/`）
- 策略防线：`scripts/fitting/verify-trust-region.ts`（双阻尼策略交叉收敛验证）
- 算法原理文档：`fitting/algorithms/*.md`（与算法 ts 同名，md 讲数学原理，ts 顶部注释讲实现步骤）
- 历史参考：`backup/ml-matrix.md`（自研矩阵落地前的 ml-matrix 库手册，仅供追溯）
