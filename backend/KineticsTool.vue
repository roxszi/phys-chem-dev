<script setup lang="ts">
/**
 * 准二级吸附动力学拟合工具 — 主页面组件
 *
 * 功能：参数输入 → Excel 上传 → 计算拟合 → 结果展示
 */
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import {
  runFullCalculation,
  type ExperimentParams,
  type RawDataPoint,
  type FitResult,
  type CalculationResult,
} from '../utils/kinetics'

// ============================================================
// 实验参数（带默认值）
// ============================================================
const c0 = ref(100)   // 初始浓度 / (mg/L)
const V = ref(50)      // 溶液体积 / (mL)
const m = ref(0.1)     // 吸附剂干重 / (g)

// ============================================================
// 原始数据（用户上传 Excel 或手动输入）
// ============================================================
const rawPairs = ref<{ t: number; ct: number }[]>([])

// ============================================================
// 计算结果
// ============================================================
const result = ref<CalculationResult | null>(null)
const hasCalculated = ref(false)

// ============================================================
// 手动输入模式的数据
// ============================================================
const manualRows = ref<{ t: string; ct: string }[]>([
  { t: '', ct: '' },
  { t: '', ct: '' },
  { t: '', ct: '' },
  { t: '', ct: '' },
  { t: '', ct: '' },
])

/** 添加一行手动数据 */
function addManualRow(): void {
  manualRows.value.push({ t: '', ct: '' })
}

/** 删除一行手动数据 */
function removeManualRow(index: number): void {
  if (manualRows.value.length > 1) {
    manualRows.value.splice(index, 1)
  }
}

// ============================================================
// Excel 文件上传处理
// ============================================================

/**
 * 处理 Excel 文件上传
 * 期望格式：第一行为表头，后续行为数据，前两列分别为 t 和 ct
 */
function handleFileUpload(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e: ProgressEvent<FileReader>) => {
    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      // 读取为二维数组，跳过表头
      const rows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
      })

      // 跳过第一行（表头），解析数据
      const pairs: { t: number; ct: number }[] = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length < 2) continue
        const tVal = Number(row[0])
        const ctVal = Number(row[1])
        if (isNaN(tVal) || isNaN(ctVal)) continue
        pairs.push({ t: tVal, ct: ctVal })
      }

      rawPairs.value = pairs
      // 同步到手动输入区
      manualRows.value = pairs.map((p) => ({
        t: String(p.t),
        ct: String(p.ct),
      }))

      // 自动触发计算
      doCalculation()
    } catch (err) {
      alert('Excel 文件读取失败，请检查文件格式。\n' + String(err))
    }
  }
  reader.readAsArrayBuffer(file)
}

// ============================================================
// 计算触发
// ============================================================

/** 从手动输入区提取数据并计算 */
function doCalculation(): void {
  // 从手动输入区收集数据
  const pairs: { t: number; ct: number }[] = []
  for (const row of manualRows.value) {
    const tVal = parseFloat(row.t)
    const ctVal = parseFloat(row.ct)
    if (isNaN(tVal) || isNaN(ctVal)) continue
    pairs.push({ t: tVal, ct: ctVal })
  }

  if (pairs.length < 3) {
    result.value = {
      dataPoints: [],
      linear: null,
      nonlinear: null,
      warnings: ['有效数据点不足 3 个，请检查输入'],
    }
    hasCalculated.value = true
    return
  }

  const params: ExperimentParams = {
    c0: c0.value,
    V: V.value,
    m: m.value,
  }

  result.value = runFullCalculation(params, pairs)
  hasCalculated.value = true
}

// ============================================================
// 格式化工具函数
// ============================================================

/** 保留指定小数位 */
function fmt(value: number | undefined, digits = 4): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return value.toFixed(digits)
}

/** 科学计数法格式 */
function fmtSci(value: number | undefined, digits = 6): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return value.toExponential(digits)
}
</script>

