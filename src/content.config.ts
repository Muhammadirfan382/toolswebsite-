import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SITE } from './data/site';

// The layout appends " | {brand}", so the stored title must leave room for it (≤ 60 total).
const TITLE_MAX = 60 - ` | ${SITE.brand}`.length;

const tools = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/tools' }),
  schema: z.object({
    /** Without the brand, which the layout appends. */
    title: z.string().max(TITLE_MAX, `Title too long: keep it to ${TITLE_MAX} characters before " | ${SITE.brand}".`),
    description: z.string().min(70).max(155),
    h1: z.string(),
    /** One sentence under the H1. */
    intro: z.string(),
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()),
    howToSteps: z.array(z.string()).min(3).max(5),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).min(5).max(8),
  }),
});

export const collections = { tools };
