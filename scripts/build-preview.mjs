// Preview build that includes draft guides (marked DRAFT, noindex, never in sitemap or RSS).
// For reviewing drafts locally only; never deploy this build.
import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, SHOW_DRAFTS: '1' },
});
process.exit(r.status ?? 1);
