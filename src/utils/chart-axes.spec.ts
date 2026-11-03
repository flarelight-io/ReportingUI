import { buildAxis, formatTicks, tickCountFor } from './chart-axes';

describe('formatTicks', () => {
  it('uses one unit and just enough decimals for the step', () => {
    expect(formatTicks([0, 250000, 500000, 750000, 1000000], 250000)).toEqual(['0', '0.25M', '0.50M', '0.75M', '1.00M']);
    expect(formatTicks([0, 500, 1000, 1500, 2000], 500)).toEqual(['0', '0.5K', '1.0K', '1.5K', '2.0K']);
    expect(formatTicks([0, 200, 400, 600], 200)).toEqual(['0', '200', '400', '600']);
    expect(formatTicks([0, 0.25, 0.5, 0.75, 1], 0.25)).toEqual(['0', '0.25', '0.50', '0.75', '1.00']);
  });

  it('handles negatives, percent and never prints -0', () => {
    expect(formatTicks([-50, 0, 50], 50)).toEqual(['-50', '0', '50']);
    expect(formatTicks([0, 25, 50, 75, 100], 25, true)).toEqual(['0', '25%', '50%', '75%', '100%']);
  });

  it('keeps ticks distinct for tiny steps', () => {
    const labels = formatTicks([0, 0.0005, 0.001], 0.0005);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('tickCountFor', () => {
  it('fits fewer ticks into less room and stays within 2-8', () => {
    expect(tickCountFor(60, 11)).toBeLessThan(tickCountFor(300, 11));
    expect(tickCountFor(0, 11)).toBe(2);
    expect(tickCountFor(5000, 11)).toBe(8);
  });
});

describe('buildAxis', () => {
  it('caps a percent axis at 100 and labels it with %', () => {
    const a = buildAxis(0, 98, { percentAxis: true }, { length: 300, fontSize: 11 });
    expect(a.scale.max).toBe(100);
    expect(a.labels[a.labels.length - 1]).toBe('100%');
  });

  it('lets axisMax / axisMin override and works without config', () => {
    expect(buildAxis(0, 98, { axisMax: 80 }, { length: 300, fontSize: 11 }).scale.max).toBe(80);
    expect(buildAxis(0, 98, { percentAxis: true, axisMax: 150 }, { length: 300, fontSize: 11 }).scale.max).toBe(150);
    expect(buildAxis(0, 587, undefined, { length: 300, fontSize: 11 }).scale.max).toBe(600);
  });
});
