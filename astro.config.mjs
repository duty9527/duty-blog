import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// 绑定自定义域名后，将下方的 site 修改为你的正式域名（例如 https://duty.dev）
export default defineConfig({
  site: process.env.SITE_URL || 'https://duty-blog.pages.dev',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      wrap: false,
    },
  },
});
