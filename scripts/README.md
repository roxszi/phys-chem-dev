# scripts — 项目脚本

项目全部辅助脚本。Node 运行：`pnpm exec tsx --tsconfig tsconfig.base.json <脚本路径>`（tsx 解析 `@shared` 别名需 `--tsconfig` 指向含 paths 的配置）。

---

## 目录结构

```
scripts/
├── distFrontendGzip.ts    前端构建产物 gzip 压缩（vitepress build 后处理，
│                          由 package.json 的 build:frontend:gzip:* 命令调用）
└── fitting/               fitting 数值防线（脚本 + 基线同目录，相对引用不受移动影响）
    ├── verify-fitting.ts          回归主防线：8 用例固定输出对比基线
    ├── verify-trust-region.ts     策略防线：Nielsen / classic 双阻尼策略交叉收敛验证
    └── baseline-fitting.json      数值基线（8 用例的 params / sse / r² / covariance /
                                   xCorrected 快照）
```

---

## fitting 回归防线用法

```bash
pnpm verify:fitting              # 与基线对比（默认，改 fitting 代码后必跑）
pnpm verify:fitting --save       # 生成/覆盖基线（仅换计算路线并核对数值后使用）
pnpm exec tsx --tsconfig tsconfig.base.json scripts/fitting/verify-trust-region.ts
```

约定：

- **等价重构批次**：要求与基线 bit 级一致，任何漂移即中断交付
- **换计算路线批次**：容差 1e-10 内放行；放行前须先核对偏差全部来自预期中的表示形式 / 求和顺序差异，再 `--save` 重生成
- 基线中的随机扰动来自固定种子的线性同余伪随机（`seededNoise`），跨机器、跨时间完全可复现，不用 `Math.random`

## 8 用例覆盖

| 用例 | 覆盖点 |
|---|---|
| lm-basic | LM 等权（指数模型，跨尺度参数） |
| lm-weighted | LM 加权（sigmaY → weights 路径） |
| lls-weighted | 线性最小二乘（Beer-Lambert 形态） |
| lls-two-points | LLS n=2（dof=0 → covariance/stdErr 全 NaN 教学口径） |
| odr-linear | ODR（sigmaX 非零，线性模型，York 退化对照） |
| odr-degenerate | ODR sigmaX 全 0（应退化为加权 LM） |
| fit-equation | fitEquation + 蔗糖水解全链路（含 t=0/t=∞ 锚点踢除） |
| fit-equation-anchor-both | 锚点双边消费路径（α₀ 与 α∞ 同时给出） |
