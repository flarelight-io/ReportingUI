# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Compile all Stencil components → /dist
npm start              # Dev mode with hot reload + local server
npm test               # Jest unit tests + Puppeteer E2E tests
npm run test.watch     # Continuous test watching
npm run generate       # Scaffold a new Stencil component
npm run bundle:esbuild # Build standalone flarelight-reporting-esbuild.js (no deps)
npm run generate:config-schemas # Refresh src/utils/widget-config-schemas.ts from src/schema.json
```

There is no lint script. Tests use Jest (spec) and Puppeteer (e2e); both run together with `npm test`.

## Architecture

This is a **StencilJS web components library** that publishes reusable reporting dashboard widgets. Consumers embed the components in React, Angular, vanilla JS, or .NET apps. The output includes ESM/CJS distributions, a hydrate bundle (SSR), and a standalone esbuild IIFE bundle.

### Component Hierarchy

```
<report-viewer>          ← Main container: parses config, renders the CSS grid layout,
                           owns filter state, calls fetchChartData()
  └── <*-widget>         ← Widgets extend BaseWidget; receive data props from report-viewer
        └── <*-visualization>  ← Chart/viz components extend BaseVisualization; render Chart.js

<report-builder>         ← Optional editing layer around <report-viewer>: selection frames, move/resize,
                           undo/redo, config hook or built-in <widget-config-form>. Controlled:
                           emits configurationChange, the app applies it
```

All widgets inherit from `base-widget.tsx`. All visualizations inherit from `base-visualization.ts`. The base classes handle shared lifecycle, data loading, and event emission.

### Data Flow

1. `<report-viewer>` receives a config object and a `fetchChartData` callback prop.
2. It uses `ChartDataRequestBuilder` (`src/utils/chart-data-request-builder.ts`) to build typed API request objects.
3. It calls `fetchChartData(request)` — the consumer supplies this function (it makes the actual HTTP call).
4. Results are passed down as props to individual widgets.
5. Widgets emit `filterChange` events upward; `<report-viewer>` aggregates and re-fetches.

### Key Directories

- `src/components/widgets/` — All widget components (data, text, source-info, 15+ statistical test widgets)
- `src/components/widgets/visualizations/` — Chart renderers (bar, line, pie, heatmap, scatter, table, etc.)
- `src/components/report-viewer/` — Top-level container component
- `src/api/types/common.ts` — Shared API interfaces (`ChartDataRequest`, `DataSource`, `Filter`)
- `src/components/report-builder/` — `<report-builder>` and `<widget-config-form>`; `src/components/builder-demo/` is the builder demo page (`/builder.html`)
- `src/utils/` — `ChartDataRequestBuilder`, `ChartThemeUtils`, general utils; the report builder's pure logic: `layout.ts` (layout engine), `report-layout.ts` (config helpers), `widget-catalog.ts`, `config-form.ts`, `widget-registry.ts`
- `src/global/theme.scss` — Global SCSS theme
- `src/schema.json` — UI schema defining widget configuration shape

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
- `npm run bundle:esbuild` → `flarelight-reporting-esbuild.js` single-file IIFE bundle (~847 KB), includes `createElement()`, `createChart()`, `renderReport()` helpers; patches `document.baseURI` for PuppeteerSharp compatibility

### Integration Guides

Integration guides live in the `docs/` folder:
- `docs/react-integration.md`
- `docs/javascript-integration.md`
- `docs/dotnet-integration.md`
- `docs/esbuild-bundle.md`
- `docs/development.md` — full architecture and contributor guide
- `docs/report-builder.md` — the report builder (API, keyboard, configuration UI); design and status in `docs/design/report-builder.md`
