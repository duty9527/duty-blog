import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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
 */
function rehypeLocalizeImages() {
  return (tree) => {
    function walk(node) {
      if (!node) return;
      if (node.type === 'element' && node.tagName === 'img' && node.properties?.src) {
        const src = String(node.properties.src);
        const prefix1 = 'https://gcore.jsdelivr.net/gh/blue-duty/gitnote-images/img/';
        const prefix2 = 'https://dutycsd.top/static/img/';
        if (src.startsWith(prefix1)) {
          node.properties['data-original-src'] = src;
          node.properties.src = '/img/' + src.slice(prefix1.length);
        } else if (src.startsWith(prefix2)) {
          node.properties['data-original-src'] = src;
          node.properties.src = '/img/' + src.slice(prefix2.length);
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
  site: process.env.SITE_URL || 'https://dutycsd.top',
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

