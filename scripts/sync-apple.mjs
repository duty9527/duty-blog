#!/usr/bin/env node
/**
 * Apple Notes (备忘录) & Apple Journal (手记) 同步与导入工具
 *
 * 支持三种模式：
 * 1. GitHub Actions / iOS 快捷指令云端发布：
 *    node scripts/sync-apple.mjs --from-env
 * 2. Mac 本地直接同步 Apple 备忘录（读取“博客”/“Blog”/“随笔”文件夹）：
 *    npm run sync:notes
 * 3. 导入 iPhone Apple 手记 (Journal) 导出的压缩包或目录：
 *    npm run import:journal -- /path/to/AppleJournalEntries
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'src/content/blog');
const IMG_DIR = path.join(ROOT_DIR, 'public/img');

function toCNIsoString(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const cnMs = d.getTime() + 8 * 3600 * 1000;
  const iso = new Date(cnMs).toISOString();
  return iso.replace('Z', '+08:00');
}

function getNextId() {
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  let maxId = 23;
  for (const file of files) {
    const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const m = content.match(/^vanblogId:\s*(\d+)/m);
    if (m) {
      const id = Number.parseInt(m[1], 10);
      if (id > maxId) maxId = id;
    }
    const baseNum = Number.parseInt(path.basename(file, '.md'), 10);
    if (!Number.isNaN(baseNum) && baseNum > maxId) {
      maxId = baseNum;
    }
  }
  return maxId + 1;
}

function extractDescription(markdown) {
  const clean = markdown
    .replace(/<!--\s*more\s*-->/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*>`~_]+/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
  return clean.slice(0, 150);
}

function htmlToMarkdown(html) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // 自动提取 Apple 备忘录内嵌的 base64 图片并保存至 public/img/，保留原段落图文混排位置
    .replace(
      /<img[^>]+src=["']data:image\/([a-zA-Z0-9+]+);base64,([^"']+)["'][^>]*>/gi,
      (_, mimeSub, b64Data) => {
        try {
          const cleanB64 = b64Data.replace(/\s+/g, '');
          const buf = Buffer.from(cleanB64, 'base64');
          const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
          const ext = mimeSub === 'jpeg' ? 'jpg' : mimeSub.replace('+xml', '');
          const fileName = `note-${hash}.${ext}`;
          fs.writeFileSync(path.join(IMG_DIR, fileName), buf);
          return `\n\n![](/img/${fileName})\n\n`;
        } catch {
          return '';
        }
      }
    )
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**')
    .replace(/<(?:i|em)[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function writeBlogPost({ title, content, category = '随笔', tags = ['手记'], pubDate, updatedDate, customId }) {
  const id = customId || getNextId();
  const pubIso = toCNIsoString(pubDate ? new Date(pubDate) : new Date());
  const updIso = toCNIsoString(updatedDate ? new Date(updatedDate) : new Date());
  const finalTitle =
    (title || '').trim() ||
    content
      .split('\n')
      .map((l) => l.replace(/^[#*>-]+\s*/, '').trim())
      .find(Boolean)
      ?.slice(0, 28) ||
    `手记 ${pubIso.slice(0, 10)}`;

  const body = content.includes('<!-- more -->')
    ? content.trim()
    : `${content.trim()}\n\n<!-- more -->\n`;

  const desc = extractDescription(content);

  const frontmatter = [
    '---',
    `vanblogId: ${id}`,
    `title: ${JSON.stringify(finalTitle)}`,
    `description: ${JSON.stringify(desc)}`,
    `pubDate: ${JSON.stringify(pubIso)}`,
    `updatedDate: ${JSON.stringify(updIso)}`,
    `category: ${JSON.stringify(category)}`,
    `tags: ${JSON.stringify(tags)}`,
    `author: "独语天涯"`,
    `top: 0`,
    `hidden: false`,
    `private: false`,
    `pathname: ""`,
    `viewer: 1`,
    `visited: 1`,
    `draft: false`,
    '---',
  ].join('\n');

  const filePath = path.join(BLOG_DIR, `${id}.md`);
  fs.writeFileSync(filePath, `${frontmatter}\n\n${body}\n`, 'utf-8');
  console.log(`✅ 已生成文章: src/content/blog/${id}.md (${finalTitle})`);
  return filePath;
}

