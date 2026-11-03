# builder-demo



<!-- Auto Generated Below -->


## Overview

Demo page for `<report-builder>`: the sample report from the viewer demo, an app-built toolbar around the builder's
methods, a `configureWidget` hook with a small dialog of its own, and a live view of what the builder emits.

## Dependencies

### Depends on

- [report-demo](../report-demo)
- [report-builder](../report-builder)

### Graph
```mermaid
graph TD;
  builder-demo --> report-demo
  builder-demo --> report-builder
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
  report-builder --> report-viewer
  report-builder --> widget-config-form
  style builder-demo fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
