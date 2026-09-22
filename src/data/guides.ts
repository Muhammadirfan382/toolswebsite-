/** Guide categories. URLs: /guides/<id>. A guide slug must never equal a category id. */

export const GUIDE_CATEGORY_IDS = ['pdf', 'image', 'background', 'qr', 'writing', 'comparison'] as const;
export type GuideCategoryId = (typeof GUIDE_CATEGORY_IDS)[number];

export interface GuideCategory {
  id: GuideCategoryId;
  name: string;
  /** Page title (brand is appended). */
  title: string;
  description: string;
  intro: string;
}

export const GUIDE_CATEGORIES: readonly GuideCategory[] = [
  {
    id: 'pdf',
    name: 'PDF guides',
    title: 'PDF Guides – Merge, Compress and Convert',
    description: 'Step-by-step PDF guides: merging, shrinking and converting PDF files on phones and computers, tested with our free browser tools.',
    intro: 'Practical answers to common PDF problems, with steps tested on our own tools.',
  },
  {
    id: 'image',
    name: 'Image guides',
    title: 'Image Guides – Resize, Compress and Convert',
    description: 'Guides to resizing, compressing and converting photos for forms, social media and email, tested with our free browser tools.',
    intro: 'How to get photos to the size, shape and format you need.',
  },
  {
    id: 'background',
    name: 'Background guides',
    title: 'Photo Background Guides',
    description: 'Guides to photo backgrounds for ID photos, product pictures and profile images, with honest notes on what works and what does not.',
    intro: 'Getting clean, acceptable backgrounds for photos.',
  },
  {
    id: 'qr',
    name: 'QR code guides',
    title: 'QR Code Guides – Create, Print and Test',
    description: 'How to create, print and test QR codes for links, WiFi, menus and contact cards, with tips that keep codes scannable.',
    intro: 'Making QR codes that scan reliably, wherever you use them.',
  },
  {
    id: 'writing',
    name: 'Writing guides',
    title: 'Writing Guides – Word Counts and Text Limits',
    description: 'Guides to word counts, reading time and character limits for essays, applications and social posts, with clear assumptions.',
    intro: 'Word counts, length limits and reading time, explained.',
  },
  {
    id: 'comparison',
    name: 'Comparisons',
    title: 'Tool Comparisons and Alternatives',
    description: 'Neutral, dated comparisons of our free browser tools with other PDF and image services, so you can pick what suits you.',
    intro: 'Fair comparisons, checked on the date shown on each page.',
  },
];

export function getGuideCategory(id: GuideCategoryId): GuideCategory {
  return GUIDE_CATEGORIES.find((c) => c.id === id)!;
}
