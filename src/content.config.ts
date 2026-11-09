import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    vanblogId: z.number().optional(),
    title: z.string(),
    description: z.string().optional().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('随笔'),
    tags: z.array(z.string()).default([]),
    author: z.string().default('独语天涯'),
    top: z.number().default(0),
    hidden: z.boolean().default(false),
    private: z.boolean().default(false),
    pathname: z.string().default(''),
    viewer: z.number().default(0),
    visited: z.number().default(0),
    lastVisitedTime: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };

