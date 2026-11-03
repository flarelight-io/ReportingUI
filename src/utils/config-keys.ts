import { stableStringify } from './filters';

/** A report configuration as an object, or undefined when it is missing or not valid JSON. */
export function parseConfigObject(config: any): any {
  try {
    return typeof config === 'string' ? JSON.parse(config) : config;
  } catch {
    return undefined;
  }
}

/**
 * Identifies the parts of a configuration that affect the data of every widget: sources and anything else that
 * isn't presentation (`colorTheme`) or layout (`widgets`, `layouts`, `columns`, `rowHeight`, `rowAspectRatio`,
 * `gap`). When it changes, all cached widget data is dropped.
 */
export function globalDataKey(config: any): string | undefined {
  const parsed = parseConfigObject(config);
  if (!parsed) return undefined;
  const { colorTheme, widgets, layouts, columns, rowHeight, rowAspectRatio, gap, ...rest } = parsed;
  return stableStringify(rest);
}

/**
 * Per-widget data keys by widget id. What a widget fetches depends on its type and config, not on its position,
 * size or title, so those are not part of the key.
 */
export function widgetDataKeys(config: any): Map<string, string> {
  const parsed = parseConfigObject(config);
  const keys = new Map<string, string>();
  if (parsed && Array.isArray(parsed.widgets)) {
    parsed.widgets.forEach((w: any) => {
      if (w && w.id !== undefined) keys.set(String(w.id), stableStringify([w.type, w.config === undefined ? null : w.config]));
    });
  }
  return keys;
}

/** Ids whose cached data is stale: widgets whose key changed, new ones, and ones that were removed. */
export function staleWidgetIds(previous: Map<string, string>, next: Map<string, string>): string[] {
  const stale: string[] = [];
  next.forEach((key, id) => { if (previous.get(id) !== key) stale.push(id); });
  previous.forEach((_, id) => { if (!next.has(id)) stale.push(id); });
  return stale;
}
