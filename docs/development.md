# Development Guide

This guide covers the architecture, patterns, and workflows for contributing to the Flarelight Reporting library.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
git clone https://github.com/flarelight-io/reporting
cd reporting
npm install
```

## Commands

```bash
npm run build          # Compile all Stencil components → /dist
npm start              # Dev mode with hot reload + local server
npm test               # Jest unit tests + Puppeteer E2E tests
npm run test.watch     # Continuous test watching
npm run generate       # Scaffold a new Stencil component
npm run bundle:esbuild # Build standalone flarelight-reporting-esbuild.js (no deps)
```

There is no lint script. Tests use Jest (spec) and Puppeteer (e2e); both run together with `npm test`.

## Architecture

This is a **StencilJS web components library** that publishes reusable reporting dashboard widgets. Consumers embed the components in React, Angular, Vue, vanilla JS, or .NET apps. The output includes ESM/CJS distributions, a hydrate bundle (SSR), and a standalone esbuild IIFE bundle.

### Component Hierarchy

```
<report-viewer>          ← Main container: parses config, manages grid layout (Gridstack),
                           owns filter state, calls fetchChartData()
  └── <*-widget>         ← Widgets extend BaseWidget; receive data props from report-viewer
        └── <*-visualization>  ← Chart/viz components extend BaseVisualization; render Chart.js
```

All widgets inherit from `base-widget.tsx`. All visualizations inherit from `base-visualization.ts`. The base classes handle shared lifecycle, data loading, and event emission.

### Data Flow

1. `<report-viewer>` receives a config object and a `fetchChartData` callback prop.
2. It uses `ChartDataRequestBuilder` (`src/utils/chart-data-request-builder.ts`) to build typed API request objects.
3. It calls `fetchChartData(request)` — the consumer supplies this function (it makes the actual HTTP call).
4. Results are passed down as props to individual widgets.
5. Widgets emit `filterChange` events upward; `<report-viewer>` aggregates and re-fetches.

### Key Directories

```
src/
  components/
    report-viewer/          ← Top-level container component
    widgets/                ← All widget components
      visualizations/       ← Chart renderers (bar, line, pie, heatmap, scatter, etc.)
  api/
    types/
      common.ts             ← Shared API interfaces (ChartDataRequest, DataSource, Filter)
  utils/
    chart-data-request-builder.ts
    chart-theme-utils.ts
  global/
    theme.scss              ← Global SCSS theme variables
  schema.json               ← UI schema defining widget configuration shape
```

### Stencil Patterns

Components use standard Stencil decorators:

```typescript
@Component({ tag: 'fl-my-widget', styleUrl: 'my-widget.scss', shadow: true })
export class MyWidget {
  @Prop() config: WidgetConfig;
  @State() data: ChartData;
  @Event() filterChange: EventEmitter<Filter>;
  @Watch('config') onConfigChange() { ... }
  @Element() el: HTMLElement;
}
```

### Distribution

- `npm run build` → `/dist` (ESM, CJS, hydrate, custom-elements, type definitions)
- `npm run bundle:esbuild` → `flarelight-reporting-esbuild.js` single-file IIFE bundle, includes `createElement()`, `createChart()`, `renderReport()` helpers; patches `document.baseURI` for PuppeteerSharp compatibility

## Field display names

`sources[].fields[]` can carry a `displayName` next to the raw column `name`. Wherever a chart shows a field name
(legend entries, tooltips, table headers, filter titles) it shows the display name when the source defines one that
differs from the name, so the backend controls the wording. Matching is by field name, case-insensitively, so it also
works when the backend returns a different casing in the rows.

```json
{ "sources": [{ "id": "sales", "name": "Sales", "type": "table",
    "fields": [{ "name": "rev_usd", "displayName": "Revenue (USD)", "type": "number" }] }] }
```

A table column's explicit `header` in the widget configuration still wins over the display name.

### Supplying sources at render time

Sources don't have to be embedded in the saved report. `<report-viewer>` takes a `sources` property that overrides
`configuration.sources`; a widget only stores its `sourceId`. Changing the property refetches and re-renders, and
clearing it falls back to the sources in the configuration.

```js
viewer.sources = await loadSourcesFromBackend();
```
`data-widget` builds the lookup (`VisualizationData.fieldLabels`) and visualizations use `fieldLabel(data, name)`
from `base-visualization.ts`; use the same helper in new visualizations.

## Adding a New Widget

1. Run `npm run generate` and follow the Stencil scaffold prompts.
2. Extend `BaseWidget` from `src/components/widgets/base-widget.tsx`.
3. For chart-based widgets, add a corresponding visualization component in `src/components/widgets/visualizations/` that extends `BaseVisualization`.
4. Register any new widget types in the `report-viewer`'s widget-dispatch logic.
5. Add configuration types to `src/api/types/common.ts` and update `src/schema.json`.

## Adding a New Visualization

1. Create `src/components/widgets/visualizations/<name>-visualization.tsx` extending `BaseVisualization`.
2. Use Chart.js for rendering; the base class handles canvas setup and resize.
3. Export the new component from the package entry point.

## Testing

Unit tests (Jest) live alongside components as `*.spec.ts`. End-to-end tests (Puppeteer) live as `*.e2e.ts`.

```bash
npm test               # Run all tests once
npm run test.watch     # Watch mode
```

## Build Output

| Output | Location | Use case |
|--------|----------|----------|
| ESM modules | `dist/index.js` | Modern bundlers |
| CommonJS | `dist/index.cjs.js` | Node.js / older bundlers |
| Hydrate | `dist/hydrate/` | Server-side rendering |
| Custom elements | `dist/components/` | Standalone custom elements |
| Loader | `loader/` | Lazy-loading via `defineCustomElements()` |
| CSS | `dist/flarelight-reporting/flarelight-reporting.css` | Theme styles |
| esbuild IIFE | `flarelight-reporting-esbuild.js` | Drop-in script tag, PuppeteerSharp |
