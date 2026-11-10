import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * Remark plugin to transform VanBlog container directives like:
 * :::warning{title="注意"}
 * content
 * :::
 */
function remarkVanblogContainers() {
  return (tree) => {
    function walk(node) {
      if (!node || !Array.isArray(node.children)) return;
      for (const child of node.children) {
        if (child.type === 'paragraph' && Array.isArray(child.children)) {
          // Merge adjacent text nodes (e.g. split by smartypants)
          const merged = [];
          for (const c of child.children) {
            if (
              c.type === 'text' &&
              merged.length > 0 &&
              merged[merged.length - 1].type === 'text'
            ) {
              merged[merged.length - 1].value += c.value;
            } else {
              merged.push(c);
            }
          }
          child.children = merged;
          const first = child.children[0];
          const last = child.children[child.children.length - 1];
          if (
            first &&
            first.type === 'text' &&
            first.value.startsWith(':::') &&
            last &&
            last.type === 'text' &&
            last.value.trimEnd().endsWith(':::')
          ) {
            const match = first.value.match(
              /^:::(\w+)(?:\{title=["“”']([^"“”']*)["“”']\})?\s*\n?/
            );
            if (match) {
              const kind = match[1] || 'info';
              const title = match[2] || kind.toUpperCase();
              first.value = first.value.slice(match[0].length);
              last.value = last.value.replace(/\n?:::\s*$/, '');
              child.data = child.data || {};
              child.data.hName = 'div';
              child.data.hProperties = {
                className: [`callout`, `callout-${kind}`],
                'data-title': title,
              };
            }
          }
        }
        walk(child);
      }
    }
    walk(tree);
  };
}

/**
 * Rehype plugin to map gitnote-images / VanBlog static image URLs to local /img/ assets
 * and automatically enable Apple Live Photo playback when a companion .mov/.mp4 exists.
 */
function rehypeLocalizeImages() {
  return (tree) => {
    function walk(node) {
      if (!node) return;
      if (
        node.type === 'element' &&
        node.tagName === 'div' &&
        Array.isArray(node.properties?.className) &&
        node.properties.className.includes('callout') &&
        Array.isArray(node.children) &&
        node.children[0]?.type === 'text'
      ) {
        const m = node.children[0].value.match(/^\{title=["“”']?([^"“”'}]+)["“”']?\}\s*/);
        if (m) {
          node.properties['data-title'] = m[1];
          node.children[0].value = node.children[0].value.slice(m[0].length);
        }
      }
      if (node.type === 'element' && node.tagName === 'img' && node.properties?.src) {
        let src = String(node.properties.src);
        const prefix1 = 'https://gcore.jsdelivr.net/gh/blue-duty/gitnote-images/img/';
        const prefix2 = 'https://dutycsd.top/static/img/';
        if (src.startsWith(prefix1)) {
          node.properties['data-original-src'] = src;
          src = '/img/' + src.slice(prefix1.length);
          node.properties.src = src;
        } else if (src.startsWith(prefix2)) {
          node.properties['data-original-src'] = src;
          src = '/img/' + src.slice(prefix2.length);
          node.properties.src = src;
        }

        // 1. 支持在 Markdown 中显式指定实况视频: ![live](/img/photo.jpg?live=/img/photo.mov)
        const qIdx = src.indexOf('?');
        if (qIdx !== -1) {
          const cleanPath = src.slice(0, qIdx);
          const params = new URLSearchParams(src.slice(qIdx + 1));
          const liveVideo = params.get('live') || params.get('video');
          if (liveVideo) {
            node.properties.src = cleanPath;
            node.properties['data-live-video'] = liveVideo;
            src = cleanPath;
          }
        }

        // 2. 自动检测同名实况视频文件（如 public/img/xxx.jpg 同目录下存在 xxx.mov / xxx.MOV / xxx.mp4）
        if (!node.properties['data-live-video'] && src.startsWith('/img/')) {
          const baseNoExt = src.replace(/\.[^./?]+$/, '');
          for (const ext of ['.mov', '.MOV', '.mp4', '.MP4']) {
            const candidateRel = `${baseNoExt}${ext}`;
            const candidateAbs = path.join(PUBLIC_DIR, candidateRel);
            if (fs.existsSync(candidateAbs)) {
              node.properties['data-live-video'] = candidateRel;
              break;
            }
          }
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child);
      }
    }
    walk(tree);
  };
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://blog.du7y.com',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkVanblogContainers, [remarkMath, { singleDollarTextMath: false }]],
    rehypePlugins: [rehypeKatex, rehypeLocalizeImages],
    shikiConfig: {
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      wrap: false,
    },
  },
});

