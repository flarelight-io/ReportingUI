[![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)](https://stenciljs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# Flarelight Reporting

A StencilJS web components library for building interactive reporting dashboards. Drop data visualization widgets — charts, statistical analyses, KPIs, and more — into React, Angular, Vue, .NET, or vanilla JavaScript applications.

## Features

- **Metadata-driven rendering** — the entire report layout, widget types, and data sources are defined as a plain JSON configuration object. Store configs in a database, generate them server-side, or build a visual editor — no code changes needed to change what a report shows
- **20+ visualization types** — bar, line, pie, scatter, bubble, heatmap, KPI, sunburst, histogram, lollipop, box & whisker, table, and more
- **Statistical analysis widgets** — normality tests (Shapiro-Wilk, Anderson-Darling, Kolmogorov-Smirnov), ANOVA, Mann-Whitney, Kruskal-Wallis, Wilcoxon, correlation, descriptive statistics
- **Bring your own data** — a single `fetchChartData(request)` callback is all the library needs; you control how data is fetched, cached, and transformed
- **Grid-based layout** via [Gridstack](https://gridstackjs.com/) — draggable, resizable widgets
- **Framework-agnostic** Web Components — works with any frontend stack
- **PDF generation** support via PuppeteerSharp / headless Chrome
- **Standalone esbuild bundle** — single `<script>` tag, no build step required
- **TypeScript** — full type definitions included

## Installation

```bash
npm install @flarelight-io/reporting
```

## Quick Start

### React

```jsx
// index.jsx / index.tsx
import { defineCustomElements } from '@flarelight-io/reporting/loader';
import '@flarelight-io/reporting/dist/flarelight-reporting/flarelight-reporting.css';

defineCustomElements();
```

```jsx
function Dashboard() {
  const fetchChartData = async (request) => {
    const res = await fetch('/api/chart-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return res.json();
  };

  return (
    <report-viewer
      reportId="my-dashboard"
      configuration={reportConfig}
      fetchChartData={fetchChartData}
    />
  );
}
```

### Vanilla JavaScript

```html
<link rel="stylesheet" href="node_modules/@flarelight-io/reporting/dist/flarelight-reporting/flarelight-reporting.css">

<report-viewer id="viewer" report-id="my-dashboard"></report-viewer>

<script type="module">
  import { defineCustomElements } from '@flarelight-io/reporting/loader';
  defineCustomElements();

  const viewer = document.getElementById('viewer');
  viewer.configuration = { widgets: [...], sources: [...] };
  viewer.fetchChartData = async (request) => { /* fetch from your API */ };
</script>
```

### Standalone bundle (no build step)

```html
<report-viewer id="viewer" report-id="my-dashboard" is-viewer="true"></report-viewer>
<script src="flarelight-reporting-esbuild.js"></script>
<script>
  customElements.whenDefined('report-viewer').then(() => {
    const viewer = document.getElementById('viewer');
    viewer.configuration = { widgets: [...], sources: [...] };
    viewer.fetchChartData = async (request) => { /* ... */ };
  });
</script>
```

Build the standalone bundle with `npm run bundle:esbuild`. See [docs/esbuild-bundle.md](docs/esbuild-bundle.md) for full details including PuppeteerSharp usage.

## How it Works

The library is **fully metadata-driven**. A report is described entirely by a plain JSON configuration object — no JSX, no component trees, no hard-coded widget lists. Pass that object to `<report-viewer>` alongside a data-fetching callback, and the library handles rendering, layout, and interactivity.

This means you can:
- **Store reports in a database** and render any report by fetching its config at runtime
- **Build a report editor** that saves configs as JSON — the viewer renders whatever the editor produces
- **Generate reports server-side** by constructing the config programmatically
- **Version and diff reports** since the entire definition is serialisable data

`<report-viewer>` accepts a **configuration** object and a **fetchChartData** callback:

- The configuration declares widget types, grid positions, and data source definitions.
- `fetchChartData(request)` is called by the library whenever a widget needs data. The typed request describes exactly what is needed (source, filters, aggregation); your function makes the API call and returns the rows.
- Widgets emit `filterChange` events upward; `<report-viewer>` aggregates them and re-fetches automatically.

```javascript
const configuration = {
  widgets: [
    {
      id: 'revenue-kpi',
      type: 'kpi',
      title: 'Total Revenue',
      x: 0, y: 0, w: 3, h: 2,
      config: { sourceId: 'sales', valueField: 'revenue' }
    },
    {
      id: 'sales-chart',
      type: 'bar',
      title: 'Sales by Region',
      x: 0, y: 2, w: 6, h: 4,
      config: { sourceId: 'sales', groupByField: 'region', valueField: 'revenue' }
    }
  ],
  sources: [
    {
      id: 'sales',
      name: 'Sales Data',
      type: 'json',
      fields: [
        { name: 'region', displayName: 'Region', type: 'string' },
        { name: 'revenue', displayName: 'Revenue', type: 'number' }
      ]
    }
  ]
};
```

## Widgets

### Visualization Widgets

| Widget type | Description |
|-------------|-------------|
| `bar` | Bar chart |
| `clusteredBar` | Clustered bar chart |
| `stackedBar` | Stacked bar chart |
| `line` | Line chart |
| `pie` | Pie / donut chart |
| `scatter` | Scatter plot |
| `bubble` | Bubble chart |
| `heatmap` | Heatmap |
| `histogram` | Histogram |
| `sunburst` | Sunburst chart |
| `lollipop` | Lollipop chart |
| `boxWhisker` | Box & whisker chart |
| `table` | Data table |
| `kpi` | KPI card |
| `text` | Text / markdown |
| `sourceInfo` | Data source info |

### Statistical Analysis Widgets

| Widget type | Description |
|-------------|-------------|
| `descriptiveAnalysis` | Descriptive statistics |
| `correlationAnalysis` | Correlation matrix |
| `shapiroWilkTest` | Shapiro-Wilk normality test |
| `andersonDarlingTest` | Anderson-Darling normality test |
| `kolmogorovSmirnovTest` | Kolmogorov-Smirnov normality test |
| `boxWhiskerNormalityPlot` | Box-whisker normality plot |
| `oneSampleHypothesisTest` | One-sample hypothesis test |
| `independentTwoSampleTest` | Independent two-sample t-test |
| `pairedTwoSampleTest` | Paired two-sample t-test |
| `welchTwoSampleTest` | Welch two-sample t-test |
| `oneWayAnova` | One-way ANOVA |
| `welchAnova` | Welch ANOVA |
| `mannWhitneyUTest` | Mann-Whitney U test |
| `kruskalWallisTest` | Kruskal-Wallis test |
| `oneSampleWilcoxon` | One-sample Wilcoxon signed-rank test |
| `pairedWilcoxon` | Paired Wilcoxon signed-rank test |

## Documentation

- [Development Guide](docs/development.md) — architecture, patterns, how to add components
- [React Integration](docs/react-integration.md) — detailed React setup and examples
- [JavaScript Integration](docs/javascript-integration.md) — vanilla JS / CDN usage
- [.NET Integration](docs/dotnet-integration.md) — PuppeteerSharp PDF generation
- [esbuild Bundle](docs/esbuild-bundle.md) — standalone bundle reference

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
