import { Component, h, State, Element, Watch } from '@stencil/core';
import { ColorTheme, ChartThemeUtils } from '../../utils/chart-theme';

const DEBUG_MODE = false; // Set to true to enable verbose logging

@Component({
  tag: 'report-demo',
  styleUrl: 'report-demo.scss',
  shadow: true
})
export class ReportDemo {
  @Element() hostElement: HTMLElement;
  
  @State() heightMode: 'auto' | 'fixed' = 'auto';
  
  @State() demoConfiguration = {
    colorTheme: "rainbow",
    widgets: [
      {
        id: 'title',
        type: 'text',
        title: 'Welcome to Flarelight Reporting',
        x: 0,
        y: 0,
        w: 12,
        h: 1,
        config: {
          text: 'This is a demo of all available chart visualizations in Flarelight Reporting.',
          fontSize: 'large',
          textAlign: 'center',
          enableFormatting: true
        }
      },
      // Section Title: Basic Charts
      {
        id: 'basic-charts',
        type: 'text',
        title: '',
        x: 0,
        y: 1,
        w: 12,
        h: 1,
        config: {
          text: '## Basic Charts',
          fontSize: 'medium',
          textAlign: 'left',
          enableFormatting: true,
          hideTitle: true
        }
      },
      // Basic Charts
      {
        id: 'pie-chart',
        type: 'data',
        title: 'Pie Chart',
        x: 0,
        y: 2,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'pie',
          groupByField: 'category',
          valueField: 'value',
          showLegend: true
        }
      },
      {
        id: 'donut-chart',
        type: 'data',
        title: 'Donut Chart',
        x: 3,
        y: 2,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'donut',
          groupByField: 'category',
          valueField: 'value',
          showLegend: true,
          showTotal: true
        }
      },
      {
        id: 'bar-chart',
        type: 'data',
        title: 'Bar Chart',
        x: 6,
        y: 2,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'bar',
          groupByField: 'category',
          valueField: 'value',
          showGrid: false,
          showLabels: true
        }
      },
      {
        id: 'horizontal-bar',
        type: 'data',
        title: 'Horizontal Bar Chart',
        x: 9,
        y: 2,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'hbar',
          groupByField: 'category',
          valueField: 'value',
          showGrid: false,
          showLabels: true
        }
      },
      {
        id: 'line-chart',
        type: 'data',
        title: 'Line Chart',
        x: 0,
        y: 5,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-time-series',
          visualizationType: 'line',
          groupByField: 'date',
          valueField: 'value',
          showGrid: true,
          showLegend: true
        }
      },
      {
        id: 'scatter-chart',
        type: 'data',
        title: 'Scatter Chart',
        x: 4,
        y: 5,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-scatter',
          visualizationType: 'scatter',
          groupByField: 'x',
          valueField: 'y',
          showGrid: true,
          showRegressionLine: true,
          showLegend: true
        }
      },
      {
        id: 'kpi-widget',
        type: 'data',
        title: 'KPI Widget',
        x: 8,
        y: 5,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-kpi',
          visualizationType: 'kpi',
          valueField: 'value',
          kpiFormatType: 'number',
          kpiPrefix: '$',
          kpiSuffix: 'M'
        }
      },
      
      // Filter Visualization
      {
        id: 'filter-widget',
        type: 'data',
        title: 'Filter Widget',
        x: 0,
        y: 8,
        w: 3,
        h: 2,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'filter',
          valueField: 'category',
          multiSelect: false,
          placeholder: 'Select category...'
        }
      },
      {
        id: 'multi-filter-widget',
        type: 'data',
        title: 'Multi-Select Filter',
        x: 3,
        y: 8,
        w: 3,
        h: 2,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'filter',
          valueField: 'category',
          multiSelect: true,
          placeholder: 'Select categories...'
        }
      },
      {
        id: 'button-filter-widget',
        type: 'data',
        title: 'Button Filter (Single)',
        x: 6,
        y: 8,
        w: 3,
        h: 2,
        config: {
          sourceId: 'sample-small-categorical',
          visualizationType: 'filter',
          valueField: 'status',
          multiSelect: false,
          placeholder: 'Select status...'
        }
      },
      {
        id: 'button-multi-filter-widget',
        type: 'data',
        title: 'Button Filter (Multi)',
        x: 9,
        y: 8,
        w: 3,
        h: 2,
        config: {
          sourceId: 'sample-small-categorical',
          visualizationType: 'filter',
          valueField: 'status',
          multiSelect: true,
          placeholder: 'Select statuses...'
        }
      },
      
      // Section Title: Multi-Series Charts
      {
        id: 'multi-series-charts',
        type: 'text',
        title: '',
        x: 0,
        y: 10,
        w: 12,
        h: 1,
        config: {
          text: '## Multi-Series Charts',
          fontSize: 'medium',
          textAlign: 'left',
          enableFormatting: true,
          hideTitle: true
        }
      },
      // Multi-Series Charts
      {
        id: 'stacked-bar',
        type: 'data',
        title: 'Stacked Bar Chart',
        x: 0,
        y: 11,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-multi-series',
          visualizationType: 'stacked-bar',
          groupByField: 'category',
          fields: ['series1', 'series2', 'series3'],
          showLegend: true,
          showGrid: true
        }
      },
      {
        id: 'stacked-hbar',
        type: 'data',
        title: 'Horizontal Stacked Bar',
        x: 3,
        y: 11,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-multi-series',
          visualizationType: 'stacked-hbar',
          groupByField: 'category',
          fields: ['series1', 'series2', 'series3'],
          showLegend: true,
          showGrid: true
        }
      },
      {
        id: 'clustered-bar',
        type: 'data',
        title: 'Clustered Bar Chart',
        x: 6,
        y: 11,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-multi-series',
          visualizationType: 'clustered-bar',
          groupByField: 'category',
          fields: ['series1', 'series2', 'series3'],
          showLegend: true,
          showGrid: true,
        }
      },
      {
        id: 'clustered-hbar',
        type: 'data',
        title: 'Horizontal Clustered Bar',
        x: 9,
        y: 11,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-multi-series',
          visualizationType: 'clustered-hbar',
          groupByField: 'category',
          fields: ['series1', 'series2', 'series3'],
          showLegend: true,
          showGrid: true
        }
      },
      
      // Section Title: Specialized Charts
      {
        id: 'specialized-charts',
        type: 'text',
        title: '',
        x: 0,
        y: 14,
        w: 12,
        h: 1,
        config: {
          text: '## Specialized Charts',
          fontSize: 'medium',
          textAlign: 'left',
          enableFormatting: true,
          hideTitle: true
        }
      },
      // Specialized Charts
      {
        id: 'lollipop-chart',
        type: 'data',
        title: 'Lollipop Chart',
        x: 0,
        y: 15,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'lollipop',
          groupByField: 'category',
          valueField: 'value',
          showGrid: true,
          showLabels: true
        }
      },
      {
        id: 'lollipop-h-chart',
        type: 'data',
        title: 'Horizontal Lollipop Chart',
        x: 3,
        y: 15,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'lollipop-h',
          groupByField: 'category',
          valueField: 'value',
          showGrid: true,
          showLabels: true
        }
      },
      {
        id: 'histogram-chart',
        type: 'data',
        title: 'Histogram',
        x: 6,
        y: 15,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-histogram',
          visualizationType: 'histogram',
          groupByField: 'bin',
          valueField: 'frequency',
          showGrid: true
        }
      },
      {
        id: 'heatmap',
        type: 'data',
        title: 'Heatmap',
        x: 9,
        y: 15,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-heatmap',
          visualizationType: 'heatmap',
          xField: 'x',
          yField: 'y',
          valueField: 'value',
          showValues: true,
          showLabels: true
        }
      },
      
      // Statistical Charts
      {
        id: 'stats-section',
        type: 'text',
        title: '',
        x: 0,
        y: 18,
        w: 12,
        h: 1,
        config: {
          text: '## Statistical Charts',
          fontSize: 'medium',
          textAlign: 'left',
          enableFormatting: true,
          hideTitle: true
        }
      },
      {
        id: 'box-whisker-chart',
        type: 'data',
        title: 'Box and Whisker Plot',
        x: 0,
        y: 19,
        w: 6,
        h: 3,
        config: {
          sourceId: 'sample-box-whisker',
          visualizationType: 'box-whisker',
          groupByField: 'group',
          valueField: 'value',
          showGrid: true,
          showLabels: true,
          showLegend: true
        }
      },
      
      // Complex Charts
      {
        id: 'sunburst-chart',
        type: 'data',
        title: 'Sunburst Chart',
        x: 6,
        y: 19,
        w: 6,
        h: 3,
        config: {
          sourceId: 'sample-hierarchy',
          visualizationType: 'sunburst',
          valueField: 'value',
          idField: 'id',
          parentIdField: 'parentId',
          groupByField: 'name',
          labelField: 'displayName',
          showLabels: true,
          showLegend: true
        }
      },
      {
        id: 'bubble-chart',
        type: 'data',
        title: 'Bubble Chart',
        x: 0,
        y: 22,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-bubble',
          visualizationType: 'bubble',
          groupByField: 'x',
          valueField: 'y',
          idField: 'size',
          parentIdField: 'category',
          showGrid: true,
          showLegend: true
        }
      },
      // Analysis Widgets
      {
        id: 'descriptive-analysis',
        type: 'descriptiveAnalysis',
        title: 'Descriptive Statistics',
        x: 4,
        y: 22,
        w: 4,
        h: 3,
        config: {
          analysisId: 'sample-descriptive',
          analysisName: 'Sample Descriptive Statistics'
        }
      },
      {
        id: 'correlation-analysis',
        type: 'correlationAnalysis',
        title: 'Correlation Analysis',
        x: 8,
        y: 22,
        w: 4,
        h: 3,
        config: {
          analysisId: 'sample-correlation',
          analysisName: 'Sample Correlation Analysis',
          showLabels: true
        }
      },
      {
        id: 'hypothesis-test',
        type: 'oneSampleHypothesisTest',
        title: 'IQ Analysis',
        x: 0,
        y: 25,
        w: 6,
        h: 5,
        config: {
          analysisId: 'sample-hypothesis-test',
          analysisName: 'IQ Analysis'
        }
      },
      {
        id: 'independent-two-sample-hypothesis-test',
        type: 'independentTwoSampleHypothesisTest',
        title: 'Group Comparison Analysis',
        x: 6,
        y: 25,
        w: 6,
        h: 5,
        config: {
          analysisId: 'sample-independent-two-sample-hypothesis-test',
          analysisName: 'Group Comparison Analysis'
        }
      },
      {
        id: 'paired-two-sample-hypothesis-test',
        type: 'pairedTwoSampleHypothesisTest',
        title: 'Paired Sample Analysis',
        x: 0,
        y: 30,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-paired-two-sample-hypothesis-test',
          analysisName: 'Paired Sample Analysis'
        }
      },
      {
        id: 'one-sample-wilcoxon-signed-rank',
        type: 'oneSampleWilcoxonSignedRank',
        title: 'Wilcoxon Signed Rank Test',
        x: 6,
        y: 30,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-one-sample-wilcoxon-signed-rank',
          analysisName: 'Wilcoxon Signed Rank Test'
        }
      },
      {
        id: 'paired-two-sample-wilcoxon-signed-rank',
        type: 'pairedTwoSampleWilcoxonSignedRank',
        title: 'Paired Two Sample Wilcoxon Signed Rank Test',
        x: 0,
        y: 36,
        w: 6,
        h: 7,
        config: {
          analysisId: 'sample-paired-two-sample-wilcoxon-signed-rank',
          analysisName: 'Paired Two Sample Wilcoxon Signed Rank Test'
        }
      },
      {
        id: 'welch-two-sample-hypothesis-test',
        type: 'welchTwoSampleHypothesisTest',
        title: 'Welch\'s Two Sample Analysis',
        x: 6,
        y: 36,
        w: 6,
        h: 7,
        config: {
          analysisId: 'sample-welch-two-sample-hypothesis-test',
          analysisName: 'Welch\'s Two Sample Analysis'
        }
      },
      {
        id: 'one-way-anova',
        type: 'OneWayANOVA',
        title: 'One-Way ANOVA Analysis',
        x: 0,
        y: 43,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-one-way-anova',
          analysisName: 'One-Way ANOVA Analysis'
        }
      },
      {
        id: 'welch-anova',
        type: 'WelchANOVA',
        title: 'Welch\'s ANOVA Analysis',
        x: 6,
        y: 43,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-welch-anova',
          analysisName: 'Welch&apos;s ANOVA Analysis'
        }
      },
      {
        id: 'mann-whitney-u-test',
        type: 'mannWhitneyUTest',
        title: 'Mann-Whitney U Test Analysis',
        x: 0,
        y: 49,
        w: 6,
        h: 7,
        config: {
          analysisId: 'sample-mann-whitney-u-test',
          analysisName: 'Mann-Whitney U Test Analysis'
        }
      },
      {
        id: 'kruskal-wallis-test',
        type: 'kruskalWallisTest',
        title: 'Kruskal-Wallis Test Analysis',
        x: 6,
        y: 49,
        w: 6,
        h: 7,
        config: {
          analysisId: 'sample-kruskal-wallis-test',
          analysisName: 'Kruskal-Wallis Test Analysis'
        }
      },
      {
        id: 'shapiro-wilk-test',
        type: 'shapiroWilkTest',
        title: 'Shapiro-Wilk Test Analysis',
        x: 0,
        y: 56,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-shapiro-wilk-test',
          analysisName: 'Shapiro-Wilk Test Analysis'
        }
      },
      {
        id: 'kolmogorov-smirnov-normality-test',
        type: 'kolmogorovSmirnovNormalityTest',
        title: 'Kolmogorov-Smirnov Normality Test Analysis',
        x: 6,
        y: 56,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-kolmogorov-smirnov-normality-test',
          analysisName: 'Kolmogorov-Smirnov Normality Test Analysis'
        }
      },
      {
        id: 'anderson-darling-normality-test',
        type: 'andersonDarlingNormalityTest',
        title: 'Anderson-Darling Normality Test Analysis',
        x: 0,
        y: 62,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-anderson-darling-normality-test',
          analysisName: 'Anderson-Darling Normality Test Analysis'
        }
      },
      {
        id: 'box-whisker-normality-plot',
        type: 'boxWhiskerNormalityPlot',
        title: 'Box-Whisker Normality Plot',
        x: 6,
        y: 62,
        w: 6,
        h: 6,
        config: {
          analysisId: 'sample-box-whisker-normality-plot',
          analysisName: 'Box-Whisker Normality Plot',
          showOutliers: true,
          showGrid: true,
          showLabels: true,
          showLegend: true,
          boxWidth: 0.8
        }
      },
      // KPI Widgets Section
      {
        id: 'kpi-basic',
        type: 'data',
        title: 'Basic KPI',
        x: 0,
        y: 68,
        w: 2,
        h: 2,
        config: {
          sourceId: 'sample-kpi',
          visualizationType: 'kpi',
          valueField: 'value',
          prefix: '$',
          format: '##,##'
        }
      },
      {
        id: 'kpi-with-trend',
        type: 'data',
        title: 'KPI with Trend',
        x: 2,
        y: 68,
        w: 2,
        h: 2,
        config: {
          sourceId: 'sample-kpi-with-trend',
          visualizationType: 'kpi',
          valueField: 'currentRevenue',
          previousValueField: 'previousRevenue',
          prefix: '$',
          format: '##,##',
          showTrend: true
        }
      },
      {
        id: 'kpi-percentage',
        type: 'data',
        title: 'Percentage KPI',
        x: 4,
        y: 68,
        w: 2,
        h: 2,
        config: {
          sourceId: 'sample-kpi-percentage',
          visualizationType: 'kpi',
          valueField: 'value',
          format: '##.#',
          suffix: '%'
        }
      },
      {
        id: 'kpi-custom-format',
        type: 'data',
        title: 'Custom Format KPI',
        x: 6,
        y: 68,
        w: 3,
        h: 2,
        config: {
          sourceId: 'sample-kpi-custom-format',
          visualizationType: 'kpi',
          valueField: 'value',
          format: '##.###,##',
          prefix: '€',
          suffix: 'M'
        }
      },
      {
        id: 'kpi-currency',
        type: 'data',
        title: 'Currency KPI',
        x: 9,
        y: 68,
        w: 3,
        h: 2,
        config: {
          sourceId: 'sample-kpi-currency',
          visualizationType: 'kpi',
          valueField: 'value',
          prefix: '$',
          format: '##,##.##'
        }
      },
        {
          id: 'source-info-widget',
          type: 'sourceInfo',
          title: 'Report Information',
          x: 0,
          y: 70,
          w: 6,
          h: 2,
          config: {
            hideTitle: false
          }
        }
    ],
    sources: [
      {
        id: 'sample-categorical',
        name: 'Categorical Data',
        type: 'mock',
        fields: [
          { name: 'category', displayName: 'Category', type: 'string' },
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-small-categorical',
        name: 'Small Categorical Data',
        type: 'mock',
        fields: [
          { name: 'status', displayName: 'Status', type: 'string' },
          { name: 'count', displayName: 'Count', type: 'number' }
        ]
      },
      {
        id: 'sample-time-series',
        name: 'Time Series Data',
        type: 'mock',
        fields: [
          { name: 'date', displayName: 'Date', type: 'date' },
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-scatter',
        name: 'Scatter Plot Data',
        type: 'mock',
        fields: [
          { name: 'x', displayName: 'X Value', type: 'number' },
          { name: 'y', displayName: 'Y Value', type: 'number' }
        ]
      },
      {
        id: 'sample-histogram',
        name: 'Histogram Data',
        type: 'mock',
        fields: [
          { name: 'bin', displayName: 'Bin', type: 'string' },
          { name: 'frequency', displayName: 'Frequency', type: 'number' }
        ]
      },
      {
        id: 'sample-heatmap',
        name: 'Heatmap Data',
        type: 'mock',
        fields: [
          { name: 'x', displayName: 'X Axis', type: 'string' },
          { name: 'y', displayName: 'Y Axis', type: 'string' },
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-hierarchy',
        name: 'Hierarchy Data',
        type: 'mock',
        fields: [
          { name: 'id', displayName: 'ID', type: 'string' },
          { name: 'parentId', displayName: 'Parent ID', type: 'string' },
          { name: 'name', displayName: 'Name', type: 'string' },
          { name: 'displayName', displayName: 'Display Name', type: 'string' },
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-bubble',
        name: 'Bubble Chart Data',
        type: 'mock',
        fields: [
          { name: 'x', displayName: 'X Position', type: 'number' },
          { name: 'y', displayName: 'Y Position', type: 'number' },
          { name: 'size', displayName: 'Size', type: 'number' },
          { name: 'category', displayName: 'Category', type: 'string' }
        ]
      },
      {
        id: 'sample-multi-series',
        name: 'Multi-Series Data',
        type: 'mock',
        fields: [
          { name: 'category', displayName: 'Category', type: 'string' },
          { name: 'series1', displayName: 'Series 1', type: 'number' },
          { name: 'series2', displayName: 'Series 2', type: 'number' },
          { name: 'series3', displayName: 'Series 3', type: 'number' }
        ]
      },
      {
        id: 'sample-kpi',
        name: 'KPI Data',
        type: 'mock',
        fields: [
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-descriptive',
        name: 'Descriptive Statistics',
        type: 'analysis',
        analysisType: 'descriptive'
      },
      {
        id: 'sample-correlation',
        name: 'Correlation Analysis',
        type: 'analysis',
        analysisType: 'correlation'
      },
      {
        id: 'sample-hypothesis-test',
        name: 'Hypothesis Test Analysis',
        type: 'analysis',
        analysisType: 'oneSampleHypothesisTest'
      },
      {
        id: 'sample-one-sample-wilcoxon-signed-rank',
        name: 'One-Sample Wilcoxon Signed Rank Test Analysis',
        type: 'analysis',
        analysisType: 'oneSampleWilcoxonSignedRank'
      },
      {
        id: 'sample-paired-two-sample-wilcoxon-signed-rank',
        name: 'Paired Two Sample Wilcoxon Signed Rank Test Analysis',
        type: 'analysis',
        analysisType: 'pairedTwoSampleWilcoxonSignedRank'
      },
      {
        id: 'sample-independent-two-sample-hypothesis-test',
        name: 'Independent Two-Sample Hypothesis Test Analysis',
        type: 'analysis',
        analysisType: 'independentTwoSampleHypothesisTest'
      },
      {
        id: 'sample-paired-two-sample-hypothesis-test',
        name: 'Paired Two-Sample Hypothesis Test Analysis',
        type: 'analysis',
        analysisType: 'pairedTwoSampleHypothesisTest'
      },
      {
        id: 'sample-welch-two-sample-hypothesis-test',
        name: 'Welch\'s Two Sample Hypothesis Test Analysis',
        type: 'analysis',
        analysisType: 'welchTwoSampleHypothesisTest'
      },
      {
        id: 'sample-one-way-anova',
        name: 'One-Way ANOVA Analysis',
        type: 'analysis',
        analysisType: 'OneWayANOVA'
      },
      {
        id: 'sample-welch-anova',
        name: 'Welch\'s ANOVA Analysis',
        type: 'analysis',
        analysisType: 'WelchANOVA'
      },
      {
        id: 'sample-mann-whitney-u-test',
        name: 'Mann-Whitney U Test Analysis',
        type: 'analysis',
        analysisType: 'mannWhitneyUTest'
      },
      {
        id: 'sample-kruskal-wallis-test',
        name: 'Kruskal-Wallis Test Analysis',
        type: 'analysis',
        analysisType: 'kruskalWallisTest'
      },
      {
        id: 'sample-shapiro-wilk-test',
        name: 'Shapiro-Wilk Test Analysis',
        type: 'analysis',
        analysisType: 'shapiroWilkTest'
      },
      {
        id: 'sample-box-whisker',
        name: 'Statistical Distribution Data',
        type: 'mock',
        fields: [
          { name: 'group', displayName: 'Group', type: 'string' },
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-anderson-darling-normality-test',
        name: 'Anderson-Darling Normality Test Analysis',
        type: 'analysis',
        analysisType: 'andersonDarlingNormalityTest'
      },
      {
        id: 'sample-box-whisker-normality-plot',
        name: 'Box-Whisker Normality Plot',
        type: 'analysis',
        analysisType: 'boxWhiskerNormalityPlot'
      },
      {
        id: 'sample-kpi',
        name: 'Basic KPI Data',
        type: 'mock',
        fields: [
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-kpi-with-trend',
        name: 'KPI with Trend Data',
        type: 'mock',
        fields: [
          { name: 'currentRevenue', displayName: 'Current Revenue', type: 'number' },
          { name: 'previousRevenue', displayName: 'Previous Revenue', type: 'number' }
        ]
      },
      {
        id: 'sample-kpi-currency',
        name: 'Currency KPI Data',
        type: 'mock',
        fields: [
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-kpi-percentage',
        name: 'Percentage KPI Data',
        type: 'mock',
        fields: [
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      },
      {
        id: 'sample-kpi-custom-format',
        name: 'Custom Format KPI Data',
        type: 'mock',
        fields: [
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      }
    ]
  };

  @State() darkMode = false;
  @State() colorTheme: ColorTheme = "rainbow";
  @State() activeFilter: { sourceId: string; field: string; value: any } | null = null;

  @Watch('colorTheme')
  onColorThemeChange() {
    if (this.colorThemeSelectRef) {
      this.colorThemeSelectRef.value = this.colorTheme;
    }
    
    // Update the configuration object
    this.demoConfiguration = {
      ...this.demoConfiguration,
      colorTheme: this.colorTheme
    };
    
    // Ensure the theme is applied globally
    ChartThemeUtils.setColorTheme(this.colorTheme);
    document.documentElement.setAttribute('data-color-theme', this.colorTheme);
    
    // Update brand colors based on the selected theme
    this.updateBrandColors();
    
    // Force re-render of all widgets
    setTimeout(() => {
      this.forceChartRefresh();
    }, 50);
  }
  
  // Cache data for each source when filtered
  private filteredDataCache: { [sourceId: string]: any[] } = {};
  private reportViewerRef: HTMLElement = null;
  private colorThemeSelectRef: HTMLSelectElement = null;
  // Queue of filters to apply once the report viewer is available
  private pendingFilters: Array<{ sourceId: string; field: string; value: any } | null> = [];
  private reportViewerReady = false;
  // Add a cache timestamp to avoid duplicate processing
  private lastFilterChangeTimestamp = 0;
  private filterProcessingInProgress = false;
  
  // Use a direct reference to the element via ref callback
  private setReportViewerRef = (el: any) => {
    console.log('Report viewer ref callback:', el);
    if (el) {
      this.reportViewerRef = el;
      this.reportViewerReady = true;
      
      // Apply any pending filters
      if (this.pendingFilters.length > 0) {
        console.log('Applying pending filters via ref callback');
        this.applyPendingFilters();
      }
    }
  };

  componentDidLoad() {
    console.log('Component did load');
    
    // Set initial color theme
    ChartThemeUtils.setColorTheme(this.colorTheme);
    document.documentElement.setAttribute('data-color-theme', this.colorTheme);
    
    // Update brand colors on initial load
    this.updateBrandColors();
    
    // Try multiple ways to find the report viewer component
    this.findReportViewer();
    
    // Set up a longer polling mechanism as a fallback
    const checkInterval = setInterval(() => {
      if (!this.reportViewerReady) {
        this.findReportViewer();
        
        if (this.reportViewerReady) {
          console.log('Report viewer found through polling');
          clearInterval(checkInterval);
        }
      } else {
        clearInterval(checkInterval);
      }
    }, 500);
    
    // Safety timeout to stop polling after 20 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.reportViewerReady) {
        console.error('Failed to get report viewer reference after 20 seconds');
      }
    }, 20000);
  }
  
  componentDidRender() {
    console.log('Component did render');
    // Try to find the report viewer after render
    if (!this.reportViewerReady) {
      this.findReportViewer();
    }
  }
  
  private findReportViewer() {
    if (this.reportViewerReady) return;
    
    // Try various query selectors to find the report viewer
    try {
      // Try direct child selector
      this.reportViewerRef = this.hostElement.querySelector('report-viewer') as unknown as HTMLElement;
      
      // Try document-wide selector as fallback
      if (!this.reportViewerRef) {
        this.reportViewerRef = document.querySelector('report-viewer') as unknown as HTMLElement;
      }
      
      // Try alternate selector with direct path
      if (!this.reportViewerRef) {
        this.reportViewerRef = document.querySelector('.reportviewer-container > report-viewer') as unknown as HTMLElement;
      }
      
      // If we found it, mark as ready
      if (this.reportViewerRef) {
        console.log('Report viewer reference found:', this.reportViewerRef);
        this.reportViewerReady = true;
        this.applyPendingFilters();
      }
    } catch (err) {
      console.error('Error finding report viewer:', err);
    }
  }
  
  private applyPendingFilters() {
    if (this.pendingFilters.length > 0 && this.reportViewerReady) {
      console.log('Applying pending filters:', this.pendingFilters);
      this.pendingFilters.forEach(filter => {
        this.triggerDirectFilterChange(filter);
      });
      this.pendingFilters = [];
    }
  }

  private toggleTheme = () => {
    this.darkMode = !this.darkMode;
    document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
    
    // Update brand colors when theme changes
    this.updateBrandColors();
  }

  private toggleHeightMode = () => {
    this.heightMode = this.heightMode === 'auto' ? 'fixed' : 'auto';
  };

  private setColorThemeSelectRef = (el: HTMLSelectElement) => {
    this.colorThemeSelectRef = el;
    if (el) {
      el.value = this.colorTheme;
    }
  };

  private changeColorTheme = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const theme = target.value as ColorTheme;
    this.colorTheme = theme;
    
    // Update the configuration object
    this.demoConfiguration = {
      ...this.demoConfiguration,
      colorTheme: theme
    };
    
    // Set the theme using ChartThemeUtils
    ChartThemeUtils.setColorTheme(theme);
    
    // Also set the CSS custom property
    document.documentElement.setAttribute('data-color-theme', theme);
    
    // Update brand colors based on the selected theme
    this.updateBrandColors();
    
    // Force re-render of the report viewer
    if (this.reportViewerRef) {
      // Update the configuration prop directly
      (this.reportViewerRef as any).configuration = this.demoConfiguration;
      
      // Dispatch a custom event to trigger re-render
      const themeChangeEvent = new CustomEvent('colorThemeChange', {
        detail: { colorTheme: theme },
        bubbles: true
      });
      this.reportViewerRef.dispatchEvent(themeChangeEvent);
      
      // Also try to force a re-render by triggering a data update
      setTimeout(() => {
        this.forceChartRefresh();
      }, 100);
    }
  };

  private updateBrandColors() {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    const colors = theme.series;
    
    // Update CSS custom properties for brand colors
    if (this.hostElement) {
      this.hostElement.style.setProperty('--brand-primary', colors[0]);
      this.hostElement.style.setProperty('--brand-primary-light', colors[1]);
      this.hostElement.style.setProperty('--brand-primary-lighter', colors[2]);
      this.hostElement.style.setProperty('--brand-primary-lightest', colors[3]);
      this.hostElement.style.setProperty('--brand-secondary', colors[4] || colors[0]);
      this.hostElement.style.setProperty('--brand-gradient-start', colors[0]);
      this.hostElement.style.setProperty('--brand-gradient-middle', colors[1] || colors[0]);
      this.hostElement.style.setProperty('--brand-gradient-end', colors[2] || colors[1] || colors[0]);
    }
  }

  private clearFilter = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (DEBUG_MODE) console.log('Clearing filter');
    
    // Prevent duplicate processing
    if (this.filterProcessingInProgress) {
      if (DEBUG_MODE) console.log('Filter processing already in progress, ignoring');
      return;
    }
    
    this.filterProcessingInProgress = true;
    
    // Clear the filter
    this.activeFilter = null;
    this.filteredDataCache = {};
    
    // First ensure filter is cleared at component level
    this.triggerDirectFilterChange(null);
    
    // Force update the UI - use a simpler approach
    try {
      if (this.reportViewerRef) {
        if (DEBUG_MODE) console.log('Clearing filters on report viewer');
        
        // Clear widget data cache
        if ((this.reportViewerRef as any).widgetData) {
          if (DEBUG_MODE) console.log('Clearing report viewer widget data cache');
          (this.reportViewerRef as any).widgetData = {};
        }
        
        // Set active filters to empty array
        if ((this.reportViewerRef as any).activeFilters) {
          if (DEBUG_MODE) console.log('Setting active filters to empty array');
          (this.reportViewerRef as any).activeFilters = [];
        }
        
        // Call handleFilterChange with wildcard to ensure filters are cleared
        if (typeof (this.reportViewerRef as any).handleFilterChange === 'function') {
          if (DEBUG_MODE) console.log('Calling handleFilterChange with wildcard to clear all filters');
          (this.reportViewerRef as any).handleFilterChange('*', '*', null);
        }
        
        // Force rebuild to ensure all components refresh
        this.forceReportRerendering();
        
        // Also try to directly refresh all chart elements
        setTimeout(() => {
          this.forceChartRefresh();
        }, 100);
      }
    } catch (err) {
      console.error('Error clearing filters:', err);
    } finally {
      this.filterProcessingInProgress = false;
    }
  }

  private triggerDirectFilterChange = (filter: { sourceId: string; field: string; value: any } | null) => {
    // Prevent duplicate filter processing
    const now = Date.now();
    if (now - this.lastFilterChangeTimestamp < 500) {
      if (DEBUG_MODE) console.log('Throttling filter change - too soon after last change');
      return;
    }
    this.lastFilterChangeTimestamp = now;
    
    if (this.filterProcessingInProgress) {
      if (DEBUG_MODE) console.log('Filter processing already in progress, ignoring');
      return;
    }
    
    this.filterProcessingInProgress = true;
    
    if (!this.reportViewerRef || !this.reportViewerReady) {
      if (DEBUG_MODE) console.warn('No report viewer reference available for direct filter application, queuing for later');
      this.pendingFilters.push(filter);
      this.filterProcessingInProgress = false;
      return;
    }
    
    try {
      if (DEBUG_MODE) console.log('Triggering direct filter change:', filter);
      
      if (filter) {
        // Apply filter directly using the component's handleFilterChange method
        if (typeof (this.reportViewerRef as any).handleFilterChange === 'function') {
          if (DEBUG_MODE) console.log('Calling handleFilterChange directly');
          (this.reportViewerRef as any).handleFilterChange(filter.sourceId, filter.field, filter.value);
        }
        
        // Only use one event dispatching method - prefer direct component method
        if (!(this.reportViewerRef as any).handleFilterChange) {
          if (DEBUG_MODE) console.log('Dispatching filter-change event as fallback');
          // Only use one event method - direct component event is preferred
          const filterEvent = new CustomEvent('filter-change', {
            detail: {
              sourceId: filter.sourceId,
              field: filter.field, 
              value: filter.value
            },
            bubbles: true
          });
          this.reportViewerRef.dispatchEvent(filterEvent);
        }
      } else {
        // Clear all filters
        if (typeof (this.reportViewerRef as any).handleFilterChange === 'function') {
          if (DEBUG_MODE) console.log('Calling handleFilterChange with null values to clear filters');
          (this.reportViewerRef as any).handleFilterChange('*', '*', null);
        }
      }
    } catch (err) {
      console.error('Error applying filter directly:', err);
    } finally {
      this.filterProcessingInProgress = false;
    }
  };
  
  private forceReportRerendering() {
    if (DEBUG_MODE) console.log('Force report rerendering - complete rebuild');
    
    // Find the report container
    let reportContainer = document.getElementById('flarelight-report-container');
    
    // If not found, try alternate selectors
    if (!reportContainer) {
      reportContainer = this.hostElement.querySelector('.reportviewer-container');
    }
    
    if (!reportContainer) {
      reportContainer = document.querySelector('.reportviewer-container');
    }
    
    // Use shadow DOM correctly if needed
    if (!reportContainer && this.hostElement.shadowRoot) {
      reportContainer = this.hostElement.shadowRoot.querySelector('.reportviewer-container');
    }
    
    if (reportContainer) {
      if (DEBUG_MODE) console.log('Found report container, rebuilding report viewer');
      
      // Store configuration
      const currentConfig = JSON.parse(JSON.stringify(this.demoConfiguration));
      
      // Clear container
      reportContainer.innerHTML = '';
      
      // Create new report viewer
      const newViewer = document.createElement('report-viewer') as unknown as HTMLElement;
      newViewer.setAttribute('report-id', 'visualization-showcase');
      
      // Set properties
      (newViewer as any).configuration = currentConfig;
      (newViewer as any).showPlaceholder = true;
      (newViewer as any).fetchChartData = this.fetchChartData;
      
      // Add to DOM
      reportContainer.appendChild(newViewer);
      
      // Update references
      this.reportViewerRef = newViewer;
      this.reportViewerReady = true;
      
      if (DEBUG_MODE) console.log('Report viewer rebuilt');
    } else {
      console.error('Could not find report container - make sure it exists in the DOM');
    }
  }

  private fetchChartData = async (request: any) => {    
    if (DEBUG_MODE) console.log('Fetch chart data request:', request);
    
    // Special handling for source info widget - return data for all sources when SourceType = Sources
    if (request.sourceId === '00000000-0000-0000-0000-000000000000' || 
        (request.sourceType && request.sourceType === 'Sources')) {
      if (DEBUG_MODE) console.log('Source info widget detected, returning all sources data');
      return this.getAllSourcesData();
    }
    
    // Special handling for filter visualizations - always return unfiltered data
    if (request.widgetType === 'filter') {
      if (DEBUG_MODE) console.log('Filter visualization detected, returning unfiltered base data');
      return this.getBaseData(request.sourceId);
    }
    
    // Check if this is a filtered request
    const isFilteredRequest = request.filters && request.filters.length > 0;
    
    // If we're clearing filters via wildcard, ensure we don't reapply a filter
    const isWildcardClear = 
      request.filters && 
      request.filters.length === 1 && 
      request.filters[0] && 
      request.filters[0].fieldName === '*' && 
      request.filters[0].value === null;
      
    if (isWildcardClear) {
      if (DEBUG_MODE) console.log('Wildcard filter clear detected in fetch, returning unfiltered data');
      this.activeFilter = null;
      this.filteredDataCache = {};
      return this.getBaseData(request.sourceId);
    }
    
    // Capture active filter from the request
    if (isFilteredRequest) {
      // Extract the filter from the request
      let newFilter = null;
      
      const filter = request.filters[0];
      if (Array.isArray(filter) && filter.length > 0 && filter[0].fieldName) {
        newFilter = {
          sourceId: request.sourceId,
          field: filter[0].fieldName,
          value: filter[0].value
        };
      } else if (filter && filter.fieldName) {
        newFilter = {
          sourceId: request.sourceId,
          field: filter.fieldName,
          value: filter.value
        };
      } else if (typeof filter === 'object' && filter !== null) {
        // For {0: {fieldName: ...}} structure
        const subFilter = Object.values(filter)[0] as any;
        if (subFilter && subFilter.fieldName) {
          newFilter = {
            sourceId: request.sourceId,
            field: subFilter.fieldName,
            value: subFilter.value
          };
        }
      }
      
      // If we have a new filter that's different from the current one
      if (newFilter && (
          !this.activeFilter || 
          this.activeFilter.value !== newFilter.value || 
          this.activeFilter.field !== newFilter.field
      )) {
        if (DEBUG_MODE) console.log('Setting active filter:', newFilter);
        
        // Clear the cache when filter changes
        this.filteredDataCache = {};
        
        // Set the new filter
        this.activeFilter = newFilter;
        
        // Apply the filter directly to the report viewer component if ready
        if (this.reportViewerReady && !this.filterProcessingInProgress) {
          // Prevent recursive filter processing
          this.filterProcessingInProgress = true;
          this.triggerDirectFilterChange(newFilter);
          this.filterProcessingInProgress = false;
        } else if (!this.filterProcessingInProgress) {
          this.pendingFilters.push(newFilter);
        }
      }
    } else if (this.activeFilter && request.sourceId === this.activeFilter.sourceId) {
      // If request is from source that had a filter but no longer does, clear filter
      if (DEBUG_MODE) console.log('Clearing active filter');
      this.activeFilter = null;
      this.filteredDataCache = {};
      
      // Clear the filter on the report viewer component if ready
      if (this.reportViewerReady && !this.filterProcessingInProgress) {
        // Prevent recursive filter processing
        this.filterProcessingInProgress = true;
        this.triggerDirectFilterChange(null);
        this.filterProcessingInProgress = false;
      } else if (!this.filterProcessingInProgress) {
        this.pendingFilters.push(null);
      }
    }
    
    // Get data for the request - if no active filter, return base data
    if (!this.activeFilter) {
      if (DEBUG_MODE) console.log('No active filter, returning base data');
      return this.getBaseData(request.sourceId);
    }
    
    // Check cache first for filtered data
    const cacheKey = `${request.sourceId}-${this.activeFilter.field}-${this.activeFilter.value}`;
    if (this.filteredDataCache[cacheKey]) {
      if (DEBUG_MODE) console.log(`Using cached filtered data for ${cacheKey}`);
      return this.filteredDataCache[cacheKey];
    }
    
    // Get data for the request with filter applied
    const baseData = this.getBaseData(request.sourceId);
    const filteredData = this.filterDataByCategory(baseData, this.activeFilter.value);
    
    // Store in cache
    this.filteredDataCache[cacheKey] = filteredData;
    
    // Return the filtered data
    return filteredData;
  };
    
  private filterDataByCategory(data: any[], categoryValue: string) {
    if (!data || data.length === 0) return data;
    
    if (DEBUG_MODE) console.log(`Filtering data with category value: ${categoryValue}`, data);
    
    // Create a copy of the data to avoid modifying the original
    const result = [...data];
    
    // If data has a category field
    if ('category' in data[0]) {
      if (DEBUG_MODE) console.log('Filtering by category field');
      // Keep only the matching category record
      return result.filter(item => item.category === categoryValue);
    }
    
    // For multi-series data
    if ('series1' in data[0]) {
      if (DEBUG_MODE) console.log('Filtering multi-series data');
      // Keep only the record with the matching category
      return result.filter(item => item.category === categoryValue);
    }
    
    // For time series, modify values to make filtering obvious
    if ('date' in data[0]) {
      if (DEBUG_MODE) console.log('Modifying time series data');
      return result.map(item => ({
        ...item,
        value: item.value * 2 // Double values to make filtering obvious
      }));
    }
    
    // For scatter plot data, shift points to make filtering obvious
    if ('x' in data[0] && 'y' in data[0] && !('category' in data[0])) {
      if (DEBUG_MODE) console.log('Modifying scatter plot data');
      return result.map(item => ({
        ...item,
        x: item.x * 0.8, // Shift x values
        y: item.y * 1.5  // Amplify y values
      }));
    }
    
    // For box-whisker data
    if ('group' in data[0]) {
      if (DEBUG_MODE) console.log('Filtering box-whisker data');
      return result.filter(item => {
        if (typeof item.group === 'string') {
          return item.group === categoryValue || item.group.includes(categoryValue);
        }
        return false;
      });
    }
    
    // For heatmap data
    if ('value' in data[0] && 'x' in data[0] && 'y' in data[0]) {
      if (DEBUG_MODE) console.log('Modifying heatmap data');
      return result.map(item => ({
        ...item,
        value: item.value * 1.8 // Increase intensity
      }));
    }
    
    // For hierarchical data
    if ('parentId' in data[0]) {
      if (DEBUG_MODE) console.log('Modifying hierarchy data');
      return result.map(item => ({
        ...item,
        value: item.value * 1.5 // Increase values
      }));
    }
    
    // For other data types, see if we can find a matching field
    for (const field of ['name', 'label', 'bin', 'x', 'y']) {
      if (field in data[0]) {
        if (DEBUG_MODE) console.log(`Filtering by ${field} field`);
        return result.filter(item => {
          if (typeof item[field] === 'string') {
            return item[field] === categoryValue || item[field].includes(categoryValue);
          }
          return item[field] === categoryValue;
        });
      }
    }
    
    // If we can't filter in a meaningful way, modify the data to make filtering obvious
    if (DEBUG_MODE) console.log('Using default filtering approach');
    return result.map(item => {
      // Create a copy and modify numeric properties
      const newItem = {...item};
      for (const key in newItem) {
        if (typeof newItem[key] === 'number') {
          newItem[key] = newItem[key] * 1.5; // Increase all numeric values by 50%
        }
      }
      return newItem;
    });
  }
  
  private getAllSourcesData() {
    // Return information about all sources configured in the report
    return this.demoConfiguration.sources.map(source => ({
      Name: source.name,
      SourceType: source.type === 'mock' ? 'DataImport' : source.type === 'analysis' ? 'Analysis' : 'DataImport',
      CreatedDate: this.generateRandomDate()
    }));
  }

  private generateRandomDate() {
    // Generate a random date within the last year
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
    return new Date(randomTime).toISOString();
  }

  private getBaseData(sourceId: string) {
    // Mock data based on the source ID or chart type
    switch (sourceId) {
      case 'sample-categorical':
        return [
          { category: 'Enterprise Software Solutions & Cloud Services', value: 142 },
          { category: 'Healthcare Technology & Medical Devices', value: 98 },
          { category: 'Financial Services & Banking Technology', value: 125 },
          { category: 'E-commerce & Digital Marketing Platforms', value: 89 },
          { category: 'Manufacturing & Industrial Automation', value: 167 },
          { category: 'Transportation & Logistics Management', value: 134 },
          { category: 'Education Technology & Learning Platforms', value: 76 },
          { category: 'Renewable Energy & Sustainability Solutions', value: 203 },
          { category: 'Telecommunications & Network Infrastructure', value: 156 },
          { category: 'Real Estate & Property Management Systems', value: 91 },
          { category: 'Food & Beverage Industry Technologies', value: 118 },
          { category: 'Retail & Customer Experience Solutions', value: 145 },
          { category: 'Media & Entertainment Content Platforms', value: 82 },
          { category: 'Automotive & Smart Vehicle Technologies', value: 178 },
          { category: 'Agriculture & Smart Farming Solutions', value: 94 }
        ];
        
      case 'sample-small-categorical':
        return [
          { status: 'Active', count: 45 },
          { status: 'Inactive', count: 23 },
          { status: 'Pending', count: 12 },
          { status: 'Completed', count: 67 }
        ];
        
      case 'sample-time-series':
        return [
          { date: '2023-01-01', value: 145 },
          { date: '2023-01-15', value: 178 },
          { date: '2023-02-01', value: 156 },
          { date: '2023-02-15', value: 189 },
          { date: '2023-03-01', value: 234 },
          { date: '2023-03-15', value: 198 },
          { date: '2023-04-01', value: 267 },
          { date: '2023-04-15', value: 245 },
          { date: '2023-05-01', value: 289 },
          { date: '2023-05-15', value: 312 },
          { date: '2023-06-01', value: 298 },
          { date: '2023-06-15', value: 334 },
          { date: '2023-07-01', value: 367 },
          { date: '2023-07-15', value: 345 },
          { date: '2023-08-01', value: 389 },
          { date: '2023-08-15', value: 412 },
          { date: '2023-09-01', value: 398 },
          { date: '2023-09-15', value: 434 },
          { date: '2023-10-01', value: 456 },
          { date: '2023-10-15', value: 423 },
          { date: '2023-11-01', value: 478 },
          { date: '2023-11-15', value: 489 },
          { date: '2023-12-01', value: 512 },
          { date: '2023-12-15', value: 534 }
        ];
        
      case 'sample-scatter':
        const scatterData = [];
        for (let i = 0; i < 50; i++) {
          scatterData.push({
            x: 10 + Math.random() * 90,
            y: 15 + Math.random() * 85 + (i * 0.5), // Add some correlation
          });
        }
        return scatterData;
        
      case 'sample-histogram':
        return [
          { bin: 'Very Low Performance (0-10%)', frequency: 12 },
          { bin: 'Below Average Performance (10-20%)', frequency: 24 },
          { bin: 'Low Average Performance (20-30%)', frequency: 45 },
          { bin: 'Average Performance (30-40%)', frequency: 67 },
          { bin: 'Above Average Performance (40-50%)', frequency: 89 },
          { bin: 'Good Performance (50-60%)', frequency: 76 },
          { bin: 'Very Good Performance (60-70%)', frequency: 54 },
          { bin: 'Excellent Performance (70-80%)', frequency: 38 },
          { bin: 'Outstanding Performance (80-90%)', frequency: 23 },
          { bin: 'Exceptional Performance (90-100%)', frequency: 15 },
          { bin: 'Peak Performance (100%+)', frequency: 8 }
        ];
        
      case 'sample-heatmap':
        const heatmapData = [];
        const xLabels = [
          'North American Markets', 'European Union Markets', 'Asian Pacific Markets', 
          'Latin American Markets', 'Middle Eastern Markets', 'African Markets',
          'Oceanian Markets', 'Nordic Markets', 'Eastern European Markets'
        ];
        const yLabels = [
          'Q1 Sales Performance', 'Q2 Sales Performance', 'Q3 Sales Performance', 
          'Q4 Sales Performance', 'Annual Growth Rate', 'Market Share Percentage',
          'Customer Satisfaction Score', 'Revenue per Customer'
        ];
        
        xLabels.forEach(x => {
          yLabels.forEach(y => {
            heatmapData.push({
              x: x,
              y: y,
              value: Math.floor(Math.random() * 100) + 10
            });
          });
        });
        return heatmapData;
        
      case 'sample-hierarchy':
        return [
          { id: '1', parentId: null, name: 'Global Corporation Headquarters', displayName: 'Global Corporation HQ - Executive Leadership', value: 2500 },
          { id: '2', parentId: '1', name: 'North American Operations Division', displayName: 'North American Ops - Regional Management', value: 1200 },
          { id: '3', parentId: '1', name: 'European Operations Division', displayName: 'European Ops - Regional Management', value: 800 },
          { id: '4', parentId: '1', name: 'Asia Pacific Operations Division', displayName: 'Asia Pacific Ops - Regional Management', value: 500 },
          { id: '5', parentId: '2', name: 'US East Coast Sales Territory', displayName: 'US East Coast - Sales & Marketing', value: 600 },
          { id: '6', parentId: '2', name: 'US West Coast Sales Territory', displayName: 'US West Coast - Sales & Marketing', value: 400 },
          { id: '7', parentId: '2', name: 'Canadian Operations Territory', displayName: 'Canadian Ops - Sales & Distribution', value: 200 },
          { id: '8', parentId: '3', name: 'Western European Sales Region', displayName: 'Western Europe - Sales & Customer Success', value: 450 },
          { id: '9', parentId: '3', name: 'Eastern European Sales Region', displayName: 'Eastern Europe - Sales & Market Development', value: 250 },
          { id: '10', parentId: '3', name: 'Nordic Countries Sales Region', displayName: 'Nordic Region - Sales & Strategic Partnerships', value: 100 },
          { id: '11', parentId: '4', name: 'Japanese Market Operations', displayName: 'Japan - Sales & Technology Services', value: 200 },
          { id: '12', parentId: '4', name: 'Chinese Market Operations', displayName: 'China - Sales & Manufacturing Support', value: 180 },
          { id: '13', parentId: '4', name: 'Southeast Asian Markets', displayName: 'Southeast Asia - Sales & Regional Expansion', value: 120 },
          { id: '14', parentId: '5', name: 'New York Metropolitan Area', displayName: 'NYC Metro - Enterprise Sales Division', value: 300 },
          { id: '15', parentId: '5', name: 'Boston Financial District', displayName: 'Boston - Financial Services Sales', value: 200 },
          { id: '16', parentId: '5', name: 'Washington DC Government Sector', displayName: 'DC - Government & Public Sector Sales', value: 100 },
          { id: '17', parentId: '6', name: 'Silicon Valley Technology Hub', displayName: 'Silicon Valley - Tech Industry Sales', value: 250 },
          { id: '18', parentId: '6', name: 'Los Angeles Entertainment Industry', displayName: 'LA - Media & Entertainment Sales', value: 150 }
        ];
        
      case 'sample-bubble':
        const bubbleData = [];
        const categories = [
          'Technology & Innovation Sector', 'Healthcare & Life Sciences', 'Financial Services & Banking',
          'Manufacturing & Industrial', 'Retail & Consumer Goods', 'Energy & Utilities',
          'Transportation & Logistics', 'Real Estate & Construction', 'Education & Training',
          'Media & Entertainment', 'Telecommunications', 'Agriculture & Food Production'
        ];
        
        categories.forEach(category => {
          for (let i = 0; i < 3; i++) {
            bubbleData.push({
              x: 10 + Math.random() * 80,
              y: 10 + Math.random() * 80,
              size: 10 + Math.random() * 40,
              category: category
            });
          }
        });
        return bubbleData;
        
      case 'sample-multi-series':
        return [
          { 
            category: 'Enterprise Software & Cloud Solutions', 
            series1: 145, series2: 189, series3: 167 
          },
          { 
            category: 'Healthcare Technology & Medical Devices', 
            series1: 132, series2: 156, series3: 198 
          },
          { 
            category: 'Financial Services & Banking Technology', 
            series1: 178, series2: 134, series3: 145 
          },
          { 
            category: 'E-commerce & Digital Marketing Platforms', 
            series1: 156, series2: 189, series3: 123 
          },
          { 
            category: 'Manufacturing & Industrial Automation', 
            series1: 189, series2: 167, series3: 178 
          },
          { 
            category: 'Transportation & Logistics Management', 
            series1: 134, series2: 145, series3: 189 
          },
          { 
            category: 'Education Technology & Learning Platforms', 
            series1: 167, series2: 198, series3: 134 
          },
          { 
            category: 'Renewable Energy & Sustainability Solutions', 
            series1: 198, series2: 123, series3: 156 
          },
          { 
            category: 'Telecommunications & Network Infrastructure', 
            series1: 123, series2: 178, series3: 189 
          },
          { 
            category: 'Real Estate & Property Management Systems', 
            series1: 145, series2: 189, series3: 167 
          }
        ];
      
      case 'sample-kpi':
        return [
          { value: 12750000 }
        ];
        
      case 'sample-kpi-with-trend':
        return [
          { currentRevenue: 15750000, previousRevenue: 14200000 }
        ];
        
      case 'sample-kpi-currency':
        return [
          { value: 2847500 }
        ];
        
      case 'sample-kpi-percentage':
        return [
          { value: 0.847 }
        ];
        
      case 'sample-kpi-custom-format':
        return [
          { value: 1234567.89 }
        ];
        
      case 'sample-box-whisker':
        // Generate box-whisker data with pre-calculated statistics
        const groups = [
          'North American Regional Performance Metrics',
          'European Union Market Performance Indicators', 
          'Asia Pacific Growth & Development Statistics',
          'Latin American Expansion Performance Data',
          'Middle Eastern Market Penetration Analysis',
          'African Markets Development Indicators',
          'Global Digital Transformation Metrics'
        ];
        
        return groups.map((group, index) => {
          // Generate realistic statistical data
          const baseValue = 30 + Math.random() * 40;
          const spread = 10 + Math.random() * 20;
          const sampleSize = 40 + Math.floor(Math.random() * 21);
          const missingCount = Math.floor(Math.random() * 5);
          
          // Calculate statistics based on distribution type
          let mean, stdDev, min, q1, median, q3, max, iqr, lowerWhisker, upperWhisker;
          let outlierCount = 0;
          let outliers = [];
          
          if (group.includes('North American')) {
            // Normal distribution
            mean = baseValue;
            stdDev = spread * 0.3;
            min = mean - 2.5 * stdDev;
            q1 = mean - 0.67 * stdDev;
            median = mean;
            q3 = mean + 0.67 * stdDev;
            max = mean + 2.5 * stdDev;
          } else if (group.includes('European')) {
            // Slightly skewed distribution
            mean = baseValue + spread * 0.2;
            stdDev = spread * 0.4;
            min = mean - 2.2 * stdDev;
            q1 = mean - 0.5 * stdDev;
            median = mean + 0.1 * stdDev;
            q3 = mean + 0.8 * stdDev;
            max = mean + 2.8 * stdDev;
          } else if (group.includes('Asia Pacific')) {
            // Higher variance distribution
            mean = baseValue;
            stdDev = spread * 0.5;
            min = mean - 2.8 * stdDev;
            q1 = mean - 0.8 * stdDev;
            median = mean;
            q3 = mean + 0.8 * stdDev;
            max = mean + 2.8 * stdDev;
          } else {
            // Mixed distribution
            mean = baseValue + spread * 0.1;
            stdDev = spread * 0.35;
            min = mean - 2.3 * stdDev;
            q1 = mean - 0.6 * stdDev;
            median = mean + 0.05 * stdDev;
            q3 = mean + 0.7 * stdDev;
            max = mean + 2.6 * stdDev;
          }
          
          iqr = q3 - q1;
          lowerWhisker = q1 - 1.5 * iqr;
          upperWhisker = q3 + 1.5 * iqr;
          
          // Generate some outliers (limited to 50 for preview)
          const outlierCountLow = Math.floor(Math.random() * 3);
          const outlierCountHigh = Math.floor(Math.random() * 3);
          outlierCount = outlierCountLow + outlierCountHigh;
          
          for (let i = 0; i < Math.min(outlierCountLow, 25); i++) {
            outliers.push(lowerWhisker - Math.random() * stdDev);
          }
          for (let i = 0; i < Math.min(outlierCountHigh, 25); i++) {
            outliers.push(upperWhisker + Math.random() * stdDev);
          }
          
          return {
            SampleSize: sampleSize,
            MissingCount: missingCount,
            Mean: Number(mean.toFixed(2)),
            StdDev: Number(stdDev.toFixed(2)),
            Min: Number(min.toFixed(2)),
            Q1: Number(q1.toFixed(2)),
            Median: Number(median.toFixed(2)),
            Q3: Number(q3.toFixed(2)),
            Max: Number(max.toFixed(2)),
            IQR: Number(iqr.toFixed(2)),
            LowerWhisker: Number(lowerWhisker.toFixed(2)),
            UpperWhisker: Number(upperWhisker.toFixed(2)),
            OutlierCountLow: outlierCountLow,
            OutlierCountHigh: outlierCountHigh,
            OutlierCount: outlierCount,
            OutliersPreviewJson: outliers.length > 0 ? JSON.stringify(outliers) : null,
            DataSourceName: group,
            SampleSourceName: `Sample_${index + 1}`
          };
        });
      
      case 'sample-box-whisker-normality-plot':
        // Generate box-whisker normality plot data with pre-calculated statistics
        const baseValue = 30 + Math.random() * 40;
        const spread = 10 + Math.random() * 20;
        const sampleSize = 40 + Math.floor(Math.random() * 21);
        const missingCount = Math.floor(Math.random() * 5);
        
        // Calculate statistics for a normal distribution
        const mean = baseValue;
        const stdDev = spread * 0.3;
        const min = mean - 2.5 * stdDev;
        const q1 = mean - 0.67 * stdDev;
        const median = mean;
        const q3 = mean + 0.67 * stdDev;
        const max = mean + 2.5 * stdDev;
        const iqr = q3 - q1;
        const lowerWhisker = q1 - 1.5 * iqr;
        const upperWhisker = q3 + 1.5 * iqr;
        
        // Generate some outliers (limited to 50 for preview)
        // Create more extreme outliers to test the chart scaling
        const outlierCountLow = Math.floor(Math.random() * 5) + 2; // 2-6 low outliers
        const outlierCountHigh = Math.floor(Math.random() * 5) + 2; // 2-6 high outliers
        const outlierCount = outlierCountLow + outlierCountHigh;
        const outliers = [];
        
        // Generate extreme low outliers (much further from whisker)
        for (let i = 0; i < Math.min(outlierCountLow, 25); i++) {
          outliers.push(lowerWhisker - (2 + Math.random() * 3) * stdDev); // 2-5 std devs below whisker
        }
        // Generate extreme high outliers (much further from whisker)
        for (let i = 0; i < Math.min(outlierCountHigh, 25); i++) {
          outliers.push(upperWhisker + (2 + Math.random() * 3) * stdDev); // 2-5 std devs above whisker
        }
        
        return [{
          SampleSize: sampleSize,
          MissingCount: missingCount,
          Mean: Number(mean.toFixed(4)),
          StdDev: Number(stdDev.toFixed(4)),
          Min: Number(min.toFixed(4)),
          Q1: Number(q1.toFixed(4)),
          Median: Number(median.toFixed(4)),
          Q3: Number(q3.toFixed(4)),
          Max: Number(max.toFixed(4)),
          IQR: Number(iqr.toFixed(4)),
          LowerWhisker: Number(lowerWhisker.toFixed(4)),
          UpperWhisker: Number(upperWhisker.toFixed(4)),
          OutlierCountLow: outlierCountLow,
          OutlierCountHigh: outlierCountHigh,
          OutlierCount: outlierCount,
          OutliersPreviewJson: outliers.length > 0 ? JSON.stringify(outliers) : null,
          DataSourceName: 'Global Performance Dataset',
          SampleSourceName: 'Normality Analysis Sample'
        }];
      
      case 'sample-descriptive':
        return [
          { Statistic: 'Total Sample Count (N)', Value: 2847 },
          { Statistic: 'Arithmetic Mean (Average)', Value: 156.73 },
          { Statistic: 'Median Value (50th Percentile)', Value: 142.8 },
          { Statistic: 'Mode (Most Frequent Value)', Value: 138.5 },
          { Statistic: 'Standard Deviation (σ)', Value: 45.29 },
          { Statistic: 'Sample Variance (σ²)', Value: 2051.19 },
          { Statistic: 'Minimum Observed Value', Value: 23.4 },
          { Statistic: 'Maximum Observed Value', Value: 287.6 },
          { Statistic: 'Range (Max - Min)', Value: 264.2 },
          { Statistic: 'First Quartile (Q1)', Value: 118.7 },
          { Statistic: 'Third Quartile (Q3)', Value: 189.4 },
          { Statistic: 'Interquartile Range (IQR)', Value: 70.7 },
          { Statistic: 'Skewness Coefficient', Value: 0.34 },
          { Statistic: 'Kurtosis Coefficient', Value: -0.12 },
          { Statistic: 'Coefficient of Variation (%)', Value: 28.9 }
        ];
        
      case 'sample-correlation':
        return [
          { 
            Name: 'Customer Satisfaction Score', 
            'Customer Satisfaction Score': 1.00, 
            'Revenue Growth Rate': 0.85, 
            'Market Share Percentage': 0.42, 
            'Employee Engagement Index': 0.78,
            'Digital Transformation Score': 0.15,
            'Operational Efficiency Rating': 0.91,
            'Customer Churn Rate': -0.73,
            'Support Ticket Volume': -0.68
          },
          { 
            Name: 'Revenue Growth Rate', 
            'Customer Satisfaction Score': 0.85, 
            'Revenue Growth Rate': 1.00, 
            'Market Share Percentage': 0.67, 
            'Employee Engagement Index': 0.23,
            'Digital Transformation Score': 0.45,
            'Operational Efficiency Rating': 0.58,
            'Customer Churn Rate': -0.52,
            'Support Ticket Volume': -0.41
          },
          { 
            Name: 'Market Share Percentage', 
            'Customer Satisfaction Score': 0.42, 
            'Revenue Growth Rate': 0.67, 
            'Market Share Percentage': 1.00, 
            'Employee Engagement Index': 0.12,
            'Digital Transformation Score': 0.38,
            'Operational Efficiency Rating': 0.34,
            'Customer Churn Rate': -0.28,
            'Support Ticket Volume': -0.19
          },
          { 
            Name: 'Employee Engagement Index', 
            'Customer Satisfaction Score': 0.78, 
            'Revenue Growth Rate': 0.23, 
            'Market Share Percentage': 0.12, 
            'Employee Engagement Index': 1.00,
            'Digital Transformation Score': -0.15,
            'Operational Efficiency Rating': 0.67,
            'Customer Churn Rate': -0.45,
            'Support Ticket Volume': -0.52
          },
          { 
            Name: 'Digital Transformation Score', 
            'Customer Satisfaction Score': 0.15, 
            'Revenue Growth Rate': 0.45, 
            'Market Share Percentage': 0.38, 
            'Employee Engagement Index': -0.15,
            'Digital Transformation Score': 1.00,
            'Operational Efficiency Rating': 0.28,
            'Customer Churn Rate': 0.08,
            'Support Ticket Volume': 0.12
          },
          { 
            Name: 'Operational Efficiency Rating', 
            'Customer Satisfaction Score': 0.91, 
            'Revenue Growth Rate': 0.58, 
            'Market Share Percentage': 0.34, 
            'Employee Engagement Index': 0.67,
            'Digital Transformation Score': 0.28,
            'Operational Efficiency Rating': 1.00,
            'Customer Churn Rate': -0.61,
            'Support Ticket Volume': -0.55
          },
          { 
            Name: 'Customer Churn Rate', 
            'Customer Satisfaction Score': -0.73, 
            'Revenue Growth Rate': -0.52, 
            'Market Share Percentage': -0.28, 
            'Employee Engagement Index': -0.45,
            'Digital Transformation Score': 0.08,
            'Operational Efficiency Rating': -0.61,
            'Customer Churn Rate': 1.00,
            'Support Ticket Volume': 0.82
          },
          { 
            Name: 'Support Ticket Volume', 
            'Customer Satisfaction Score': -0.68, 
            'Revenue Growth Rate': -0.41, 
            'Market Share Percentage': -0.19, 
            'Employee Engagement Index': -0.52,
            'Digital Transformation Score': 0.12,
            'Operational Efficiency Rating': -0.55,
            'Customer Churn Rate': 0.82,
            'Support Ticket Volume': 1.00
          }
        ];
      
      case 'sample-hypothesis-test':
        return [{
          SampleSize: 15,
          SampleMean: 50.4000000000000000,
          SampleStdDev: 2.0976176963403031,
          PopulationStdDev: null,
          PopulationMean: 50,
          ConfidenceLevel: 95.0,
          DataSourceName: "Two Tailed T-Test",
          SampleSourceName: "value",
          TestName: "TwoTailed",
          LCL: 50.393435156908666,
          UCL: 50.40656484309133,
          PValue: 0.045,
          NullReject: true
        }];
        
      case 'sample-independent-two-sample-hypothesis-test':
        return [{
          SampleSizeGroup1: 25,
          SampleSizeGroup2: 30,
          SampleMeanGroup1: 82.3,
          SampleMeanGroup2: 78.5,
          SampleStdDevGroup1: 4.2,
          SampleStdDevGroup2: 3.8,
          PopulationStdDevGroup1: null,
          PopulationStdDevGroup2: null,
          ConfidenceLevel: 95.0,
          DataSourceName: "Independent Two-Sample T-Test",
          SampleSourceNameGroup1: "Treatment Group A",
          SampleSourceNameGroup2: "Treatment Group B",
          TestName: "TwoTailed",
          LCL: 1.234,
          UCL: 6.566,
          PValue: 0.012,
          NullReject: true
        }];
        
      case 'sample-paired-two-sample-hypothesis-test':
        return [{
          SampleSizeGroup1: 20,
          SampleSizeGroup2: 20,
          DifferenceMean: 3.8,
          DifferenceStdDev: 2.1,
          PopulationStdDev: null,
          ConfidenceLevel: 95.0,
          DataSourceName: "Paired Two-Sample T-Test",
          SampleSourceNameGroup1: "Before Treatment",
          SampleSourceNameGroup2: "After Treatment",
          TestName: "TwoTailed",
          LCL: 2.45,
          UCL: 5.15,
          PValue: 0.023,
          NullReject: true
        }];
        
      case 'sample-welch-two-sample-hypothesis-test':
        return [{
          SampleSizeGroup1: 28,
          SampleSizeGroup2: 22,
          SampleMeanGroup1: 85.7,
          SampleMeanGroup2: 79.2,
          SampleStdDevGroup1: 5.1,
          SampleStdDevGroup2: 4.3,
          ConfidenceLevel: 95.0,
          DataSourceName: "Welch's Two Sample T-Test",
          SampleSourceNameGroup1: "Experimental Group",
          SampleSourceNameGroup2: "Control Group",
          TestName: "TwoTailed",
          LCL: 2.145,
          UCL: 10.955,
          PValue: 0.008,
          NullReject: true
        }];
        
      case 'sample-one-way-anova':
        return [
          {
            Id: 1,
            SourceOfVariation: "Between Groups",
            SumOfSquares: 228.0,
            DegreesOfFreedom: 3,
            MeanSquares: 76.0,
            FRatio: 13.57,
            PValue: 0.0001,
            FCritical: 3.24,
            PCritical: 0.05,
            DataSourceName: "One-Way ANOVA Analysis",
            ConfidenceLevel: 95,
            NullReject: true
          },
          {
            Id: 2,
            SourceOfVariation: "Within Groups",
            SumOfSquares: 112.0,
            DegreesOfFreedom: 20,
            MeanSquares: 5.6,
            FRatio: null,
            PValue: null,
            FCritical: null,
            DataSourceName: "One-Way ANOVA Analysis",
            ConfidenceLevel: 95,
            NullReject: true
          },
          {
            Id: 3,
            SourceOfVariation: "Total",
            SumOfSquares: 340.0,
            DegreesOfFreedom: 23,
            MeanSquares: 14.7826,
            FRatio: null,
            PValue: null,
            FCritical: null,
            DataSourceName: "One-Way ANOVA Analysis",
            ConfidenceLevel: 95,
            NullReject: true
          }
        ];
        
      case 'sample-welch-anova':
        return [
          {
            SumOfSquares: 245.67,
            WelchMS: 81.89,
            FRatio: 12.45,
            NumDF: 3,
            DenDF: 18.5,
            PValue: 0.0003,
            FCritical: 3.16,
            PCritical: 0.05,
            DataSourceName: "Welch's ANOVA Analysis",
            ConfidenceLevel: 95,
            NullReject: true
          }
        ];
        
      case 'sample-one-sample-wilcoxon-signed-rank':
        return [{
          SampleSizeNonZero: 12,
          ZeroCount: 3,
          HasTies: false,
          WPlus: 45.5,
          WMinus: 32.5,
          WStat: 32.5,
          MeanW: 39.0,
          VarW: 162.5,
          DataSourceName: "One-Sample Wilcoxon Signed Rank Test",
          SampleSourceName: "Treatment Response Scores",
          TestName: "TwoTailed",
          ConfidenceLevel: 95.0,
          ContinuityCorrection: true,
          ZValue: -1.23,
          PValue: 0.218,
          WCritical: 17.0,
          ReferenceMedian: 42.0,
          NullReject: false
        }];
        
      case 'sample-paired-two-sample-wilcoxon-signed-rank':
        return [{
          SampleSize: 15,
          SampleSizeNonZero: 12,
          ZeroCount: 3,
          HasTies: false,
          WPlus: 67.5,
          WMinus: 25.5,
          WStat: 25.5,
          MeanW: 46.5,
          VarW: 195.0,
          HasNullPairs: false,
          DataSourceName: "Paired Two Sample Wilcoxon Signed Rank Test",
          SampleSourceName1: "Before Treatment Scores",
          SampleSourceName2: "After Treatment Scores",
          TestName: "TwoTailed",
          ConfidenceLevel: 95.0,
          ReferenceValue: 0.0,
          ContinuityCorrection: true,
          ZValue: -2.15,
          PValue: 0.031,
          WCritical: 21.0,
          NullReject: true
        }];
        
      case 'sample-mann-whitney-u-test':
        return [{
          N1: 25,
          N2: 30,
          W1: 312.5,
          W2: 487.5,
          U1: 187.5,
          U2: 562.5,
          UStat: 187.5,
          MeanU: 375.0,
          VarU: 1950.0,
          HasTies: false,
          DataSourceName: "Mann-Whitney U Test Analysis",
          SampleSourceName1: "Treatment Group A",
          SampleSourceName2: "Treatment Group B",
          TestName: "TwoTailed",
          ConfidenceLevel: 95.0,
          ExpectedDifference: 0.0,
          ContinuityCorrection: true,
          ZValue: -2.34,
          PValue: 0.019,
          UCritical: 198.0,
          NullReject: true
        }];
      case 'sample-kruskal-wallis-test':
        return [{
          TotalN: 120,
          GroupCount: 5,
          DegreesOfFreedom: 4,
          SumRi2OverNi: 1850.5,
          HRaw: 12.45,
          CorrectionFactor: 0.987,
          HStat: 12.28,
          HasTies: true,
          DataSourceName: "Kruskal-Wallis Test Analysis",
          SampleSourceNames: "Control Group, Treatment A, Treatment B, Treatment C, Placebo Group",
          ConfidenceLevel: 95.0,
          PValue: 0.015,
          HCritical: 9.49,
          NullReject: true
        }];
        
      case 'sample-shapiro-wilk-test':
        return [{
          SampleSize: 25,
          MissingCount: 0,
          Mean: 45.67,
          StdDev: 8.23,
          DataSourceName: "Shapiro-Wilk Test Analysis",
          SampleSourceName: "Normality Test Data",
          ConfidenceLevel: 95.0,
          WStat: 0.945,
          PValue: 0.234,
          WCritical: 0.918,
          NullReject: false
        }];
        
      case 'sample-kolmogorov-smirnov-normality-test':
        return [{
          SampleSize: 30,
          MissingCount: 2,
          Mean: 52.14,
          StdDev: 9.87,
          DataSourceName: "Kolmogorov-Smirnov Normality Test Analysis",
          SampleSourceName: "Distribution Test Data",
          ConfidenceLevel: 95.0,
          DStat: 0.127,
          PValue: 0.089,
          DCritical: 0.161,
          NullReject: false
        }];
        
      case 'sample-anderson-darling-normality-test':
        return [{
          SampleSize: 25,
          MissingCount: 1,
          Mean: 48.32,
          StdDev: 7.45,
          DataSourceName: "Anderson-Darling Normality Test Analysis",
          SampleSourceName: "Normality Test Data",
          ConfidenceLevel: 95.0,
          A2: 0.342,
          A2Star: 0.356,
          PValue: 0.156,
          A2StarCritical: 0.752,
          NullReject: false
        }];
      
      default:
        console.warn(`No mock data available for source: ${sourceId}`);
        return [];
    }
  }

  private forceChartRefresh() {
    try {
      console.log('Attempting direct chart refresh');
      
      // Find all data widget elements
      const dataWidgets = document.querySelectorAll('data-widget');
      if (dataWidgets.length > 0) {
        console.log(`Found ${dataWidgets.length} data widgets to refresh`);
        
        // Trigger data update events on each widget
        dataWidgets.forEach(widget => {
          try {
            // Update the colorTheme on each widget
            (widget as any).colorTheme = this.colorTheme;
            
            // Dispatch a theme change event
            widget.dispatchEvent(new CustomEvent('colorThemeChange', {
              detail: { colorTheme: this.colorTheme },
              bubbles: false
            }));
            
            // Dispatch a dataUpdate event to trigger a refresh
            widget.dispatchEvent(new CustomEvent('dataUpdate', {
              detail: null, // null will trigger a re-fetch
              bubbles: false
            }));
            
            // Also try to directly access internal methods if available
            if (typeof (widget as any).refreshData === 'function') {
              (widget as any).refreshData();
            }
            
            // Try to find and refresh visualization components within the widget
            if (widget.shadowRoot) {
              const vizElements = widget.shadowRoot.querySelectorAll('[class*="visualization"]');
              if (vizElements.length > 0) {
                console.log(`Found ${vizElements.length} visualization elements to refresh in widget`);
                vizElements.forEach(viz => {
                  // Update colorTheme on visualization components
                  (viz as any).colorTheme = this.colorTheme;
                  
                  // Dispatch theme change event
                  viz.dispatchEvent(new CustomEvent('colorThemeChange', {
                    detail: { colorTheme: this.colorTheme },
                    bubbles: false
                  }));
                  
                  if (typeof (viz as any).refreshData === 'function') {
                    (viz as any).refreshData();
                  }
                });
              }
            }
          } catch (innerErr) {
            console.error('Error refreshing widget:', innerErr);
          }
        });
      } else {
        console.log('No data-widget elements found, trying alternate methods');
      }
      
      // Trigger a global resize event to force chart redraws
      window.dispatchEvent(new Event('resize'));
      
      // Find all charts through common class names
      const chartElements = document.querySelectorAll('.echarts-for-react, .chart-container, [class*="chart"]');
      if (chartElements.length > 0) {
        console.log(`Found ${chartElements.length} potential chart elements to refresh`);
        chartElements.forEach(chart => {
          try {
            if (typeof (chart as any).refresh === 'function') {
              (chart as any).refresh();
            }
            if (typeof (chart as any).resize === 'function') {
              (chart as any).resize();
            }
          } catch (chartErr) {
            // Ignore errors, just trying different methods
          }
        });
      }
    } catch (err) {
      console.error('Error during chart refresh:', err);
    }
  }

  render() {
    return (
      <div class="demo-container">
        <header class="demo-header">
          <h1>Flarelight Reporting Visualization Demo</h1>
          <p>A comprehensive showcase of all available chart types and visualizations</p>
          <div class="theme-controls">
            <div class="theme-toggle">
              <button onClick={this.toggleTheme} class="toggle-button">
                {this.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </button>
            </div>
            <div class="height-mode-toggle">
              <button onClick={this.toggleHeightMode} class="toggle-button height-mode-btn">
                {this.heightMode === 'auto' ? 'Switch to Fixed Height' : 'Switch to Auto Height'}
              </button>
            </div>
            <div class="color-theme-selector">
              <label htmlFor="colorThemeSelect">Color Theme:</label>
              <select 
                ref={this.setColorThemeSelectRef}
                id="colorThemeSelect" 
                onChange={this.changeColorTheme}
                class="theme-select"
              >
                <option value="brand">Brand Monochromatic</option>
                <option value="rainbow">Rainbow</option>
                <option value="blue">Blue Monochromatic</option>
                <option value="grayscale">Grayscale</option>
                <option value="rainbow-alt">Alternative Rainbow</option>
              </select>
            </div>
          </div>
          <div class="filter-info">
            {this.activeFilter ? (
              <div class="active-filter">
                <span>Active Filter: {this.activeFilter.value}</span>
                <button onClick={this.clearFilter}>Clear Filter</button>
              </div>
            ) : (
              <p>Click on chart elements to filter data across charts</p>
            )}
          </div>
        </header>
        
        <div class="reportviewer-container" id="flarelight-report-container" height-mode={this.heightMode}>
          <report-viewer
            ref={this.setReportViewerRef}
            reportId="visualization-showcase"
            configuration={this.demoConfiguration}
            showPlaceholder={true}
            fetchChartData={this.fetchChartData}
            height-mode={this.heightMode}
          ></report-viewer>
        </div>
      </div>
    );
  }
} 