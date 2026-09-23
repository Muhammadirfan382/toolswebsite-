# Deploying to Cloudflare Pages

Everything in the repository is ready. The steps below need your accounts, so they are yours to do.
Replace `{{DOMAIN}}` with your real domain (for example `example.com`) as you go.

## 0. Sharing a test link before launch

For feedback rounds you do not need the real domain. Pick whichever fits the testers:

**Same Wi-Fi (no accounts, instant).** Build once, then serve the build to the network:

```bash
npm run build && npm run serve:lan
```

Testers open `http://<your-computer-ip>:4399` (find the IP with `ipconfig`; the Wi-Fi adapter's
IPv4 address). The `--lan` flag drops `upgrade-insecure-requests` from the CSP, which is the one
production header that cannot work over plain `http` on an IP address; everything else is served
exactly as in production. Windows Firewall asks once to allow Node. Stop the server with `Ctrl+C`,
and it is unreachable again.

**A public link (free, ~5 minutes, needs a Cloudflare login).** From the project folder:

```bash
npm run deploy:share
```

That builds `dist-share/` — the production output, but with `noindex` on every page, a
disallow-all `robots.txt` and no sitemap, so a test link can never turn into a second copy of the
site in Google — and then runs `wrangler pages deploy`. The first run opens a browser to log in and
asks to create the project (`everyday-tools-preview`, separate from the production one in step 2)
and for a production branch name; `main` is fine. It ends by printing the `*.pages.dev` URL to
share. Deploy again any time by re-running the same command. Remember the pages still say
`{{BRAND}}` and link to `example.com` until the placeholders are filled.

**A drag-and-drop link.** Zip the contents of `dist/` and drop the zip on
<https://app.netlify.com/drop>. It gives a random URL that also serves `_headers` and `_redirects`.

A shared preview should not be indexed while it is a test. `npm run build:portable` writes
`dist-portable/`, a copy with relative links, `noindex` on every page and no canonical or sitemap —
use that one for hosts you do not control, or to open the site from a folder or a USB stick
(`dist-portable/index.html` works by double-clicking; page links point at the `.html` files).

## 1. Before the first deploy

1. Fill in the placeholders:
   - `src/data/site.ts`: `DOMAIN`, `brand`, `email`.
   - `/about`, `/privacy-policy`, `/terms`: the `[TODO: …]` placeholders (who runs the site, dates,
     hosting provider, governing law).
   - `public/og-default.png`: a designed 1200 × 630 image for link previews.
2. Check the ⚠ VERIFY list in `AUDIT.md` against official sources and fill each `source` field in
   `src/data/presets.ts` and `src/data/limits.ts`. Presets with missing sizes stay hidden automatically.
3. Run the full check locally. Everything must pass:
   ```bash
   npm run verify
   ```
   Title lengths are checked with your real brand, so a long brand name may require shorter titles in
   `src/content/tools/*.md`. The build tells you which ones.
4. Commit and push the repository to GitHub.

## 2. Create the Cloudflare Pages project

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the GitHub repository and the production branch (`master` or `main`).
3. Build settings:
   | Setting | Value |
   | --- | --- |
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(leave empty)* |
   | Environment variable | `NODE_VERSION` = `24` (any current LTS, 22.12 or newer) |
4. Save and deploy. The first build gives you a `*.pages.dev` address. Open it and try a few tools.

`public/_headers` (security headers, caching) and `public/_redirects` (trailing slash → no slash) are
applied by Cloudflare automatically. Check them:

```bash
curl -I https://YOUR-PROJECT.pages.dev/merge-pdf
```

You should see `content-security-policy`, `x-content-type-options: nosniff`,
`referrer-policy: strict-origin-when-cross-origin` and `permissions-policy`.

## 3. Custom domain and HTTPS

1. In the Pages project, open **Custom domains → Set up a custom domain** and add `{{DOMAIN}}`.
   If the domain's DNS is on Cloudflare, the record is created for you. HTTPS certificates are issued
   automatically; this can take a few minutes.
2. Add `www.{{DOMAIN}}` as a second custom domain too.
3. Redirect **www → apex** (the site's canonical URLs use the apex domain, without www):
   **Rules → Redirect Rules → Create rule**, or use the "Redirect from WWW to root" template:
   - When: hostname equals `www.{{DOMAIN}}`
   - Then: dynamic redirect to `concat("https://{{DOMAIN}}", http.request.uri.path)`, status **301**,
     preserve query string.
4. **SSL/TLS → Edge Certificates**: turn on **Always Use HTTPS**.
5. Check: `https://www.{{DOMAIN}}/merge-pdf` and `http://{{DOMAIN}}/merge-pdf` must both end at
   `https://{{DOMAIN}}/merge-pdf`.

(If you prefer www as the main address instead, tell me: `DOMAIN` in `src/data/site.ts` and the redirect
direction both need to change so canonical URLs match.)

## 4. Google Search Console

1. Go to <https://search.google.com/search-console> → **Add property → Domain** → enter `{{DOMAIN}}`.
2. Google shows a TXT record. In Cloudflare **DNS → Records → Add record**: type `TXT`, name `@`,
   content = the value Google gave you. Save, then press **Verify** in Search Console
   (DNS changes can take a few minutes).
3. **Sitemaps**: submit `https://{{DOMAIN}}/sitemap-index.xml`.
4. **URL Inspection → Request indexing** for the home page and the 16 tool pages (17 URLs):
   ```
   https://{{DOMAIN}}/
   https://{{DOMAIN}}/merge-pdf
   https://{{DOMAIN}}/compress-pdf
   https://{{DOMAIN}}/jpg-to-pdf
   https://{{DOMAIN}}/pdf-to-jpg
   https://{{DOMAIN}}/compress-image
   https://{{DOMAIN}}/resize-image
   https://{{DOMAIN}}/jpg-to-png
   https://{{DOMAIN}}/png-to-jpg
   https://{{DOMAIN}}/age-calculator
   https://{{DOMAIN}}/percentage-calculator
   https://{{DOMAIN}}/cgpa-calculator
   https://{{DOMAIN}}/gpa-calculator
   https://{{DOMAIN}}/bmi-calculator
   https://{{DOMAIN}}/qr-code-generator
   https://{{DOMAIN}}/word-counter
   https://{{DOMAIN}}/character-counter
   ```
   Google limits how many requests you can make per day; if you hit the limit, continue the next day.
5. Check **Pages** in Search Console weekly. Indexing a new domain can take days to weeks.

## 5. Bing Webmaster Tools

Go to <https://www.bing.com/webmasters>, sign in, and choose **Import from Google Search Console**.
This copies the verified site and the sitemap.

## 6. Analytics (optional, only if you decide to)

The site currently has no analytics and no cookies, and the privacy policy says so. If you add Google
Analytics 4 later:

- add a cookie/consent notice first,
- update `/privacy-policy`,
- add the Google Tag Manager / Analytics domains to the Content-Security-Policy in `public/_headers`,
- never send file names, text or other tool input as analytics events.

## 7. After launch

- Run <https://pagespeed.web.dev> on the home page and a few tool pages to confirm real-world scores.
- Test on a real iPhone and Android phone: pick files from Photos/Files and download results.
- Keep `npm run verify` passing before every deploy; the GitHub Actions workflow in
  `.github/workflows/ci.yml` runs the same checks on every push.
