export interface TopNOptions {
  /** Keep the N largest categories. Unset, 0 or at least the category count leaves the data untouched. */
  topN?: number;
  /** Label of the combined bucket. Default "Other". */
  otherLabel?: string;
  /** Set to false to drop the remaining categories instead of combining them. Default true. */
  showOther?: boolean;
}

/** Neutral color for the combined "Other" entry (follows the theme's axis color). */
export const OTHER_COLOR = 'var(--fl-chart-axis-color, #9ca3af)';

export type WithOther<T> = T & { isOther?: boolean };

/**
 * Keeps the N largest categories (sorted by value, descending) and combines the rest into one "Other" entry
 * (the sum of their values). Left alone when topN isn't set or isn't smaller than the category count. A single
 * leftover category is kept as itself: an "Other" made of one item would only hide its name.
 */
export function applyTopN<T extends { category: string; value: number }>(items: T[], options: TopNOptions | undefined): WithOther<T>[] {
  const n = options && typeof options.topN === 'number' ? Math.floor(options.topN) : 0;
  if (!items || !(n >= 1) || items.length <= n) return items;

  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (isFinite(b.item.value) ? b.item.value : -Infinity) - (isFinite(a.item.value) ? a.item.value : -Infinity) || a.index - b.index)
    .map(entry => entry.item);

  const kept = sorted.slice(0, n);
  const rest = sorted.slice(n);
  if (rest.length === 1) return [...kept, rest[0]];
  if (options && options.showOther === false) return kept;

  const other = {
    ...rest[0],
    category: (options && options.otherLabel) || 'Other',
    value: rest.reduce((sum, item) => sum + (isFinite(item.value) ? item.value : 0), 0),
    isOther: true
  } as WithOther<T>;
  return [...kept, other];
}

/** Reads the top-N options from a chart config. */
export function topNOptions(config: any): TopNOptions {
  return config ? { topN: config.topN, otherLabel: config.otherLabel, showOther: config.showOther } : {};
}
