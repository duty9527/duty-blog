/**
 * Cloudflare Pages Function: POST /api/publish
 *
 * 提供简洁的个人博客发布 Webhook 接口。
 * 在 Cloudflare Pages 后台配置环境变量：
 * - PUBLISH_SECRET: 你自定义的接口密钥
 * - GITHUB_TOKEN: 拥有 duty9527/duty-blog Contents 读写权限的 GitHub Token
 *
 * 请求示例:
 * POST https://dutycsd.top/api/publish
 * Authorization: Bearer <PUBLISH_SECRET>
 * Content-Type: application/json
 * {
 *   "title": "可选标题",
 *   "content": "手记或备忘录正文...",
 *   "category": "随笔",
 *   "tags": "手记,随笔"
 * }
 */

interface Env {
  PUBLISH_SECRET?: string;
  GITHUB_TOKEN?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!env.PUBLISH_SECRET || !env.GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Server not configured: missing PUBLISH_SECRET or GITHUB_TOKEN in Cloudflare Pages environment variables.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== env.PUBLISH_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const content = String(body.content || '').trim();
  if (!content) {
    return new Response(JSON.stringify({ ok: false, error: 'content is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ghRes = await fetch('https://api.github.com/repos/duty9527/duty-blog/dispatches', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'duty-blog-cloudflare-pages-webhook',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'publish-apple',
      client_payload: {
        title: String(body.title || ''),
        content,
        category: String(body.category || '随笔'),
        tags: Array.isArray(body.tags) ? body.tags.join(',') : String(body.tags || '手记,随笔'),
        source: String(body.source || 'apple-webhook'),
        date: String(body.date || new Date().toISOString()),
      },
    }),
  });

  if (!ghRes.ok) {
    const errText = await ghRes.text();
    return new Response(
      JSON.stringify({ ok: false, status: ghRes.status, error: errText }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Triggered blog publish workflow successfully.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
