// 侧边栏
// 需要考虑 i18n

// 导入数据类型
import type { Sidebar } from "./types.ts"

// ================================ 侧边栏配置 ================================
/** 默认语言，即中文 */
const root: Sidebar = []
/** 英文 */
const en: Sidebar = []
// 默认导出
export const sidebar = {
  root, en
}

// ================================ 导航栏内容 ================================

// root.push({
//   text: "关于我们",
//   items: [
//     { text: "Markdown Examples", link: "/markdown-examples" },
//     { text: "Runtime API Examples", link: "/api-examples" }
//   ]
// })
// en.push({})
