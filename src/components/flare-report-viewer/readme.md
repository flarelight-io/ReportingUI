# flare-report-viewer



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
- [data-widget](../widgets)

### Graph
```mermaid
graph TD;
  flare-report-viewer --> text-widget
  flare-report-viewer --> source-info-widget
  flare-report-viewer --> data-widget
  text-widget --> base-widget
  source-info-widget --> base-widget
  data-widget --> table-visualization
  data-widget --> bar-chart-visualization
  data-widget --> line-chart-visualization
  data-widget --> pie-chart-visualization
  data-widget --> kpi-visualization
  data-widget --> scatter-chart-visualization
  data-widget --> histogram-chart-visualization
  data-widget --> heatmap-visualization
  data-widget --> sunburst-chart-visualization
  data-widget --> bubble-chart-visualization
  data-widget --> base-widget
  report-demo --> flare-report-viewer
  style flare-report-viewer fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
