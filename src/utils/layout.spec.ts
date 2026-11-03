import {
  LayoutItem, addItem, clampItem, collides, compactVertical, findFreePosition, hasOverlap, moveItem, normalizeLayout,
  removeItems, resizeItem, resolveRect, sameLayout, setItemRect
} from './layout';

const item = (id: string, x: number, y: number, w: number, h: number, extra: Partial<LayoutItem> = {}): LayoutItem => ({ id, x, y, w, h, ...extra });
const pos = (items: LayoutItem[], id: string) => { const i = items.find(o => o.id === id)!; return [i.x, i.y, i.w, i.h]; };

describe('resolveRect', () => {
  it('uses the viewer defaults: half the grid wide, 4 rows tall, at the origin', () => {
    expect(resolveRect({})).toEqual({ x: 0, y: 0, w: 6, h: 4 });
    expect(resolveRect({}, 24)).toEqual({ x: 0, y: 0, w: 12, h: 4 });
    expect(resolveRect({}, 5)).toEqual({ x: 0, y: 0, w: 3, h: 4 });
  });

  it('clamps width and position to the grid', () => {
    expect(resolveRect({ x: 10, w: 8 }, 12)).toEqual({ x: 4, y: 0, w: 8, h: 4 });
    expect(resolveRect({ x: 3, w: 20 }, 6)).toEqual({ x: 0, y: 0, w: 6, h: 4 });
    expect(resolveRect({ x: -2, y: -5 }, 12)).toMatchObject({ x: 0, y: 0 });
  });
});

describe('collides', () => {
  it('detects overlap and treats touching edges as free', () => {
    expect(collides(item('a', 0, 0, 4, 2), item('b', 3, 1, 4, 2))).toBe(true);
    expect(collides(item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2))).toBe(false);
    expect(collides(item('a', 0, 0, 4, 2), item('b', 0, 2, 4, 2))).toBe(false);
    expect(collides(item('a', 0, 0, 4, 2), item('a', 0, 0, 4, 2))).toBe(false);
  });
});

describe('clampItem', () => {
  it('keeps items inside the grid and within size limits', () => {
    expect(clampItem(item('a', 10, -3, 5, 2), { columns: 12 })).toMatchObject({ x: 7, y: 0, w: 5 });
    expect(clampItem(item('a', 0, 0, 20, 2, { maxW: 8 }), { columns: 12 }).w).toBe(8);
    expect(clampItem(item('a', 0, 0, 1, 1, { minW: 3, minH: 2 }), { columns: 12 })).toMatchObject({ w: 3, h: 2 });
    expect(clampItem(item('a', 0, 0, 9, 1), { columns: 6 }).w).toBe(6);
  });
});

describe('moveItem', () => {
  it('moves into free space and floats up under vertical compaction', () => {
    const r = moveItem([item('a', 0, 0, 4, 2), item('b', 6, 0, 4, 2)], 'b', 6, 5);
    expect(pos(r, 'b')).toEqual([6, 0, 4, 2]);
  });

  it('pushes colliding items down', () => {
    const items = [item('a', 0, 0, 6, 2), item('b', 0, 2, 6, 2)];
    const r = moveItem(items, 'b', 0, 0);
    expect(pos(r, 'b')).toEqual([0, 0, 6, 2]);
    expect(pos(r, 'a')).toEqual([0, 2, 6, 2]);
  });

  it('pushes chains of items', () => {
    const items = [item('a', 0, 0, 6, 2), item('b', 0, 2, 6, 2), item('c', 0, 4, 6, 2), item('d', 6, 0, 6, 2)];
    const r = moveItem(items, 'd', 0, 0);
    expect(hasOverlap(r)).toBe(false);
    expect(pos(r, 'd')).toEqual([0, 0, 6, 2]);
    expect(pos(r, 'a')).toEqual([0, 2, 6, 2]);
    expect(pos(r, 'b')).toEqual([0, 4, 6, 2]);
    expect(pos(r, 'c')).toEqual([0, 6, 6, 2]);
  });

  it('clamps the target to the grid', () => {
    const r = moveItem([item('a', 0, 0, 4, 2)], 'a', 99, 0, { columns: 12 });
    expect(pos(r, 'a')).toEqual([8, 0, 4, 2]);
  });

  it('does not move locked items, and cannot push locked ones', () => {
    const items = [item('a', 0, 0, 6, 2, { locked: true }), item('b', 6, 0, 6, 2)];
    expect(moveItem(items, 'a', 3, 3)).toBe(items);
    expect(moveItem(items, 'b', 0, 0)).toBe(items);
  });

  it('flows other items around a locked one', () => {
    const items = [item('lock', 0, 2, 12, 1, { locked: true }), item('a', 0, 0, 6, 2), item('b', 0, 3, 6, 2)];
    const r = compactVertical(moveItem(items, 'b', 0, 3));
    expect(pos(r, 'lock')).toEqual([0, 2, 12, 1]);
    expect(hasOverlap(r)).toBe(false);
  });

  it('with compact: none leaves items where they are and rejects overlapping moves', () => {
    const items = [item('a', 0, 0, 4, 2), item('b', 6, 5, 4, 2)];
    const free = moveItem(items, 'b', 6, 8, { compact: 'none' });
    expect(pos(free, 'b')).toEqual([6, 8, 4, 2]);
    expect(moveItem(items, 'b', 2, 1, { compact: 'none' })).toBe(items);
  });

  it('ignores unknown ids and never mutates the input', () => {
    const items = [item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2)];
    const before = JSON.stringify(items);
    expect(moveItem(items, 'zzz', 1, 1)).toBe(items);
    moveItem(items, 'b', 0, 0);
    expect(JSON.stringify(items)).toBe(before);
  });
});

