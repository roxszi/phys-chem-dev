/**
 * 数据格式化的工具函数
 * 1.  对象
 *     superMap - 上标查询表
 * 2.  函数
 *     formatTime - 格式化时间（秒 → 分:秒）
 * 
 * formatRotation, formatRateConstant, superscript, formatHalfLife, formatR2
 */


/** 上标查询表 */
const superMap: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "-": "⁻", "+": "⁺",
}


/**
 * 格式化时间（秒 → 分:秒）
 * @param seconds - 秒数
 * @returns "M:SS" 格式字符串
 */
export function formatTime(seconds: number): string {
  // 如果无穷大或负数，则直接返回 "0:00"
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00"
  }
  // 其他情况则进行格式化
  /** 分钟 */
  const m = Math.floor(seconds / 60)
  /** 秒 */
  const s = Math.round(seconds % 60)
  /** 格式化的字符串 */
  const formatted = `${ m }:${ s.toString().padStart(2, "0") }`
  // 返回格式化后的字符串
  return formatted
}


/**
 * 格式化旋光度（保留指定小数位）
 * @param value - 旋光度值
 * @param digits - 小数位数（默认 2）
 */
export function formatRotation(value: number, digits: number = 2): string {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(digits);
}


/**
 * 格式化速率常数
 * @param k - 速率常数
 * @param modelType - 模型类型（决定单位）
 */
export function formatRateConstant(k: number, modelType: string): string {
  if (!Number.isFinite(k) || k === 0) return '-';

  const exponent = Math.floor(Math.log10(Math.abs(k)));
  const mantissa = k / Math.pow(10, exponent);

  // 单位取决于模型类型
  const unit = modelType === 'first-order' ? 's⁻¹' : modelType === 'zero-order' ? 'mol·L⁻¹·s⁻¹' : 'L·mol⁻¹·s⁻¹';

  if (Math.abs(exponent) < 2) {
    return `${k.toExponential(4)} ${unit}`;
  }
  return `${mantissa.toFixed(4)}×10${superscript(exponent)} ${unit}`;
}



/**
 * 数字转上标
 * @param n - 整数
 * @returns Unicode 上标字符串
 */
function superscript(n: number): string {
  return n.toString().split('').map((c) => superMap[c] ?? c).join('');
}


/**
 * 格式化半衰期
 * @param seconds - 半衰期（秒）
 * @returns 友好的时间字符串
 */
export function formatHalfLife(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds === Infinity) return '-';
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`;
  if (seconds < 3600) return formatTime(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}小时${m}分`;
}


/**
 * 格式化 R²（百分比）
 * @note 这个有问题啊！
 */
export function formatR2(r2: number): string {
  if (!Number.isFinite(r2)) return '-';
  return `${(r2 * 100).toFixed(2)}%`;
}


// ── 时间输入相关的工具函数 ──


/**
 * 解析时间字符串为秒数
 * 支持 "mm:ss" 和 "hh:mm:ss" 两种格式
 * @param input - 时间字符串
 * @returns 秒数，解析失败返回 null
 */
export function parseTimeString(input: string): number | null {
  const parts = input.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return null;
}

/**
 * 将秒数格式化为时钟时间 "h:mm:ss" 或 "mm:ss"
 * 用于显示测量时刻 t
 * @param seconds - 秒数（从当天零点起）
 */
export function formatClockTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 将秒数格式化为经过时间 "mm:ss" 或 "h:mm:ss"
 * 用于显示 Δt（距 t0 的经过时间）
 * @param seconds - 秒数
 */
export function formatElapsedTime(seconds: number): string {
  return formatClockTime(seconds);
}

/**
 * 获取当前时刻的秒数（从当天零点起）
 * @returns 当前时刻秒数
 */
export function nowInSeconds(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}
