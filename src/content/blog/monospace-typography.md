---
title: "终端排版美学：等宽字体与高信噪比阅读体验"
description: "探讨为什么 Monospace 等宽字体不仅适合写代码，也适合构建克制、专注的技术阅读界面。"
pubDate: 2026-10-28
tags: ["typography", "minimalism"]
---

大多数现代网页充斥着复杂的卡片阴影、渐变背景与浮动侧边栏。而回到终端（Terminal）界面时，一切信息都回归到了字符本身。

## 核心排版参数

在 `duty-blog` 中，我们固定了以下几个关键排版约束：

| 属性 | 设定值 | 设计考量 |
| :--- | :--- | :--- |
| 正文字体 | `JetBrains Mono` + 系统中文 | 字符宽度严格对齐，代码与正文无缝衔接 |
| 容器最大宽度 | `720px` (~68ch) | 符合人眼单行扫视的最舒适跨度 |
| 行高 (`line-height`) | `1.78` | 为中文与英文混排留出充足呼吸感 |

## ASCII 结构之美

在等宽字体下，纯文本 ASCII 图表天生拥有像素级对齐能力：

```text
+-------------------------------------------------------+
| ~/duty-blog                    ~/index ~/posts ~/now  |
+-------------------------------------------------------+
|                                                       |
| $ cat about.txt                                       |
| Minimalist notes on systems and edge architecture.    |
|                                                       |
| $ ls -lt ./posts                                      |
| 2026-11-09  Hello World: Astro x Cloudflare           |
| 2026-10-28  Monospace Typography & Signal-to-Noise    |
|                                                       |
+-------------------------------------------------------+
```
