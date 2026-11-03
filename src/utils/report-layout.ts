import { LayoutItem, resolveRect } from './layout';

/**
 * Reads and edits widget positions in a report configuration without changing its format. Two formats exist, as in the
 * viewer: widgets carrying `x/y/w/h` themselves, and `layouts` ({ lg|md|sm|xs: [{ i, x, y, w, h }] }) plus widget
 * definitions. With `layouts` the viewer uses the first of lg, md, sm, xs, and a definition's own x/y/w/h wins, so
 * edits go to the same places. All functions return new objects and leave their input untouched.
 */

const LAYOUT_KEYS = ['lg', 'md', 'sm', 'xs'] as const;

export interface ReportWidgetDef {
  id: string;
  type: string;
  title?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  config?: Record<string, any>;
  [key: string]: any;
}

type Config = Record<string, any>;

const POSITION_KEYS = ['x', 'y', 'w', 'h'] as const;

/** The layout the viewer reads (first available of lg, md, sm, xs), when the configuration uses `layouts`. */
export function layoutKey(config: Config): typeof LAYOUT_KEYS[number] | undefined {
  if (!config || !config.layouts || !config.widgets) return undefined;
  return LAYOUT_KEYS.find(key => Array.isArray(config.layouts[key]));
}

function definitions(config: Config): ReportWidgetDef[] {
  return config && Array.isArray(config.widgets) ? config.widgets : [];
}

function hasOwnPosition(def: ReportWidgetDef): boolean {
  return POSITION_KEYS.some(key => def[key] !== undefined);
}

/** Positions of all widgets, in the order the viewer renders them. */
export function getLayoutItems(config: Config, columns?: number): LayoutItem[] {
  const defs = definitions(config);
  const key = layoutKey(config);
  if (key) {
    return (config.layouts[key] as any[]).map(item => {
      const def = defs.find(d => d.id === item.i);
      const rect = resolveRect({
        x: def && def.x !== undefined ? def.x : item.x,
        y: def && def.y !== undefined ? def.y : item.y,
        w: def && def.w !== undefined ? def.w : item.w,
        h: def && def.h !== undefined ? def.h : item.h
      }, columns);
      return { id: String(item.i), ...rect };
    });
  }
  return defs.map(def => ({ id: String(def.id), ...resolveRect(def, columns) }));
}

const samePosition = (a: { x?: number; y?: number; w?: number; h?: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** Writes positions back. Only widgets whose position actually changed are touched. */
export function applyLayoutItems(config: Config, items: LayoutItem[], columns?: number): Config {
  const current = new Map(getLayoutItems(config, columns).map(i => [i.id, i]));
  const changed = items.filter(item => {
    const before = current.get(item.id);
    return before && !samePosition(before, item);
  });
  if (changed.length === 0) return config;

  const key = layoutKey(config);
  const byId = new Map(changed.map(i => [i.id, i]));
  const rect = (i: LayoutItem) => ({ x: i.x, y: i.y, w: i.w, h: i.h });

  const widgets = definitions(config).map(def => {
    const item = byId.get(String(def.id));
    if (!item) return def;
    // Definitions carrying their own position (or in the plain format) hold it; with layouts the layout holds it
    return !key || hasOwnPosition(def) ? { ...def, ...rect(item) } : def;
  });

  const next: Config = { ...config, widgets };
  if (key) {
    next.layouts = {
      ...config.layouts,
      [key]: (config.layouts[key] as any[]).map(entry => {
        const item = byId.get(String(entry.i));
        return item ? { ...entry, ...rect(item) } : entry;
      })
    };
  }
  return next;
}

/** A widget id that isn't used yet: `type`, then `type-2`, `type-3`, ... */
export function nextWidgetId(config: Config, type: string): string {
  const used = new Set(definitions(config).map(d => String(d.id)));
  const base = String(type).replace(/[^a-zA-Z0-9_-]+/g, '-') || 'widget';
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}

/** Adds a widget definition at a position. With `layouts` it is added to the layout the viewer reads too. */
export function addWidgetToConfig(
  config: Config,
  widget: { id: string; type: string; title?: string; config?: Record<string, any>; [key: string]: any },
  rect: { x: number; y: number; w: number; h: number }
): Config {
  const key = layoutKey(config);
  const def: ReportWidgetDef = key ? { ...widget } : { ...widget, ...rect };
  const next: Config = { ...config, widgets: [...definitions(config), def] };
  if (key) {
    next.layouts = { ...config.layouts, [key]: [...(config.layouts[key] as any[]), { i: widget.id, ...rect }] };
  }
  return next;
}

/** Removes widgets (and their layout entries). */
export function removeWidgetsFromConfig(config: Config, ids: string[]): Config {
  const gone = new Set(ids.map(String));
  const next: Config = { ...config, widgets: definitions(config).filter(d => !gone.has(String(d.id))) };
  if (config.layouts) {
    const layouts: Record<string, any> = {};
    Object.keys(config.layouts).forEach(k => {
      layouts[k] = Array.isArray(config.layouts[k]) ? config.layouts[k].filter((e: any) => !gone.has(String(e.i))) : config.layouts[k];
    });
    next.layouts = layouts;
  }
  return next;
}

/**
 * Merges a patch into a widget definition. A patch containing x/y/w/h also moves its layout entry, so the position
 * stays consistent whichever format the report uses. Returns the same object when the widget doesn't exist.
 */
export function updateWidgetInConfig(config: Config, id: string, patch: Partial<ReportWidgetDef>): Config {
  const defs = definitions(config);
  const index = defs.findIndex(d => String(d.id) === String(id));
  if (index < 0) return config;
  const { x, y, w, h, ...rest } = patch;
  const hasPosition = [x, y, w, h].some(v => v !== undefined);
  const key = layoutKey(config);

  const widgets = defs.slice();
  widgets[index] = { ...defs[index], ...rest, id: defs[index].id };
  let next: Config = { ...config, widgets };

  if (hasPosition) {
    const columns = undefined;
    const before = getLayoutItems(config, columns).find(i => i.id === String(id));
    if (before) {
      const item = { ...before, ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}), ...(w !== undefined ? { w } : {}), ...(h !== undefined ? { h } : {}) };
      const applied = applyLayoutItems(next, [item], columns);
      next = applied;
      if (!key && !hasOwnPosition(next.widgets[index])) {
        // Plain format and the widget had no position yet: store it
        next.widgets = next.widgets.slice();
        next.widgets[index] = { ...next.widgets[index], x: item.x, y: item.y, w: item.w, h: item.h };
      }
    }
  }
  return next;
}
