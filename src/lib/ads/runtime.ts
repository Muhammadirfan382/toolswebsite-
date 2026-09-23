/**
 * Ad runtime (only included on pages that have ad slots and only when ads are not "off").
 *
 * - The AdSense script loads once, after the first user interaction or when the browser is idle,
 *   never during initial render (Phase 4 rule 2).
 * - A slot requests its ad only when it comes near the viewport (IntersectionObserver), is
 *   visible at the current width, and no file is being processed (rule 1).
 * - "after-result" slots stay hidden (no reserved space) until a result is shown; on pages
 *   without a result box (calculators, text tools) they show immediately.
 * - Unfilled slots keep their reserved height while on screen (collapsing a visible slot would
 *   shift the page); they collapse only when fully off screen, where the shift is not visible
 *   and does not count toward CLS.
 * Consent: with Google's Privacy & messaging (a Google-certified CMP) configured in AdSense,
 * the AdSense script shows the consent message to EEA/UK/CH visitors and waits for it before
 * personalized ads (rule 4). We never build our own banner.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    googlefc?: { callbackQueue?: (() => void)[]; showRevocationMessage?: () => void };
  }
}

const SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

function slots(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.ad-slot')];
}

const isProcessing = () => Boolean(document.querySelector('.file-drop.is-busy'));

function fitsWidth(slot: HTMLElement): boolean {
  const min = Number(slot.dataset.minWidth ?? 0);
  return window.innerWidth >= min;
}

/* After-result slots ----------------------------------------------------- */
function setupAfterResult(): void {
  const waiting = slots().filter((s) => s.dataset.afterResult === 'true');
  if (!waiting.length) return;
  const reveal = () => waiting.forEach((s) => s.classList.remove('ad-slot--wait'));
  if (!document.querySelector('[data-result-box]')) return reveal();
  document.addEventListener('result-shown', reveal, { once: true });
}

/* Live mode -------------------------------------------------------------- */
let scriptRequested = false;
function loadScriptOnce(client: string): void {
  if (scriptRequested) return;
  scriptRequested = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `${SCRIPT_BASE}?client=${encodeURIComponent(client)}`;
  s.crossOrigin = 'anonymous';
  document.head.append(s);
}

function whenInteractiveOrIdle(cb: () => void): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    events.forEach((e) => window.removeEventListener(e, run));
    cb();
  };
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
  events.forEach((e) => window.addEventListener(e, run, { once: true, passive: true }));
  const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 3000));
  idle(run, { timeout: 5000 });
}

function requestAd(slot: HTMLElement): void {
  if (slot.dataset.requested) return;
  if (isProcessing()) {
    // Try again once processing has finished.
    setTimeout(() => requestAd(slot), 1000);
    return;
  }
  slot.dataset.requested = 'true';
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}

function watchUnfilled(slot: HTMLElement): void {
  const ins = slot.querySelector('ins.adsbygoogle');
  if (!ins) return;
  const check = () => {
    if (ins.getAttribute('data-ad-status') !== 'unfilled') return;
    const r = slot.getBoundingClientRect();
    const offscreen = r.bottom < 0 || r.top > window.innerHeight;
    if (offscreen) slot.classList.add('ad-slot--collapsed');
  };
  new MutationObserver(check).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
  window.addEventListener('scroll', check, { passive: true });
}

function setupLive(): void {
  const live = slots().filter((s) => s.dataset.adMode === 'live');
  if (!live.length) return;
  const client = live[0]!.querySelector<HTMLElement>('ins.adsbygoogle')?.dataset.adClient;
  if (!client) return;

  whenInteractiveOrIdle(() => {
    loadScriptOnce(client);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const slot = e.target as HTMLElement;
          const visible = !slot.classList.contains('ad-slot--wait') && fitsWidth(slot);
          if (e.isIntersecting && visible) {
            requestAd(slot);
            io.unobserve(slot);
          }
        }
      },
      { rootMargin: '300px 0px' },
    );
    live.forEach((s) => {
      watchUnfilled(s);
      io.observe(s);
    });
    // After-result slots become observable once revealed.
    document.addEventListener('result-shown', () => live.forEach((s) => io.observe(s)));
  });
}

/* "Privacy settings" link: reopen the CMP message --------------------------- */
function setupPrivacySettings(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-privacy-settings]').forEach((btn) =>
    btn.addEventListener('click', () => {
      window.googlefc = window.googlefc || {};
      window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
      window.googlefc.callbackQueue.push(() => window.googlefc?.showRevocationMessage?.());
    }),
  );
}

setupAfterResult();
setupLive();
setupPrivacySettings();

export {};
