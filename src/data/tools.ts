/** Registry of every tool on the site. Pages, navigation, cards and footer links derive from this. */

export type CategoryId = 'pdf' | 'image' | 'calc' | 'text-qr';

export type IconName =
  | 'merge'
  | 'compress'
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'image'
  | 'resize'
  | 'convert'
  | 'calendar'
  | 'percent'
  | 'grad'
  | 'scale'
  | 'qr'
  | 'text'
  | 'chars';

export interface Category {
  id: CategoryId;
  /** Short label used in the header nav. */
  navLabel: string;
  /** Page heading and card group title. */
  name: string;
  /** URL path, no trailing slash. */
  path: string;
  /** One line used on group headings. */
  blurb: string;
}

export interface Tool {
  /** URL slug without leading slash, e.g. "merge-pdf". */
  slug: string;
  name: string;
  category: CategoryId;
  /** Short card description (one sentence). */
  description: string;
  icon: IconName;
  /** 4–6 related slugs: same category first, then the closest cross-category tools. */
  related: string[];
  phase: 1;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'pdf',
    navLabel: 'PDF Tools',
    name: 'PDF Tools',
    path: '/pdf-tools',
    blurb: 'Merge, compress and convert PDF files in your browser.',
  },
  {
    id: 'image',
    navLabel: 'Image Tools',
    name: 'Image Tools',
    path: '/image-tools',
    blurb: 'Compress, resize and convert images without uploading them.',
  },
  {
    id: 'calc',
    navLabel: 'Calculators',
    name: 'Calculators',
    path: '/calculators',
    blurb: 'Age, percentage, GPA, CGPA and BMI calculators that show the formula.',
  },
  {
    id: 'text-qr',
    navLabel: 'Text & QR',
    name: 'Text & QR Tools',
    path: '/text-tools',
    blurb: 'Count words and characters, and create QR codes.',
  },
];

export const TOOLS: readonly Tool[] = [
  // PDF
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf',
    description: 'Combine several PDF files into one, in the order you choose.',
    icon: 'merge',
    related: ['compress-pdf', 'jpg-to-pdf', 'pdf-to-jpg', 'compress-image'],
    phase: 1,
  },
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf',
    description: 'Make a PDF file smaller, with an option to aim for a target size.',
    icon: 'compress',
    related: ['merge-pdf', 'jpg-to-pdf', 'pdf-to-jpg', 'compress-image'],
    phase: 1,
  },
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'pdf',
    description: 'Turn JPG, PNG or WebP images into a single PDF document.',
    icon: 'image-to-pdf',
    related: ['merge-pdf', 'compress-pdf', 'pdf-to-jpg', 'compress-image', 'resize-image'],
    phase: 1,
  },
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'pdf',
    description: 'Save each page of a PDF as a JPG image.',
    icon: 'pdf-to-image',
    related: ['jpg-to-pdf', 'compress-pdf', 'merge-pdf', 'compress-image', 'jpg-to-png'],
    phase: 1,
  },
  // Image
  {
    slug: 'compress-image',
    name: 'Compress Image',
    category: 'image',
    description: 'Reduce image file size, or compress to a target size like 20KB or 100KB.',
    icon: 'image',
    related: ['resize-image', 'jpg-to-png', 'png-to-jpg', 'compress-pdf', 'jpg-to-pdf'],
    phase: 1,
  },
  {
    slug: 'resize-image',
    name: 'Resize Image',
    category: 'image',
    description: 'Change image dimensions in pixels, percent, or with a ready-made preset.',
    icon: 'resize',
    related: ['compress-image', 'jpg-to-png', 'png-to-jpg', 'jpg-to-pdf'],
    phase: 1,
  },
  {
    slug: 'jpg-to-png',
    name: 'JPG to PNG',
    category: 'image',
    description: 'Convert JPG images to PNG format.',
    icon: 'convert',
    related: ['png-to-jpg', 'compress-image', 'resize-image', 'jpg-to-pdf'],
    phase: 1,
  },
  {
    slug: 'png-to-jpg',
    name: 'PNG to JPG',
    category: 'image',
    description: 'Convert PNG images to JPG, choosing a background for transparent areas.',
    icon: 'convert',
    related: ['jpg-to-png', 'compress-image', 'resize-image', 'jpg-to-pdf'],
    phase: 1,
  },
  // Calculators
  {
    slug: 'age-calculator',
    name: 'Age Calculator',
    category: 'calc',
    description: 'Find exact age in years, months and days, plus your next birthday.',
    icon: 'calendar',
    related: ['percentage-calculator', 'bmi-calculator', 'gpa-calculator', 'cgpa-calculator'],
    phase: 1,
  },
  {
    slug: 'percentage-calculator',
    name: 'Percentage Calculator',
    category: 'calc',
    description: 'Percent of a number, percent change, marks percentage and more.',
    icon: 'percent',
    related: ['cgpa-calculator', 'gpa-calculator', 'age-calculator', 'bmi-calculator'],
    phase: 1,
  },
  {
    slug: 'cgpa-calculator',
    name: 'CGPA Calculator',
    category: 'calc',
    description: 'Combine semester GPAs into a credit-weighted CGPA.',
    icon: 'grad',
    related: ['gpa-calculator', 'percentage-calculator', 'age-calculator', 'bmi-calculator', 'word-counter'],
    phase: 1,
  },
  {
    slug: 'gpa-calculator',
    name: 'GPA Calculator',
    category: 'calc',
    description: 'Calculate GPA from course grades and credit hours.',
    icon: 'grad',
    related: ['cgpa-calculator', 'percentage-calculator', 'age-calculator', 'bmi-calculator', 'word-counter'],
    phase: 1,
  },
  {
    slug: 'bmi-calculator',
    name: 'BMI Calculator',
    category: 'calc',
    description: 'Work out body mass index for adults in metric or imperial units.',
    icon: 'scale',
    related: ['age-calculator', 'percentage-calculator', 'gpa-calculator', 'cgpa-calculator'],
    phase: 1,
  },
  // Text & QR
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    category: 'text-qr',
    description: 'Create QR codes for links, WiFi, WhatsApp, contacts and more.',
    icon: 'qr',
    related: ['word-counter', 'character-counter', 'resize-image', 'compress-image'],
    phase: 1,
  },
  {
    slug: 'word-counter',
    name: 'Word Counter',
    category: 'text-qr',
    description: 'Count words, sentences and reading time as you type.',
    icon: 'text',
    related: ['character-counter', 'qr-code-generator', 'percentage-calculator', 'compress-pdf'],
    phase: 1,
  },
  {
    slug: 'character-counter',
    name: 'Character Counter',
    category: 'text-qr',
    description: 'Count characters and check text against common length limits.',
    icon: 'chars',
    related: ['word-counter', 'qr-code-generator', 'resize-image', 'compress-image'],
    phase: 1,
  },
];

/** Tools linked from the 404 page. An editorial pick, not based on usage data. */
export const FEATURED_SLUGS: readonly string[] = [
  'compress-pdf',
  'merge-pdf',
  'compress-image',
  'resize-image',
  'jpg-to-pdf',
  'qr-code-generator',
];

export function getTool(slug: string): Tool {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  return tool;
}

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export function toolsIn(id: CategoryId): Tool[] {
  return TOOLS.filter((t) => t.category === id);
}

export function toolPath(slug: string): string {
  return `/${slug}`;
}
