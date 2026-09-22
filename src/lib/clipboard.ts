/** Copy text, falling back to a hidden textarea for browsers without the async Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    const done = document.execCommand('copy');
    ta.remove();
    return done;
  } catch {
    return false;
  }
}

/**
 * Wire a "Copy" button: copies getText() and briefly shows "Copied" (announced via aria-live).
 * The button text returns to its original label after 2 seconds.
 */
export function wireCopyButton(button: HTMLButtonElement, getText: () => string, status?: HTMLElement): void {
  const original = button.textContent ?? 'Copy';
  button.addEventListener('click', async () => {
    const text = getText();
    if (!text) return;
    const done = await copyText(text);
    const msg = done ? 'Copied' : 'Copy failed. Select the text and copy it manually.';
    button.textContent = done ? 'Copied ✓' : 'Copy failed';
    if (status) status.textContent = msg;
    setTimeout(() => {
      button.textContent = original;
      if (status) status.textContent = '';
    }, 2000);
  });
}
