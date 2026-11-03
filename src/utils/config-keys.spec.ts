import { globalDataKey, parseConfigObject, staleWidgetIds, widgetDataKeys } from './config-keys';

const widget = (id: string, extra: any = {}) => ({ id, type: 'bar', title: id, x: 0, y: 0, w: 4, h: 3, config: { sourceId: 's', valueField: 'v' }, ...extra });
const report = (widgets: any[], extra: any = {}) => ({ sources: [{ id: 's', name: 'S', type: 't', fields: [] }], widgets, ...extra });

describe('parseConfigObject', () => {
  it('accepts objects and JSON strings and tolerates garbage', () => {
    const obj = { a: 1 };
    expect(parseConfigObject(obj)).toBe(obj);
    expect(parseConfigObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseConfigObject('{nope')).toBeUndefined();
    expect(parseConfigObject(undefined)).toBeUndefined();
  });
});

describe('globalDataKey', () => {
  const base = report([widget('a')]);

  it('ignores presentation and layout changes', () => {
    const key = globalDataKey(base);
    expect(globalDataKey({ ...base, colorTheme: 'rainbow' })).toBe(key);
    expect(globalDataKey({ ...base, columns: 24, rowHeight: 40, rowAspectRatio: 2, gap: 4 })).toBe(key);
    expect(globalDataKey({ ...base, widgets: [widget('a', { x: 5 }), widget('b')] })).toBe(key);
    expect(globalDataKey({ ...base, layouts: { lg: [] } })).toBe(key);
  });

  it('changes when anything else changes, such as the sources', () => {
    const key = globalDataKey(base);
    expect(globalDataKey({ ...base, sources: [{ id: 's', name: 'Renamed', type: 't', fields: [] }] })).not.toBe(key);
  });

  it('does not depend on key order, and accepts JSON strings', () => {
    expect(globalDataKey({ b: 1, a: 2 })).toBe(globalDataKey({ a: 2, b: 1 }));
    expect(globalDataKey(JSON.stringify(base))).toBe(globalDataKey(base));
    expect(globalDataKey(undefined)).toBeUndefined();
  });
});

describe('widgetDataKeys and staleWidgetIds', () => {
  const keys = (widgets: any[]) => widgetDataKeys(report(widgets));

  it('keys by type and config only', () => {
    const before = keys([widget('a')]);
    expect(keys([widget('a', { x: 9, y: 9, w: 12, h: 8, title: 'New title' })]).get('a')).toBe(before.get('a'));
    expect(keys([widget('a', { config: { sourceId: 's', valueField: 'other' } })]).get('a')).not.toBe(before.get('a'));
    expect(keys([widget('a', { type: 'pie' })]).get('a')).not.toBe(before.get('a'));
  });

  it('reports only widgets that changed, were added or were removed', () => {
    const previous = keys([widget('a'), widget('b'), widget('c')]);
    const next = keys([widget('a', { x: 3 }), widget('b', { config: { sourceId: 'other' } }), widget('d')]);
    expect(staleWidgetIds(previous, next).sort()).toEqual(['b', 'c', 'd']);
  });

  it('reports nothing when only layout changed, and handles missing widgets', () => {
    const previous = keys([widget('a')]);
    expect(staleWidgetIds(previous, keys([widget('a', { y: 7 })]))).toEqual([]);
    expect(widgetDataKeys({}).size).toBe(0);
    expect(widgetDataKeys(undefined).size).toBe(0);
  });
});
