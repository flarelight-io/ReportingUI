export type ChartMode = "light" | "dark";
export type BuiltInColorTheme = "brand" | "rainbow" | "blue" | "grayscale" | "rainbow-alt";
// Any registered theme name is valid; the `string & {}` keeps autocomplete for the built-ins.
export type ColorTheme = BuiltInColorTheme | (string & {});

export interface ColorThemeDefinition {
  /** Series colors used in light mode (cycled when there are more series than colors). */
  light: string[];
  /** Series colors used in dark mode. Falls back to `light` when omitted. */
  dark?: string[];
  /** Optional 5-color diverging scale [strong-, moderate-, neutral, moderate+, strong+] per mode. */
  distinct?: { light: string[]; dark?: string[] };
}

/** Optional overrides for the non-palette theme tokens (fonts, surfaces, strokes...). */
export interface ChartThemeOverrides {
  light?: Record<string, any>;
  dark?: Record<string, any>;
}

function alpha(hex: string, a: number) {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
}

// Color theme definitions
const builtInColorThemes: Record<BuiltInColorTheme, { light: string[], dark: string[] }> = {
  brand: {
    light: [
      "#4d19a2", // primary brand color
      "#5c1fb8", // 95% intensity
      "#6b2bc4", // 90% intensity
      "#7a37d0", // 85% intensity
      "#8943dc", // 80% intensity
      "#984fe8", // 75% intensity
      "#a75bf4", // 70% intensity
      "#b667ff", // 65% intensity
    ],
    dark: [
      "#c035db", // primary brand color (dark mode)
      "#d84ae0", // 95% intensity
      "#e05fe6", // 90% intensity
      "#e874ec", // 85% intensity
      "#f089f2", // 80% intensity
      "#f89ef8", // 75% intensity
      "#ffb3fe", // 70% intensity
      "#ffc8ff", // 65% intensity
    ]
  },
  rainbow: {
    light: [
      "#ef4444", // red
      "#f97316", // orange
      "#eab308", // yellow
      "#22c55e", // green
      "#06b6d4", // cyan
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#ec4899", // pink
    ],
    dark: [
      "#f87171", // red (lighter for dark mode)
      "#fb923c", // orange
      "#facc15", // yellow
      "#4ade80", // green
      "#22d3ee", // cyan
      "#60a5fa", // blue
      "#a78bfa", // purple
      "#f472b6", // pink
    ]
  },
  blue: {
    light: [
      "#1e40af", // blue-800
      "#2563eb", // blue-600
      "#3b82f6", // blue-500
      "#60a5fa", // blue-400
      "#93c5fd", // blue-300
      "#bfdbfe", // blue-200
      "#dbeafe", // blue-100
      "#eff6ff", // blue-50
    ],
    dark: [
      "#1d4ed8", // blue-700
      "#2563eb", // blue-600
      "#3b82f6", // blue-500
      "#60a5fa", // blue-400
      "#93c5fd", // blue-300
      "#bfdbfe", // blue-200
      "#dbeafe", // blue-100
      "#f0f9ff", // blue-50
    ]
  },
  grayscale: {
    light: [
      "#111827", // gray-900
      "#374151", // gray-700
      "#4b5563", // gray-600
      "#6b7280", // gray-500
      "#9ca3af", // gray-400
      "#d1d5db", // gray-300
      "#e5e7eb", // gray-200
      "#f3f4f6", // gray-100
    ],
    dark: [
      "#f9fafb", // gray-50
      "#f3f4f6", // gray-100
      "#e5e7eb", // gray-200
      "#d1d5db", // gray-300
      "#9ca3af", // gray-400
      "#6b7280", // gray-500
      "#4b5563", // gray-600
      "#374151", // gray-700
    ]
  },
  "rainbow-alt": {
    light: [
      "#8b5cf6", // purple
      "#3b82f6", // blue
      "#06b6d4", // cyan
      "#22c55e", // green
      "#eab308", // yellow
      "#f97316", // orange
      "#ef4444", // red
      "#ec4899", // pink
    ],
    dark: [
      "#a78bfa", // purple
      "#60a5fa", // blue
      "#22d3ee", // cyan
      "#4ade80", // green
      "#facc15", // yellow
      "#fb923c", // orange
      "#f87171", // red
      "#f472b6", // pink
    ]
  }
};

const customColorThemes: Record<string, ColorThemeDefinition> = {};
let themeOverrides: ChartThemeOverrides = {};

function getPalette(colorTheme: ColorTheme, mode: ChartMode): string[] {
  const custom = customColorThemes[colorTheme];
  if (custom) {
    const palette = custom[mode] && custom[mode].length ? custom[mode] : custom.light;
    return palette;
  }
  const builtIn = builtInColorThemes[colorTheme as BuiltInColorTheme] || builtInColorThemes.brand;
  return builtIn[mode];
}

