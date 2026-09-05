/**
 * 前端发布页面的压缩脚本
 * ---
 * - 查找 dist-frontend-* 目录
 * @note 该脚本需要 node 环境
 */

// 导入node后端模块
import fs from "node:fs"
import path from "node:path"
import { createGzip } from "node:zlib"
import { pipeline } from "node:stream/promises"
import process from "node:process"

/** 要压缩的文件扩展名（包含 .html） */
const EXTENSIONS = [".js", ".css", ".wasm", ".html"]
/** 发布目录字典 */
const TARGET_DIR_DIST = {
  "root": "dist-frontend-root",
  "subpage": "dist-frontend-subpage",
} as const

/**
 * 查找 dist 目录
 * - 会从 baseDir 里查找 targetDir 并返回第一个找到的目录
 * - 如果没有找到，会抛出错误
 * @param targetDir 目标目录名，如 dist-frontend-xxx
 */
async function findDistDir(targetDir: string) {
  /** 根目录 */
  const baseDir = "./"
  try {
    // 异步读取 baseDir 目录内容，并返回文件系统对象
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    // 筛选并以名称映射，返回目录名数组
    const dirs = entries
      // 过滤：是目录，且名称以 targetDir 开头
      .filter(e => ((e.isDirectory()) && (e.name.startsWith(targetDir))))
      // 映射：返回目录名
      .map(e => e.name)
    // 如果没有找到符合条件的目录
    if (dirs.length === 0) {
      // 如果没找到，则报错
      throw new Error(`在 ${ baseDir } 目录下，未找到任何 ${ targetDir } 目录`)
    }
    // 如果有多个，取第一个
    return path.join(baseDir, dirs[0]!)
  } catch (err) {
    // 报错
    console.error("查找 dist 目录失败:", err)
    // 强制终止当前进程
    process.exit(1)
  }
}

/**
 * 压缩指定文件为 gzip 格式（.gz）
 * - 该函数会执行增量压缩逻辑：
 *   - 如果目标 .gz 文件已存在且修改时间不早于源文件，则跳过压缩
 *   - 否则使用最高压缩级别（level 9）创建新的 .gz 文件
 * @param filePath - 需要压缩的源文件路径（绝对路径或相对路径）
 * @returns 异步操作完成时返回，无返回值
 * @example
 * await compressFile("./data/example.txt")
 */
async function compressFile(filePath: string) {
  /** gz文件路径 */
  const gzPath = filePath + ".gz"
  // 增量压缩：如果 .gz 存在且比源文件新，则跳过
  try {
    // 获取源文件和 .gz 文件的信息
    const [srcStat, gzStat] = await Promise.all([
      fs.promises.stat(filePath),
      fs.promises.stat(gzPath),
    ])
    // 如果 .gz 文件修改时间不早于（不小于）源文件，则跳过
    if (gzStat.mtimeMs >= srcStat.mtimeMs) {
      // console.log(`⏭️ 跳过 (已是最新): ${ path.relative(process.cwd(), gzPath) }`)
      return
    }
  } catch (_) {
    // 文件不存在或 .gz 不存在，继续
  }
  // 开始压缩
  /** 以源文件路径创建可读流 */
  const readStream = fs.createReadStream(filePath)
  /** 以gzip路径创建可写流 */
  const writeStream = fs.createWriteStream(gzPath)
  /** 创建gzip压缩处理流，使用最高压缩级别（level 9） */
  const gzip = createGzip({ level: 9 })
  try {
    // 以pipeline异步执行文件压缩流程
    // 参数: readStream(读取流), gzip(压缩处理), writeStream(写入流)
    await pipeline(readStream, gzip, writeStream)
    // 压缩成功后，打印成功信息
    // 使用path.relative获取相对于当前工作目录的路径，使输出更友好
    // console.log(`✅ 压缩成功: ${ path.relative(process.cwd(), gzPath) }`)
  } catch (err) {
    // 压缩失败时，打印错误信息
    // 包含原始文件路径和具体的错误对象
    console.error(`❌ 压缩失败: ${ filePath }`, err)
  }
}

/**
 * 递归遍历目录并处理文件
 * @param dir - 要遍历的目录路径
 */
async function walkDir(dir: string) {
  // 读取目录内容，包含文件和子目录信息
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  // 遍历目录中的每个条目
  for (const entry of entries) {
    // 获取当前条目的完整路径
    const fullPath = path.join(dir, entry.name)
    // 如果是目录
    if (entry.isDirectory()) {
      // 则递归遍历该目录
      await walkDir(fullPath)
    // 不是目录，则判断当前条目是否为文件，并且文件扩展名是否在EXTENSIONS数组中
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      // 符合条件，则进行压缩处理
      await compressFile(fullPath)
    }
  }
}

/**
 * 主函数，用于执行压缩操作
 * - 该函数会查找dist目录，遍历其中的文件并进行压缩
 */
async function main() {
  const buildKind = process.env["VITE_BUILD_KIND"] as keyof typeof TARGET_DIR_DIST
  const targetDir = TARGET_DIR_DIST[buildKind]
  if (!targetDir) {
    console.error(`无效的 VITE_BUILD_KIND: ${ buildKind }`)
    process.exit(1)
  }
  // 查找dist目录路径
  const distDir = await findDistDir(targetDir)
  // 打印要压缩的目录信息
  console.log(`📁 压缩目录: ${ distDir }`)
  // 遍历目录中的文件进行压缩
  await walkDir(distDir)
  // 打印完成信息
  console.log("🎉 全部压缩完成")
}

// 执行主函数
main().catch(console.error)
