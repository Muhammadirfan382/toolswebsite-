/** Grow a textarea with its content, between its CSS min-height and `maxPx`. */
export function autogrow(textarea: HTMLTextAreaElement, maxPx = 800): () => void {
  const resize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight + 2, maxPx)}px`;
  };
  textarea.addEventListener('input', resize);
  resize();
  return resize;
}

/** Run `fn` at most once per `ms`, always with the latest call (trailing edge). */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** localStorage wrappers that never throw (private mode, blocked storage, quota). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
