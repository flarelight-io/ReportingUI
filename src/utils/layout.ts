/**
 * Grid layout math for the viewer and the report builder. Pure functions over plain rectangles: no DOM, no
 * mutation of the input. Coordinates are zero-based: `x`/`w` in columns, `y`/`h` in rows.
 */

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** A locked item never moves or resizes by itself and other items flow around it. */
  locked?: boolean;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface LayoutOptions {
  /** Number of grid columns. Default 12. */
  columns?: number;
  /**
   * `vertical` (default): colliding items are pushed down and everything floats up to close gaps.
   * `none`: items stay where they are put; moves and resizes that would overlap another item are rejected.
   */
  compact?: 'vertical' | 'none';
}

export const DEFAULT_COLUMNS = 12;
export const DEFAULT_ROWS = 4;

const columnsOf = (o?: LayoutOptions) => Math.max(1, Math.floor((o && o.columns) || DEFAULT_COLUMNS));
const compactOf = (o?: LayoutOptions) => (o && o.compact) || 'vertical';

/** The rectangle of a widget as the viewer places it: defaults for missing values, clamped to the grid. */
export function resolveRect(
  widget: { x?: number; y?: number; w?: number; h?: number },
  columns: number = DEFAULT_COLUMNS
): { x: number; y: number; w: number; h: number } {
  const cols = Math.max(1, Math.floor(columns));
  const w = Math.max(1, Math.min(cols, Math.floor(widget.w || Math.max(1, Math.round(cols / 2)))));
  const x = Math.max(0, Math.min(cols - w, Math.floor(widget.x !== undefined ? widget.x : 0)));
  const y = Math.max(0, Math.floor(widget.y !== undefined ? widget.y : 0));
  const h = Math.max(1, Math.floor(widget.h || DEFAULT_ROWS));
  return { x, y, w, h };
}

/** True when the two rectangles share at least one cell. */
export function collides(a: LayoutItem, b: LayoutItem): boolean {
  if (a.id === b.id) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Keeps an item inside the grid and within its own size limits. */
export function clampItem(item: LayoutItem, options?: LayoutOptions): LayoutItem {
  const columns = columnsOf(options);
  const maxW = Math.min(columns, item.maxW && item.maxW > 0 ? item.maxW : columns);
  const minW = Math.min(maxW, Math.max(1, item.minW || 1));
  const w = Math.max(minW, Math.min(maxW, Math.floor(item.w)));
  const maxH = item.maxH && item.maxH > 0 ? item.maxH : Infinity;
  const minH = Math.min(maxH, Math.max(1, item.minH || 1));
  const h = Math.max(minH, Math.min(maxH, Math.floor(item.h)));
  const x = Math.max(0, Math.min(columns - w, Math.floor(item.x)));
  const y = Math.max(0, Math.floor(item.y));
  return { ...item, x, y, w, h };
}

const sortByPosition = (a: LayoutItem, b: LayoutItem) => a.y - b.y || a.x - b.x;

/**
 * Floats every unlocked item up as far as it goes without overlapping anything. Locked items stay put. Items keep
 * their relative order; the result is in the same order as the input.
 */
export function compactVertical(items: LayoutItem[]): LayoutItem[] {
  const placed = new Map<string, LayoutItem>();
  items.filter(i => i.locked).forEach(i => placed.set(i.id, { ...i }));
  [...items.filter(i => !i.locked)].sort(sortByPosition).forEach(item => {
    const next = { ...item };
    while (next.y > 0) {
      const above = { ...next, y: next.y - 1 };
      let blocked = false;
      placed.forEach(other => { if (!blocked && collides(above, other)) blocked = true; });
      if (blocked) break;
      next.y -= 1;
    }
    placed.set(next.id, next);
  });
  return items.map(i => placed.get(i.id) as LayoutItem);
}

/**
 * Pushes every unlocked item that overlaps `fixed` down below it, then does the same for whatever those items now
 * overlap. Returns false when an overlap involves a locked item (it cannot be pushed).
 */
function pushDown(byId: Map<string, LayoutItem>, fixed: LayoutItem): boolean {
  const colliders = [...byId.values()].filter(o => collides(fixed, o)).sort(sortByPosition);
  for (const other of colliders) {
    if (other.locked) return false;
    const pushed = { ...other, y: fixed.y + fixed.h };
    byId.set(pushed.id, pushed);
    if (!pushDown(byId, pushed)) return false;
  }
  return true;
}

/** Applies a changed rectangle for one item and resolves overlaps according to `compact`. Null = rejected. */
function place(items: LayoutItem[], changed: LayoutItem, options?: LayoutOptions): LayoutItem[] | null {
  const byId = new Map<string, LayoutItem>(items.map(i => [i.id, { ...i }]));
  byId.set(changed.id, changed);

  if (compactOf(options) === 'none') {
    for (const other of byId.values()) if (collides(changed, other)) return null;
    return items.map(i => byId.get(i.id) as LayoutItem);
  }

  if (!pushDown(byId, changed)) return null;
  const resolved = items.map(i => byId.get(i.id) as LayoutItem);
  return compactVertical(resolved);
}

/** Moves an item to (x, y). Colliding items are pushed down (or the move is rejected with `compact: 'none'`). */
export function moveItem(items: LayoutItem[], id: string, x: number, y: number, options?: LayoutOptions): LayoutItem[] {
  const current = items.find(i => i.id === id);
  if (!current || current.locked) return items;
  const moved = clampItem({ ...current, x, y }, options);
  return place(items, moved, options) || items;
}

/** Resizes an item (within its limits and the grid). Colliding items are pushed down, or the resize is rejected. */
export function resizeItem(items: LayoutItem[], id: string, w: number, h: number, options?: LayoutOptions): LayoutItem[] {
  const current = items.find(i => i.id === id);
  if (!current || current.locked) return items;
  const resized = clampItem({ ...current, w, h }, options);
  return place(items, resized, options) || items;
}

/** First position (scanning rows top to bottom, columns left to right) where a w x h item fits without overlap. */
export function findFreePosition(items: LayoutItem[], w: number, h: number, options?: LayoutOptions): { x: number; y: number } {
  const columns = columnsOf(options);
  const width = Math.max(1, Math.min(columns, Math.floor(w)));
  const height = Math.max(1, Math.floor(h));
  const bottom = items.reduce((max, i) => Math.max(max, i.y + i.h), 0);
  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x <= columns - width; x++) {
      const candidate = { id: '\u0000candidate', x, y, w: width, h: height };
      if (!items.some(i => collides(candidate, i))) return { x, y };
    }
  }
  return { x: 0, y: bottom };
}

