# table-visualization



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute     | Description | Type                                                                                                                                                                                                                                                                                                                                                                                                                                          | Default     |
| ------------ | ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `colorTheme` | `color-theme` |             | `"blue" \| "brand" \| "grayscale" \| "rainbow" \| "rainbow-alt" \| string & {}`                                                                                                                                                                                                                                                                                                                                                               | `"brand"`   |
| `config`     | --            |             | `BarChartConfig \| BoxWhiskerChartConfig \| BubbleChartConfig \| ClusteredBarChartConfig \| ClusteredHBarChartConfig \| DonutChartConfig \| FilterVisualizationConfig \| HBarChartConfig \| HeatmapConfig \| HistogramConfig \| KpiConfig \| LineChartConfig \| LollipopChartConfig \| LollipopHChartConfig \| PieChartConfig \| ScatterChartConfig \| StackedBarChartConfig \| StackedHBarChartConfig \| SunburstChartConfig \| TableConfig` | `undefined` |
| `data`       | --            |             | `VisualizationData`                                                                                                                                                                                                                                                                                                                                                                                                                           | `undefined` |


## Events

| Event          | Description | Type                                   |
| -------------- | ----------- | -------------------------------------- |
| `filterChange` |             | `CustomEvent<FilterChangeEventDetail>` |


## Dependencies

### Used by

 - [data-widget](..)

### Graph
```mermaid
graph TD;
  data-widget --> table-visualization
  style table-visualization fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
