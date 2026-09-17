# ml-matrix 库手册

> 事实源：`node_modules/ml-matrix/matrix.d.ts`（6.15.0 实装类型定义，逐段核对）+ 官网 <https://mljs.github.io/matrix/> + `src/` 源码。
> 版本：**6.15.0**（2026-09-03 核实，`pnpm view ml-matrix version`；dist-tags：latest=6.15.0，future=3.0.0-0）。
> 定位：通用的 ml-matrix 库学习手册与 API 参考，不含任何项目专属内容。

## 1. 库定位

- 维护方：Zakodium（mljs 生态），MIT 协议，npm 包名 `ml-matrix`。
- 定位：稠密小中型矩阵的通用线性代数库——构造、算术、规约统计、五种分解（LU / QR / Cholesky / EVD / SVD）、求逆、最小二乘求解。
- 安装：`pnpm add ml-matrix`。ESM 与 CJS 双入口（`exports` 指向 `matrix.mjs` / `matrix.js`），类型 `matrix.d.ts`，`sideEffects: false`。
- 运行时依赖仅 2 个轻量包（`is-any-array`、`ml-array-rescale`），体积小。
- 不含的功能：稀疏矩阵（另装 `ml-sparse-matrix`）、分布式 / GPU、符号运算。

## 2. 核心数据模型

ml-matrix 的一切围绕 `Matrix` 类（继承自 `AbstractMatrix`）：

- 内部按行优先存储一维 `number[]`，不是 `number[][]`。
- 读写单元素用 `get(i, j)` / `set(i, j, v)`，不是 `m[i][j]`。
- 与 `number[][]` 互转：
  - 二维数组 → Matrix：`new Matrix(data)`（构造函数接受 `ArrayLike<ArrayLike<number>>`）或 `wrap(data)`（零拷贝视图，见 §4）。
  - Matrix → 二维数组：`m.to2DArray()`（深拷贝）；→ 一维数组：`m.to1DArray()`（按行展开）。
- 静态方法普遍接受原始二维数组：`MaybeMatrix = AbstractMatrix | ArrayLike<ArrayLike<number>>`，多数场景无需手动 `new Matrix()`。
- 导入：`import { Matrix, inverse, solve, LuDecomposition, ... } from "ml-matrix"`。

**可变性语义**（最重要的约定）：

| 形式 | 例子 | 返回 |
| --- | --- | --- |
| 静态方法 | `Matrix.add(A, B)`、`Matrix.mul(A, 10)` | 新 Matrix，A、B 不变 |
| 实例方法（非原地） | `A.mmul(B)`、`A.transpose()`、`A.clone()` | 新 Matrix，A 不变 |
| 实例方法（原地 inplace） | `A.add(B)`、`A.mul(10)`、`A.abs()` | `this`，A 被修改 |

同名方法静态 / 实例双形态：静态返回新矩阵，实例是原地操作。读代码、写代码时先分清是哪一种。

**两种使用风格**：

- 原生风格（推荐）：数据在模块边界转一次成 Matrix，链路内全程 Matrix，最后 `to2DArray()` / `to1DArray()` 出去。无重复转换开销，API 最全。
- 适配层风格：包装函数保持 `number[][]` 进出（`new Matrix(d2)` 进、`to2DArray()` 出），让既有代码不改类型。每次调用有 O(n²) 拷贝开销，小矩阵（n < 1000）可忽略；高频调用链路应改原生风格。

## 3. 构造与转换

| API | 说明 |
| --- | --- |
| `new Matrix(rows, cols)` | 指定尺寸，全 0 |
| `new Matrix(data2D)` | 从二维数组构造（拷贝） |
| `new Matrix(otherMatrix)` | 从另一 Matrix 拷贝构造 |
| `Matrix.zeros(r, c)` / `Matrix.ones(r, c)` | 全 0 / 全 1 |
| `Matrix.eye(r, c?, v?)` | 单位阵；`c` 缺省 = `r`；对角值 `v` 缺省 1。别名 `Matrix.identity` |
| `Matrix.diag(data, r?, c?)` | 由向量构造对角阵。别名 `Matrix.diagonal`。注意与实例方法 `m.diag()`（取对角向量）是两回事 |
| `Matrix.rowVector(arr)` / `Matrix.columnVector(arr)` | 1×n 行向量 / n×1 列向量 |
| `Matrix.from1DArray(r, c, data1D)` | 一维数组按行填充成 r×c |
| `Matrix.rand(r, c, opts?)` / `Matrix.randInt(r, c, opts?)` | 随机矩阵（`{ random }` 可注入随机源；randInt 有 `{ min, max }`） |
| `wrap(data1D, { columns?, rows? })` | 零拷贝包装一维数组（`WrapperMatrix1D`） |
| `wrap(data2D)` | 零拷贝包装二维数组（`WrapperMatrix2D`）——只读场景用它免拷贝 |
| `Matrix.checkMatrix(v)` | 是 Matrix 则原样返回，否则包装成 Matrix |
| `Matrix.isMatrix(v)` | 类型守卫 |
| `Matrix.copy(from, to)` | 把 from 的数据拷进 to |
| `m.clone()` | 独立深拷贝 |
| `m.to1DArray()` / `m.to2DArray()` / `m.toJSON()` | 导出数据（前两个是拷贝） |

