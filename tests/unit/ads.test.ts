import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ADS_MODE, PLACEMENTS, PUB_ID_VALID, slotConfig } from '../../src/data/ads';
import { LIVE_CSP, adsHeadersIntegration } from '../../scripts/ads-headers.mjs';

describe('ads configuration', () => {
  it('is off until the owner turns it on with a real publisher id', () => {
    expect(ADS_MODE).toBe('off');
    expect(PUB_ID_VALID).toBe(false);
    expect(slotConfig('tool', 'after-result')).toBeNull();
  });

  it('never places a slot above or inside the tool (Phase 4 rule 1)', () => {
    // Tool slots are all below the tool area; the only one near it waits for a result.
    expect(PLACEMENTS.tool['after-result']!.afterResult).toBe(true);
    expect(Object.keys(PLACEMENTS.tool)).toEqual([
      'after-result',
      'below-howto',
      'in-content-1',
      'sidebar-desktop',
      'footer-anchor',
    ]);
    expect(PLACEMENTS.tool['footer-anchor']!.enabled).toBe(false);
    expect(PLACEMENTS.tool['sidebar-desktop']!.minWidth).toBe(1200);
  });

  it('reserves a height for every enabled slot', () => {
    for (const [page, slots] of Object.entries(PLACEMENTS)) {
      for (const [name, c] of Object.entries(slots)) {
        if (!c.enabled) continue;
        expect(c.height.desktop, `${page}/${name} desktop height`).toBeGreaterThan(0);
        if (!c.minWidth) expect(c.height.mobile, `${page}/${name} mobile height`).toBeGreaterThan(0);
      }
    }
  });
});

describe('live-mode security headers', () => {
  const STRICT = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";
  const headersFile = async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ads-headers-'));
    await writeFile(join(dir, '_headers'), `/*\n  Content-Security-Policy: ${STRICT}\n  X-Frame-Options: DENY\n`);
    return dir;
  };

  it('leaves the strict policy alone when ads are off or in placeholder mode', async () => {
    for (const mode of ['off', 'placeholder']) {
      const dir = await headersFile();
      await adsHeadersIntegration(mode).hooks['astro:build:done']({ dir: pathToFileURL(`${dir}/`) });
      expect(await readFile(join(dir, '_headers'), 'utf8')).toContain(`Content-Security-Policy: ${STRICT}`);
    }
  });

  it('allows Google ad and consent domains in live mode, but not on embeds', async () => {
    const dir = await headersFile();
    await adsHeadersIntegration('live').hooks['astro:build:done']({ dir: pathToFileURL(`${dir}/`) });
    const text = await readFile(join(dir, '_headers'), 'utf8');
    expect(text).toContain(`Content-Security-Policy: ${LIVE_CSP}`);
    expect(LIVE_CSP).toContain('https://pagead2.googlesyndication.com');
    expect(LIVE_CSP).toContain('https://fundingchoicesmessages.google.com'); // consent (CMP)
    expect(LIVE_CSP).toContain("object-src 'none'");
    expect(LIVE_CSP).toContain("frame-ancestors 'none'");
    // Embeds keep the strict policy, with the ad policy detached.
    expect(text).toMatch(/\/embed\/\*\n\s+! Content-Security-Policy\n\s+Content-Security-Policy: default-src 'self'/);
    expect(text).toContain('X-Frame-Options: DENY');
  });
});
