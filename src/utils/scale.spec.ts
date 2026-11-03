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

describe('niceScale with pinned ends', () => {
  it('pins 0-100 so the axis never rounds up to 110 or 120', () => {
    const s = niceScale(0, 97, 5, { min: 0, max: 100 });
    expect(s.min).toBe(0);
    expect(s.max).toBe(100);
    expect(s.ticks).toEqual([0, 25, 50, 75, 100]);
    // data slightly above 100 no longer pushes the axis to 150
    expect(niceScale(0, 100.5, 5, { min: 0, max: 100 }).max).toBe(100);
  });

  it('chooses a step that lands on the pinned end', () => {
    expect(niceScale(0, 70, 5, { max: 80 }).ticks).toEqual([0, 20, 40, 60, 80]);
    expect(niceScale(0, 70, 3, { max: 100 }).ticks).toEqual([0, 50, 100]);
  });

  it('pins only the lower end and still rounds the top', () => {
    const s = niceScale(0, 87, 5, { min: 10 });
    expect(s.min).toBe(10);
    expect(s.max).toBeGreaterThanOrEqual(87);
    expect(s.ticks[0]).toBe(10);
  });

  it('is unchanged without bounds', () => {
    expect(niceScale(0, 587.4).ticks).toEqual([0, 200, 400, 600]);
  });
});
