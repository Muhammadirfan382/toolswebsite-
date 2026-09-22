---
# SAMPLE ONLY: shows every block of the guide template. Keep it as draft: true or delete it.
# Real guides are written from the approved plan in docs/content-plan.md (Phase 3, Prompt 3).
title: Sample Guide – Layout Preview (Draft)
description: A sample draft that shows every part of the guide template, from the short answer box to FAQs. It is never published.
slug: sample-guide-layout
primaryKeyword: guide layout sample
secondaryKeywords: []
category: pdf
relatedTools:
  - merge-pdf
  - compress-pdf
author: '{{AUTHOR_NAME}}'
publishedAt: 2026-09-22
updatedAt: 2026-09-22
draft: true
shortAnswer: This box holds a 2–3 sentence direct answer to the question in the title. It appears at the top of every guide so readers (and search engines) get the answer immediately.
howWeTested: Describe what you actually did, for example which fixture files you used on which tool, with which settings, on which device and browser, and on what date.
faqs:
  - q: Where does this question appear?
    a: In the FAQ section under the article, and in FAQPage structured data.
  - q: Is this page ever published?
    a: No. It is a draft sample. Drafts are only built in development or in a SHOW_DRAFTS preview build.
---

## First section heading

Each level-2 heading becomes an entry in the "On this page" table of contents, which appears when an article has three or more of them.

Screenshots come from `npm run shots -- merge-pdf` and live in `src/assets/guides/<tool>/`. Reference them with a relative path so Astro optimizes them, for example:

`![Merge PDF with two files added](../../assets/guides/merge-pdf/02-files-added-desktop.webp)`

## Second section heading

Steps about other software (Windows, iPhone, Word and so on) carry a verify marker for the owner. <!-- VERIFY: example of a marker the owner removes after checking the current menus. -->

## Third section heading

The "Try it now" cards below are generated from `relatedTools`, and the related guides at the bottom come from guides that share tools or a category.
