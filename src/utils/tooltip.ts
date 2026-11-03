const EDGE_MARGIN = 4;
const POINTER_GAP = 12;

/**
 * Positions a chart tooltip above the pointer, fully inside the viewport.
 * Uses fixed positioning so it isn't clipped by the chart or widget (which are overflow:hidden).
 * Falls back to below the pointer only when there is no room above.
 * Use as a ref callback: `ref={el => placeTooltip(el, clientX, clientY)}`.
 */
export function placeTooltip(el: HTMLElement | undefined, clientX: number, clientY: number): void {
  if (!el) return;
  // The ref fires before the element is attached, so measuring has to wait a frame.
  // Hide it until the first placement so it never flashes in the wrong spot.
  if (!el.style.left) el.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    position(el, clientX, clientY);
    el.style.visibility = '';
  });
}

function position(el: HTMLElement, clientX: number, clientY: number): void {
  const { offsetWidth: w, offsetHeight: h } = el;
  const viewportW = document.documentElement.clientWidth;

  let left = clientX - w / 2;
  left = Math.max(EDGE_MARGIN, Math.min(left, viewportW - w - EDGE_MARGIN));
  let top = clientY - h - POINTER_GAP;
  if (top < EDGE_MARGIN) top = clientY + POINTER_GAP * 1.5;

  el.style.position = 'fixed';
  el.style.zIndex = '1000';
  el.style.transform = 'none';
  el.style.transition = 'opacity 120ms cubic-bezier(0.4, 0, 0.2, 1)';
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;

  // An ancestor with transform/filter becomes the containing block for fixed elements; correct for it
  const rect = el.getBoundingClientRect();
  if (Math.abs(rect.left - left) > 0.5 || Math.abs(rect.top - top) > 0.5) {
    el.style.left = `${left - (rect.left - left)}px`;
    el.style.top = `${top - (rect.top - top)}px`;
  }
}
