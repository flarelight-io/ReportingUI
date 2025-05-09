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
      // Basic Charts
      {
        id: 'bar-chart',
        type: 'data',
        title: 'Bar Chart',
        x: 0,
        y: 1,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'bar',
          groupByField: 'category',
          valueField: 'value',
          showGrid: true,
          showLegend: true
        }
      },
      {
        id: 'line-chart',
        type: 'data',
        title: 'Line Chart',
        x: 4,
        y: 1,
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
        id: 'pie-chart',
        type: 'data',
        title: 'Pie Chart',
        x: 8,
        y: 1,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-categorical',
          visualizationType: 'pie',
          groupByField: 'category',
          valueField: 'value',
          showLegend: true
        }
      },
      // Complex Charts - Row 1
      {
        id: 'donut-chart',
        type: 'data',
        title: 'Donut Chart',
        x: 0,
        y: 4,
        w: 4,
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
        id: 'scatter-chart',
        type: 'data',
        title: 'Scatter Chart',
        x: 4,
        y: 4,
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
        id: 'histogram-chart',
        type: 'data',
        title: 'Histogram',
        x: 8,
        y: 4,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-histogram',
          visualizationType: 'histogram',
          groupByField: 'bin',
          valueField: 'frequency',
          showGrid: true
        }
      },
      // Complex Charts - Row 2
      {
        id: 'heatmap',
        type: 'data',
        title: 'Heatmap',
        x: 0,
        y: 7,
        w: 4,
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
      {
        id: 'sunburst-chart',
        type: 'data',
        title: 'Sunburst Chart',
        x: 4,
        y: 7,
        w: 4,
        h: 3,
        config: {
          sourceId: 'sample-hierarchy',
          visualizationType: 'sunburst',
          valueField: 'value',
          idField: 'id',
          parentIdField: 'parentId',
          groupByField: 'name',
          showLegend: true
        }
      },
      {
        id: 'bubble-chart',
        type: 'data',
        title: 'Bubble Chart',
        x: 8,
        y: 7,
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
        x: 0,
        y: 10,
        w: 6,
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
        x: 6,
        y: 10,
        w: 6,
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
      }
    ]
  };

  private fetchChartData = async (request) => {
    console.log('Chart data request:', request);
    
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
          { id: '1', parentId: null, name: 'Root', value: 100 },
          { id: '2', parentId: '1', name: 'Branch A', value: 60 },
          { id: '3', parentId: '1', name: 'Branch B', value: 40 },
          { id: '4', parentId: '2', name: 'Leaf A1', value: 30 },
          { id: '5', parentId: '2', name: 'Leaf A2', value: 30 },
          { id: '6', parentId: '3', name: 'Leaf B1', value: 25 },
          { id: '7', parentId: '3', name: 'Leaf B2', value: 15 }
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