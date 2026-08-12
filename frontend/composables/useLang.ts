/**
 * 语言包 VitePress 业务组件多语言 composable
 * ---
 * 流程：
 * 1.  业务组件定义扁平键名 + 每条词条 `{ root, en }` 的语言字典
 * 2.  useLang(dict) → 根据当前 localeIndex（"root" | "en"）派生响应式语言包
 * 3.  未识别的 localeIndex 自动回落 root
 * ---
 * 设计思路：
 * - 嵌套倒置：词条在外层扁平排（"中英成对相邻"），语言在内层，避免漏翻
 * - computed 派生而非快照读取：build 时 SSR 也能取到正确语言，产物 HTML 直接是目标语言
 * - Unpack<D>：从 `{ k: {root, en} }` 推导为 `{ k: root的类型 }`，组件侧 langRef.value 拿到的不是 any
 * - 兼容"先加键后补译文"的工作流：未识别的语言 fallback 到 root，避免页面出现 undefined
 * - 与 project-info/index.ts 中 locales 配置一致："root" = 简体中文，"en" = English
 */

// import { computed } from "vue"
// import { useData } from "vitepress"

/** 单条词条：必须同时提供所有支持的语言 */
type LangEntry = Record<string, unknown>

/**
 * 把"词条字典"解包为"扁平语言包"。
 * 
 * 例：{ A: { root: "你好", en: "Hi" } } → { A: string }
 */
type Unpack<D extends Record<string, LangEntry>> = {
  [K in keyof D]: D[K]["root"]
}

/**
 * 根据当前 VitePress 语言索引派生响应式语言包
 *
 * @param dict 词条字典，每条必须同时含 root 与 en
 * @returns 当前语言下的扁平语言包（响应式 Ref）
 */
export function useLang<D extends Record<string, LangEntry>>(dict: D) {
  const { localeIndex } = useData()
  const langRef = computed<Unpack<D>>(() => {
    /** 当前语言键，未识别则回落 root */
    const key: string = localeIndex.value
    /** 构造当前语言下的扁平包 */
    const result: Record<string, unknown> = {}
    for (const k in dict) {
      const entry = dict[k]!
      result[k] = entry[key] ?? entry["root"]
    }
    return result as Unpack<D>
  })
  return langRef
}
