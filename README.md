# ~/duty-blog

极简 Monospace 终端风个人博客，基于 **Astro 5** 构建，专为 **Cloudflare Pages** 全球边缘部署设计。

## 特性一览

- **Monospace 终端美学**：`JetBrains Mono` 等宽字体排版、闪烁光标提示符、高信噪比单栏阅读布局。
- **亮/暗双色主题**：默认跟随系统或终端暗色，支持一键切换并自动同步代码块与评论区主题（零首屏闪烁）。
- **Content Collections 强类型内容管理**：
  - `src/content/blog/*.md`：长篇技术文章与随笔（支持按年份归档、`#tag` 标签过滤、自动阅读时长估算与目录 TOC）。
  - `src/content/notes/*.md`：短思考 / 碎碎念时间流，搭配 `/now` 当前状态页。
- **技术写作友好**：
  - 内置 **Shiki** 双主题构建期代码高亮 + 右上角一键复制按钮（`copy -> copied!`）。
  - 内置 **LaTeX 数学公式**（`remark-math` + `rehype-katex` 构建期预渲染，零客户端 JS 开销）。
  - 按需渲染 **Mermaid** 流程图。
- **独立博客标配**：自动生成 `/rss.xml` 与 `/sitemap-index.xml`，预置 **Giscus**（GitHub Discussions）懒加载评论组件。

---

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器 (http://localhost:4321)
npm run dev

# 3. 构建生产环境静态文件 (输出至 ./dist)
npm run build
```

---

## 部署到 Cloudflare Pages 并绑定自定义域名

### 第一步：连接 GitHub 仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入左侧 **Compute (Workers) -> Workers & Pages**。
2. 点击 **Create** -> 切换到 **Pages** 标签页 -> 选择 **Import an existing Git repository**。
3. 授权并选择 `duty9527/duty-blog` 仓库。
4. 配置构建参数：
   - **Project name**: `duty-blog`
   - **Production branch**: `main`
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. 点击 **Save and Deploy**，约 30 秒即可完成首次全球部署。

### 第二步：绑定你的自定义域名

1. 在 Cloudflare Pages 的 `duty-blog` 项目详情页，点击顶部 **Custom domains** 标签。
2. 点击 **Set up a custom domain**，输入你的域名（例如 `blog.yourdomain.com` 或根域名 `yourdomain.com`）。
3. Cloudflare 会自动添加 DNS CNAME 记录并签发免费 SSL 证书。
4. 绑定完成后，在 `astro.config.mjs` 中将 `site` 更新为你的正式域名（或在 Cloudflare Pages 环境变量中添加 `SITE_URL=https://你的域名`），以便生成的 RSS 与 Sitemap 使用正式域名。

---

## 日常写作指南

### 写一篇新文章

在 `src/content/blog/` 下新建一个 `.md` 文件（例如 `my-new-post.md`）：

```markdown
---
title: "文章标题"
description: "简短摘要，用于 SEO 与 RSS"
pubDate: 2026-11-10
tags: ["cloudflare", "notes"]
draft: false
---

这里开始写正文...
```

### 发一条短思考 (Note)

在 `src/content/notes/` 下新建一个 `.md` 文件（例如 `2026-11-10-idea.md`）：

```markdown
---
pubDate: 2026-11-10T10:30:00Z
tags: ["thought"]
---

写下你的简短想法，不需要标题。
```

### 开启 Giscus 评论（可选）

1. 在 GitHub 的 `duty9527/duty-blog` 仓库 **Settings -> General -> Features** 中勾选开启 **Discussions**。
2. 访问 [giscus.app/zh-CN](https://giscus.app/zh-CN)，输入仓库名 `duty9527/duty-blog`。
3. 将页面生成的 `data-repo-id` 和 `data-category-id` 填入 `src/consts.ts` 的 `GISCUS_CONFIG` 中，推送代码即可生效。
