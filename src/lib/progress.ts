/** Behavior for <Progress>. Screen-reader announcements are throttled to avoid chatter. */

export interface ProgressController {
  /** Determinate progress: e.g. set(3, 12, 'Page 3 of 12'). */
  set(done: number, total: number, label?: string): void;
  /** Unknown duration. */
  indeterminate(label: string): void;
  hide(): void;
}

const controllers = new WeakMap<HTMLElement, ProgressController>();

export function progressFor(root: HTMLElement): ProgressController | undefined {
  return controllers.get(root);
}

export function initProgress(root: HTMLElement): ProgressController {
  const existing = controllers.get(root);
  if (existing) return existing;
  const bar = root.querySelector<HTMLProgressElement>('progress')!;
  const label = root.querySelector<HTMLElement>('[data-progress-label]')!;
  const live = root.querySelector<HTMLElement>('[data-progress-live]')!;
  let lastAnnounce = 0;

  const announce = (text: string, force = false) => {
    const now = Date.now();
    if (force || now - lastAnnounce > 1500) {
      live.textContent = text;
      lastAnnounce = now;
    }
  };

  const controller: ProgressController = {
    set(done, total, text) {
      root.hidden = false;
      const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
      bar.max = 100;
      bar.value = pct;
      const shown = text ?? `${pct}%`;
      label.textContent = shown;
      announce(`${shown}${text ? ` (${pct}%)` : ''}`, done === 0);
    },
    indeterminate(text) {
      root.hidden = false;
      bar.removeAttribute('value');
      label.textContent = text;
      announce(text, true);
    },
    hide() {
      root.hidden = true;
      live.textContent = '';
    },
  };
  controllers.set(root, controller);
  return controller;
}

export function initAllProgress(): void {
  document.querySelectorAll<HTMLElement>('[data-progress]').forEach(initProgress);
}
