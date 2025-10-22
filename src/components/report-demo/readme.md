# report-demo



<!-- Auto Generated Below -->


## Dependencies

### Depends on

- [report-viewer](../report-viewer)

### Graph
```mermaid
graph TD;
  report-demo --> report-viewer
  report-viewer --> text-widget
  report-viewer --> source-info-widget
  report-viewer --> descriptive-analysis-widget
  report-viewer --> correlation-analysis-widget
  report-viewer --> one-sample-hypothesis-test-widget
  report-viewer --> one-sample-wilcoxon-signed-rank-widget
  report-viewer --> paired-two-sample-wilcoxon-signed-rank-widget
  report-viewer --> independent-two-sample-hypothesis-test-widget
  report-viewer --> paired-two-sample-hypothesis-test-widget
  report-viewer --> welch-two-sample-hypothesis-test-widget
  report-viewer --> one-way-anova-widget
  report-viewer --> welch-anova-widget
  report-viewer --> mann-whitney-u-test-widget
  report-viewer --> kruskal-wallis-test-widget
  report-viewer --> shapiro-wilk-test-widget
  report-viewer --> kolmogorov-smirnov-normality-test-widget
  report-viewer --> anderson-darling-normality-test-widget
  report-viewer --> box-whisker-normality-plot-widget
  report-viewer --> data-widget
  text-widget --> base-widget
  source-info-widget --> base-widget
  source-info-widget --> data-widget
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
  descriptive-analysis-widget --> base-widget
  descriptive-analysis-widget --> data-widget
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
  style report-demo fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
