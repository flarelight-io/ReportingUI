import { niceScale } from './scale';

describe('niceScale', () => {
  it('rounds the domain up to round tick values', () => {
    const s = niceScale(0, 587.4);
    expect(s.min).toBe(0);
    expect(s.max).toBe(600);
    expect(s.ticks).toEqual([0, 200, 400, 600]);
  });

  it('covers negative data and keeps zero as a tick', () => {
    const s = niceScale(-30, 80);
    expect(s.min).toBeLessThanOrEqual(-30);
    expect(s.max).toBeGreaterThanOrEqual(80);
    expect(s.ticks).toContain(0);
  });

  it('handles flat and zero data without a degenerate range', () => {
    expect(niceScale(0, 0).max).toBeGreaterThan(0);
    const flat = niceScale(5, 5);
    expect(flat.max).toBeGreaterThan(flat.min);
  });

  it('avoids float noise in ticks', () => {
    const s = niceScale(0, 0.9);
    expect(s.ticks.every(t => String(t).length <= 5)).toBe(true);
  });
});
