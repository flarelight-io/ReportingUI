import {
  addWidgetToConfig, applyLayoutItems, getLayoutItems, layoutKey, nextWidgetId, removeWidgetsFromConfig, replaceWidgetInConfig, updateWidgetInConfig
} from './report-layout';

const plain = () => ({
  sources: [{ id: 's' }],
  widgets: [
    { id: 'a', type: 'bar', title: 'A', x: 0, y: 0, w: 6, h: 4, config: { sourceId: 's' } },
    { id: 'b', type: 'kpi', title: 'B', x: 6, y: 0, w: 6, h: 4, config: { sourceId: 's' } },
    { id: 'c', type: 'text', title: 'C' }
  ]
});

const withLayouts = () => ({
  sources: [{ id: 's' }],
  layouts: { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4, moved: false }, { i: 'b', x: 6, y: 0, w: 6, h: 4 }], md: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }] },
  widgets: [
    { id: 'a', type: 'bar', title: 'A', config: {} },
    { id: 'b', type: 'kpi', title: 'B', x: 6, y: 0, w: 6, h: 4, config: {} }
  ]
});

const rect = (items: any[], id: string) => { const i = items.find(o => o.id === id); return [i.x, i.y, i.w, i.h]; };

describe('getLayoutItems', () => {
  it('reads positions from widgets, resolving missing ones like the viewer', () => {
    const items = getLayoutItems(plain());
    expect(rect(items, 'a')).toEqual([0, 0, 6, 4]);
    expect(rect(items, 'c')).toEqual([0, 0, 6, 4]);
  });

  it('reads the first available layout, with a definition position taking precedence', () => {
    const cfg = withLayouts();
    expect(layoutKey(cfg)).toBe('lg');
    const items = getLayoutItems(cfg);
    expect(items.map(i => i.id)).toEqual(['a', 'b']);
    expect(rect(items, 'a')).toEqual([0, 0, 6, 4]);
    const overridden = { ...cfg, widgets: [{ ...cfg.widgets[0], x: 3, w: 4 }, cfg.widgets[1]] };
    expect(rect(getLayoutItems(overridden), 'a')).toEqual([3, 0, 4, 4]);
  });

  it('clamps to the given number of columns', () => {
    expect(rect(getLayoutItems(plain(), 6), 'b')).toEqual([0, 0, 6, 4]);
  });
});

describe('applyLayoutItems', () => {
  it('writes only widgets whose position changed, leaving the input untouched', () => {
    const cfg = plain();
    const before = JSON.stringify(cfg);
    const items = getLayoutItems(cfg).map(i => (i.id === 'a' ? { ...i, y: 4 } : i));
    const next: any = applyLayoutItems(cfg, items);
    expect(JSON.stringify(cfg)).toBe(before);
    expect(next.widgets[0]).toMatchObject({ id: 'a', x: 0, y: 4, w: 6, h: 4, title: 'A', config: { sourceId: 's' } });
    expect(next.widgets[1]).toBe(cfg.widgets[1]);
    expect(next.widgets[2]).toBe(cfg.widgets[2]);
    expect(next.sources).toBe(cfg.sources);
  });

  it('returns the same configuration when nothing changed', () => {
    const cfg = plain();
    expect(applyLayoutItems(cfg, getLayoutItems(cfg))).toBe(cfg);
  });

  it('writes to the layout entry (keeping its extra keys), and to definitions that carry their own position', () => {
    const cfg = withLayouts();
    const items = getLayoutItems(cfg).map(i => ({ ...i, y: 2 }));
    const next: any = applyLayoutItems(cfg, items);
    expect(next.layouts.lg[0]).toEqual({ i: 'a', x: 0, y: 2, w: 6, h: 4, moved: false });
    expect(next.widgets[0]).toBe(cfg.widgets[0]);
    expect(next.widgets[1]).toMatchObject({ y: 2 });
    expect(next.layouts.md).toBe(cfg.layouts.md);
  });
});

describe('addWidgetToConfig, removeWidgetsFromConfig, nextWidgetId', () => {
  it('adds a widget with its position, or to the layout when layouts are used', () => {
    const next: any = addWidgetToConfig(plain(), { id: 'd', type: 'pie', config: {} }, { x: 0, y: 4, w: 4, h: 3 });
    expect(next.widgets[3]).toMatchObject({ id: 'd', x: 0, y: 4, w: 4, h: 3 });
    const withL: any = addWidgetToConfig(withLayouts(), { id: 'd', type: 'pie' }, { x: 0, y: 4, w: 4, h: 3 });
    expect(withL.layouts.lg[2]).toEqual({ i: 'd', x: 0, y: 4, w: 4, h: 3 });
    expect(withL.widgets[2]).toEqual({ id: 'd', type: 'pie' });
  });

  it('removes widgets and their layout entries in every breakpoint', () => {
    const next: any = removeWidgetsFromConfig(withLayouts(), ['a']);
    expect(next.widgets.map((w: any) => w.id)).toEqual(['b']);
    expect(next.layouts.lg.map((e: any) => e.i)).toEqual(['b']);
    expect(next.layouts.md).toEqual([]);
  });

  it('generates unused ids', () => {
    expect(nextWidgetId(plain(), 'pie')).toBe('pie');
    expect(nextWidgetId(plain(), 'bar')).toBe('bar');
    expect(nextWidgetId({ widgets: [{ id: 'bar', type: 'bar' }, { id: 'bar-2', type: 'bar' }] }, 'bar')).toBe('bar-3');
    expect(nextWidgetId({}, 'stacked bar')).toBe('stacked-bar');
  });
});

describe('updateWidgetInConfig', () => {
  it('merges a patch into one widget and keeps its id', () => {
    const cfg = plain();
    const next: any = updateWidgetInConfig(cfg, 'a', { title: 'New', id: 'zzz', config: { sourceId: 'other' } });
    expect(next.widgets[0]).toMatchObject({ id: 'a', title: 'New', config: { sourceId: 'other' }, x: 0, w: 6 });
    expect(next.widgets[1]).toBe(cfg.widgets[1]);
    expect(updateWidgetInConfig(cfg, 'missing', { title: 'x' })).toBe(cfg);
  });

  it('applies position patches in both formats', () => {
    const next: any = updateWidgetInConfig(plain(), 'a', { y: 5, w: 3 });
    expect(next.widgets[0]).toMatchObject({ x: 0, y: 5, w: 3, h: 4 });
    const withL: any = updateWidgetInConfig(withLayouts(), 'a', { x: 2 });
    expect(withL.layouts.lg[0]).toMatchObject({ i: 'a', x: 2, y: 0, w: 6 });
  });
});

describe('replaceWidgetInConfig', () => {
  it('replaces the definition as a whole and keeps the position', () => {
    const cfg = plain();
    const next: any = replaceWidgetInConfig(cfg, 'a', { id: 'zzz', type: 'bar', x: 9, config: { custom: 1 } });
    expect(next.widgets[0]).toEqual({ id: 'a', type: 'bar', config: { custom: 1 }, x: 0, y: 0, w: 6, h: 4 });
    expect(next.widgets[1]).toBe(cfg.widgets[1]);
    expect(replaceWidgetInConfig(cfg, 'missing', { id: 'm', type: 'bar' })).toBe(cfg);
  });

  it('does not add a position to definitions whose position lives in the layout', () => {
    const next: any = replaceWidgetInConfig(withLayouts(), 'a', { id: 'a', type: 'bar', title: 'T' });
    expect(next.widgets[0]).toEqual({ id: 'a', type: 'bar', title: 'T' });
  });
});
