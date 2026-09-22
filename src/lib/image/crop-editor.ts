/**
 * Touch-friendly crop positioning: the user drags (or uses arrow keys) to move the image under a
 * fixed frame with the target aspect ratio, and zooms with a slider (or + / − keys).
 * Returns the chosen source rectangle in pixels of the upright image.
 */
import type { CropRect } from './core';

export interface CropEditor {
  open(image: Blob, imageWidth: number, imageHeight: number, aspect: number): void;
  close(): void;
  readonly crop: CropRect | null;
}

export function initCropEditor(root: HTMLElement): CropEditor {
  const viewport = root.querySelector<HTMLElement>('[data-crop-viewport]')!;
  const img = root.querySelector<HTMLImageElement>('[data-crop-img]')!;
  const zoomInput = root.querySelector<HTMLInputElement>('[data-crop-zoom]')!;
  let url = '';
  let iw = 0;
  let ih = 0;
  let zoom = 1;
  // Image offset inside the viewport, as fractions of the viewport size (resize-proof).
  let fx = 0;
  let fy = 0;
  let active = false;

  const vw = () => viewport.clientWidth;
  const vh = () => viewport.clientHeight;
  /** Scale that makes the image just cover the viewport. */
  const coverScale = () => Math.max(vw() / iw, vh() / ih);

  function clamp() {
    const s = coverScale() * zoom;
    const minX = (vw() - iw * s) / vw();
    const minY = (vh() - ih * s) / vh();
    fx = Math.min(0, Math.max(minX, fx));
    fy = Math.min(0, Math.max(minY, fy));
  }

  function paint() {
    if (!active) return;
    clamp();
    const s = coverScale() * zoom;
    img.style.width = `${iw * s}px`;
    img.style.height = `${ih * s}px`;
    img.style.transform = `translate(${fx * vw()}px, ${fy * vh()}px)`;
  }

  function setZoom(next: number, anchorX = 0.5, anchorY = 0.5) {
    const before = coverScale() * zoom;
    const z = Math.min(4, Math.max(1, next));
    const after = coverScale() * z;
    // Keep the point under the anchor still while zooming.
    const px = anchorX * vw() - fx * vw();
    const py = anchorY * vh() - fy * vh();
    fx = (anchorX * vw() - (px * after) / before) / vw();
    fy = (anchorY * vh() - (py * after) / before) / vh();
    zoom = z;
    zoomInput.value = String(z);
    paint();
  }

  // Pointer drag (mouse, touch, pen)
  let drag: { id: number; x: number; y: number; fx: number; fy: number } | null = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (!active) return;
    viewport.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, fx, fy };
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    fx = drag.fx + (e.clientX - drag.x) / vw();
    fy = drag.fy + (e.clientY - drag.y) / vh();
    paint();
  });
  const end = () => (drag = null);
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (!active) return;
      e.preventDefault();
      const r = viewport.getBoundingClientRect();
      setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    },
    { passive: false },
  );
  viewport.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      fx += moves[e.key]![0];
      fy += moves[e.key]![1];
      paint();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoom(zoom * 1.1);
    } else if (e.key === '-') {
      e.preventDefault();
      setZoom(zoom / 1.1);
    }
  });
  zoomInput.addEventListener('input', () => setZoom(Number(zoomInput.value)));
  new ResizeObserver(paint).observe(viewport);

  return {
    open(image, w, h, aspect) {
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(image);
      img.src = url;
      iw = w;
      ih = h;
      viewport.style.aspectRatio = String(aspect);
      // Tall frames (e.g. 9:16) would not fit on a phone screen: cap the height via the width.
      viewport.style.width = `min(100%, ${(60 * aspect).toFixed(2)}vh)`;
      zoom = 1;
      zoomInput.value = '1';
      active = true;
      root.hidden = false;
      // Center the image.
      requestAnimationFrame(() => {
        const s = coverScale();
        fx = (vw() - iw * s) / 2 / vw();
        fy = (vh() - ih * s) / 2 / vh();
        paint();
      });
    },
    close() {
      active = false;
      root.hidden = true;
      if (url) URL.revokeObjectURL(url);
      url = '';
      img.removeAttribute('src');
    },
    get crop() {
      if (!active || !vw()) return null;
      const s = coverScale() * zoom;
      return { x: (-fx * vw()) / s, y: (-fy * vh()) / s, w: vw() / s, h: vh() / s };
    },
  };
}
