/**
 * Behavior for <ResultBox>. Tool scripts call `resultBoxFor(el).show(items)` and listen for the
 * bubbling 'start-over' event to reset their own state.
 */
import { describeSizeChange, formatBytes } from './format';
import { downloadBlob, loadZipLib, zipBlobs } from './download';

export interface ResultItem {
  name: string;
  blob: Blob;
  /** Size of the input file, to show before/after and % saved. */
  originalSize?: number;
  /** Extra line under the item, e.g. "1200 × 800 px" or "Could not reach 20 KB". */
  note?: string;
  /** Mark the note as a warning (target not reached, etc.). */
  warn?: boolean;
}

export interface ResultBoxController {
  show(items: ResultItem[], summary?: string): void;
  clear(): void;
  readonly items: ResultItem[];
}

const controllers = new WeakMap<HTMLElement, ResultBoxController>();

export function resultBoxFor(root: HTMLElement): ResultBoxController | undefined {
  return controllers.get(root);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initResultBox(root: HTMLElement): ResultBoxController {
  const existing = controllers.get(root);
  if (existing) return existing;

  const list = root.querySelector<HTMLUListElement>('[data-rb-list]')!;
  const summaryEl = root.querySelector<HTMLElement>('[data-rb-summary]')!;
  const zipBtn = root.querySelector<HTMLButtonElement>('[data-rb-zip]')!;
  const startOverBtn = root.querySelector<HTMLButtonElement>('[data-rb-start-over]')!;
  const heading = root.querySelector<HTMLElement>('[data-rb-heading]')!;
  const zipName = root.dataset.zipName || 'files.zip';

  let items: ResultItem[] = [];

  const sizeLine = (item: ResultItem) =>
    item.originalSize !== undefined
      ? `${formatBytes(item.originalSize)} → ${formatBytes(item.blob.size)} (${describeSizeChange(item.originalSize, item.blob.size)})`
      : formatBytes(item.blob.size);

  const thumbs = root.dataset.thumbs === 'true';
  let thumbUrls: string[] = [];

  const render = (summary?: string) => {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls = [];
    list.replaceChildren();
    list.classList.toggle('rb-thumbs', thumbs);
    items.forEach((item, i) => {
      const li = el('li', 'rb-item');
      if (thumbs && item.blob.type.startsWith('image/')) {
        const url = URL.createObjectURL(item.blob);
        thumbUrls.push(url);
        const img = el('img', 'rb-thumb');
        img.src = url;
        img.alt = `Preview of ${item.name}`;
        img.loading = 'lazy';
        li.append(img);
      }
      const info = el('div', 'rb-info');
      info.append(el('span', 'rb-name', item.name), el('span', 'rb-size', sizeLine(item)));
      if (item.note) info.append(el('span', item.warn ? 'rb-note rb-warn' : 'rb-note', item.note));
      const btn = el('button', i === 0 || items.length === 1 ? 'btn' : 'btn btn--secondary', 'Download');
      btn.type = 'button';
      btn.dataset.index = String(i);
      btn.setAttribute('aria-label', `Download ${item.name}`);
      li.append(info, btn);
      list.append(li);
    });

    const withOriginal = items.filter((i) => i.originalSize !== undefined);
    let text = summary ?? '';
    if (!summary && items.length > 1 && withOriginal.length === items.length) {
      const before = withOriginal.reduce((s, i) => s + (i.originalSize ?? 0), 0);
      const after = withOriginal.reduce((s, i) => s + i.blob.size, 0);
      text = `${items.length} files: ${formatBytes(before)} → ${formatBytes(after)} (${describeSizeChange(before, after)}).`;
    }
    summaryEl.textContent = text;
    summaryEl.hidden = !text;
    zipBtn.hidden = items.length < 2;
    zipBtn.textContent = 'Download all as ZIP';
    zipBtn.disabled = false;
    root.hidden = items.length === 0;
  };

  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-index]');
    const item = btn ? items[Number(btn.dataset.index)] : undefined;
    if (item) downloadBlob(item.blob, item.name);
  });

  zipBtn.addEventListener('click', async () => {
    zipBtn.disabled = true;
    zipBtn.textContent = 'Preparing ZIP…';
    try {
      const zip = await zipBlobs(items, (p) => {
        zipBtn.textContent = `Preparing ZIP… ${Math.round(p)}%`;
      });
      downloadBlob(zip, zipName);
      zipBtn.textContent = 'Download all as ZIP';
    } catch {
      zipBtn.textContent = navigator.onLine ? 'ZIP failed. Download files one by one.' : 'ZIP needs a connection. Download files one by one.';
    } finally {
      zipBtn.disabled = false;
    }
  });

  startOverBtn.addEventListener('click', () => {
    controller.clear();
    root.dispatchEvent(new CustomEvent('start-over', { bubbles: true }));
  });

  const controller: ResultBoxController = {
    show(next, summary) {
      items = [...next];
      render(summary);
      // Move focus to the results so keyboard and screen-reader users land on them.
      heading.focus();
    },
    clear() {
      items = [];
      render();
    },
    get items() {
      return [...items];
    },
  };
  controllers.set(root, controller);
  return controller;
}

export function initAllResultBoxes(): void {
  const boxes = document.querySelectorAll<HTMLElement>('[data-result-box]');
  boxes.forEach(initResultBox);
  // The user has picked files: fetch the ZIP library now so "Download all" works offline later.
  if (boxes.length) {
    document.addEventListener('files-changed', (e) => {
      if ((e as CustomEvent<File[]>).detail.length) void loadZipLib().catch(() => {});
    });
  }
}
