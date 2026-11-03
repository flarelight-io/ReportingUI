export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/** Rounds a raw step up to 1, 2, 2.5, 5 or 10 times a power of ten. */
function niceStep(rawStep: number): number {
  if (!isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * Math.pow(10, exponent);
}

/**
 * Computes an axis domain with round tick values (e.g. 0, 200, 400, 600) that fully covers
 * [dataMin, dataMax]. Pass `dataMin = 0` for bar-like charts that must start at zero.
 */
export function niceScale(dataMin: number, dataMax: number, targetTicks = 5): NiceScale {
  let lo = Math.min(dataMin, dataMax);
  let hi = Math.max(dataMin, dataMax);
  if (lo === hi) {
    // Flat data: open a window around the value so the axis still has a range
    const pad = Math.abs(hi) > 0 ? Math.abs(hi) * 0.5 : 1;
    lo = lo >= 0 && lo - pad < 0 ? 0 : lo - pad;
    hi = hi + pad;
  }
  const step = niceStep((hi - lo) / Math.max(1, targetTicks - 1));
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) {
    // Round away float noise such as 0.30000000000000004
    ticks.push(parseFloat((min + i * step).toPrecision(12)));
  }
  return { min, max, step, ticks };
}
