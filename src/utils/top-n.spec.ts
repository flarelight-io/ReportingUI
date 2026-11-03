import { applyTopN } from './top-n';

const items = [
  { category: 'a', value: 10 }, { category: 'b', value: 50 }, { category: 'c', value: 30 },
  { category: 'd', value: 5 }, { category: 'e', value: 20 }
];

describe('applyTopN', () => {
  it('keeps the N largest by value and sums the rest into Other, last', () => {
    const r = applyTopN(items, { topN: 2 });
    expect(r.map(i => i.category)).toEqual(['b', 'c', 'Other']);
    expect(r[2].value).toBe(35);
    expect(r[2].isOther).toBe(true);
    expect(r[0].isOther).toBeUndefined();
  });

  it('uses a custom label and can drop the remainder', () => {
    expect(applyTopN(items, { topN: 2, otherLabel: 'Everything else' })[2].category).toBe('Everything else');
    expect(applyTopN(items, { topN: 2, showOther: false }).map(i => i.category)).toEqual(['b', 'c']);
  });

  it('does nothing when topN is unset, invalid or not smaller than the data', () => {
    expect(applyTopN(items, undefined)).toBe(items);
    expect(applyTopN(items, {})).toBe(items);
    expect(applyTopN(items, { topN: 0 })).toBe(items);
    expect(applyTopN(items, { topN: 5 })).toBe(items);
    expect(applyTopN(items, { topN: 99 })).toBe(items);
  });

  it('keeps a single leftover as itself instead of an Other of one', () => {
    const r = applyTopN(items, { topN: 4 });
    expect(r.map(i => i.category)).toEqual(['b', 'c', 'e', 'a', 'd']);
    expect(r.some(i => i.isOther)).toBe(false);
  });

  it('is stable for equal values and tolerates non-finite ones', () => {
    const r = applyTopN([{ category: 'x', value: 1 }, { category: 'y', value: 1 }, { category: 'z', value: NaN }, { category: 'w', value: 0 }], { topN: 1 });
    expect(r[0].category).toBe('x');
    expect(r[1].category).toBe('Other');
  });

  it('does not mutate the input', () => {
    const copy = JSON.stringify(items);
    applyTopN(items, { topN: 2 });
    expect(JSON.stringify(items)).toBe(copy);
  });
});
