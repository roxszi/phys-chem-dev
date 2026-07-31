// 导航栏
// 需要考虑 i18n

// 导入数据类型
import type { NavItem } from "./types.ts"

// ================================ 导航栏配置 ================================
/** 默认语言，即中文 */
const root: NavItem[] = []
/** 英文 */
const en: NavItem[] = []
// 默认导出
export const nav = {
  root, en
}

// ================================ 导航栏内容 ================================

root.push(
  { text: "节点加速", items: [
    { text: "国内访问", link: "https://phys-chem.top/" },
    { text: "海外访问", link: "https://roxszi.github.io/phys-chem/" }
  ]}
)
en.push(
  { text: "Optimize Nodes", items: [
    { text: "China Access", link: "https://phys-chem.top/en/" },
    { text: "Global Access", link: "https://roxszi.github.io/phys-chem/en/" }
  ]}
)

root.push(
  { text: "技术栈", items: [
    { text: "VitePress", link: "https://vitepress.dev/zh/" },
    { text: "TDsign", link: "https://tdesign.tencent.com/" }
  ]}
)
en.push(
  { text: "Tech Stack", items: [
    { text: "VitePress", link: "https://vitepress.dev/" },
    { text: "TDsign", link: "https://tdesign.tencent.com/index-en" }
  ]}
)
