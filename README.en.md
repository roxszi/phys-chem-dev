# Physical Chemistry Learning Helper (物化助手)

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmYwIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNIDEyIDRMNCAxMkwxMiA0IiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/roxszi/phys-chem-dev)

## [**简体中文**](./README.md) | **English**

> 📦 Source code: [GitHub](https://github.com/roxszi/phys-chem-dev) · [AtomGit (China)](https://atomgit.com/roxszi/phys-chem-dev) · [GitCode (China)](https://gitcode.com/roxszi/phys-chem-dev)
>
> 🌐 Live site (CN): [https://www.yaodasci.com](https://www.yaodasci.com/)
>
> 🌐 Live site (EN): [https://roxszi.github.io/phys-chem/en/](https://roxszi.github.io/phys-chem/en/)

---

## 📖 Introduction

**Physical Chemistry Learning Helper** (物化助手) is a WebApp tool-suite for **physical chemistry theory & experimental teaching**, built on [VitePress](https://vitepress.dev/). It combines **statistical machine learning, computer vision, and deep learning** to merge two traditionally separate phases — *data collection* and *data processing* — so that students can **evaluate data quality on the spot during a lab session**, spot outliers, and re-measure weak points immediately. Problems are surfaced in the lab, not after the report is written.

### ✨ Highlights

- 🔒 **Privacy first** — all computation (fitting / CV / ML) runs locally in the browser/mobile device. **No data is ever uploaded to a server.** No backend dependency, no backdoor.
- ⚡ **Hardware acceleration** — TensorFlow.js WebGPU/WebGL backends + OpenCV.js WASM SIMD + multithreaded builds; runs on CPU, iGPU, or mobile NPU.
- 📱 **Cross-platform** — works out-of-the-box on desktop and mobile browsers; no app installation required.
- 🎨 **Modern UI** — built on [TDesign vue-next](https://tdesign.tencent.com/vue-next/overview) plus a thin layer of in-house base components.
- 🌍 **Bilingual** — native i18n; Chinese and English sites are built and deployed independently.
- 📦 **Zero-server deploy** — fully static SSG; the built artifacts can be dropped onto any static-pages service.

### 🎯 Core Features

| Module | Description | Status |
|---|---|---|
| Sucrose Hydrolysis Kinetics Assistant | Real-time first-order-reaction fitting of αₜ vs. t with outlier add/remove | ✅ Done |
| Contact Angle — Vertical Calibration | Calibrate device verticality using mobile gravity/orientation sensors | ✅ Done |
| Contact Angle — Drop Image Processing | OpenCV.js edge detection + ellipse fitting + in-house iterative filter + base/center/edge masks | ✅ Done |
| Contact Angle — Multi-image Batch (`ContactAngleMulti`) | Process multiple droplet photos in one run | ✅ Done |
| Outline-Colorimetric Method | CV-based chemical kinetics colorimetry: sample contour detection, area/center computation, R/G/B mean and std-dev export | ✅ Done |
| Andor Raman Data Pipeline | `.sif` → `.asc` → `.xlsx` one-click batch conversion | ✅ Done |
| Non-linear Fitting Algorithms | LM, ODR, weighted linear least squares; interfaces are extensible | ✅ Done |
| Equation Models | Schema-wrapped physical-chemistry equations + `fitEquation` one-shot entry point | ✅ Done |
| Hono Backend Skeleton | Hono runtime placeholder (no business logic yet) | 🚧 Placeholder |
| ML Utilities | e.g. S-G interpolation/smoothing — gaps Origin doesn't fill | 📝 Placeholder |
| Deep Learning Demo | TensorFlow.js demos | 📝 Placeholder |

---

## 🛠️ Tech Stack

### Frontend

| Layer | Choice |
|---|---|
| Static site generator | [VitePress 2.0 (alpha)](https://vitepress.dev/) — `2.0.0-alpha.19`, SSG + Vue runtime dual-layer |
| View framework | [Vue 3.5+](https://vuejs.org/) — `<script setup>` + Composition API |
| UI library | [TDesign vue-next](https://tdesign.tencent.com/vue-next/overview) — auto-imported on demand |
| In-house base components | `frontend/components/My*.vue` — `MyBadge` / `MyButton` / `MyDrawer` / `MyFeatures` / `MyNoticeBar` / `MyPicHead` / `Radio` / `MySlider` / `MySymbolLineChart` / `MyTable` / `MyTeamMembers` / `MyUpload` |
| Utility kit | [VueUse](https://vueuse.org/) + in-house `frontend/utils/myPlugin.ts` (`myLoading` / `myDialog` / `myMessage` / `myError` / `myWait`) |
| Auto-import | [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import) + [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components) |
| Path resolution | [vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths) — reuses `tsconfig.paths` |

### In-browser Compute Engines

| Layer | Choice | Use |
|---|---|---|
| Deep learning | [TensorFlow.js 4.22](https://www.tensorflow.org/js) + `tfjs-backend-webgpu` + `tfjs-backend-webgl` + `tfjs-backend-cpu` | Three backends loaded with priority `webgpu > webgl > cpu`; module-level singleton |
| Computer vision | [OpenCV.js 5.0 (`@techstark/opencv-js`)](https://docs.opencv.org/5.0/js_tutorials/js_tutorials.html) | WASM multi-variant builds (`fallback` / `simd` / `simd.pthreads`), automatic fallback |
| Math formulas | [markdown-it-mathjax3](https://github.com/oclero/markdown-it-mathjax3) | Math typesetting in VitePress |
| Charts | [ECharts 6](https://echarts.apache.org/) + [vue-echarts 8](https://github.com/echarts/vue-echarts) | Data visualization |
| Spreadsheets | [SheetJS xlsx](https://docs.sheetjs.com/) | `.xlsx` export |

### Shared Pure-TS Library (newest addition)

`shared/` is a **cross-runtime pure-TypeScript numerical / algorithm library** that the Vue frontend and the Node backend both import directly:

| Tier | Directory | Responsibility |
|---|---|---|
| **Tier 0** | `shared/matrix/` | Pure linear algebra (`Matrix` type, `inverse`, `LinearSolver`, `covariance`), zero deps |
| **Tier 0** | `shared/math/` | Generic numeric stats (`mean` / `rSquared` / `rmse` / `sigma²` / `finite-difference`) |
| **Tier 1** | `shared/fitting/` | Fitting algorithms + shared infrastructure (`JacobianProvider` / `ConvergenceCheck` / `DampingStrategy` / `LinearSolver` are all swappable interfaces) |
| └ | `fitting/algorithms/linear/` | Weighted linear least squares (closed-form) |
| └ | `fitting/algorithms/lm/` | Levenberg-Marquardt non-linear least squares |
| └ | `fitting/algorithms/odr/` | Orthogonal distance regression (errors in both x and y; degenerates to LM when σx → 0) |
| **Tier 2** | `shared/equation/` | Physical-chemistry equation models — schema + `defineEquationModel` factory + `fitEquation` one-shot fit |
| └ | `equation/sucrose-hydrolysis.ts` | First-order sucrose hydrolysis kinetics model (with α₀ / α∞ / k three-parameter initialization heuristics) |
| **Tier 3** | `shared/tfjs/` | tfjs integration placeholder (backend loading + tfjs Jacobian interface) |

**Dependency direction** (one-way): `matrix/ → math/ → fitting/ → equation/ → tfjs/`. See [`shared/README.md`](./shared/README.md) for details.

### Backend

| Layer | Choice |
|---|---|
| Web framework | [Hono 4](https://hono.dev/) |
| Runtime | [Node.js 24+](https://nodejs.org/) + [`@hono/node-server`](https://github.com/honojs/node-server) |
| Database | Not introduced yet (currently only a `Hello Hono!` route placeholder; will be picked per business need) |

> 📌 The Prisma mention in earlier README revisions was a historical plan; it has been replaced by the pure-TS `shared/` fitting library, and is **not** in the current dependencies.

---

## 📁 Project Layout

```
phys-chem/
├── frontend/                          # Frontend (VitePress 2.0 + Vue 3.5)
│   ├── .vitepress/
│   │   ├── project-info/              # Decoupled project meta (footer / nav / sidebar / social / i18n)
│   │   ├── theme/                     # VitePress theme styles (bridge.css / tdesign-theme.css)
│   │   ├── layouts/                   # Custom BaseLayout
│   │   └── config.ts                  # VitePress engineering config
│   ├── components/                    # In-house base components (MyBadge / MyButton / MyTable ...)
│   ├── composables/                   # Logic layer
│   │   ├── useLang.ts                 # i18n switch
│   │   ├── useTFjs.ts                 # tfjs backend loader (webgpu > webgl > cpu, state machine)
│   │   └── useOpenCV.ts               # OpenCV WASM multi-variant loader + auto fallback
│   ├── index/                         # Site pages (Markdown + Vue islands)
│   │   ├── about/                     # About
│   │   ├── chemometrics/              # Chemometrics
│   │   │   └── andor-raman/           # Andor Raman .sif → .xlsx
│   │   ├── experiment/                # Experiments
│   │   │   ├── sucrose-hydrolysis/    # First-order sucrose hydrolysis
│   │   │   ├── contact-angle/         # Contact angle (ContactAngle + ContactAngleMulti)
│   │   │   │   ├── vertical-calibration/
│   │   │   │   └── drop-pic-process/
│   │   │   └── outline-colorimetric/  # Outline-colorimetric method
│   │   ├── i18n/en/                   # English site pages
│   │   ├── test/                      # Internal test page
│   │   └── index.md                   # Home
│   ├── public/
│   │   ├── LICENSES/                  # Third-party license texts
│   │   ├── assets/                    # Static assets (incl. Andor `.pgm` script)
│   │   └── opencv/                    # OpenCV.js WASM multi-variant build artifacts
│   └── utils/
│       ├── myPlugin.ts                # In-house TDesign plugin (Loading / Dialog / Message)
│       ├── xlsx.ts                    # SheetJS wrapper
│       ├── file.ts                    # File utilities
│       └── opencv/                    # Backup OpenCV builds (min / all × fallback / simd / simd.pthreads)
│
├── backend/                           # Backend (Hono)
│   └── index.ts                       # Placeholder: Hello Hono! route (port 3000)
│
├── shared/                            # Cross-runtime pure-TS library (see "Tech Stack")
│   ├── matrix/                        # Tier 0: pure linear algebra
│   ├── math/                          # Tier 0: generic numeric stats
│   ├── fitting/                       # Tier 1: fitting algorithms (linear / lm / odr)
│   ├── equation/                      # Tier 2: equation models (incl. sucrose hydrolysis)
│   ├── tfjs/                          # Tier 3: tfjs integration (placeholder)
│   ├── format.ts                      # Formatting utilities
│   ├── constants.ts                   # Shared constants
│   ├── distFrontendGzip.ts            # Build-output `.gz` incremental compression script
│   └── README.md                      # Detailed `shared/` docs
│
├── backup/                            # Archived historical files
├── .vitepress/cache/                  # VitePress build cache
├── dist-frontend-root/                # Build output (root variant — for apex-domain deploy)
├── dist-frontend-subpage/             # Build output (subpage variant — for Pages sub-path deploy)
│
├── .npmrc                             # pnpm / npm config (incl. better-sqlite3 mirror etc.)
├── .gitignore
├── pnpm-workspace.yaml                # pnpm workspace config (incl. `allowBuilds`)
├── tsconfig.json                      # Root tsconfig
├── tsconfig.base.json                 # Shared compile options
├── tsconfig.frontend.json             # Frontend tsconfig
├── tsconfig.backend.json              # Backend tsconfig
├── globals.d.ts
├── package.json                       # Root package.json (scripts, deps)
├── pnpm-lock.yaml
└── license                            # MulanPSL-2.0 license text
```

### Naming Conventions

| Category | Convention |
|---|---|
| Files / folders | kebab-case primary; PascalCase for special cases (e.g. `MyXxx.vue`) |
| Variables / functions / methods | camelCase |
| Components | PascalCase (`MyButton.vue`) |
| Types | PascalCase, no prefix |
| Constants | UPPER_SNAKE_CASE |

---

## 🚀 Quick Start

### Requirements

- **Node.js** ≥ 24.0.0 (`engines.node` in `package.json`)
- **pnpm** ≥ 11.0.0 (`engines.pnpm` in `package.json`; tested with 11.7+)

### Install

```bash
git clone https://github.com/roxszi/phys-chem-dev.git
# For China mainland access you may also use:
# git clone https://gitcode.com/roxszi/phys-chem-dev.git
cd phys-chem-dev
pnpm install
```

### Develop

```bash
# Start the VitePress dev server (default port 5173 — override with `vitepress dev --port <n>`)
pnpm dev

# Start the Hono backend dev server (port 3000)
pnpm dev:backend
```

### Build

```bash
# === Frontend build ===
# Chinese site (root variant — for apex-domain deploy, e.g. https://www.yaodasci.com/)
pnpm build:frontend:root

# English site (subpage variant — for Pages sub-path deploy, e.g. https://roxszi.github.io/phys-chem/)
pnpm build:frontend:subpage

# Build both root + subpage
pnpm build

# Incremental .gz compression of the built output (recommended for production)
pnpm build:frontend:gzip

# === Backend build ===
pnpm build:backend          # tsc → dist/
pnpm start:backend          # node dist/index.js
```

### Scripts Cheat Sheet

| Command | Purpose |
|---|---|
| `pnpm dev` | Start VitePress dev server |
| `pnpm dev:backend` | Start Hono dev server (`tsx watch`) |
| `pnpm build` | Build frontend root + subpage variants |
| `pnpm build:frontend` | Same as above |
| `pnpm build:frontend:root` | Build only the Chinese root variant → `dist-frontend-root/` |
| `pnpm build:frontend:subpage` | Build only the English subpage variant → `dist-frontend-subpage/` |
| `pnpm build:frontend:gzip` | Incrementally compress both root + subpage to `.gz` |
| `pnpm build:frontend:gzip:root` | Compress only the root variant |
| `pnpm build:frontend:gzip:subpage` | Compress only the subpage variant |
| `pnpm preview:frontend` | VitePress preview (preview built artifacts) |
| `pnpm build:backend` | Backend tsc compile to `dist/` |
| `pnpm start:backend` | Run the compiled backend |

> 💡 Compression note: `shared/distFrontendGzip.ts` compresses `.js` / `.css` / `.wasm` / `.html` artifacts to `level 9` incrementally — an existing `.gz` newer than its source is skipped — so Nginx `gzip_static` can hit them directly.

---

## 📚 Documentation

- [`shared/README.md`](./shared/README.md) — Detailed cross-runtime fitting library docs (three-tier dependency graph, swappable interfaces, algorithm matrix)
- [`shared/fitting/algorithms/odr/README.md`](./shared/fitting/algorithms/odr/README.md) — ODR algorithm deep dive (math derivations and degeneracy properties)
- [`shared/fitting/algorithms/linear/README.md`](./shared/fitting/algorithms/linear/README.md) — Weighted linear least squares (incl. teaching note on `stdErr = NaN` when n = 2)
- [`frontend/components/`](./frontend/components) — In-house base components
- [`frontend/composables/`](./frontend/composables) — `useTFjs` / `useOpenCV` browser engine loaders

---

## 📄 License

This project is licensed under the [Mulan Permissive Software License, Version 2 (MulanPSL-2.0)](https://license.coscl.org.cn/MulanPSL2).

Copyright © [SI Cheng-Yun (司承运)](https://github.com/roxszi) @ China Pharmaceutical University, Faculty of Science, Chemistry Experiment Center.

---

## 🙏 Acknowledgements

Thanks to the following open-source projects (full license texts under [`frontend/public/LICENSES/`](./frontend/public/LICENSES/)):

| Project | Use |
|---|---|
| [VitePress](https://vitepress.dev/) | Static site generation |
| [Vue.js](https://vuejs.org/) | View framework |
| [TDesign](https://tdesign.tencent.com/) | UI component library |
| [VueUse](https://vueuse.org/) | Vue composition utilities |
| [TensorFlow.js](https://www.tensorflow.org/js) | In-browser deep learning |
| [OpenCV.js](https://opencv.org/) | In-browser computer vision |
| [ECharts](https://echarts.apache.org/) + [vue-echarts](https://github.com/echarts/vue-echarts) | Charting |
| [markdown-it-mathjax3](https://github.com/oclero/markdown-it-mathjax3) | Markdown math typesetting |
| [SheetJS](https://docs.sheetjs.com/) | `.xlsx` spreadsheet handling |
| [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import) + [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components) | Vite plugins |
| [vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths) | Path resolution |
| [Hono](https://hono.dev/) + [`@hono/node-server`](https://github.com/honojs/node-server) | Backend framework (placeholder business) |

---

## 📮 Contact

- Open an [Issue](https://github.com/roxszi/phys-chem-dev/issues) (or on [AtomGit](https://atomgit.com/roxszi/phys-chem-dev/issues) for China)
- Email: [sichengyun@163.com](mailto:sichengyun@163.com)

---

**⭐ If this project helps you, please give us a Star!**