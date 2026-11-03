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

## Layout: row height and gap

By default the grid has 12 columns, square rows (row height = column width) and a 15px gap. Change this with
`report-viewer` properties or the same keys at the top level of the report configuration. Properties win over
the configuration.

| Property | Config key | Meaning |
| -------- | ---------- | ------- |
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
