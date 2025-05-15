import { Component, h, State } from '@stencil/core';

@Component({
  tag: 'report-demo',
  styleUrl: 'report-demo.scss',
  shadow: true
})
export class ReportDemo {
  @State() demoConfiguration = {
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
          showLegend: true
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
          showRegressionLine: true
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
      
      // Section Title: Multi-Series Charts
      {
        id: 'multi-series-charts',
        type: 'text',
        title: '',
        x: 0,
        y: 8,
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
        y: 9,
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
        y: 9,
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
        y: 9,
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
        y: 9,
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
        y: 12,
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
        y: 13,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'lollipop',
          groupByField: 'category',
          valueField: 'value',
          showGrid: false,
          showLabels: true
        }
      },
      {
        id: 'lollipop-h-chart',
        type: 'data',
        title: 'Horizontal Lollipop Chart',
        x: 3,
        y: 13,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'lollipop-h',
          groupByField: 'category',
          valueField: 'value',
          showGrid: false,
          showLabels: true
        }
      },
      {
        id: 'histogram-chart',
        type: 'data',
        title: 'Histogram',
        x: 6,
        y: 13,
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
        y: 13,
        w: 3,
        h: 3,
        config: {
          sourceId: 'sample-heatmap',
          visualizationType: 'heatmap',
          showLabels: true,
          groupByField: 'y',
          valueField: 'value',
          fields: ['x']
        }
      },
      
      // Statistical Charts
      {
        id: 'stats-section',
        type: 'text',
        title: '',
        x: 0,
        y: 16,
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
        y: 17,
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
        y: 17,
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
        y: 20,
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
        y: 20,
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
        y: 20,
        w: 4,
        h: 3,
        config: {
          analysisId: 'sample-correlation',
          analysisName: 'Sample Correlation Analysis',
          showLabels: true
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
        id: 'sample-box-whisker',
        name: 'Statistical Distribution Data',
        type: 'mock',
        fields: [
          { name: 'group', displayName: 'Group', type: 'string' },
          { name: 'value', displayName: 'Value', type: 'number' }
        ]
      }
    ]
  };

  private fetchChartData = async (request) => {    
    // Mock data based on the source ID or chart type
    switch (request.sourceId) {
      case 'sample-categorical':
        return [
          { category: 'Category A', value: 42 },
          { category: 'Category B', value: 28 },
          { category: 'Category C', value: 35 },
          { category: 'Category D', value: 49 },
          { category: 'Category E', value: 22 }
        ];
        
      case 'sample-time-series':
        return [
          { date: '2023-01-01', value: 10 },
          { date: '2023-02-01', value: 25 },
          { date: '2023-03-01', value: 15 },
          { date: '2023-04-01', value: 30 },
          { date: '2023-05-01', value: 18 },
          { date: '2023-06-01', value: 40 }
        ];
        
      case 'sample-scatter':
        return [
          { x: 10, y: 8 },
          { x: 15, y: 12 },
          { x: 20, y: 18 },
          { x: 25, y: 20 },
          { x: 30, y: 25 },
          { x: 35, y: 29 },
          { x: 40, y: 33 },
          { x: 45, y: 36 },
          { x: 50, y: 42 }
        ];
        
      case 'sample-histogram':
        return [
          { bin: '0-10', frequency: 5 },
          { bin: '10-20', frequency: 12 },
          { bin: '20-30', frequency: 25 },
          { bin: '30-40', frequency: 18 },
          { bin: '40-50', frequency: 10 },
          { bin: '50-60', frequency: 3 }
        ];
        
      case 'sample-heatmap':
        return [
          { x: 'A', y: '1', value: 10 },
          { x: 'A', y: '2', value: 25 },
          { x: 'A', y: '3', value: 5 },
          { x: 'B', y: '1', value: 15 },
          { x: 'B', y: '2', value: 30 },
          { x: 'B', y: '3', value: 12 },
          { x: 'C', y: '1', value: 8 },
          { x: 'C', y: '2', value: 20 },
          { x: 'C', y: '3', value: 35 }
        ];
        
      case 'sample-hierarchy':
        return [
          { id: '1', parentId: null, name: 'Root', displayName: 'Main Root', value: 100 },
          { id: '2', parentId: '1', name: 'Branch A', displayName: 'Branch Alpha', value: 60 },
          { id: '3', parentId: '1', name: 'Branch B', displayName: 'Branch Beta', value: 40 },
          { id: '4', parentId: '2', name: 'Leaf A1', displayName: 'Leaf A-1', value: 30 },
          { id: '5', parentId: '2', name: 'Leaf A2', displayName: 'Leaf A-2', value: 30 },
          { id: '6', parentId: '3', name: 'Leaf B1', displayName: 'Leaf B-1', value: 25 },
          { id: '7', parentId: '3', name: 'Leaf B2', displayName: 'Leaf B-2', value: 15 }
        ];
        
      case 'sample-bubble':
        return [
          { x: 10, y: 20, size: 15, category: 'Group 1' },
          { x: 25, y: 35, size: 25, category: 'Group 1' },
          { x: 40, y: 15, size: 10, category: 'Group 1' },
          { x: 30, y: 40, size: 30, category: 'Group 2' },
          { x: 15, y: 30, size: 20, category: 'Group 2' },
          { x: 35, y: 25, size: 15, category: 'Group 3' },
          { x: 20, y: 10, size: 25, category: 'Group 3' }
        ];
        
      case 'sample-multi-series':
        return [
          { category: 'Category A', series1: 30, series2: 40, series3: 20 },
          { category: 'Category B', series1: 20, series2: 30, series3: 35 },
          { category: 'Category C', series1: 40, series2: 25, series3: 30 },
          { category: 'Category D', series1: 35, series2: 20, series3: 25 }
        ];
      
      case 'sample-kpi':
        return [
          { value: 1250000 }
        ];
        
      case 'sample-box-whisker':
        // Generate data with different statistical distributions for each group
        const result = [];
        
        // Group A: Normal distribution around 50
        for (let i = 0; i < 30; i++) {
          result.push({ group: 'Group A', value: 50 + (Math.random() + Math.random() + Math.random() - 1.5) * 15 });
        }
        
        // Group B: Normal distribution around 70 with wider spread
        for (let i = 0; i < 30; i++) {
          result.push({ group: 'Group B', value: 70 + (Math.random() + Math.random() + Math.random() - 1.5) * 25 });
        }
        
        // Group C: Skewed right distribution
        for (let i = 0; i < 30; i++) {
          result.push({ group: 'Group C', value: 40 + Math.pow(Math.random(), 2) * 60 });
        }
        
        // Group D: Bimodal distribution
        for (let i = 0; i < 15; i++) {
          result.push({ group: 'Group D', value: 30 + Math.random() * 15 });
        }
        for (let i = 0; i < 15; i++) {
          result.push({ group: 'Group D', value: 70 + Math.random() * 15 });
        }
        
        return result;
      
      case 'sample-descriptive':
        return [
          { Statistic: 'Count', Value: 100 },
          { Statistic: 'Mean', Value: 35.42 },
          { Statistic: 'Median', Value: 33.5 },
          { Statistic: 'Mode', Value: 32 },
          { Statistic: 'Std Dev', Value: 12.65 },
          { Statistic: 'Min', Value: 10 },
          { Statistic: 'Max', Value: 75 },
          { Statistic: 'Range', Value: 65 }
        ];
        
      case 'sample-correlation':
        if (request.widgetType === 'correlationAnalysis') {
          // Return correlation matrix
          return [
            { Name: 'Variable A', 'Variable A': 1.00, 'Variable B': 0.72, 'Variable C': -0.35, 'Variable D': 0.18 },
            { Name: 'Variable B', 'Variable A': 0.72, 'Variable B': 1.00, 'Variable C': -0.28, 'Variable D': 0.25 },
            { Name: 'Variable C', 'Variable A': -0.35, 'Variable B': -0.28, 'Variable C': 1.00, 'Variable D': -0.56 },
            { Name: 'Variable D', 'Variable A': 0.18, 'Variable B': 0.25, 'Variable C': -0.56, 'Variable D': 1.00 }
          ];
        }
        break;
      
      default:
        console.warn(`No mock data available for source: ${request.sourceId}`);
        return [];
    }
    
    return [];
  };

  render() {
    return (
      <div class="demo-container">
        <header class="demo-header">
          <h1>Flarelight Reporting Visualization Demo</h1>
          <p>A comprehensive showcase of all available chart types and visualizations</p>
        </header>
        
        <div class="report-container">
          <flare-report-viewer
            reportId="visualization-showcase"
            configuration={this.demoConfiguration}
            showPlaceholder={true}
            fetchChartData={this.fetchChartData}
          ></flare-report-viewer>
        </div>
      </div>
    );
  }
} 