describe('resizeItem', () => {
  it('grows into free space and pushes colliding items down', () => {
    const items = [item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2)];
    const r = resizeItem(items, 'a', 8, 2);
    expect(pos(r, 'a')).toEqual([0, 0, 8, 2]);
    expect(pos(r, 'b')).toEqual([4, 2, 4, 2]);
  });

  it('respects min and max sizes and the grid', () => {
    const items = [item('a', 0, 0, 4, 2, { minW: 3, maxW: 6 })];
    expect(pos(resizeItem(items, 'a', 1, 1), 'a')).toEqual([0, 0, 3, 1]);
    expect(pos(resizeItem(items, 'a', 50, 1), 'a')).toEqual([0, 0, 6, 1]);
  });

  it('rejects overlapping resizes with compact: none', () => {
    const items = [item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2)];
    expect(resizeItem(items, 'a', 8, 2, { compact: 'none' })).toBe(items);
  });
});

describe('addItem and findFreePosition', () => {
  it('puts a new item in the first free spot', () => {
    const items = [item('a', 0, 0, 6, 2)];
    expect(findFreePosition(items, 6, 2)).toEqual({ x: 6, y: 0 });
    expect(findFreePosition([item('a', 0, 0, 12, 2)], 6, 2)).toEqual({ x: 0, y: 2 });
    expect(findFreePosition([], 6, 2)).toEqual({ x: 0, y: 0 });
  });

  it('adds at the first free spot or at an explicit position (pushing what is there)', () => {
    const items = [item('a', 0, 0, 6, 2)];
    expect(pos(addItem(items, { id: 'b', w: 6, h: 2 }), 'b')).toEqual([6, 0, 6, 2]);
    const r = addItem(items, { id: 'b', x: 0, y: 0, w: 6, h: 2 });
    expect(pos(r, 'b')).toEqual([0, 0, 6, 2]);
    expect(pos(r, 'a')).toEqual([0, 2, 6, 2]);
  });

  it('ignores duplicate ids and honours the column count', () => {
    const items = [item('a', 0, 0, 6, 2)];
    expect(addItem(items, { id: 'a', w: 2, h: 2 })).toBe(items);
    expect(pos(addItem([], { id: 'x', w: 20, h: 1 }, { columns: 6 }), 'x')).toEqual([0, 0, 6, 1]);
  });
});

describe('removeItems', () => {
  it('closes the gap under vertical compaction and not otherwise', () => {
    const items = [item('a', 0, 0, 6, 2), item('b', 0, 2, 6, 2)];
    expect(pos(removeItems(items, ['a']), 'b')).toEqual([0, 0, 6, 2]);
    expect(pos(removeItems(items, ['a'], { compact: 'none' }), 'b')).toEqual([0, 2, 6, 2]);
  });
});

describe('normalizeLayout', () => {
  it('clamps and resolves overlaps already in the data, keeping input order', () => {
    const items = [item('a', 0, 0, 6, 2), item('b', 2, 1, 6, 2), item('c', 10, 0, 6, 2)];
    const r = normalizeLayout(items);
    expect(r.map(i => i.id)).toEqual(['a', 'b', 'c']);
    expect(hasOverlap(r)).toBe(false);
  });
});

describe('compactVertical and sameLayout', () => {
  it('floats items up without overlapping', () => {
    const r = compactVertical([item('a', 0, 4, 6, 2), item('b', 0, 9, 6, 2)]);
    expect(pos(r, 'a')).toEqual([0, 0, 6, 2]);
    expect(pos(r, 'b')).toEqual([0, 2, 6, 2]);
  });

  it('compares layouts by position and size only', () => {
    expect(sameLayout([item('a', 0, 0, 1, 1)], [item('a', 0, 0, 1, 1, { locked: true })])).toBe(true);
    expect(sameLayout([item('a', 0, 0, 1, 1)], [item('a', 1, 0, 1, 1)])).toBe(false);
  });
});

describe('setItemRect', () => {
  it('changes position and size together (resizing from the left edge)', () => {
    const items = [item('a', 4, 0, 4, 2), item('b', 0, 0, 4, 2)];
    const r = setItemRect(items, 'a', { x: 2, y: 0, w: 6, h: 2 });
    expect(pos(r, 'a')).toEqual([2, 0, 6, 2]);
    expect(pos(r, 'b')).toEqual([0, 2, 4, 2]);
  });

  it('clamps to the grid and limits, and rejects locked or overlapping (compact: none) changes', () => {
    expect(pos(setItemRect([item('a', 0, 0, 4, 2, { minW: 3 })], 'a', { x: -5, y: 0, w: 1, h: 2 }), 'a')).toEqual([0, 0, 3, 2]);
    const locked = [item('a', 0, 0, 4, 2, { locked: true })];
    expect(setItemRect(locked, 'a', { x: 1, y: 1, w: 2, h: 2 })).toBe(locked);
    const two = [item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2)];
    expect(setItemRect(two, 'b', { x: 2, y: 0, w: 6, h: 2 }, { compact: 'none' })).toBe(two);
  });
});
