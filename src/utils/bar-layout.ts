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
}

/**
 * Splits a measured area into plot rectangle + label margins, in pixels.
 * Font size is an input rather than derived from the area, so text stays readable at any size.
 */
export function computeBarFrame(input: BarFrameInput): BarFrame {
  const { width: W, height: H, horizontal, labels, fontSize, valueLabels, showCategories } = input;
  const pad = 8;
  const charWidth = fontSize * 0.58;
  const longestPx = Math.max(0, ...labels.map(l => l.length)) * charWidth;
  const topPad = valueLabels && !horizontal ? fontSize + 8 : 8;

  let left = pad;
  let bottom = pad + 4;
  let rotate = false;
  if (showCategories) {
    if (horizontal) {
      left = Math.min(longestPx + pad * 2, W * 0.4);
    } else {
      const slotWidth = (W - pad * 2) / Math.max(1, labels.length);
      rotate = slotWidth < longestPx + 6;
      bottom = rotate
        ? Math.min(longestPx * Math.SQRT1_2 + fontSize + 8, H * 0.45)
        : fontSize + 14;
    }
  }

  left += input.leftInset || 0;

  const rightPad = pad + (horizontal && valueLabels ? 40 : 0);
  const plotW = Math.max(0, W - left - rightPad);
  const plotH = Math.max(0, H - topPad - bottom);
  const slot = (horizontal ? plotH : plotW) / Math.max(1, labels.length);
  const labelStride = horizontal || rotate ? Math.max(1, Math.ceil((fontSize * 1.3) / Math.max(1, slot))) : 1;

  return { plotX: left, plotY: topPad, plotW, plotH, rotate, slot, labelStride, charWidth };
}

export function clipLabel(text: string, maxChars = 18): string {
  return text.length > maxChars ? `${text.substring(0, maxChars - 1)}…` : text;
}
