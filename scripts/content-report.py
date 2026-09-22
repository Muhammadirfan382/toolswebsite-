# Prints one row per tool page: title/description length, article words, FAQ count and how often
# the primary keyword appears in the article + FAQ text. Run after `npm run build`:
#   python scripts/content-report.py
import glob
import html
import os
import re

rows = []
for f in sorted(glob.glob('src/content/tools/*.md')):
    slug = os.path.basename(f)[:-3]
    s = open(f, encoding='utf-8').read()
    fm, body = s.split('---', 2)[1:]
    title = re.search(r'^title: (.*)$', fm, re.M).group(1) + ' | {{BRAND}}'
    desc = re.search(r'^description: (.*)$', fm, re.M).group(1)
    keyword = re.search(r'^primaryKeyword: (.*)$', fm, re.M).group(1)
    faqs = len(re.findall(r'^  - q:', fm, re.M))
    clean = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)
    words = len(re.findall(r"[A-Za-z0-9'’-]+", clean))
    page = open(f'dist/{slug}.html', encoding='utf-8').read()
    article = re.search(r'<article class="prose tool-content"[^>]*>(.*?)</article>', page, re.S).group(1)
    faq = re.search(r'<section class="faq".*?</section>', page, re.S).group(0)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', article + faq)).lower()
    count = len(re.findall(re.escape(keyword.lower()), text))
    rows.append((slug, title, len(title), len(desc), words, faqs, count))

print(f"{'slug':24} {'TL':>3} {'DL':>3} {'words':>5} {'FAQ':>3} {'kw':>3}  title")
for slug, title, tl, dl, words, faqs, count in rows:
    ok = tl <= 60 and dl <= 155 and 600 <= words <= 1000 and 5 <= faqs <= 8
    print(f"{slug:24} {tl:>3} {dl:>3} {words:>5} {faqs:>3} {count:>3}  {title}{'' if ok else '  <-- CHECK'}")
