import { h } from '@stencil/core';
import { ChartThemeUtils } from './chart-theme';
import { NiceScale, niceScale } from './scale';

export interface ValueAxisOptions {
  ticks: number[];
  /** Pre-formatted tick labels (same length as `ticks`); defaults to formatting each tick. */
  labels?: string[];
  /** Domain the ticks are drawn against. */
  min: number;
  max: number;
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  fontSize: number;
  fontFamily: string;
  /** Value axis runs left-to-right (horizontal bar charts) instead of bottom-to-top. */
  horizontal?: boolean;
  showGrid?: boolean;
  gridOpacity?: number;
  showLabels?: boolean;
}

/** Formats an axis tick; keeps K/M/B suffixes consistent with the rest of the chart. */
export function formatTick(value: number): string {
  return ChartThemeUtils.formatNumber(value);
}

/** Width in px needed for the widest tick label (used to reserve a left margin). */
export function tickLabelWidth(ticks: (number | string)[], fontSize: number): number {
  return Math.max(0, ...ticks.map(t => (typeof t === 'string' ? t : formatTick(t)).length)) * fontSize * 0.58 + 6;
}

/** Chart config options for the value axis. */
export interface AxisConfig {
  /** Pin the lower end of the value axis. */
  axisMin?: number;
  /** Pin the upper end of the value axis (data above it is clipped to the plot). */
  axisMax?: number;
  /** Values are percentages: pins the axis to 0-100 (unless axisMin/axisMax say otherwise) and labels ticks with %. */
  percentAxis?: boolean;
}

/** How many ticks fit along `lengthPx` without their labels colliding. */
export function tickCountFor(lengthPx: number, fontSize: number, horizontal = false): number {
  const spacing = horizontal ? fontSize * 5.5 : fontSize * 2.4;
  return Math.max(2, Math.min(8, Math.floor(Math.max(0, lengthPx) / spacing) + 1));
}

/**
 * Formats ticks consistently: one unit (K/M/B) and just enough decimals for the step, so labels read
 * `0, 0.5, 1.0` or `0, 250K, 500K` instead of mixed precision. Zero is always `0`.
 */
export function formatTicks(ticks: number[], step: number, percent = false): string[] {
  const maxAbs = Math.max(0, ...ticks.map(t => Math.abs(t)));
  const unit = percent ? 1 : maxAbs >= 1e9 ? 1e9 : maxAbs >= 1e6 ? 1e6 : maxAbs >= 1e3 ? 1e3 : 1;
  const suffix = percent ? '%' : unit === 1e9 ? 'B' : unit === 1e6 ? 'M' : unit === 1e3 ? 'K' : '';
  // Fewest decimals (up to 6) that show every tick and the step exactly, so 0.25M never reads as 0.3M
  const decimalsFor = (value: number): number => {
    for (let d = 0; d <= 6; d++) {
      const scaled = value * Math.pow(10, d);
      if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return d;
    }
    return 6;
  };
  const decimals = Math.max(decimalsFor(Math.abs(step) / unit), ...ticks.map(t => decimalsFor(t / unit)));
  return ticks.map(t => {
    if (t === 0) return '0';
    const text = (t / unit).toFixed(decimals);
    return `${text === '-0' ? '0' : text}${suffix}`;
  });
}

export interface BuiltAxis {
  scale: NiceScale;
  labels: string[];
}

/**
 * The value axis for a chart: a nice scale with a tick count suited to the room, optional pinned ends from the
 * chart config (`axisMin`, `axisMax`, `percentAxis`) and consistently formatted labels.
 */
export function buildAxis(
  dataMin: number,
  dataMax: number,
  config: AxisConfig | undefined,
  room: { length: number; fontSize: number; horizontal?: boolean }
): BuiltAxis {
  const percent = !!(config && config.percentAxis);
  const bounds: { min?: number; max?: number } = {};
  if (percent) { bounds.min = 0; bounds.max = 100; }
  if (config && typeof config.axisMin === 'number') bounds.min = config.axisMin;
  if (config && typeof config.axisMax === 'number') bounds.max = config.axisMax;
  const scale = niceScale(dataMin, dataMax, tickCountFor(room.length, room.fontSize, room.horizontal), bounds);
  return { scale, labels: formatTicks(scale.ticks, scale.step, percent) };
}

/**
 * Gridlines plus tick labels for a value axis. Gridlines are subtle and dashed except the baseline;
 * labels use the secondary text color so data labels stay the visual focus.
 */
export function renderValueAxis(o: ValueAxisOptions) {
  const span = o.max - o.min || 1;
  return (
    <g class="value-axis">
      {o.ticks.map((tick, i) => {
        const f = (tick - o.min) / span;
        const isBase = i === 0;
        const pos = o.horizontal ? o.plotX + f * o.plotW : o.plotY + o.plotH - f * o.plotH;
        const snapped = ChartThemeUtils.snapToPixel(pos);
        return (
          <g key={`tick-${i}`}>
            {o.showGrid !== false && !isBase && (
              <line
                x1={o.horizontal ? snapped : o.plotX}
                y1={o.horizontal ? o.plotY : snapped}
                x2={o.horizontal ? snapped : o.plotX + o.plotW}
                y2={o.horizontal ? o.plotY + o.plotH : snapped}
                stroke="var(--fl-chart-grid-color)"
                stroke-width="1"
                stroke-dasharray="3,3"
                opacity={o.gridOpacity ?? 0.8}
              />
            )}
            {o.showLabels !== false && (
              <text
                x={o.horizontal ? pos : o.plotX - 8}
                y={o.horizontal ? o.plotY + o.plotH + o.fontSize + 4 : pos}
                font-size={o.fontSize}
                text-anchor={o.horizontal ? 'middle' : 'end'}
                dominant-baseline={o.horizontal ? 'auto' : 'middle'}
                fill="var(--fl-chart-text-secondary)"
                font-family={o.fontFamily}
              >
                {o.labels ? o.labels[i] : formatTick(tick)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
