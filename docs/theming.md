# Theming and styling

## CSS variables

Components read `--fl-*` custom properties, which pass through the shadow DOM. Set them on `:root`,
on `<report-viewer>`, or on any ancestor. Defaults live in `src/global/theme.scss`.

```css
report-viewer {
  --fl-widget-radius: 2px;
  --fl-widget-shadow: none;
  --fl-widget-border: 1px solid #d0d7de;
  --fl-widget-header-background: #0b1f3a;
  --fl-grid-gap: 8px;
  --fl-chart-padding: 8px;
}
```

| Group  | Variables |
| ------ | --------- |
| Layout | `--fl-report-padding`, `--fl-grid-gap` |
| Widget | `--fl-widget-radius`, `--fl-widget-shadow`, `--fl-widget-shadow-hover`, `--fl-widget-border`, `--fl-widget-header-padding`, `--fl-widget-header-background`, `--fl-widget-title-size`, `--fl-widget-title-weight`, `--fl-widget-body-padding`, `--fl-widget-body-padding-fixed` |
| Chart  | `--fl-chart-padding`, `--fl-chart-legend-max-height`, and the existing `--fl-chart-*` colors, fonts and effects |

By default a widget's padding, title and text sizes shrink as the widget gets small (down to 40% for cards under about 140 × 220 px), so a one-row text widget still shows its text. The padding and title variables above set a fixed value instead and turn that scaling off for the part they set. Inside a widget, `--fl-widget-scale` (0.4 to 1) is available for your own styles.

## Light / dark

`report-viewer` has a `theme` property: `"light"`, `"dark"` or `"auto"` (default). Use it to drive the report from your
app's own toggle.

```html
<report-viewer theme="dark"></report-viewer>
```

```js
viewer.theme = isDark ? 'dark' : 'light';   // from your toggle
viewer.theme = 'auto';                      // follow the page again
```

- `auto` follows the page: a `data-theme="dark|light"` attribute or a `dark`/`light` class on `<html>`, otherwise the
  system `prefers-color-scheme`.
- `light` / `dark` apply to that viewer only, even on a page of the opposite mode. The viewer sets `data-theme` on
  itself, so the CSS variables switch for everything inside it, and charts pick the matching palette.
- This is separate from `colorTheme`, which chooses the chart palette (`brand`, `rainbow`, or your own).
- Make sure `@flarelight-io/reporting/styles.css` is loaded; it defines the light and dark variable sets.

## Layout: row height and gap

By default the grid has 12 columns, square rows (row height = column width) and a 15px gap. Change this with
`report-viewer` properties or the same keys at the top level of the report configuration. Properties win over
the configuration.

| Property | Config key | Meaning |
| -------- | ---------- | ------- |
| `columns` | `columns` | Number of grid columns (default `12`). Widget `x` and `w` are counted in these columns and widgets wider than the grid are clamped. |
| `rowHeight` / `row-height` | `rowHeight` | Row height in pixels. Overrides `rowAspectRatio`. |
| `rowAspectRatio` / `row-aspect-ratio` | `rowAspectRatio` | Column width divided by row height. `1` = square (default), `2` = rows half as tall as a column is wide. |
| `gap` | `gap` | Gap between widgets in pixels, `0` or more. Default `15`. |

```html
<report-viewer row-aspect-ratio="2" gap="8"></report-viewer>
```

```js
viewer.rowHeight = 60;   // fixed 60px rows
viewer.gap = 0;          // no gaps
```

`rowHeight` and `rowAspectRatio` apply to `heightMode="auto"`; in `heightMode="fixed"` the rows are sized to fill
the container. If `gap` isn't set, the `--fl-grid-gap` CSS variable (default `15px`) is used.

## Shadow parts

Anything not covered by a variable can be styled with `::part()` on the widget element. Widgets
re-export the parts of their frame and chart, so you don't need to reach into nested shadow roots.

| Part | Where |
| ---- | ----- |
| `card`, `header`, `title`, `body` | the widget frame (every widget) |
| `chart`, `plot`, `legend`, `tooltip` | the chart inside `data-widget` |

