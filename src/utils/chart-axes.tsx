import { h } from '@stencil/core';
import { ChartThemeUtils } from './chart-theme';

export interface ValueAxisOptions {
  ticks: number[];
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
export function tickLabelWidth(ticks: number[], fontSize: number): number {
  return Math.max(0, ...ticks.map(t => formatTick(t).length)) * fontSize * 0.58 + 6;
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
                {formatTick(tick)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