/**
 * Adds an item. Without an explicit x/y it goes in the first free spot; with one, it goes there and anything it
 * overlaps is pushed down (or the add is rejected with `compact: 'none'`).
 */
export function addItem(
  items: LayoutItem[],
  item: Omit<LayoutItem, 'x' | 'y'> & { x?: number; y?: number },
  options?: LayoutOptions
): LayoutItem[] {
  if (items.some(i => i.id === item.id)) return items;
  const sized = clampItem({ ...item, x: 0, y: 0 } as LayoutItem, options);
  const explicit = item.x !== undefined && item.y !== undefined;
  const position = explicit ? { x: item.x as number, y: item.y as number } : findFreePosition(items, sized.w, sized.h, options);
  const added = clampItem({ ...sized, ...position }, options);
  const result = place([...items, added], added, options);
  return result || items;
}

/** Removes items and, with vertical compaction, closes the gaps they leave. */
export function removeItems(items: LayoutItem[], ids: string[], options?: LayoutOptions): LayoutItem[] {
  const remaining = items.filter(i => !ids.includes(i.id));
  return compactOf(options) === 'vertical' ? compactVertical(remaining) : remaining;
}

/**
 * Clamps every item to the grid and resolves any overlaps already in the data (for instance a hand-edited
 * configuration). Earlier items in the input keep their position, later ones are pushed.
 */
export function normalizeLayout(items: LayoutItem[], options?: LayoutOptions): LayoutItem[] {
  let result: LayoutItem[] = [];
  [...items].sort(sortByPosition).forEach(item => {
    const clamped = clampItem(item, options);
    result = place([...result, clamped], clamped, options) || [...result, clamped];
  });
  const order = new Map(result.map(i => [i.id, i]));
  return items.map(i => order.get(i.id) as LayoutItem);
}

/** True when any two items overlap. */
export function hasOverlap(items: LayoutItem[]): boolean {
  return items.some((a, index) => items.slice(index + 1).some(b => collides(a, b)));
}

/** True when two layouts have the same position and size for every item. */
export function sameLayout(a: LayoutItem[], b: LayoutItem[]): boolean {
  if (a.length !== b.length) return false;
  const map = new Map(b.map(i => [i.id, i]));
  return a.every(i => {
    const o = map.get(i.id);
    return !!o && o.x === i.x && o.y === i.y && o.w === i.w && o.h === i.h;
  });
}
