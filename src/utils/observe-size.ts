export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Calls back with the element's size now and whenever it changes.
 * Charts use this to lay themselves out in real pixels instead of scaling a fixed viewBox,
 * which keeps text at a constant, readable size. Returns a disconnect function.
 */
export function observeSize(el: Element, onSize: (size: ElementSize) => void): () => void {
  const report = () => {
    const rect = el.getBoundingClientRect();
    onSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
  };
  report();
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }
  const observer = new ResizeObserver(report);
  observer.observe(el);
  return () => observer.disconnect();
}