```css
data-widget::part(title) { text-transform: uppercase; }
data-widget::part(legend) { display: none; }
data-widget::part(card) { border-radius: 0; }
```

## Report builder

The builder is light DOM like the viewer, so you restyle it with ordinary selectors: `.builder-frame`, `.builder-frame.selected`, `.builder-handle`, `.builder-settings` (the settings button) and `.builder-panel` (the configuration drawer or modal). Its frames, handles and settings button use `--fl-chart-primary`, and the built-in configuration form uses the card, border, text and background variables above, so it follows your theme and dark mode. Details in [report-builder.md](report-builder.md#styling).

## Chart colors from CSS

Chart colors can also be set from CSS. These variables are **not defined by default**: when unset, charts use the
`colorTheme` palette (below); when set, they win. Define them on `:root`, on `<report-viewer>`, or on any ancestor, and
per mode with `[data-theme="dark"]`.

| Variables | Used by | Notes |
| --------- | ------- | ----- |
| `--fl-chart-series-1` … `--fl-chart-series-24` | all charts, filter buttons | Series colors in order, set at least one; extra series cycle. |
| `--fl-heatmap-color-1` … `--fl-heatmap-color-24` | heatmap | Scale from low to high, set at least two. Colors are blended smoothly between stops. |
| `--fl-correlation-negative-strong`, `-negative-moderate`, `-neutral`, `-positive-moderate`, `-positive-strong` | correlation matrix | Set all five. |
| `--fl-chart-text-color`, `--fl-chart-panel`, `--fl-chart-background`, `--fl-chart-border`, `--fl-chart-axis-color`, `--fl-chart-grid-color` | all charts | Surfaces and text. |
| `--fl-chart-font-family`, `--fl-chart-font-size`, `--fl-chart-title-size` | all charts | Typography; chart labels keep this size at any container size. |

```css
report-viewer {
  --fl-chart-series-1: #0b3d91;
  --fl-chart-series-2: #1d6fd1;
  --fl-chart-series-3: #f5a623;
  --fl-heatmap-color-1: #f7fbff;
  --fl-heatmap-color-2: #08306b;
}
report-viewer[data-theme="dark"] {
  --fl-chart-series-1: #8ab4ff;
  --fl-heatmap-color-1: #08306b;
  --fl-heatmap-color-2: #f7fbff;
}
```

Charts read the variables when they render. If you change them at runtime, call `ChartThemeUtils.refreshTheme()` so
charts re-read them (changing `theme` on the viewer does this too). Colors can be hex, `rgb()` or `rgba()`; a heatmap
scale using other formats (named colors, `hsl()`) steps between stops instead of blending.

## Custom chart color themes

Register a palette once, then select it by name in the report configuration (`"colorTheme": "corp"`).

```ts
import { ChartThemeUtils } from '@flarelight-io/reporting';

ChartThemeUtils.registerColorTheme('corp', {
  light: ['#0b3d91', '#1d6fd1', '#4fa3f7', '#f5a623', '#d0021b'],
  dark: ['#8ab4ff', '#5c9aff', '#3a7bd5', '#ffcf66', '#ff6b6b'], // optional, falls back to light
  // Optional diverging scale for correlation widgets: [strong-, moderate-, neutral, moderate+, strong+].
  // Derived from the palette when omitted.
  distinct: { light: ['#d0021b', '#f5a623', '#e5e7eb', '#4fa3f7', '#0b3d91'] },
});
```

Other helpers: `unregisterColorTheme(name)`, `getColorThemeNames()`, `hasColorTheme(name)`, and
`setThemeOverrides({ light: { fontFamily: '...' }, dark: { ... } })` to override individual tokens
(font, surfaces, grid color, ...).

## Chart sizing

Charts measure their plot area and lay themselves out in pixels, so axis and label text stays at a
constant size (the theme `fontSize`) instead of scaling with the container. When a cell is small,
labels are thinned or hidden rather than shrunk.
