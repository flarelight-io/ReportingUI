# esbuild Bundle Usage

The esbuild bundle (`flarelight-reporting-esbuild.js`) is a single-file IIFE that includes the complete Stencil runtime and all components. No build step or module bundler required on the consuming end.

**Intended use cases:**
- Drop-in `<script>` tag in plain HTML pages
- PuppeteerSharp / headless Chrome PDF generation
- .NET backends serving self-contained report HTML

## Building the Bundle

```bash
npm run bundle:esbuild
```

Outputs: `flarelight-reporting-esbuild.js` (~390 KB, ES2017 target)

## Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Report</title>
</head>
<body>
  <report-viewer id="viewer" report-id="my-report" is-viewer="true"></report-viewer>

  <script src="flarelight-reporting-esbuild.js"></script>
  <script>
    customElements.whenDefined('report-viewer').then(() => {
      const viewer = document.getElementById('viewer');

      viewer.configuration = {
        widgets: [ /* ... */ ],
        sources: [ /* ... */ ]
      };

      viewer.fetchChartData = async (request) => {
        const res = await fetch('/api/chart-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
        return res.json();
      };
    });
  </script>
</body>
</html>
```

## Setting Component Properties

Always set `config` and `data` as **JavaScript properties**, not HTML attributes — complex objects can't be serialized through attributes:

```html
<kpi-visualization id="kpi"></kpi-visualization>

<script src="flarelight-reporting-esbuild.js"></script>
<script>
  customElements.whenDefined('kpi-visualization').then(() => {
    const kpi = document.getElementById('kpi');
    kpi.config = { title: 'Revenue', kpiFormatType: 'currency' };
    kpi.data = {
      rawData: [{ value: 125000, previousValue: 120000, trend: 'up' }],
      loading: false
    };
  });
</script>
```

## Helper Functions

The bundle exposes a `FlarelightReporting` global with convenience helpers:

```javascript
// Wait until all components are registered
await FlarelightReporting.whenReady();

// Create a KPI widget element
const kpi = FlarelightReporting.createKPI(
  { title: 'Revenue', kpiFormatType: 'currency' },
  125000,   // value
  120000,   // previousValue
  'up'      // trend direction
);
document.body.appendChild(kpi);

// Create a chart element
const chart = FlarelightReporting.createChart('bar',
  { title: 'Sales by Region' },
  [
    { category: 'North', value: 12000 },
    { category: 'South', value: 19000 }
  ]
);
document.body.appendChild(chart);

// Render a complete report into a container
await FlarelightReporting.renderReport(containerElement, reportConfig);
```

## Data Structure

Visualization components expect data in this shape:

```javascript
{
  rawData: [
    { category: 'A', value: 100 },
    { category: 'B', value: 200 }
  ],
  loading: false,
  error: null   // optional error string
}
```

## PuppeteerSharp Usage

The bundle includes an automatic fix for the common PuppeteerSharp error:

```
TypeError: Failed to construct 'URL': Invalid URL at bootstrapLazy
```

This occurs because PuppeteerSharp's `document.baseURI` is `about:blank`. The bundle detects this and sets `file:///` as the base URI automatically.

### PuppeteerSharp example

```csharp
await page.SetContentAsync(htmlWithBundle);

// Expose your data bridge before components load
await page.ExposeFunctionAsync("getChartData", new Func<object, Task<object>>(
    async (config) => await FetchDataFromDatabase(config)
));

await page.WaitForSelectorAsync("report-viewer");
await page.WaitForTimeoutAsync(2000); // allow charts to render

var pdf = await page.PdfAsync(new PdfOptions { Format = PaperFormat.A4, PrintBackground = true });
```

Bridge function in the HTML:

```javascript
window.fetchChartData = async (config) => await window.getChartData(config);
customElements.whenDefined('report-viewer').then(() => {
  document.getElementById('viewer').fetchChartData = window.fetchChartData;
});
```

## Available Components

| Tag | Description |
|-----|-------------|
| `report-viewer` | Full report container |
| `data-widget` | Data widget (wraps visualizations) |
| `text-widget` | Text/markdown widget |
| `source-info-widget` | Data source info widget |
| `kpi-visualization` | KPI card |
| `bar-chart-visualization` | Bar chart |
| `clustered-bar-chart-visualization` | Clustered bar chart |
| `stacked-bar-chart-visualization` | Stacked bar chart |
| `line-chart-visualization` | Line chart |
| `pie-chart-visualization` | Pie / donut chart |
| `scatter-chart-visualization` | Scatter plot |
| `bubble-chart-visualization` | Bubble chart |
| `heatmap-visualization` | Heatmap |
| `histogram-chart-visualization` | Histogram |
| `sunburst-chart-visualization` | Sunburst chart |
| `lollipop-chart-visualization` | Lollipop chart |
| `box-whisker-chart-visualization` | Box & whisker chart |
| `table-visualization` | Data table |
| `correlation-analysis-widget` | Correlation matrix |
| `descriptive-analysis-widget` | Descriptive statistics |

## Technical Details

| Property | Value |
|----------|-------|
| Bundler | esbuild |
| Format | IIFE |
| Target | ES2017 |
| Size | ~390 KB |
| Dependencies | None (self-contained) |
| PuppeteerSharp | Compatible (baseURI patched) |
