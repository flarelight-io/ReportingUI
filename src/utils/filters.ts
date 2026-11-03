import { ChartFilter, Filter } from '../api/types/common';

/** JSON.stringify with sorted object keys, so equal values always produce the same string (objects, arrays, dates). */
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: any): any => {
    if (v === undefined) return null;
    if (v instanceof Date) return v.toISOString();
    if (v === null || typeof v !== 'object') return typeof v === 'number' && !isFinite(v) ? String(v) : v;
    if (seen.has(v)) return '[circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, any> = {};
    Object.keys(v).sort().forEach(k => { out[k] = walk(v[k]); });
    return out;
  };
  return JSON.stringify(walk(value));
}

/** Which filter a change refers to: source + field, and the optional id when several filters share a field. */
export function filterIdentity(f: { sourceId: string; field: string; id?: string }): string {
  return `${f.sourceId}\u0000${f.field}\u0000${f.id ?? ''}`;
}

/** Cache key for a set of filters: independent of order and safe for object/array values. */
export function filtersCacheKey(filters: Filter[]): string {
  if (!filters || filters.length === 0) return 'nofilters';
  return stableStringify(filters.map(f => stableStringify(f)).sort());
}

/**
 * Converts an app filter into the request filter sent to fetchChartData. The operation defaults to 'eq'; the
 * value and any extra properties are passed through untouched, so apps can use operations and options this
 * library doesn't know about. Client-side bookkeeping (sourceId, id) is not sent.
 */
export function toChartFilter(filter: Filter): ChartFilter {
  const { sourceId: _sourceId, field, operation, value, id: _id, ...extra } = filter;
  return { ...extra, fieldName: field, operation: operation || 'eq', value };
}
