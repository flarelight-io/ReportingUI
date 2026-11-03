import { observeSize } from './observe-size';

/** Keeps a measured width/height for a plot element and reports changes. */
export class PlotSizeTracker {
  private el?: Element;
  private disconnect?: () => void;

  constructor(private onChange: (size: { width: number; height: number }) => void) {}

  /** Use as a `ref` callback on the plot container. */
  attach = (el?: Element) => {
    if (el === this.el) return;
    this.disconnect?.();
    this.el = el;
    this.disconnect = el ? observeSize(el, this.onChange) : undefined;
  };

  detach() {
    this.attach(undefined);
  }
}

export interface BarFrameInput {
  width: number;
  height: number;
  horizontal: boolean;
  /** Already-truncated category labels, in display order. */
  labels: string[];
  fontSize: number;
  /** Reserve headroom for value labels drawn above (or beside) the bars. */
  valueLabels: boolean;
  /** Draw category labels on the axis. */
  showCategories: boolean;
  /** Extra left margin in px, e.g. for value-axis tick labels. */
  leftInset?: number;
  /** Value-axis tick labels (already formatted); reserves a left margin, or a bottom one for horizontal charts. */
  tickLabels?: string[];
}

export interface BarFrame {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  /** Vertical charts only: category labels are rotated because they don't fit side by side. */
  rotate: boolean;
  /** Size of one category slot along the category axis. */
  slot: number;
  /** Draw every Nth category label so labels never overlap. */
  labelStride: number;
  charWidth: number;
  /** Input labels clipped to what actually fits; use these for drawing. */
  labels: string[];
  /** False when even a short label would not fit, so category labels should be skipped. */
  showCategories: boolean;
}

/**
 * Splits a measured area into plot rectangle + label margins, in pixels.
 * Font size is an input rather than derived from the area, so text stays readable at any size,
 * and labels are clipped to the room available instead of eating the plot.
 */
export function computeBarFrame(input: BarFrameInput): BarFrame {
  const { width: W, height: H, horizontal, fontSize, valueLabels } = input;
  const pad = 8;
  const charWidth = fontSize * 0.58;
  const rawLabels = input.labels;
  const count = Math.max(1, rawLabels.length);
  const topPad = valueLabels && !horizontal ? fontSize + 8 : 8;
  const minChars = 4;

  // Margin for the value axis tick labels
  let left = pad + (input.leftInset || 0);
  let valueAxisBottom = 0;
  if (input.tickLabels && input.tickLabels.length) {
    if (horizontal) {
      valueAxisBottom = fontSize + 8;
    } else {
      left += Math.max(...input.tickLabels.map(t => t.length)) * charWidth + 8;
    }
  }

  let labels = rawLabels;
  let bottom = pad + 4;
  let rotate = false;
  let showCategories = input.showCategories;

  if (showCategories) {
    const longest = (list: string[]) => Math.max(0, ...list.map(l => l.length));
    if (horizontal) {
      const labelWidth = Math.min(longest(rawLabels) * charWidth + pad * 2, W * 0.4);
      const fit = Math.floor((labelWidth - pad * 2) / charWidth);
      if (fit < minChars) {
        showCategories = false;
      } else {
        labels = rawLabels.map(l => clipLabel(l, fit));
        left += labelWidth - pad;
      }
    } else {
      const slotWidth = (W - left - pad) / count;
      const flatFit = Math.floor((slotWidth - 6) / charWidth);
      if (flatFit >= Math.min(longest(rawLabels), 12) && flatFit >= minChars) {
        // Everything fits side by side (short labels, or clipped to the slot)
        labels = rawLabels.map(l => clipLabel(l, flatFit));
        bottom = fontSize + 14;
      } else {
        // Rotate, but cap the label area so it never takes over the plot
        const cap = H * 0.35;
        const fit = Math.floor((cap - fontSize - 8) / Math.SQRT1_2 / charWidth);
        if (fit < minChars) {
          showCategories = false;
        } else {
          rotate = true;
          labels = rawLabels.map(l => clipLabel(l, fit));
          bottom = Math.min(longest(labels) * charWidth * Math.SQRT1_2 + fontSize + 8, cap);
        }
      }
    }
  }

  bottom += valueAxisBottom;
  const rightPad = pad + (horizontal && valueLabels ? 40 : 0);
  const plotW = Math.max(0, W - left - rightPad);
  const plotH = Math.max(0, H - topPad - bottom);
  const slot = (horizontal ? plotH : plotW) / count;
  const labelStride = horizontal || rotate ? Math.max(1, Math.ceil((fontSize * 1.3) / Math.max(1, slot))) : 1;

  return { plotX: left, plotY: topPad, plotW, plotH, rotate, slot, labelStride, charWidth, labels, showCategories };
}

export function clipLabel(text: string, maxChars = 18): string {
  return text.length > maxChars ? `${text.substring(0, maxChars - 1)}…` : text;
}

/**
 * Fits 45° rotated labels into a header area no taller than `capRatio` of the chart height,
 * clipping them as needed. Returns the clipped labels and the height they need.
 */
export function fitRotatedLabels(labels: string[], chartHeight: number, fontSize: number, capRatio = 0.3): { labels: string[]; height: number } {
  const charWidth = fontSize * 0.58;
  const cap = chartHeight * capRatio;
  const fit = Math.max(4, Math.floor((cap - fontSize - 8) / Math.SQRT1_2 / charWidth));
  const fitted = labels.map(l => clipLabel(l, fit));
  const longest = Math.max(0, ...fitted.map(l => l.length)) * charWidth;
  return { labels: fitted, height: Math.min(longest * Math.SQRT1_2 + fontSize + 8, Math.max(cap, fontSize + 12)) };
}