## 4. 元素访问、维度与迭代

- 尺寸：`m.rows` / `m.columns` / `m.size`（元素总数）。
- 单元素：`m.get(i, j)` / `m.set(i, j, v)`。
- 类型判断：`isRowVector()` / `isColumnVector()` / `isVector()` / `isSquare()` / `isSymmetric()` / `isEmpty()` / `isDistance()`。
- 行列向量存取：`getRow(i)` / `setRow(i, arr)` / `getRowVector(i)` / `swapRows(i, k)`；列同理 `getColumn` / `setColumn` / `getColumnVector` / `swapColumns`。
- 对角：`m.diag()` 返回 `number[]`。
- 迭代：`for (const [i, j, v] of m)`（即 `m.entries()`）；`m.values()` 只给值。
- 打印：`m.toString({ maxRows? = 15, maxColumns? = 10, maxNumSize? = 8, padMinus? = 'auto' })`。

## 5. 算术运算与逐元素函数

二元运算家族（静态 = 新矩阵，实例 = 原地）：`add`、`sub`（别名 `subtract`）、`mul`（别名 `multiply`）、`div`（别名 `divide`）、`mod`（别名 `modulus`），以及位运算 `and / or / xor / leftShift / rightShift / signPropagatingRightShift / zeroFillRightShift`。

- 第二参数既可标量也可矩阵：`Matrix.mul(A, 10)` 数乘；`Matrix.add(A, B)` 逐元素加。
- 逐元素比较：`Matrix.min(A, B)` / `Matrix.max(A, B)` 返回逐元素较小 / 较大矩阵。
- 逐元素一元函数（静态 / 原地双形态，约定同上）：`abs acos acosh asin asinh atan atanh cbrt ceil clz32 cos cosh exp expm1 floor fround log log1p log10 log2 round sign sin sinh sqrt tan tanh trunc`，另有 `not` / `pow(value)`。
- 一元标量：`m.neg()`（原地取负，别名 `negate`）、`m.fill(v)`。

## 6. 矩阵乘法家族

| API | 计算 | 备注 |
| --- | --- | --- |
| `m.mmul(other)` | m × other | `other` 可直接传二维数组 |
| `m.transposeMultiply(other)` | mᵀ × other | 不物化转置，行共享场景更快 |
| `m.gram()` | mᵀ × m | Gram 矩阵，只算上三角再镜像，约 2 倍速 |
| `m.mmulByTranspose(scale?)` | m × mᵀ（可加权 m·diag(scale)·mᵀ） | |
| `m.mpow(k)` | 方阵 k 次幂 | k 为非负整数 |
| `m.dot(v)` | 逐元素点积标量（同尺寸） | |
| `m.mmulStrassen(y)` | Strassen 分块乘法 | 2×2 / 3×3 有专用路径 |

常用组合：矩阵 × 向量 = `M.mmul(Matrix.columnVector(v)).to1DArray()`（列向量右乘）；`JᵀJ` = `J.gram()` 或 `J.transpose().mmul(J)`。

## 7. 规约与统计

- 全局规约（返回标量）：`sum()` `product()` `mean()` `variance(opts?)` `standardDeviation(opts?)` `trace()` `norm('frobenius' | 'max')`。
- 按维度规约：传 `'row'` 或 `'column'` 返回 `number[]`，如 `m.sum('row')`（逐行求和）、`m.mean('column')`（逐列均值）。
- 极值：`max()` / `min()`；带 `'row' | 'column'` 得逐行 / 逐列极值数组；`maxIndex()` / `minIndex()` 返回 `[row, col]`；单行 / 单列版本 `maxRow(i)`、`minColumnIndex(j)` 等。
- `variance` / `standardDeviation` 选项：`{ unbiased?: boolean, mean?: number | number[] }`。
- 预处理（原地）：`m.center()`（减均值）、`m.scale()`（除标准差），均支持 `('row' | 'column', opts)` 重载；非原地版本 `m.scaleRows({ min, max })` / `m.scaleColumns({ min, max })`（默认 0–1 归一化）。
- `m.cumulativeSum()`：原地行方向累积和。
- 沿轴自定义规约：`m.applyAlongAxis((row, idx) => ..., 'row' | 'column')`，回调收到普通 `number[]`。

