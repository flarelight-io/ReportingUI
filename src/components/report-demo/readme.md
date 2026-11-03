# report-demo



<!-- Auto Generated Below -->


## Properties

| Property   | Attribute  | Description                                                                                                | Type      | Default |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------- | --------- | ------- |
| `headless` | `headless` | Renders nothing: the builder demo borrows this component's sample report and data function (`getDemoKit`). | `boolean` | `false` |


## Methods

### `getDemoKit() => Promise<{ configuration: any; fetchChartData: (request: any) => Promise<any>; }>`

The sample report (a copy) and the function that answers its data requests.

#### Returns

Type: `Promise<{ configuration: any; fetchChartData: (request: any) => Promise<any>; }>`




## Dependencies

### Used by

 - [builder-demo](../builder-demo)

### Depends on

- [report-viewer](../report-viewer)

### Graph
```mermaid
graph TD;
  report-demo --> report-viewer
  report-viewer --> text-widget
  report-viewer --> data-widget
  text-widget --> base-widget
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
  data-widget --> filter-visualization
  data-widget --> base-widget
  builder-demo --> report-demo
  style report-demo fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
