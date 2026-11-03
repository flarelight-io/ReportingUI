/**
 * @fileoverview entry point for your component library
 *
 * This is the entry point for your component library. Use this file to export utilities,
 * constants or data structure that accompany your components.
 *
 * DO NOT use this file to export your components. Instead, use the recommended approaches
 * to consume components of this package as outlined in the `README.md`.
 */

export { format } from './utils/utils';
export type * from './components.d.ts';
export { Components, JSX } from './components';
export * from './components/widgets/base-widget';
export * from './api/types/common';
export { ChartThemeUtils } from './utils/chart-theme';
export type { ChartMode, ColorTheme, BuiltInColorTheme, ColorThemeDefinition, ChartThemeOverrides } from './utils/chart-theme';
export { ChartDataRequestBuilder } from './utils/chart-data-request-builder';
export type { ChartDataRequestBuilderOptions, ChartSort } from './utils/chart-data-request-builder';

// Export specific widget components
export * from './components/widgets/text-widget';
export * from './components/widgets/source-info-widget';
export * from './components/widgets/data-widget';
export * from './components/widgets/one-sample-hypothesis-test-widget';
export * from './components/widgets/one-sample-wilcoxon-signed-rank-widget';
export * from './components/widgets/paired-two-sample-wilcoxon-signed-rank-widget';
export * from './components/widgets/independent-two-sample-hypothesis-test-widget';
export * from './components/widgets/paired-two-sample-hypothesis-test-widget';
export * from './components/widgets/welch-two-sample-hypothesis-test-widget';
export * from './components/widgets/welch-anova-widget';
export * from './components/widgets/one-way-anova-widget';
export * from './components/widgets/mann-whitney-u-test-widget';
export * from './components/widgets/kruskal-wallis-test-widget';
export * from './components/widgets/shapiro-wilk-test-widget';
export * from './components/widgets/kolmogorov-smirnov-normality-test-widget';
export * from './components/widgets/anderson-darling-normality-test-widget';
export * from './components/widgets/box-whisker-normality-plot-widget';
// We will add other widget exports as they are converted

// Export main report viewer component
export * from './components/report-viewer/report-viewer';

// Main components
export { ReportViewer } from './components/report-viewer/report-viewer';
export { ReportDemo } from './components/report-demo/report-demo';

// Widget components
export { BaseWidget } from './components/widgets/base-widget';
export { DataWidget } from './components/widgets/data-widget';
export { TextWidget } from './components/widgets/text-widget';
export { SourceInfoWidget } from './components/widgets/source-info-widget';
export { OneSampleHypothesisTestWidget } from './components/widgets/one-sample-hypothesis-test-widget';
export { OneSampleWilcoxonSignedRankWidget } from './components/widgets/one-sample-wilcoxon-signed-rank-widget';
export { PairedTwoSampleWilcoxonSignedRankWidget } from './components/widgets/paired-two-sample-wilcoxon-signed-rank-widget';
export { IndependentTwoSampleHypothesisTestWidget } from './components/widgets/independent-two-sample-hypothesis-test-widget';
export { PairedTwoSampleHypothesisTestWidget } from './components/widgets/paired-two-sample-hypothesis-test-widget';
export { WelchTwoSampleHypothesisTestWidget } from './components/widgets/welch-two-sample-hypothesis-test-widget';
export { WelchAnovaWidget } from './components/widgets/welch-anova-widget';
export { OneWayAnovaWidget } from './components/widgets/one-way-anova-widget';
export { MannWhitneyUTestWidget } from './components/widgets/mann-whitney-u-test-widget';
export { KruskalWallisTestWidget } from './components/widgets/kruskal-wallis-test-widget';
export { ShapiroWilkTestWidget } from './components/widgets/shapiro-wilk-test-widget';
export { KolmogorovSmirnovNormalityTestWidget } from './components/widgets/kolmogorov-smirnov-normality-test-widget';

// Visualization components
export { TableVisualization } from './components/widgets/visualizations/table-visualization';
export { BarChartVisualization } from './components/widgets/visualizations/bar-chart-visualization';
export { PieChartVisualization } from './components/widgets/visualizations/pie-chart-visualization';
export { LineChartVisualization } from './components/widgets/visualizations/line-chart-visualization';
export { KpiVisualization } from './components/widgets/visualizations/kpi-visualization';
export { FilterVisualization } from './components/widgets/visualizations/filter-visualization';