## 8. 行列操作、子矩阵与拼接

- 行 / 列广播：`m.addRowVector(v)`（每行加向量 v）等 `add/sub/mul/div × Row/Column` 八个，原地。
- 单行 / 单列标量乘：`m.mulRow(i, s)` / `m.mulColumn(j, s)`。
- 子矩阵（返回新 Matrix）：`m.subMatrix(r0, r1, c0, c1)`（含端点）、`m.subMatrixRow(indices)`、`m.subMatrixColumn(indices)`、`m.selection(rowIdx, colIdx)`（索引可重复、有序）。
- 写入子块：`m.setSubMatrix(src, r0, c0)`（原地）。
- 删 / 增行列（仅 `Matrix` 类，原地）：`m.removeRow(i)` / `m.removeColumn(j)` / `m.addRow([arr])` / `m.addColumn([arr])`。
- 拼接：`m.concat(other, 'row' | 'column')`——`'row'` 纵向堆叠（列数相同），`'column'` 横向堆叠（行数相同），缺省 `'row'`。
- 重复 / 翻转 / 排序：`m.repeat({ rows, columns })`、`m.flipRows()` / `m.flipColumns()`（原地）、`m.sortRows(cmp)` / `m.sortColumns(cmp)`（原地）。
- 消元形态：`m.echelonForm()` / `m.reducedEchelonForm()`（高斯消元结果）与 `m.isEchelonForm()` / `m.isReducedEchelonForm()`。
- Kronecker：`m.kroneckerProduct(other)`（别名 `tensorProduct`）、`m.kroneckerSum(other)`。

## 9. 视图类与特殊矩阵

视图类（零拷贝，包装原矩阵引用，get/set 透传换算）：`MatrixRowView`、`MatrixColumnView`、`MatrixSubView`、`MatrixSelectionView`、`MatrixRowSelectionView`、`MatrixColumnSelectionView`、`MatrixTransposeView`、`MatrixFlipRowView`、`MatrixFlipColumnView`。适合"以另一种视角读 / 写同一份数据"且不想拷贝。

- `SymmetricMatrix`：对称阵，紧凑存储上三角，`toCompact()` / `fromCompact()`；对称增删行列 `addCross` / `removeCross`。
- `DistanceMatrix`：对角恒 0 的对称阵（紧凑存储不含对角）。

## 10. 分解

所有分解类构造时立即完成分解；构造参数直接传二维数组也可以（内部 `checkMatrix`）。

### LuDecomposition（别名 LU）

```ts
import { LuDecomposition } from "ml-matrix"
const lu = new LuDecomposition(A)
lu.isSingular()                  // true = 存在精确为 0 的主元
lu.solve(b)                      // 方阵线性方程组；奇异时 throw Error('LU matrix is singular')
lu.determinant                   // 行列式（getter）
lu.lowerTriangularMatrix         // L（单位下三角，对角恒 1）
lu.upperTriangularMatrix         // U（上三角；对角线 = 各步主元值）
lu.pivotPermutationVector        // 行交换置换向量
```

- 算法：部分主元 LU（列内选绝对值最大者做主元）。
- **`isSingular()` 是精确零判定**（主元 `=== 0`），无容差；病态但非精确奇异的矩阵会"成功"求解，结果数值误差可能很大（见 §12）。

### QrDecomposition（别名 QR）

```ts
const qr = new QrDecomposition(A)   // A 可为 m×n 矩形阵
qr.orthogonalMatrix                 // Q
qr.upperTriangularMatrix            // R
qr.isFullRank()
qr.solve(b)                         // 最小二乘 Ax≈b，要求 A 列满秩
```

### CholeskyDecomposition（别名 CHO）

```ts
const cho = new CholeskyDecomposition(A)  // 要求 A 对称，否则 throw
cho.isPositiveDefinite()                  // 是否正定
cho.lowerTriangularMatrix                 // L，A = L·Lᵀ（正定时才有效）
cho.solve(b)                              // 非正定时 throw
```

### EigenvalueDecomposition（别名 EVD）

```ts
const evd = new EigenvalueDecomposition(A, { assumeSymmetric?: boolean })
evd.realEigenvalues        // 特征值实部
evd.imaginaryEigenvalues   // 特征值虚部
evd.eigenvectorMatrix      // 特征向量矩阵（列 = 特征向量）
evd.diagonalMatrix
```

### SingularValueDecomposition（别名 SVD）——奇异 / 病态问题的万能路线

