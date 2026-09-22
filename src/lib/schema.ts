/** JSON-LD builders. No rating or review fields, ever (CLAUDE.md rule 2). */

type Json = Record<string, unknown>;

export function breadcrumbList(items: { name: string; path: string }[], site: URL | string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.path, site).href,
    })),
  };
}

export function howTo(name: string, steps: string[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function softwareApplication(opts: { name: string; description: string; url: string }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

/** Serialize for a <script type="application/ld+json"> tag, safe against "</script>". */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