// Helper function to get distinct colors for correlation analysis
// Returns 5 colors: [strong-, moderate-, neutral, moderate+, strong+]
function getDistinctColors(colorTheme: ColorTheme, mode: ChartMode): string[] {
  const isLight = mode === "light";

  const custom = customColorThemes[colorTheme];
  if (custom) {
    const explicit = custom.distinct && (custom.distinct[mode] || custom.distinct.light);
    if (explicit && explicit.length === 5) return explicit;
    // Derive a scale from the palette: ends and middle of the series colors
    const palette = getPalette(colorTheme, mode);
    const at = (f: number) => palette[Math.min(palette.length - 1, Math.round(f * (palette.length - 1)))];
    return [at(0), at(0.25), at(0.5), at(0.75), at(1)];
  }
  
  switch (colorTheme) {
    case 'brand':
      return isLight ? [
        '#ef4444', // Strong negative - red
        '#f59e0b', // Moderate negative - orange  
        '#c084fc', // Neutral - light purple
        '#7a37d0', // Moderate positive - medium purple
        '#4d19a2'  // Strong positive - dark purple
      ] : [
        '#f87171', // Strong negative - light red (dark mode)
        '#fb923c', // Moderate negative - light orange
        '#e879f9', // Neutral - light purple
        '#a855f7', // Moderate positive - medium purple
        '#7c3aed'  // Strong positive - dark purple
      ];
      
    case 'rainbow':
      return isLight ? [
        '#ef4444', // Strong negative - red
        '#f97316', // Moderate negative - orange
        '#eab308', // Neutral - yellow
        '#22c55e', // Moderate positive - green
        '#06b6d4'  // Strong positive - cyan
      ] : [
        '#f87171', // Strong negative - light red
        '#fb923c', // Moderate negative - light orange
        '#facc15', // Neutral - light yellow
        '#4ade80', // Moderate positive - light green
        '#22d3ee'  // Strong positive - light cyan
      ];
      
    case 'blue':
      return isLight ? [
        '#ef4444', // Strong negative - red
        '#f59e0b', // Moderate negative - orange
        '#93c5fd', // Neutral - light blue
        '#3b82f6', // Moderate positive - medium blue
        '#1e40af'  // Strong positive - dark blue
      ] : [
        '#f87171', // Strong negative - light red
        '#fb923c', // Moderate negative - light orange
        '#bfdbfe', // Neutral - very light blue
        '#60a5fa', // Moderate positive - light blue
        '#2563eb'  // Strong positive - medium blue
      ];
      
    case 'grayscale':
      return isLight ? [
        '#111827', // Strong negative - darkest gray
        '#4b5563', // Moderate negative - dark gray
        '#9ca3af', // Neutral - medium gray
        '#6b7280', // Moderate positive - medium-dark gray
        '#374151'  // Strong positive - dark gray
      ] : [
        '#f9fafb', // Strong negative - lightest gray
        '#d1d5db', // Moderate negative - light gray
        '#6b7280', // Neutral - medium gray
        '#9ca3af', // Moderate positive - medium-light gray
        '#e5e7eb'  // Strong positive - light gray
      ];
      
    case 'rainbow-alt':
      return isLight ? [
        '#ef4444', // Strong negative - red
        '#f97316', // Moderate negative - orange
        '#8b5cf6', // Neutral - purple
        '#3b82f6', // Moderate positive - blue
        '#06b6d4'  // Strong positive - cyan
      ] : [
        '#f87171', // Strong negative - light red
        '#fb923c', // Moderate negative - light orange
        '#a78bfa', // Neutral - light purple
        '#60a5fa', // Moderate positive - light blue
        '#22d3ee'  // Strong positive - light cyan
      ];
      
    default:
      return isLight ? [
        '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4'
      ] : [
        '#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee'
      ];
  }
}

// Helper function to create theme with color palette
function createTheme(mode: ChartMode, colorTheme: ColorTheme = "brand") {
  const colors = getPalette(colorTheme, mode);
  const isLight = mode === "light";
  
  const theme = {
    mode,
    // layout
    grid: 8,
    radius: 6,
    gap: 12,
    // typography
    fontFamily: `Inter, "Segoe UI", system-ui, sans-serif`,
    fontSize: 12,
    titleSize: 16,
    // surfaces & strokes
    bg: isLight ? "#ffffff" : "#0b0b10",
    panel: isLight ? "#ffffff" : "#12131a",
    border: isLight ? "#e5e7eb" : "#1f2430",
    labelColor: isLight ? "#374151" : "#e5e7eb",
    axisColor: isLight ? "#9ca3af" : "#9aa0aa",
    gridColor: isLight ? "#e5e7eb" : "#252a36",
    // dynamic series palette based on color theme
    series: colors,
    // distinct colors for correlation analysis (5 colors: strong-, moderate-, neutral, moderate+, strong+)
    distinct: getDistinctColors(colorTheme, mode),
    // analytical elements (regression lines, trend indicators, etc.)
    regressionColor: isLight ? "#0D9488" : "#22d3ee",
    // effects
    shadow: { dx: 0, dy: 1, blur: isLight ? 1.6 : 2.0, opacity: isLight ? 0.18 : 0.22 },
    // gridline policy
    gridlines: { x: false, y: true, opacity: isLight ? 0.8 : 0.55 },
    // brand gradients (optional)
    barGradient: [alpha(colors[0], 1), alpha("#000000", isLight ? 0.04 : 0.10)],
    lineStrokeWidth: 2,
    pointRadius: 3,
    // states
    dimOpacity: isLight ? 0.35 : 0.4,
    focusStrokeDarken: isLight ? 0.12 : 0.1,
  };

  const overrides = themeOverrides[mode];
  return overrides ? { ...theme, ...overrides } : theme;
}

