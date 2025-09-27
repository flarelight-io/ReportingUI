export type ChartMode = "light" | "dark";

const baseLight = "#4d19a2"; // brand (light mode)
const baseDark = "#c035db"; // brand (dark mode)

function alpha(hex: string, a: number) {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
}

export const chartTheme: Record<ChartMode, any> = {
  light: {
    mode: "light",
    // layout
    grid: 8,
    radius: 6,
    gap: 12,
    // typography
    fontFamily: `Inter, "Segoe UI", system-ui, sans-serif`,
    fontSize: 12,
    titleSize: 16,
    // surfaces & strokes
    bg: "#ffffff",
    panel: "#ffffff",
    border: "#e5e7eb",       // neutral-200
    labelColor: "#374151",   // neutral-700
    axisColor: "#9ca3af",    // neutral-400
    gridColor: "#e5e7eb",    // neutral-200
    // brand-first monochromatic series palette (accessible on white)
    series: [
      baseLight,            // primary - full brand color #4d19a2
      "#5c1fb8",            // 95% intensity - very subtle variation
      "#6b2bc4",            // 90% intensity
      "#7a37d0",            // 85% intensity
      "#8943dc",            // 80% intensity
      "#984fe8",            // 75% intensity
      "#a75bf4",            // 70% intensity
      "#b667ff",            // 65% intensity
    ],
    // effects
    shadow: { dx: 0, dy: 1, blur: 1.6, opacity: 0.18 },
    // gridline policy
    gridlines: { x: false, y: true, opacity: 0.8 },
    // brand gradients (optional)
    barGradient: [alpha(baseLight, 1), alpha("#000000", 0.04)],
    lineStrokeWidth: 2,
    pointRadius: 3,
    // states
    dimOpacity: 0.35,
    focusStrokeDarken: 0.12,
  },
  dark: {
    mode: "dark",
    grid: 8,
    radius: 6,
    gap: 12,
    fontFamily: `Inter, "Segoe UI", system-ui, sans-serif`,
    fontSize: 12,
    titleSize: 16,
    bg: "#0b0b10",
    panel: "#12131a",
    border: "#1f2430",
    labelColor: "#e5e7eb",
    axisColor: "#9aa0aa",
    gridColor: "#252a36",
    // brand-first monochromatic palette tuned for dark backgrounds
    series: [
      baseDark,            // primary (dark mode) - full brand color
      "#d84ae0",           // 95% intensity - very subtle variation
      "#e05fe6",           // 90% intensity
      "#e874ec",           // 85% intensity
      "#f089f2",           // 80% intensity
      "#f89ef8",           // 75% intensity
      "#ffb3fe",           // 70% intensity
      "#ffc8ff",           // 65% intensity
    ],
    shadow: { dx: 0, dy: 1, blur: 2.0, opacity: 0.22 },
    gridlines: { x: false, y: true, opacity: 0.55 },
    barGradient: [alpha(baseDark, 1), alpha("#000000", 0.10)],
    lineStrokeWidth: 2,
    pointRadius: 3,
    dimOpacity: 0.4,
    focusStrokeDarken: 0.1,
  }
};

// Utility functions for chart styling
export class ChartThemeUtils {
  private static _currentMode: ChartMode | null = null;

  static getCurrentMode(): ChartMode {
    // Check if dark mode is enabled via data attribute or CSS class
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      
      // Check for data-theme attribute first
      const dataTheme = html.getAttribute('data-theme');
      if (dataTheme === 'dark') {
        this._currentMode = 'dark';
        return 'dark';
      } else if (dataTheme === 'light') {
        this._currentMode = 'light';
        return 'light';
      }
      
      // Check for dark class
      if (html.classList.contains('dark')) {
        this._currentMode = 'dark';
        return 'dark';
      }
      
      // Check for light class
      if (html.classList.contains('light')) {
        this._currentMode = 'light';
        return 'light';
      }
      
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this._currentMode = 'dark';
        return 'dark';
      }
    }
    
    this._currentMode = 'light';
    return 'light';
  }

  static setTheme(mode: ChartMode): void {
    this._currentMode = mode;
  }

  static refreshTheme(): void {
    this._currentMode = null;
  }

  static onThemeChange(callback: () => void): void {
    if (typeof document !== 'undefined') {
      // Listen for changes to the data-theme attribute
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            this.refreshTheme();
            callback();
          }
        });
      });
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });
    }
  }

  // Helper method to manually toggle theme for testing
  static toggleTheme(): void {
    if (typeof document !== 'undefined') {
      const currentMode = this.getCurrentMode();
      const newMode = currentMode === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newMode);
      this.setTheme(newMode);
    }
  }

  static getTheme(): any {
    const mode = this._currentMode || this.getCurrentMode();
    return chartTheme[mode];
  }

  static getSeriesColor(index: number): string {
    const theme = this.getTheme();
    return theme.series[index % theme.series.length];
  }

  static createGradient(id: string, colors: string[]): string {
    return `url(#${id})`;
  }

  static getShadowFilter(): string {
    const theme = this.getTheme();
    const shadow = theme.shadow;
    return `drop-shadow(${shadow.dx}px ${shadow.dy}px ${shadow.blur}px rgba(0, 0, 0, ${shadow.opacity}))`;
  }

  static getHoverColor(baseColor: string): string {
    // Darken the color by the focus stroke amount
    const theme = this.getTheme();
    const darkenAmount = theme.focusStrokeDarken;
    
    // Simple darkening by reducing RGB values
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.max(0, Math.floor(r * (1 - darkenAmount)));
    const newG = Math.max(0, Math.floor(g * (1 - darkenAmount)));
    const newB = Math.max(0, Math.floor(b * (1 - darkenAmount)));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  static formatNumber(value: number): string {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  static snapToPixel(value: number): number {
    return Math.round(value) + 0.5;
  }

  static getSVGAttributes(): Record<string, string> {
    return {
      'shape-rendering': 'geometricPrecision',
      'text-rendering': 'optimizeLegibility',
      'vector-effect': 'non-scaling-stroke',
      'paint-order': 'stroke fill'
    };
  }
}

// Animation utilities
export class ChartAnimations {
  static getTransitionDuration(elementCount: number = 1): string {
    const baseDuration = 200; // ms
    const staggerDelay = 20; // ms per element
    return `${baseDuration + (elementCount * staggerDelay)}ms`;
  }

  static getEasing(): string {
    return 'cubic-bezier(0.4, 0, 0.2, 1)'; // ease-out
  }

  static getHoverTransition(): string {
    return 'all 120ms cubic-bezier(0.4, 0, 0.2, 1)';
  }

  // Premium bar/point animations
  static getBarAnimation(index: number, totalBars: number): string {
    const baseDuration = 200; // 180-250ms range
    const staggerDelay = 20; // 15-25ms per element
    const delay = index * staggerDelay;
    const duration = baseDuration + (totalBars * 2); // Slight increase for larger datasets
    
    return `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`;
  }

  static getPointAnimation(index: number, totalPoints: number): string {
    const baseDuration = 180; // Slightly faster for points
    const staggerDelay = 15; // Faster stagger for points
    const delay = index * staggerDelay;
    const duration = baseDuration + (totalPoints * 1.5);
    
    return `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`;
  }

  static getStaggerDelay(index: number): number {
    return index * 20; // 15-25ms stagger
  }

  static getBarEnterAnimation(): string {
    return 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)';
  }

  static getBarUpdateAnimation(): string {
    return 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)';
  }
}
