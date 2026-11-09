/**
 * Cloudflare Pages Function: POST /api/publish
 *
 * 支持长文 + 多图（图文混排）直接写入 GitHub 仓库（绕过 GitHub Actions dispatch 64KB 限制，最大支持 25MB 图文提交）。
 *
 * 支持两种请求格式：
 * 1. multipart/form-data（推荐 iOS 快捷指令分享“手记”图文时使用）：
 *    - title: 标题（可选）
 *    - content: 正文内容（长文 Markdown 或纯文本）
 *    - category: 分类（默认 "随笔"）
 *    - tags: 标签（默认 "手记,随笔"）
 *    - files / images: 1 张或多张图片文件
 *
 * 2. application/json：
 *    {
 *      "title": "标题",
 *      "content": "正文...",
 *      "category": "随笔",
 *      "tags": ["手记", "随笔"],
 *      "images": [
 *        { "name": "photo1.jpg", "base64": "..." }
 *      ]
 *    }
 */

interface Env {
  PUBLISH_SECRET?: string;
  GITHUB_TOKEN?: string;
}

const REPO = 'duty9527/duty-blog';
const BRANCH = 'main';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function toCNIsoString(date = new Date()): string {
  const cnMs = date.getTime() + 8 * 3600 * 1000;
  return new Date(cnMs).toISOString().replace('Z', '+08:00');
}