export const chartTheme: Record<ChartMode, any> = {
  light: createTheme("light", "brand"),
  dark: createTheme("dark", "brand")
};

// Utility functions for chart styling
export class ChartThemeUtils {
  private static _currentMode: ChartMode | null = null;
  private static _currentColorTheme: ColorTheme = "brand";
  private static _themeChangeCallbacks: (() => void)[] = [];

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
    this.notifyThemeChange();
  }

  /**
   * Register (or replace) a named color theme. It can then be selected with
   * `colorTheme: "<name>"` in the report configuration or via `setColorTheme`.
   */
  static registerColorTheme(name: string, definition: ColorThemeDefinition): void {
    if (!definition || !Array.isArray(definition.light) || definition.light.length === 0) {
      throw new Error(`registerColorTheme("${name}"): "light" must be a non-empty array of colors`);
    }
    customColorThemes[name] = definition;
    if (this._currentColorTheme === name) {
      this.updateCSSColorTheme(name);
    }
    this.notifyThemeChange();
  }

  static unregisterColorTheme(name: string): void {
    delete customColorThemes[name];
    this.notifyThemeChange();
  }

  static getColorThemeNames(): string[] {
    return [...Object.keys(builtInColorThemes), ...Object.keys(customColorThemes)];
  }

  static hasColorTheme(name: string): boolean {
    return name in builtInColorThemes || name in customColorThemes;
  }

  /**
   * Override individual theme tokens (fontFamily, fontSize, bg, panel, labelColor, gridColor,
   * regressionColor, lineStrokeWidth, ...) for one or both modes. Merged over the generated theme.
   */
  static setThemeOverrides(overrides: ChartThemeOverrides): void {
    themeOverrides = overrides || {};
    this.notifyThemeChange();
  }

  static setColorTheme(colorTheme: ColorTheme): void {
    this._currentColorTheme = colorTheme;
    this.updateCSSColorTheme(colorTheme);
    this.notifyThemeChange();
  }

  private static updateCSSColorTheme(colorTheme: ColorTheme): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color-theme', colorTheme);
    }
  }

  static getCurrentColorTheme(): ColorTheme {
    return this._currentColorTheme;
  }

  static refreshTheme(): void {
    this._currentMode = null;
    this.notifyThemeChange();
  }

  static onThemeChange(callback: () => void): void {
    this._themeChangeCallbacks.push(callback);
    
    if (typeof document !== 'undefined') {
      // Listen for changes to the data-theme attribute
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            this.refreshTheme();
          }
        });
      });
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });
    }
  }

  private static notifyThemeChange(): void {
    this._themeChangeCallbacks.forEach(callback => callback());
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

  /**
   * Resolves light/dark for an element: the nearest ancestor (crossing shadow roots) with
   * data-theme="light|dark" wins, e.g. a <report-viewer theme="dark">. Falls back to the
   * page-level detection (document attribute / class / system preference).
   */
  static resolveMode(host?: Element | null): ChartMode {
    let node: Element | null | undefined = host;
    while (node) {
      const value = node.getAttribute && node.getAttribute('data-theme');
      if (value === 'dark' || value === 'light') return value;
      const parent: Element | null = node.parentElement;
      if (parent) {
        node = parent;
      } else {
        const root = node.getRootNode && node.getRootNode();
        node = root && (root as ShadowRoot).host ? (root as ShadowRoot).host : null;
      }
    }
    return this._currentMode || this.getCurrentMode();
  }

  static getTheme(colorTheme?: ColorTheme, host?: Element | null): any {
    const mode = host ? this.resolveMode(host) : (this._currentMode || this.getCurrentMode());
    const theme = colorTheme || this._currentColorTheme;
    return createTheme(mode, theme);
  }

  static getSeriesColor(index: number, colorTheme?: ColorTheme): string {
    const theme = this.getTheme(colorTheme);
    return theme.series[index % theme.series.length];
  }

    static createGradient(id: string, _colors: string[]): string {      
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
      return (value / 1000000000).toFixed(3).replace(/\.?0+$/, '') + 'B';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(3).replace(/\.?0+$/, '') + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(3).replace(/\.?0+$/, '') + 'K';
    }
    // For smaller numbers, format to max 3 decimal places and remove trailing zeros
    return parseFloat(value.toFixed(3)).toString();
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
