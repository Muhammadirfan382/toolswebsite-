/**
 * Accessible tabs. Markup (without JS all panels show and the tab list stays hidden):
 *   <div data-tabs>
 *     <div role="tablist" hidden> <button role="tab" id="t-a" aria-controls="p-a">…</button> … </div>
 *     <div role="tabpanel" id="p-a" aria-labelledby="t-a">…</div> …
 *   </div>
 */
export interface TabsController {
  select(id: string, focus?: boolean): void;
  readonly current: string;
}

export function initTabs(root: HTMLElement, onChange?: (panelId: string) => void, initial?: string | null): TabsController {
  const tablist = root.querySelector<HTMLElement>('[role="tablist"]')!;
  const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')!)!);
  let current = '';

  const select = (panelId: string, focus = false) => {
    const index = Math.max(0, panels.findIndex((p) => p.id === panelId));
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i]!.hidden = !active;
    });
    current = panels[index]!.id;
    // Keep the selected tab visible in a horizontally scrolling tab row (without moving the page).
    const tab = tabs[index]!;
    if (tab.offsetLeft < tablist.scrollLeft || tab.offsetLeft + tab.offsetWidth > tablist.scrollLeft + tablist.clientWidth) {
      tablist.scrollLeft = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
    }
    if (focus) tab.focus();
    onChange?.(current);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(panels[i]!.id));
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const to =
        e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
        : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
        : e.key === 'Home' ? 0
        : e.key === 'End' ? last
        : -1;
      if (to >= 0) {
        e.preventDefault();
        select(panels[to]!.id, true);
      }
    });
  });

  tablist.hidden = false;
  root.classList.add('tabs-ready');
  select(initial && panels.some((p) => p.id === initial) ? initial : panels[0]!.id);

  return {
    select,
    get current() {
      return current;
    },
  };
}
