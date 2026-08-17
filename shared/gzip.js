import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

// 要压缩的文件扩展名（包含 .html）
const EXTENSIONS = ['.js', '.css', '.wasm', '.html'];

// 查找 dist/frontend-* 目录
async function findDistDir() {
  const baseDir = './dist';
  try {
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && e.name.startsWith('frontend-'))
      .map(e => e.name);
    if (dirs.length === 0) {
      // 如果没找到，尝试直接用 .vitepress/dist
      // const fallback = '.vitepress/dist';
      // if (fs.existsSync(fallback)) return fallback;
      throw new Error('未找到任何 frontend-* 目录');
    }
    // 如果有多个，取第一个（通常只有一个）
    return path.join(baseDir, dirs[0]);
  } catch (err) {
    console.error('查找 dist 目录失败:', err);
    process.exit(1);
  }
}

async function compressFile(filePath) {
  const gzPath = filePath + '.gz';
  // 增量压缩：如果 .gz 存在且比源文件新，则跳过
  try {
    const [srcStat, gzStat] = await Promise.all([
      fs.promises.stat(filePath),
      fs.promises.stat(gzPath),
    ]);
    if (gzStat.mtimeMs >= srcStat.mtimeMs) {
      console.log(`⏭️  跳过 (已是最新): ${path.relative(process.cwd(), gzPath)}`);
      return;
    }
  } catch (_) {
    // 文件不存在或 .gz 不存在，继续
  }

  const readStream = fs.createReadStream(filePath);
  const writeStream = fs.createWriteStream(gzPath);
  const gzip = createGzip({ level: 9 });

  try {
    await pipeline(readStream, gzip, writeStream);
    console.log(`✅ 压缩成功: ${path.relative(process.cwd(), gzPath)}`);
  } catch (err) {
    console.error(`❌ 压缩失败: ${filePath}`, err);
  }
}

async function walkDir(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath);
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      await compressFile(fullPath);
    }
  }
}

async function main() {
  const distDir = await findDistDir();
  console.log(`📁 压缩目录: ${distDir}`);
  await walkDir(distDir);
  console.log('🎉 全部压缩完成');
}

main().catch(console.error);