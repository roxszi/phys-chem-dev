/**
 * 蔗糖水解反应动力学实验助手 · 语言包
 * ---
 * 词条结构：扁平键 + 每条 `{ root, en }` 中英成对
 * - 键名用语义命名，不复制中文原文（改中文文案不必动键名）
 * - 物理量符号 / 数学符号 / 单位 不进入语言包（如 t、α、min⁻¹、℃），留在模板里
 * - 内部开发错误不翻译（如 "数据量与拟合值数量不一致"），不浪费键
 * - 加第三语言（如 ja）：每条词条新增 ja 字段即可，TypeScript 会精确指出哪些未补齐
 *
 * 消费侧：const langRef = useLang(langDict) → 模板 / script 里 langRef.Xxx 即可
 */

export const langDict = {

  // ================================ 实验条件输入区 ================================

  /** 实验条件小节标题 */
  ConditionsHeading: {
    root: "⚙️ 实验条件",
    en: "⚙️ Experimental Conditions",
  },
  /** 温度输入框 label */
  TemperatureLabel: {
    root: "实验温度",
    en: "Experimental Temperature",
  },
  /** 温度输入框 placeholder */
  TemperaturePlaceholder: {
    root: "实验温度",
    en: "Experimental Temperature",
  },
  /** α_∞ 输入框 placeholder */
  AlphaEquilibriumPlaceholder: {
    root: "平衡时刻的旋光度",
    en: "Polarimeter Reading at Equilibrium",
  },

  // ================================ 数据表格区 ================================

  /** 数据表格小节标题 */
  TableHeading: {
    root: "📋 数据表格",
    en: "📋 Data Table",
  },
  /** 行内删除按钮文字 */
  DeleteButton: {
    root: "删除",
    en: "Delete",
  },
  /** 清空整个表格按钮文字 */
  ClearTableButton: {
    root: "清空表格",
    en: "Clear Table",
  },
  /** 触发拟合按钮文字 */
  FitDataButton: {
    root: "拟合数据",
    en: "Fit Data",
  },
  /** 空数据时读取示例数据按钮文字 */
  ReadExampleButton: {
    root: "读取示例数据",
    en: "Load Example Data",
  },

  // ================================ 数据输入区 ================================

  /** 数据输入小节标题 */
  InputHeading: {
    root: "📝 数据输入",
    en: "📝 Data Entry",
  },
  /** 时间 t 输入框 placeholder */
  TPlaceholder: {
    root: "反应时长",
    en: "Reaction Duration",
  },
  /** 旋光度 α 输入框 placeholder */
  AlphaPlaceholder: {
    root: "旋光度值",
    en: "Polarimeter Reading",
  },
  /** 提交按钮文字 */
  SubmitButton: {
    root: "提交数据",
    en: "Submit Data",
  },

  // ================================ 拟合结果抽屉 ================================

  /** 拟合结果抽屉标题 */
  ResultDrawerTitle: {
    root: "📈 拟合结果",
    en: "📈 Fitting Result",
  },
  /** 非线性拟合图标题 */
  NonlinearChartTitle: {
    root: "蔗糖水解动力学-原公式拟合",
    en: "Nonlinear Fit",
  },
  /** 线性拟合图标题 */
  LinearChartTitle: {
    root: "蔗糖水解动力学-线性拟合",
    en: "Linear Fit",
  },
  /** 图例：实验值系列名 */
  ExperimentalSeriesName: {
    root: "实验值",
    en: "Experimental",
  },
  /** 图例：拟合值系列名 */
  FittedSeriesName: {
    root: "拟合值",
    en: "Fitted",
  },
  /** 拟合结果表格表头（两列） */
  ChartTableTitleArr: {
    root: ["拟合参数", "值"],
    en: ["Parameter", "Value"],
  },

  // ================================ 提示对话框 ================================

  /** 清空表格二次确认 */
  ClearConfirmContent: {
    root: "确定清空表格？",
    en: "Are you sure you want to clear the table?",
  },
  /** 数据量不足以拟合 */
  InsufficientDataContent: {
    root: "数据量不足，无法拟合",
    en: "Insufficient data points to fit.",
  },

}
