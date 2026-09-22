/** Keep calculator/tool inputs in the query string so results can be shared. */

export function readParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** Replace the query string (no new history entry). Empty values are dropped. */
export function writeParams(values: Record<string, string | number | null | undefined>): void {
  const params = new URLSearchParams();
  for (const [key, v] of Object.entries(values)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s !== '' && s !== 'NaN') params.set(key, s);
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  if (url !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, '', url);
  }
}