```ts
const svd = new SingularValueDecomposition(A, {
  computeLeftSingularVectors?: boolean,   // 缺省 true
  computeRightSingularVectors?: boolean,  // 缺省 true
  autoTranspose?: boolean,                // 缺省 false；行数 < 列数时建议开启提高精度
})
svd.diagonal             // 奇异值数组
svd.diagonalMatrix
svd.leftSingularVectors  // U
svd.rightSingularVectors // V
svd.rank                 // 数值秩
svd.condition            // 条件数 = σmax/σmin
svd.norm2                // 最大奇异值
svd.threshold            // 内部奇异值阈值
svd.inverse()            // SVD 近似逆（奇异 / 病态矩阵可用，不 throw）
svd.solve(b)             // 最小二乘（秩亏场景给最小范数解）
svd.solveForDiagonal(values)
```

### Nipals（别名 NIPALS）

NIPALS 算法（PLS 回归核心），构造 `new Nipals(X, { Y?, maxIterations? = 1000, terminationCriteria? = 1e-10 })`，暴露 `w / t / p / u / q / betas` 等载荷矩阵。光谱化学计量学场景备用。

## 11. 高层函数

| 函数 | 签名 | 行为 |
| --- | --- | --- |
| `inverse(A, useSVD = false)` | → Matrix | 方阵求逆。内部 = `solve(A, I)`：LU 路线，**奇异时 throw**；`useSVD = true` 给 SVD 近似逆（不 throw） |
| `solve(A, b, useSVD = false)` | → Matrix | 解 Ax=b。路由：方阵 → LU（奇异 throw）；矩形 → QR 最小二乘（要求列满秩）；`useSVD = true` → SVD（秩亏也出最小范数解） |
| `determinant(A)` | → number | 行列式 |
| `pseudoInverse(A, threshold = Number.EPSILON)` | → Matrix | SVD 伪逆；奇异值 < `threshold × max(rows, cols) × σmax` 视为 0 |
| `linearDependencies(A, opts?)` | → Matrix | 行间线性相关系数矩阵；某行为其余行的线性组合时，对应行给出组合系数（可诊断设计矩阵共线性）。选项 `{ thresholdValue? = 10e-10, thresholdError? = 10e-10 }` |
| `covariance(x, y?, { center? = true })` | → Matrix | **列间统计协方差矩阵**（按列中心化后计算） |
| `correlation(x, y?, { center? = true, scale? = true })` | → Matrix | 列间皮尔逊相关矩阵 |

注意：`covariance()` 是"数据列协方差"。拟合参数协方差 `Cov = σ²·M⁻¹` 这类需求要用 `inverse` / `pseudoInverse` 自行组装，两者不是一回事。

## 12. 奇异与病态：行为与选线

库的默认数值语义：

- LU 只拦**精确奇异**（主元 `=== 0` → `isSingular()` 为 true → `solve` / `inverse` throw）；**近奇异（病态）矩阵会正常求解，结果误差可能很大且无任何警告**。
- 病态检测工具：SVD 的 `svd.condition`（条件数）与 `svd.rank`（数值秩）；库无"自动容差判奇异"的开关。
- 兜底路线：`pseudoInverse(A)` / `inverse(A, true)` / `solve(A, b, true)` 永不 throw，给出最小范数 / 近似解。

选线速查：

| 场景 | 推荐路线 |
| --- | --- |
| 良态方阵 Ax=b | `new LuDecomposition(A).solve(b)`（一次分解多次右端项可复用） |
| 对称正定 Ax=b | Cholesky（更快更稳） |
| 矩形超定 Ax≈b（列满秩） | QR solve |
| 秩亏 / 奇异 / 病态 | SVD solve 或 `pseudoInverse` |
| 求逆前查稳定性 | `svd.condition` 检查后再决定 LU 还是 SVD |
| 精确判奇异 | `new LuDecomposition(A).isSingular()` |
| 需要容差判奇异 | 取 `lu.upperTriangularMatrix.diag()`（主元数组）自行设阈值检查 |

## 13. 使用注意（坑）

- 静态方法与实例方法同名不同义：`Matrix.mul(A, 2)` 返回新矩阵，`A.mul(2)` 原地修改。链式调用前确认可变性。
- `Matrix.diag(v)`（静态，构造对角阵）与 `m.diag()`（实例，取对角向量）是两个操作。
- `wrap()` 视图直接引用原数组：适合读；写操作会改原数据，且原数组重引用后视图同步变化。
- `subMatrix` 系列端点是**含**的（`subMatrix(0, 2, ...)` 取第 0~2 行）。
- `mmul` 维度不匹配会 throw（`'columns do not match'` 类错误），不静默。
- LU / QR / Cholesky 遇奇异 / 非正定**直接 throw**，不是返回 null——生产代码需 try/catch 或预检查。
- `variance` 的 `unbiased` 选项影响分母（n-1 或 n），统计口径要显式确认。
- `linearDependencies` 默认阈值 `10e-10`（即 1e-9），与常见的 `1e-10` 写法易混。