// 模式 1：从环境变量创建（GitHub Actions + iPhone 快捷指令）
function runFromEnv() {
  let rawContent = (process.env.INPUT_CONTENT || '').trim();
  let rawTitle = (process.env.INPUT_TITLE || '').trim();
  const category = (process.env.INPUT_CATEGORY || '随笔').trim();
  const rawTags = (process.env.INPUT_TAGS || '手记')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const inputDate = process.env.INPUT_DATE || '';

  if (!rawContent) {
    console.error('❌ INPUT_CONTENT 为空，未生成文章');
    process.exit(1);
  }

  // 如果快捷指令把第一行作为标题传了过来且未单独传 title
  if (!rawTitle) {
    const lines = rawContent.split('\n');
    if (lines.length > 1 && lines[0].trim().length <= 40) {
      rawTitle = lines[0].replace(/^#+\s*/, '').trim();
      rawContent = lines.slice(1).join('\n').trim();
    }
  }

  writeBlogPost({
    title: rawTitle,
    content: rawContent,
    category,
    tags: rawTags,
    pubDate: inputDate ? new Date(inputDate) : new Date(),
  });
}

// 模式 2：在 Mac 上通过 osascript 同步 Apple 备忘录指定文件夹（支持增量更新与自动 git push）
function runMacNotesSync(folderNames = ['博客', 'Blog', '随笔', '手记'], autoPush = false) {
  if (process.platform !== 'darwin') {
    console.error('⚠️ Apple 备忘录本地直连仅支持在 macOS 上运行（当前非 macOS 环境）。');
    process.exit(1);
  }

  const jxaScript = `
    const Notes = Application('Notes');
    const targetFolders = ${JSON.stringify(folderNames)};
    const result = [];
    for (const folder of Notes.folders()) {
      const fname = folder.name();
      if (targetFolders.includes(fname)) {
        for (const note of folder.notes()) {
          result.push({
            id: note.id(),
            name: note.name(),
            body: note.body(),
            creationDate: note.creationDate().toISOString(),
            modificationDate: note.modificationDate().toISOString(),
            folder: fname
          });
        }
      }
    }
    JSON.stringify(result);
  `;

  const rawJson = execFileSync('osascript', ['-l', 'JavaScript', '-e', jxaScript], {
    encoding: 'utf-8',
  });
  const notes = JSON.parse(rawJson.trim() || '[]');
  if (notes.length === 0) {
    console.log(`ℹ️ 未在 Apple 备忘录中找到名为 ${folderNames.join(' / ')} 的文件夹或笔记。`);
    return;
  }

  // 建立已有文章标题 -> { file, vanblogId, updatedDate } 索引
  const existingMap = new Map();
  for (const f of fs.readdirSync(BLOG_DIR).filter((x) => x.endsWith('.md'))) {
    const fullPath = path.join(BLOG_DIR, f);
    const txt = fs.readFileSync(fullPath, 'utf-8');
    const titleM = txt.match(/^title:\s*"(.*)"/m);
    const idM = txt.match(/^vanblogId:\s*(\d+)/m);
    const updM = txt.match(/^updatedDate:\s*"(.*)"/m);
    if (titleM) {
      existingMap.set(titleM[1], {
        file: f,
        id: idM ? Number.parseInt(idM[1], 10) : Number.parseInt(path.basename(f, '.md'), 10),
        updatedMs: updM ? new Date(updM[1]).getTime() : 0,
      });
    }
  }

  let changedCount = 0;
  for (const n of notes) {
    const modMs = new Date(n.modificationDate).getTime();
    const existing = existingMap.get(n.name);
    if (existing && Math.abs(modMs - existing.updatedMs) < 2000) {
      continue;
    }

    let md = htmlToMarkdown(n.body);
    const lines = md.split('\n');
    if (lines[0]?.replace(/^#+\s*/, '').trim() === n.name.trim()) {
      md = lines.slice(1).join('\n').trim();
    }

    writeBlogPost({
      customId: existing?.id,
      title: n.name,
      content: md,
      category: '随笔',
      tags: [n.folder === '手记' ? '手记' : '备忘录', '随笔'],
      pubDate: new Date(n.creationDate),
      updatedDate: new Date(n.modificationDate),
    });
    changedCount++;
  }

  console.log(`🎉 同步检查完成，本次新增/更新 ${changedCount} 篇备忘录文章。`);

  if (autoPush && changedCount > 0) {
    try {
      execFileSync('git', ['pull', '--rebase', 'origin', 'main'], { cwd: ROOT_DIR, stdio: 'inherit' });
      execFileSync('git', ['add', 'src/content/blog/', 'public/img/'], { cwd: ROOT_DIR, stdio: 'inherit' });
      execFileSync('git', ['commit', '-m', `sync(apple): auto sync ${changedCount} note(s) from Apple Notes`], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
      execFileSync('git', ['push', 'origin', 'main'], { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('🚀 已自动推送到 GitHub，Cloudflare Pages 正在自动部署！');
    } catch (err) {
      console.error('⚠️ 自动 git push 失败:', err.message);
    }
  }
}

// 注册 macOS launchd 后台定时自动同步守护进程（每 5 分钟静默同步一次 iCloud 备忘录）
function installMacDaemon() {
  if (process.platform !== 'darwin') {
    console.error('⚠️ 仅支持在 macOS 上安装 launchd 后台同步服务。');
    process.exit(1);
  }
  const home = process.env.HOME || '';
  const agentsDir = path.join(home, 'Library/LaunchAgents');
  fs.mkdirSync(agentsDir, { recursive: true });
  const plistPath = path.join(agentsDir, 'top.dutycsd.apple-sync.plist');
  const nodeBin = process.execPath;
  const scriptPath = path.join(ROOT_DIR, 'scripts/sync-apple.mjs');
  const logPath = path.join(home, 'Library/Logs/duty-blog-apple-sync.log');

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>top.dutycsd.apple-sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodeBin}</string>
    <string>${scriptPath}</string>
    <string>--notes</string>
    <string>--auto-push</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
  <key>StartInterval</key>
  <integer>300</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>`;

  fs.writeFileSync(plistPath, plist, 'utf-8');
  try {
    execFileSync('launchctl', ['unload', plistPath], { stdio: 'ignore' });
  } catch {}
  execFileSync('launchctl', ['load', plistPath], { stdio: 'inherit' });
  console.log(`✅ 已成功注册 macOS 后台自动同步服务！`);
  console.log(`   - 配置文件: ${plistPath}`);
  console.log(`   - 运行日志: ${logPath}`);
  console.log(`   - 效果: 你在 iPhone 或 Mac 备忘录的「博客 / 随笔 / 手记」文件夹写完内容，iCloud 同步到 Mac 后每 5 分钟会自动同步并 git push 上线！`);
}

function uninstallMacDaemon() {
  const home = process.env.HOME || '';
  const plistPath = path.join(home, 'Library/LaunchAgents/top.dutycsd.apple-sync.plist');
  if (fs.existsSync(plistPath)) {
    try {
      execFileSync('launchctl', ['unload', plistPath], { stdio: 'ignore' });
    } catch {}
    fs.unlinkSync(plistPath);
    console.log('✅ 已移除 macOS 后台自动同步服务。');
  } else {
    console.log('ℹ️ 当前未安装后台自动同步服务。');
  }
}

// 构建已有文章标题索引（用于增量去重，防止“全量导出”重复生成旧手记）
function getExistingBlogMap() {
  const existingMap = new Map();
  if (!fs.existsSync(BLOG_DIR)) return existingMap;
  for (const f of fs.readdirSync(BLOG_DIR).filter((x) => x.endsWith('.md'))) {
    const fullPath = path.join(BLOG_DIR, f);
    const txt = fs.readFileSync(fullPath, 'utf-8');
    const titleM = txt.match(/^title:\s*"(.*)"/m);
    const idM = txt.match(/^vanblogId:\s*(\d+)/m);
    const updM = txt.match(/^updatedDate:\s*"(.*)"/m);
    if (titleM) {
      existingMap.set(titleM[1], {
        file: f,
        id: idM ? Number.parseInt(idM[1], 10) : Number.parseInt(path.basename(f, '.md'), 10),
        updatedMs: updM ? new Date(updM[1]).getTime() : 0,
      });
    }
  }
  return existingMap;
}

// 模式 3：导入 Apple 手记 (Apple Journal) 导出的目录或压缩包（自带增量去重，支持多次“全量导出”只导入新条目）
function runJournalImport(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('❌ 请提供有效的 Apple 手记导出目录或 zip 路径，例如：npm run import:journal -- ~/Downloads/AppleJournalEntries');
    process.exit(1);
  }

  let targetDir = inputPath;
  if (inputPath.endsWith('.zip')) {
    const tmpDir = path.join('/tmp', `apple-journal-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    execFileSync('unzip', ['-q', inputPath, '-d', tmpDir]);
    targetDir = tmpDir;
  }

  // 查找 Entries 目录或所有 .html / .md 文件（兼容官方导出 .html 与 journal-cli 导出的 .md）
  const entryFiles = [];
  function walkDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDir(full);
      else if (entry.name.endsWith('.html') || entry.name.endsWith('.md')) entryFiles.push(full);
    }
  }
  walkDir(targetDir);

  if (entryFiles.length === 0) {
    console.log('ℹ️ 未在导出包中找到 .html 或 .md 手记条目文件。');
    return 0;
  }

  fs.mkdirSync(IMG_DIR, { recursive: true });
  const existingMap = getExistingBlogMap();
  let importedCount = 0;

  for (const entryFile of entryFiles.sort()) {
    const rawContent = fs.readFileSync(entryFile, 'utf-8');
    const ext = path.extname(entryFile);
    const baseName = path.basename(entryFile, ext);

    // 尝试从文件名或内容提取日期 (如 2025-05-12_...)
    const dateMatch =
      baseName.match(/(\d{4}-\d{2}-\d{2})/) ||
      rawContent.match(/(\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2})/);
    let pubDate = new Date();
    if (dateMatch) {
      const normalized = dateMatch[1]
        .replace('年', '-')
        .replace('月', '-')
        .replace('日', '');
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) pubDate = parsed;
    }

    const entryDir = path.dirname(entryFile);
    let title = '';
    let mdBody = '';

    if (ext === '.html') {
      // 处理官方 HTML 导出引用的图片资源（使用文件内容哈希命名，避免重复拷贝）
      const imgLinks = [];
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(rawContent)) !== null) {
        const relSrc = match[1];
        const absImg = path.resolve(entryDir, relSrc);
        if (fs.existsSync(absImg)) {
          const buf = fs.readFileSync(absImg);
          const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 14);
          const imgExt = path.extname(absImg) || '.jpg';
          const imgName = `journal-${hash}${imgExt}`;
          fs.writeFileSync(path.join(IMG_DIR, imgName), buf);
          imgLinks.push(`![](/img/${imgName})`);
        }
      }

      const titleMatch =
        rawContent.match(/<div[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
        rawContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
        rawContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch ? htmlToMarkdown(titleMatch[1]).trim() : '';

      mdBody = htmlToMarkdown(rawContent);
      if (imgLinks.length > 0) {
        mdBody += '\n\n' + imgLinks.join('\n\n');
      }
    } else {
      // 处理第三方逆向工具 journal-cli 导出的 Markdown 及本地附件
      mdBody = rawContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (fullMatch, alt, relSrc) => {
        if (/^https?:\/\//i.test(relSrc) || relSrc.startsWith('/img/')) return fullMatch;
        const absImg = path.resolve(entryDir, relSrc);
        if (fs.existsSync(absImg)) {
          const buf = fs.readFileSync(absImg);
          const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 14);
          const imgExt = path.extname(absImg) || '.jpg';
          const imgName = `journal-${hash}${imgExt}`;
          fs.writeFileSync(path.join(IMG_DIR, imgName), buf);
          return `![${alt}](/img/${imgName})`;
        }
        return fullMatch;
      });
      const firstHeading = mdBody.match(/^#\s+(.+)$/m);
      if (firstHeading) {
        title = firstHeading[1].trim();
      }
    }

    const effectiveTitle =
      title ||
      mdBody
        .split('\n')
        .map((l) => l.replace(/^[#*>-]+\s*/, '').trim())
        .find(Boolean)
        ?.slice(0, 28) ||
      `手记 ${toCNIsoString(pubDate).slice(0, 10)}`;

    // 增量去重：如果同标题手记已存在，直接跳过，避免“全量导出”重复生成
    if (existingMap.has(effectiveTitle)) {
      continue;
    }

    writeBlogPost({
      title: effectiveTitle,
      content: mdBody,
      category: '随笔',
      tags: ['手记', '随笔'],
      pubDate,
      updatedDate: pubDate,
    });
    existingMap.set(effectiveTitle, { file: '', id: 0, updatedMs: pubDate.getTime() });
    importedCount++;
  }

  console.log(`🎉 Apple 手记导入完成：本次新增 ${importedCount} 篇（已存在条目自动跳过）。`);
  return importedCount;
}

// 模式 4：通过开源逆向工具 journal-cli (omarshahine/apple-journal-cli) 直接读取 Mac 端 Journal.app 数据库
function runJournalCliSync(autoPush = false) {
  try {
    execFileSync('which', ['journal-cli'], { stdio: 'ignore' });
  } catch {
    console.log(
      'ℹ️ 未检测到 journal-cli。如需在 Mac 上免导出直读 Apple 手记数据库，可运行: brew install omarshahine/tap/journal-cli'
    );
    return 0;
  }

  const tmpOut = path.join('/tmp', `journal-cli-export-${Date.now()}`);
  fs.mkdirSync(tmpOut, { recursive: true });
  execFileSync('journal-cli', ['export', '--dir', tmpOut], { stdio: 'inherit' });
  const count = runJournalImport(tmpOut);
  if (autoPush && count > 0) {
    try {
      execFileSync('git', ['pull', '--rebase', 'origin', 'main'], { cwd: ROOT_DIR, stdio: 'inherit' });
      execFileSync('git', ['add', 'src/content/blog/', 'public/img/'], { cwd: ROOT_DIR, stdio: 'inherit' });
      execFileSync('git', ['commit', '-m', `sync(apple): auto sync ${count} entry(s) from Apple Journal`], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
      execFileSync('git', ['push', 'origin', 'main'], { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (err) {
      console.error('⚠️ 自动 git push 失败:', err.message);
    }
  }
  return count;
}

const args = process.argv.slice(2);
if (args.includes('--from-env')) {
  runFromEnv();
} else if (args.includes('--install-daemon')) {
  installMacDaemon();
} else if (args.includes('--uninstall-daemon')) {
  uninstallMacDaemon();
} else if (args.includes('--notes')) {
  const autoPush = args.includes('--auto-push');
  runMacNotesSync(['博客', 'Blog', '随笔', '手记'], autoPush);
  // 如果安装了 journal-cli，顺带同步 Mac 端 Apple 手记本地数据库
  runJournalCliSync(autoPush);
} else if (args.includes('--journal-cli')) {
  runJournalCliSync(args.includes('--auto-push'));
} else if (args.includes('--journal')) {
  const idx = args.indexOf('--journal');
  runJournalImport(args[idx + 1]);
} else {
  console.log(`用法:
  1. 开启 Mac 后台全自动监听同步 (iCloud 备忘录 + journal-cli -> 自动 git push):
     npm run install:daemon
  2. 手动触发一次 Mac 备忘录同步:
     npm run sync:notes
  3. 导入 Apple 手记导出包 (自动增量去重，只导入新条目):
     npm run import:journal -- <导出zip或目录路径>
  4. 使用第三方 journal-cli 直读 Mac 手记数据库:
     node scripts/sync-apple.mjs --journal-cli
  5. GitHub Actions 云端发布:
     node scripts/sync-apple.mjs --from-env`);
}
