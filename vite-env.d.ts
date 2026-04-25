/**
 * 全局环境的声明文件
 * 用于JS编译器类型推断
 */

// 声明VitePress的全局环境变量
/// <reference types="vite/client" />

// 声明Vite的全局环境变量
interface ImportMetaEnv {
  // 构建类型
  readonly VITE_BUILD_KIND: string

}

// vite的元数据类型声明
interface ImportMeta {
  readonly env: ImportMetaEnv
  glob: (pattern: string) => Record<string, () => Promise<any>>
  globEager: (pattern: string) => Record<string, any>
}

// css样式类型声明
declare module "*.css" {
  const css: string;
  export default css;
}
declare module "*.scss" {
  const css: string;
  export default css;
}
declare module "*.less" {
  const css: string;
  export default css;
}