async function ghApi(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'duty-blog-cloudflare-pages-publisher',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!env.PUBLISH_SECRET || !env.GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Missing PUBLISH_SECRET or GITHUB_TOKEN in Cloudflare Pages environment variables.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const auth = request.headers.get('Authorization') || '';
  const secret = auth.replace(/^Bearer\s+/i, '').trim();
  if (!secret || secret !== env.PUBLISH_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let title = '';
  let content = '';
  let category = '随笔';
  let tags: string[] = ['手记', '随笔'];
  const rawUploads: Array<{ origName: string; ext: string; base64: string }> = [];

  const contentType = request.headers.get('Content-Type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      title = String(form.get('title') || '').trim();
      content = String(form.get('content') || '').trim();
      if (form.get('category')) category = String(form.get('category')).trim();
      if (form.get('tags')) {
        tags = String(form.get('tags'))
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean);
      }

      for (const [, val] of form.entries()) {
        if (val instanceof File && val.size > 0) {
          const buf = await val.arrayBuffer();
          const ext = (val.name.split('.').pop() || 'jpg').toLowerCase();
          rawUploads.push({
            origName: val.name,
            ext,
            base64: arrayBufferToBase64(buf),
          });
        }
      }
    } else {
      const body = (await request.json()) as Record<string, any>;
      title = String(body.title || '').trim();
      content = String(body.content || '').trim();
      if (body.category) category = String(body.category).trim();
      if (body.tags) {
        tags = Array.isArray(body.tags)
          ? body.tags.map((t: any) => String(t).trim()).filter(Boolean)
          : String(body.tags)
              .split(/[,，]/)
              .map((t) => t.trim())
              .filter(Boolean);
      }
      if (Array.isArray(body.images)) {
        body.images.forEach((img: any, idx: number) => {
          const rawB64 = String(img.base64 || img.data || '').replace(
            /^data:[^;]+;base64,/,
            ''
          );
          if (rawB64) {
            const origName = String(img.name || `photo-${idx + 1}.jpg`);
            const ext = (origName.split('.').pop() || 'jpg').toLowerCase();
            rawUploads.push({
              origName,
              ext,
              base64: rawB64,
            });
          }
        });
      }
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: `Failed to parse request: ${err.message}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!content && rawUploads.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: 'content or images is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 将上传的静态图与 Live Photo 实况视频 (.mov / .mp4) 自动配对
  const videoExts = new Set(['mov', 'mp4']);
  const imageUploads = rawUploads.filter((u) => !videoExts.has(u.ext));
  const videoUploads = rawUploads.filter((u) => videoExts.has(u.ext));
  const usedVideos = new Set<number>();
  const ts = Date.now();

  const uploadedFiles: Array<{ filename: string; base64: string }> = [];
  const imageMarkdowns: string[] = [];

  imageUploads.forEach((img, idx) => {
    const stem = `journal-${ts}-${idx + 1}`;
    const imgFilename = `${stem}.${img.ext}`;
    uploadedFiles.push({ filename: imgFilename, base64: img.base64 });

    const origStem = img.origName.replace(/\.[^.]+$/, '').toLowerCase();
    // 优先按同名文件配对 (例如 IMG_1234.JPG + IMG_1234.MOV)，否则按顺序配对
    let matchedVideoIdx = videoUploads.findIndex(
      (v, vIdx) => !usedVideos.has(vIdx) && v.origName.replace(/\.[^.]+$/, '').toLowerCase() === origStem
    );
    if (matchedVideoIdx === -1 && videoUploads.length === imageUploads.length && !usedVideos.has(idx)) {
      matchedVideoIdx = idx;
    }

    if (matchedVideoIdx !== -1) {
      usedVideos.add(matchedVideoIdx);
      const v = videoUploads[matchedVideoIdx];
      const videoFilename = `${stem}.${v.ext}`;
      uploadedFiles.push({ filename: videoFilename, base64: v.base64 });
      imageMarkdowns.push(`![live](/img/${imgFilename}?live=/img/${videoFilename})`);
    } else {
      imageMarkdowns.push(`![](/img/${imgFilename})`);
    }
  });

  try {
    // 1. 获取当前分支最新 commit 与 blog 目录下的文件列表以计算新文章 ID
    const refData = await ghApi(`/git/ref/heads/${BRANCH}`, env.GITHUB_TOKEN);
    const latestCommitSha = refData.object.sha;
    const commitData = await ghApi(`/git/commits/${latestCommitSha}`, env.GITHUB_TOKEN);
    const baseTreeSha = commitData.tree.sha;

    const blogFiles = await ghApi(`/contents/src/content/blog?ref=${BRANCH}`, env.GITHUB_TOKEN);
    let maxId = 23;
    if (Array.isArray(blogFiles)) {
      for (const f of blogFiles) {
        const num = Number.parseInt(String(f.name).replace(/\.md$/, ''), 10);
        if (!Number.isNaN(num) && num > maxId) maxId = num;
      }
    }
    const nextId = maxId + 1;

    // 2. 如果未提供标题，自动取首行（若首行短）或生成日期标题
    const nowIso = toCNIsoString(new Date());
    if (!title && content) {
      const lines = content.split('\n');
      if (lines.length > 1 && lines[0].trim().length <= 36) {
        title = lines[0].replace(/^#+\s*/, '').trim();
        content = lines.slice(1).join('\n').trim();
      }
    }
    if (!title) {
      title = `手记 ${nowIso.slice(0, 10)}`;
    }

    // 3. 将上传的图片与 Live Photo .mov 视频构建为 Git Blobs
    const treeItems: Array<Record<string, string>> = [];

    for (const fileObj of uploadedFiles) {
      const blobRes = await ghApi('/git/blobs', env.GITHUB_TOKEN, {
        method: 'POST',
        body: JSON.stringify({
          content: fileObj.base64,
          encoding: 'base64',
        }),
      });
      treeItems.push({
        path: `public/img/${fileObj.filename}`,
        mode: '100644',
        type: 'blob',
        sha: blobRes.sha,
      });
    }

    let fullBody = content;
    if (imageMarkdowns.length > 0) {
      fullBody = fullBody
        ? `${fullBody}\n\n${imageMarkdowns.join('\n\n')}`
        : imageMarkdowns.join('\n\n');
    }
    if (!fullBody.includes('<!-- more -->')) {
      fullBody += '\n\n<!-- more -->\n';
    }

    const desc = content
      .replace(/[#*>`~_]+/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 150);

    const mdContent = [
      '---',
      `vanblogId: ${nextId}`,
      `title: ${JSON.stringify(title)}`,
      `description: ${JSON.stringify(desc)}`,
      `pubDate: ${JSON.stringify(nowIso)}`,
      `updatedDate: ${JSON.stringify(nowIso)}`,
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
      '',
      fullBody,
      '',
    ].join('\n');

    const mdBlob = await ghApi('/git/blobs', env.GITHUB_TOKEN, {
      method: 'POST',
      body: JSON.stringify({
        content: mdContent,
        encoding: 'utf-8',
      }),
    });

    treeItems.push({
      path: `src/content/blog/${nextId}.md`,
      mode: '100644',
      type: 'blob',
      sha: mdBlob.sha,
    });

    // 4. 创建新 Tree 与 Commit 并更新分支引用（单次原子提交同时包含文章与多张图片）
    const newTree = await ghApi('/git/trees', env.GITHUB_TOKEN, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    const newCommit = await ghApi('/git/commits', env.GITHUB_TOKEN, {
      method: 'POST',
      body: JSON.stringify({
        message: `post(apple): publish "${title}" (${imageUploads.length} image(s), ${videoUploads.length} live video(s))`,
        tree: newTree.sha,
        parents: [latestCommitSha],
      }),
    });

    await ghApi(`/git/refs/heads/${BRANCH}`, env.GITHUB_TOKEN, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
      }),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        id: nextId,
        title,
        imagesCount: imageUploads.length,
        liveVideosCount: videoUploads.length,
        url: `/posts/${nextId}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
