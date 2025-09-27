# flare-report-viewer

A component for rendering reports with configurable widgets and layouts.

## Configuration

The component accepts a `configuration` object that can include:

- `colorTheme`: The color theme for the report. Valid values: `"blue"`, `"brand"`, `"grayscale"`, `"rainbow"`, `"rainbow-alt"`. Defaults to `"brand"`.
- `sources`: Array of data sources for the widgets
- `widgets`: Array of widget definitions (legacy format)
- `layouts`: Object containing layout definitions for different screen sizes (lg, md, sm, xs)
- `widgets`: Array of widget definitions (new format, used with layouts)

Example configuration:
```json
{
  "colorTheme": "brand",
  "sources": [...],
  "layouts": {
    "lg": [...]
  },
  "widgets": [...]
}
```

<!-- Auto Generated Below -->


## Properties

| Property          | Attribute          | Description | Type       | Default     |
| ----------------- | ------------------ | ----------- | ---------- | ----------- |
| `configuration`   | `configuration`    |             | `any`      | `undefined` |
| `fetchChartData`  | `fetch-chart-data` |             | `Function` | `undefined` |
| `isFullscreen`    | `is-fullscreen`    |             | `boolean`  | `false`     |
| `isViewer`        | `is-viewer`        |             | `boolean`  | `false`     |
| `reportId`        | `report-id`        |             | `string`   | `undefined` |
| `showPlaceholder` | `show-placeholder` |             | `boolean`  | `true`      |


## Dependencies

### Used by

 - [report-demo](../report-demo)

### Depends on

- [text-widget](../widgets)
- [source-info-widget](../widgets)
- [descriptive-analysis-widget](../widgets)
- [correlation-analysis-widget](../widgets)
- [one-sample-hypothesis-test-widget](../widgets)
- [one-sample-wilcoxon-signed-rank-widget](../widgets)
- [paired-two-sample-wilcoxon-signed-rank-widget](../widgets)
- [independent-two-sample-hypothesis-test-widget](../widgets)
- [paired-two-sample-hypothesis-test-widget](../widgets)
- [welch-two-sample-hypothesis-test-widget](../widgets)
- [one-way-anova-widget](../widgets)
- [welch-anova-widget](../widgets)
- [mann-whitney-u-test-widget](../widgets)
- [kruskal-wallis-test-widget](../widgets)
- [shapiro-wilk-test-widget](../widgets)
- [kolmogorov-smirnov-normality-test-widget](../widgets)
- [anderson-darling-normality-test-widget](../widgets)
- [box-whisker-normality-plot-widget](../widgets)
- [data-widget](../widgets)

### Graph
```mermaid
graph TD;
  flare-report-viewer --> text-widget
  flare-report-viewer --> source-info-widget
  flare-report-viewer --> descriptive-analysis-widget
  flare-report-viewer --> correlation-analysis-widget
  flare-report-viewer --> one-sample-hypothesis-test-widget
  flare-report-viewer --> one-sample-wilcoxon-signed-rank-widget
  flare-report-viewer --> paired-two-sample-wilcoxon-signed-rank-widget
  flare-report-viewer --> independent-two-sample-hypothesis-test-widget
  flare-report-viewer --> paired-two-sample-hypothesis-test-widget
  flare-report-viewer --> welch-two-sample-hypothesis-test-widget
  flare-report-viewer --> one-way-anova-widget
  flare-report-viewer --> welch-anova-widget
  flare-report-viewer --> mann-whitney-u-test-widget
  flare-report-viewer --> kruskal-wallis-test-widget
  flare-report-viewer --> shapiro-wilk-test-widget
  flare-report-viewer --> kolmogorov-smirnov-normality-test-widget
  flare-report-viewer --> anderson-darling-normality-test-widget
  flare-report-viewer --> box-whisker-normality-plot-widget
  flare-report-viewer --> data-widget
  text-widget --> base-widget
  source-info-widget --> base-widget
  descriptive-analysis-widget --> base-widget
  descriptive-analysis-widget --> data-widget
  data-widget --> table-visualization
  data-widget --> bar-chart-visualization
  data-widget --> stacked-bar-chart-visualization
  data-widget --> clustered-bar-chart-visualization
  data-widget --> lollipop-chart-visualization
  data-widget --> line-chart-visualization
  data-widget --> pie-chart-visualization
  data-widget --> kpi-visualization
  data-widget --> scatter-chart-visualization
  data-widget --> histogram-chart-visualization
  data-widget --> heatmap-visualization
  data-widget --> sunburst-chart-visualization
  data-widget --> bubble-chart-visualization
  data-widget --> box-whisker-chart-visualization
  data-widget --> base-widget
  correlation-analysis-widget --> base-widget
  one-sample-hypothesis-test-widget --> base-widget
  one-sample-wilcoxon-signed-rank-widget --> base-widget
  paired-two-sample-wilcoxon-signed-rank-widget --> base-widget
  independent-two-sample-hypothesis-test-widget --> base-widget
  paired-two-sample-hypothesis-test-widget --> base-widget
  welch-two-sample-hypothesis-test-widget --> base-widget
  one-way-anova-widget --> base-widget
  one-way-anova-widget --> data-widget
  welch-anova-widget --> base-widget
  welch-anova-widget --> data-widget
  mann-whitney-u-test-widget --> base-widget
  kruskal-wallis-test-widget --> base-widget
  shapiro-wilk-test-widget --> base-widget
  kolmogorov-smirnov-normality-test-widget --> base-widget
  anderson-darling-normality-test-widget --> base-widget
  box-whisker-normality-plot-widget --> data-widget
  report-demo --> flare-report-viewer
  style flare-report-viewer fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
