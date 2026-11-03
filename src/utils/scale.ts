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

/** True when the step is 1, 2, 2.5, 5 or 10 times a power of ten. */
function isNiceStep(step: number): boolean {
  if (!isFinite(step) || step <= 0) return false;
  const exponent = Math.floor(Math.log10(step));
  const fraction = step / Math.pow(10, exponent);
  return [1, 2, 2.5, 5, 10].some(n => Math.abs(fraction - n) < 1e-9);
}

export interface ScaleBounds {
  /** Fix the lower end of the axis (for example 0). */
  min?: number;
  /** Fix the upper end of the axis (for example 100 for percentages). Data above it is clipped by the caller. */
  max?: number;
}

/**
 * Computes an axis domain with round tick values (e.g. 0, 200, 400, 600) that fully covers
 * [dataMin, dataMax]. Pass `dataMin = 0` for bar-like charts that must start at zero.
 *
 * `bounds` pins either end of the axis. A pinned end is always the first/last tick, and the step is chosen so the
 * ticks land evenly on it (0-100 gives 0, 25, 50, 75, 100 instead of a rounded-up 0-120).
 */
export function niceScale(dataMin: number, dataMax: number, targetTicks = 5, bounds?: ScaleBounds): NiceScale {
  let lo = Math.min(dataMin, dataMax);
  let hi = Math.max(dataMin, dataMax);
  if (lo === hi) {
    // Flat data: open a window around the value so the axis still has a range
    const pad = Math.abs(hi) > 0 ? Math.abs(hi) * 0.5 : 1;
    lo = lo >= 0 && lo - pad < 0 ? 0 : lo - pad;
    hi = hi + pad;
  }
  const pinnedMin = bounds && isFinite(bounds.min as number) ? (bounds.min as number) : undefined;
  const pinnedMax = bounds && isFinite(bounds.max as number) ? (bounds.max as number) : undefined;
  if (pinnedMin !== undefined) lo = pinnedMin;
  if (pinnedMax !== undefined) hi = pinnedMax;
  if (hi <= lo) hi = lo + 1;

  let step = niceStep((hi - lo) / Math.max(1, targetTicks - 1));
  if (pinnedMin !== undefined || pinnedMax !== undefined) {
    // Prefer a step that divides the pinned range evenly, closest to the wanted tick count
    const wanted = Math.max(2, targetTicks - 1);
    for (let delta = 0; delta <= 6; delta++) {
      const found = [wanted - delta, wanted + delta].find(k => k >= 2 && isNiceStep((hi - lo) / k));
      if (found) { step = (hi - lo) / found; break; }
    }
  }

  const min = pinnedMin !== undefined ? pinnedMin : Math.floor(lo / step + 1e-9) * step;
  const max = pinnedMax !== undefined ? pinnedMax : Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  const count = Math.floor((max - min) / step + 1e-9);
  for (let i = 0; i <= count; i++) {
    // Round away float noise such as 0.30000000000000004
    ticks.push(parseFloat((min + i * step).toPrecision(12)));
  }
  return { min, max, step, ticks };
}
