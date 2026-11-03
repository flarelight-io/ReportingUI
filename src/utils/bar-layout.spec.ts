import { fitCellFontSize } from './bar-layout';

describe('fitCellFontSize', () => {
  it('keeps the normal size when the value fits', () => {
    expect(fitCellFontSize(60, 30, 4, 11)).toBe(11);
  });

  it('shrinks to fit a smaller cell', () => {
    const size = fitCellFontSize(26, 20, 4, 11);
    expect(size).toBeGreaterThanOrEqual(9);
    expect(size).toBeLessThan(11);
  });

  it('returns 0 when even the minimum size does not fit', () => {
    expect(fitCellFontSize(17, 12, 4, 11)).toBe(0);
    expect(fitCellFontSize(100, 8, 4, 11)).toBe(0);
  });
});
