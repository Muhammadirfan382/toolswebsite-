import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SITE } from './data/site';
import { TOOLS } from './data/tools';
import { GUIDE_CATEGORY_IDS } from './data/guides';

// The layout appends " | {brand}", so the stored title must leave room for it (≤ 60 total).
const TITLE_MAX = 60 - ` | ${SITE.brand}`.length;
const titleSchema = z
  .string()
  .max(TITLE_MAX, `Title too long: keep it to ${TITLE_MAX} characters before " | ${SITE.brand}".`);
const faqSchema = z.array(z.object({ q: z.string(), a: z.string() }));
const toolSlugs = TOOLS.map((t) => t.slug) as [string, ...string[]];

const tools = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/tools' }),
  schema: z.object({
    /** Without the brand, which the layout appends. */
    title: titleSchema,
    description: z.string().min(70).max(155),
    h1: z.string(),
    /** One sentence under the H1. */
    intro: z.string(),
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()),
    howToSteps: z.array(z.string()).min(3).max(5),
    faqs: faqSchema.min(5).max(8),
  }),
});

/**
 * Guides (Phase 3). Every guide starts as draft: true; only the owner publishes (rule 1).
 * The file's `slug` becomes the URL: /guides/<slug>.
 */
const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: ({ image }) =>
    z
      .object({
        title: titleSchema,
        /** Optional H1 if it should differ from the <title>. */
        h1: z.string().optional(),
        description: z.string().min(70).max(155),
        slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase words joined by hyphens.'),
        primaryKeyword: z.string(),
        secondaryKeywords: z.array(z.string()).default([]),
        category: z.enum(GUIDE_CATEGORY_IDS),
        relatedTools: z.array(z.enum(toolSlugs)).min(1, 'Link at least one tool.'),
        author: z.string().default(SITE.author),
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
        draft: z.boolean().default(true),
        /** 2–3 sentences that answer the question directly (featured-snippet box). */
        shortAnswer: z.string().min(40),
        /** What we actually did to check the steps (rule 6). */
        howWeTested: z.string().min(20),
        /** Our own screenshot from src/assets/guides/<slug>/ (see `npm run shots`). */
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        /** Only for genuinely step-by-step articles: adds HowTo structured data. */
        howToSteps: z.array(z.string()).min(2).optional(),
        faqs: faqSchema.default([]),
      })
      .refine((g) => g.updatedAt >= g.publishedAt, { message: 'updatedAt cannot be before publishedAt.', path: ['updatedAt'] })
      .refine((g) => !g.heroImage || g.heroAlt, { message: 'heroImage needs heroAlt text.', path: ['heroAlt'] })
      .refine((g) => !(GUIDE_CATEGORY_IDS as readonly string[]).includes(g.slug), {
        message: 'A guide slug cannot be the same as a category name.',
        path: ['slug'],
      }),
});

export const collections = { tools, guides };
