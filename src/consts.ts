export const SITE_TITLE = 'duty-blog';
export const SITE_PROMPT = '~/duty-blog';
export const SITE_TAGLINE = 'systems, edge computing, and quiet notes.';
export const SITE_DESCRIPTION =
  '个人极简终端风技术与随笔博客，基于 Astro 构建并部署于 Cloudflare。';
export const AUTHOR_NAME = 'duty9527';
export const GITHUB_URL = 'https://github.com/duty9527/duty-blog';

// Giscus 评论配置（前往 https://giscus.app 获取你的 repoId 和 categoryId 后填入即可启用）
export const GISCUS_CONFIG = {
  enabled: true,
  repo: 'duty9527/duty-blog',
  repoId: '', // 填入你的 data-repo-id（留空时展示配置指引卡片）
  category: 'Announcements',
  categoryId: '', // 填入你的 data-category-id
  mapping: 'pathname',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  lang: 'zh-CN',
};
