/** Before/after slider behavior. Object URLs are revoked when replaced or hidden. */
export interface CompareController {
  show(before: Blob, after: Blob, caption: string): void;
  hide(): void;
}

export function initCompare(root: HTMLElement): CompareController {
  const before = root.querySelector<HTMLImageElement>('[data-before]')!;
  const after = root.querySelector<HTMLImageElement>('[data-after]')!;
  const range = root.querySelector<HTMLInputElement>('[data-range]')!;
  const caption = root.querySelector<HTMLElement>('[data-caption]')!;
  const frame = root.querySelector<HTMLElement>('.frame')!;
  let urls: string[] = [];

  const setPos = () => frame.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', setPos);
  setPos();

  const release = () => {
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = [];
  };

  return {
    show(b, a, text) {
      release();
      urls = [URL.createObjectURL(b), URL.createObjectURL(a)];
      before.src = urls[0]!;
      after.src = urls[1]!;
      caption.textContent = text;
      root.hidden = false;
    },
    hide() {
      release();
      before.removeAttribute('src');
      after.removeAttribute('src');
      root.hidden = true;
    },
  };
}
