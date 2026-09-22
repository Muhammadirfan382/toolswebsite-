/**
 * Behavior for <FileDrop>. Auto-initialized by the component; tool scripts get the controller with
 * `fileDropFor(element)` and listen for the bubbling 'files-changed' event (detail: File[]).
 */
import { formatBytes } from './format';
import { moveItem, parseAccept, validateFile } from './file-validation';

export type FilesChangedEvent = CustomEvent<File[]>;

export interface FileDropController {
  readonly files: File[];
  clear(): void;
  setBusy(busy: boolean): void;
  showError(message: string): void;
}

const controllers = new WeakMap<HTMLElement, FileDropController>();

export function fileDropFor(root: HTMLElement): FileDropController | undefined {
  return controllers.get(root);
}

let windowGuardInstalled = false;
/** Stop the browser opening a file that is dropped just outside the drop zone. */
function installWindowDropGuard() {
  if (windowGuardInstalled) return;
  windowGuardInstalled = true;
  for (const type of ['dragover', 'drop'] as const) {
    window.addEventListener(type, (e) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    });
  }
}

function makeButton(label: string, text: string, className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  b.textContent = text;
  return b;
}

export function initFileDrop(root: HTMLElement): FileDropController {
  const existing = controllers.get(root);
  if (existing) return existing;

  const input = root.querySelector<HTMLInputElement>('[data-fd-input]')!;
  const chooseBtn = root.querySelector<HTMLButtonElement>('[data-fd-choose]')!;
  const zone = root.querySelector<HTMLElement>('[data-fd-zone]')!;
  const list = root.querySelector<HTMLOListElement>('[data-fd-list]')!;
  const errorBox = root.querySelector<HTMLElement>('[data-fd-error]')!;
  const status = root.querySelector<HTMLElement>('[data-fd-status]')!;

  const multiple = root.dataset.multiple === 'true';
  const tokens = parseAccept(root.dataset.accept ?? '');
  const acceptLabel = root.dataset.acceptLabel ?? 'a supported file';
  const maxBytes = Number(root.dataset.maxSizeMb ?? '50') * 1024 * 1024;
  const allowPaste = root.dataset.paste === 'true';

  let files: File[] = [];
  let busy = false;
  let dragIndex: number | null = null;

  const emit = () =>
    root.dispatchEvent(new CustomEvent<File[]>('files-changed', { detail: [...files], bubbles: true }));

  const showErrors = (messages: string[]) => {
    errorBox.replaceChildren(
      ...messages.map((m) => {
        const p = document.createElement('p');
        p.textContent = m;
        return p;
      }),
    );
    errorBox.hidden = messages.length === 0;
  };

  const announce = (msg: string) => {
    status.textContent = msg;
  };

  const render = (focus?: { index: number; action: 'up' | 'down' | 'remove' }) => {
    list.replaceChildren();
    list.hidden = files.length === 0;
    files.forEach((file, i) => {
      const li = document.createElement('li');
      li.className = 'fd-item';
      li.draggable = multiple && files.length > 1;
      li.dataset.index = String(i);

      if (multiple && files.length > 1) {
        const handle = document.createElement('span');
        handle.className = 'fd-handle';
        handle.setAttribute('aria-hidden', 'true');
        handle.textContent = '⋮⋮';
        li.append(handle);
      }

      const info = document.createElement('span');
      info.className = 'fd-info';
      const name = document.createElement('span');
      name.className = 'fd-name';
      name.textContent = file.name;
      const size = document.createElement('span');
      size.className = 'fd-size';
      size.textContent = formatBytes(file.size);
      info.append(name, size);
      li.append(info);

      const actions = document.createElement('span');
      actions.className = 'fd-actions';
      if (multiple && files.length > 1) {
        const up = makeButton(`Move ${file.name} up`, '↑', 'fd-btn');
        up.dataset.action = 'up';
        up.disabled = i === 0 || busy;
        const down = makeButton(`Move ${file.name} down`, '↓', 'fd-btn');
        down.dataset.action = 'down';
        down.disabled = i === files.length - 1 || busy;
        actions.append(up, down);
      }
      const remove = makeButton(`Remove ${file.name}`, '✕', 'fd-btn fd-remove');
      remove.dataset.action = 'remove';
      remove.disabled = busy;
      actions.append(remove);
      li.append(actions);
      list.append(li);
    });

    if (focus) {
      if (focus.action === 'remove') {
        const target =
          list.querySelectorAll<HTMLButtonElement>('.fd-remove')[Math.min(focus.index, files.length - 1)];
        (target ?? chooseBtn).focus();
      } else {
        const btn = list.querySelector<HTMLButtonElement>(
          `li[data-index="${focus.index}"] [data-action="${focus.action}"]`,
        );
        const fallback = list.querySelector<HTMLButtonElement>(
          `li[data-index="${focus.index}"] [data-action]:not([disabled])`,
        );
        (btn && !btn.disabled ? btn : fallback)?.focus();
      }
    }
  };

  const addFiles = (incoming: File[]) => {
    if (busy || incoming.length === 0) return;
    const errors: string[] = [];
    const accepted: File[] = [];
    for (const file of incoming) {
      const error = validateFile(file, { tokens, acceptLabel, maxBytes });
      if (error) errors.push(error);
      else accepted.push(file);
    }
    if (!multiple && accepted.length > 1) {
      errors.push('Only one file can be used here, so the first valid file was kept.');
      accepted.length = 1;
    }
    showErrors(errors);
    if (accepted.length === 0) return;
    files = multiple ? [...files, ...accepted] : accepted;
    render();
    announce(
      accepted.length === 1
        ? `Added ${accepted[0]!.name}. ${files.length} ${files.length === 1 ? 'file' : 'files'} selected.`
        : `Added ${accepted.length} files. ${files.length} files selected.`,
    );
    emit();
  };

  chooseBtn.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    addFiles([...(input.files ?? [])]);
    input.value = ''; // allow choosing the same file again
  });

  // Drag and drop onto the zone
  let dragDepth = 0;
  zone.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    zone.classList.add('is-over');
  });
  zone.addEventListener('dragover', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = busy ? 'none' : 'copy';
  });
  zone.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) zone.classList.remove('is-over');
  });
  zone.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    dragDepth = 0;
    zone.classList.remove('is-over');
    addFiles([...e.dataTransfer.files]);
  });
  installWindowDropGuard();

  // Paste images (Ctrl+V / Cmd+V) anywhere on the page, unless typing in a field.
  if (allowPaste) {
    document.addEventListener('paste', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const pasted = [...(e.clipboardData?.files ?? [])];
      if (pasted.length === 0) return;
      e.preventDefault();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      addFiles(
        pasted.map((f, i) =>
          f.name && f.name !== 'image.png'
            ? f
            : new File([f], `pasted-${stamp}${pasted.length > 1 ? `-${i + 1}` : ''}.${f.type.split('/')[1] ?? 'png'}`, {
                type: f.type,
              }),
        ),
      );
    });
  }

  // List buttons: move up/down, remove
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    const li = btn?.closest<HTMLLIElement>('li');
    if (!btn || !li || busy) return;
    const i = Number(li.dataset.index);
    const file = files[i];
    if (!file) return;
    const action = btn.dataset.action as 'up' | 'down' | 'remove';
    if (action === 'remove') {
      files = files.filter((_, j) => j !== i);
      render({ index: i, action });
      announce(`Removed ${file.name}. ${files.length} ${files.length === 1 ? 'file' : 'files'} left.`);
    } else {
      const to = action === 'up' ? i - 1 : i + 1;
      files = moveItem(files, i, to);
      render({ index: to, action });
      announce(`Moved ${file.name} to position ${to + 1} of ${files.length}.`);
    }
    showErrors([]);
    emit();
  });

  // Mouse drag-to-reorder within the list
  list.addEventListener('dragstart', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLLIElement>('li');
    if (!li || busy) return;
    dragIndex = Number(li.dataset.index);
    li.classList.add('is-dragging');
    e.dataTransfer?.setData('text/plain', String(dragIndex));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
  });
  list.addEventListener('drop', (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
    const li = (e.target as HTMLElement).closest<HTMLLIElement>('li');
    const to = li ? Number(li.dataset.index) : files.length - 1;
    const moved = files[dragIndex];
    if (moved && to !== dragIndex) {
      files = moveItem(files, dragIndex, to);
      render();
      announce(`Moved ${moved.name} to position ${to + 1} of ${files.length}.`);
      emit();
    }
    dragIndex = null;
  });
  list.addEventListener('dragend', () => {
    dragIndex = null;
    list.querySelector('.is-dragging')?.classList.remove('is-dragging');
  });

  const controller: FileDropController = {
    get files() {
      return [...files];
    },
    clear() {
      files = [];
      showErrors([]);
      render();
      announce('');
      emit();
    },
    setBusy(value: boolean) {
      busy = value;
      chooseBtn.disabled = value;
      root.classList.toggle('is-busy', value);
      render();
    },
    showError(message: string) {
      showErrors([message]);
    },
  };
  controllers.set(root, controller);
  return controller;
}

export function initAllFileDrops(): void {
  document.querySelectorAll<HTMLElement>('[data-file-drop]').forEach(initFileDrop);
}