<template>
  <div class="app-container">
    <h1>准二级吸附动力学拟合工具</h1>
    <p class="subtitle">Pseudo-Second-Order Adsorption Kinetics Fitting</p>

    <!-- ========== 参数输入区 ========== -->
    <section class="card">
      <h2>📐 实验参数</h2>
      <div class="params-grid">
        <label>
          初始浓度 c₀ (mg/L)
          <input v-model.number="c0" type="number" min="0" step="any" />
        </label>
        <label>
          溶液体积 V (mL)
          <input v-model.number="V" type="number" min="0" step="any" />
        </label>
        <label>
          吸附剂质量 m (g)
          <input v-model.number="m" type="number" min="0" step="any" />
        </label>
      </div>
    </section>

    <!-- ========== 数据输入区 ========== -->
    <section class="card">
      <h2>📊 数据输入</h2>

      <!-- Excel 上传 -->
      <div class="upload-area">
        <p>上传 Excel 文件（第一行为表头，前两列分别为 t 和 c<sub>t</sub>）：</p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          @change="handleFileUpload"
          class="file-input"
        />
      </div>

      <hr />

      <!-- 手动输入表格 -->
      <p>或手动输入数据：</p>
      <table class="input-table">
        <thead>
          <tr>
            <th>t / min</th>
            <th>c<sub>t</sub> / (mg/L)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in manualRows" :key="idx">
            <td>
              <input v-model="row.t" type="number" step="any" placeholder="时间" />
            </td>
            <td>
              <input v-model="row.ct" type="number" step="any" placeholder="浓度" />
            </td>
            <td>
              <button class="btn-sm btn-danger" @click="removeManualRow(idx)" :disabled="manualRows.length <= 1">
                ✕
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button class="btn-sm" @click="addManualRow">+ 添加数据行</button>

      <div class="calc-btn-area">
        <button class="btn-primary" @click="doCalculation">开始计算</button>
      </div>
    </section>

    <!-- ========== 警告信息 ========== -->
    <section v-if="result && result.warnings.length > 0" class="card card-warning">
      <h2>⚠️ 警告</h2>
      <ul>
        <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
      </ul>
    </section>

    <!-- ========== 原始数据表 ========== -->
    <section v-if="result && result.dataPoints.length > 0" class="card">
      <h2>📋 原始数据与吸附量</h2>
      <table class="result-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>t / min</th>
            <th>c<sub>t</sub> / (mg/L)</th>
            <th>q<sub>t</sub> / (mg/g)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(dp, i) in result.dataPoints" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ fmt(dp.t, 2) }}</td>
            <td>{{ fmt(dp.ct, 2) }}</td>
            <td>{{ fmt(dp.qt, 4) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ========== 拟合结果对比 ========== -->
    <section v-if="result && (result.linear || result.nonlinear)" class="card">
      <h2>📈 拟合结果对比</h2>
      <table class="result-table">
        <thead>
          <tr>
            <th>参数</th>
            <th>线性化拟合</th>
            <th>非线性拟合 (LM)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>q<sub>e</sub> / (mg/g)</td>
            <td>{{ fmt(result.linear?.qe) }}</td>
            <td>{{ fmt(result.nonlinear?.qe) }}</td>
          </tr>
          <tr>
            <td>k<sub>2</sub> / (g·mg⁻¹·min⁻¹)</td>
            <td>{{ fmtSci(result.linear?.k2) }}</td>
            <td>{{ fmtSci(result.nonlinear?.k2) }}</td>
          </tr>
          <tr>
            <td>h / (mg·g⁻¹·min⁻¹)</td>
            <td>{{ fmt(result.linear?.h) }}</td>
            <td>{{ fmt(result.nonlinear?.h) }}</td>
          </tr>
          <tr>
            <td>t<sub>1/2</sub> / min</td>
            <td>{{ fmt(result.linear?.tHalf) }}</td>
            <td>{{ fmt(result.nonlinear?.tHalf) }}</td>
          </tr>
          <tr>
            <td>R²</td>
            <td>{{ fmt(result.linear?.r2) }}</td>
            <td>{{ fmt(result.nonlinear?.r2) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ========== 公式参考 ========== -->
    <section class="card card-info">
      <h2>📖 公式参考</h2>
      <div class="formula-list">
        <p><strong>吸附量：</strong> q<sub>t</sub> = (c₀ − c<sub>t</sub>) · V / m</p>
        <p><strong>准二级模型：</strong> q<sub>t</sub> = k₂q<sub>e</sub>²t / (1 + k₂q<sub>e</sub>t)</p>
        <p><strong>线性化形式：</strong> t/q<sub>t</sub> = 1/(k₂q<sub>e</sub>²) + t/q<sub>e</sub></p>
        <p><strong>初始吸附速率：</strong> h = k₂q<sub>e</sub>²</p>
        <p><strong>半平衡时间：</strong> t<sub>1/2</sub> = 1/(k₂q<sub>e</sub>)</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 全局容器 */
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
  color: #333;
}

h1 {
  text-align: center;
  color: #1a1a2e;
  margin-bottom: 4px;
}

h2 {
  margin-top: 0;
  font-size: 1.1rem;
  color: #1a1a2e;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 6px;
  margin-bottom: 12px;
}

.subtitle {
  text-align: center;
  color: #888;
  font-size: 0.85rem;
  margin-top: 0;
  margin-bottom: 24px;
}

/* 卡片 */
.card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-warning {
  border-color: #f0ad4e;
  background: #fff8f0;
}

.card-warning ul {
  margin: 0;
  padding-left: 20px;
  color: #856404;
}

.card-info {
  border-color: #5bc0de;
  background: #f0faff;
}

.card-info p {
  margin: 4px 0;
  font-size: 0.9rem;
}

/* 参数输入网格 */
.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.params-grid label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #555;
  font-weight: 500;
}

.params-grid input {
  margin-top: 4px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.95rem;
}

/* 上传区域 */
.upload-area {
  margin-bottom: 12px;
}

.file-input {
  margin-top: 6px;
  font-size: 0.9rem;
}

hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 16px 0;
}

/* 手动输入表格 */
.input-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}

.input-table th,
.input-table td {
  padding: 4px 6px;
  text-align: center;
  font-size: 0.9rem;
}

.input-table input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

/* 按钮 */
.btn-sm {
  padding: 4px 12px;
  font-size: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
}

.btn-sm:hover {
  background: #e8e8e8;
}

.btn-danger {
  color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover {
  background: #dc3545;
  color: #fff;
}

.btn-danger:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.calc-btn-area {
  margin-top: 12px;
  text-align: center;
}

.btn-primary {
  padding: 8px 32px;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  background: #1a1a2e;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 1px;
}

.btn-primary:hover {
  background: #2d2d5e;
}

/* 结果表格 */
.result-table {
  width: 100%;
  border-collapse: collapse;
}

.result-table th,
.result-table td {
  padding: 8px 10px;
  text-align: center;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.result-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.result-table tbody tr:hover {
  background: #f9f9ff;
}

/* 公式列表 */
.formula-list p {
  line-height: 1.6;
}
</style>
