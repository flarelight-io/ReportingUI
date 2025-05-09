import { Component, Prop, h, Host, State, Watch, Element, Listen } from '@stencil/core';
import { ChartDataRequest, Filter } from '../../api/types/common';
import { FilterChangeEventDetail, VisualizationData } from './visualizations/base-visualization';

export interface DataWidgetConfig {
  sourceId?: string;
  sourceName?: string;
  visualizationType?: 'table' | 'bar' | 'line' | 'pie' | 'donut' | 'hbar' | 'scatter' | 'sunburst' | 'heatmap' | 'bubble' | 'kpi' | 'histogram';
  fields?: string[];
  hideTitle?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showRegressionLine?: boolean;
  groupByField?: string;
  valueField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  kpiFormatType?: 'number' | 'currency' | 'percentage';
  kpiPrefix?: string;
  kpiSuffix?: string;
  idField?: string;
  parentIdField?: string;
  equalSegments?: boolean;
  columns?: Array<{ field: string; header: string }>;
}

interface DataItem {
  [key: string]: any;
}

@Component({
  tag: 'data-widget',
  styleUrl: 'data-widget.scss',
  shadow: true
})
export class DataWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = true;
  @Prop() isViewer: boolean = false;
  @Prop() config: DataWidgetConfig = {
    visualizationType: 'table'
  };
  @Prop() availableSources: any[] = [];
  @Prop() activeFilters: Filter[] = [];
  @Prop() fetchChartData: Function;
  
  @State() loading: boolean = false;
  @State() data: DataItem[] = [];
  @State() error: string = '';
  
  private timeoutId: any = null;
  private isMounted: boolean = false;
  
  connectedCallback() {
    this.isMounted = true;
    this.fetchDataFromSource();
  }
  
  disconnectedCallback() {
    this.isMounted = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
  
  @Watch('config')
  @Watch('activeFilters')
  configChanged() {
    this.fetchDataFromSource();
  }
  
  @Listen('filterChange')
  handleFilterChangeEvent(event: CustomEvent<FilterChangeEventDetail>) {
    const { sourceId, field, value } = event.detail;
    this.triggerFilterChange(sourceId, field, value);
  }
  
  private triggerFilterChange(sourceId: string, field: string, value: any) {
    // Make sure we're using the correct event format
    const event = new CustomEvent('filter-change', {
      detail: { 
        sourceId, 
        field, 
        value 
      },
      bubbles: true,
      composed: true
    });
    
    console.log(`Dispatching filter-change event: source=${sourceId}, field=${field}, value=${value}`);
    this.el.dispatchEvent(event);
  }
  
  private async fetchDataFromSource() {
    const { sourceId, visualizationType, valueField, groupByField } = this.config;
    
    // Skip if necessary conditions aren't met
    if (!sourceId || !this.isMounted) {
      this.loading = false;
      return;
    }
    
    // Find the source by id
    const source = this.availableSources.find(s => s.id === sourceId);
    if (!source) {
      this.error = 'Data source not found';
      this.loading = false;
      return;
    }
    
    // Set loading state
    this.loading = true;
    
    try {
      // Get filters for this source
      const sourceFilters = this.activeFilters.filter(f => f.sourceId === sourceId);
      
      // Create chart data request
      const chartDataRequest: ChartDataRequest = {
        reportId: this.reportId || "",
        widgetId: this.widgetId,
        sourceId: sourceId,
        chartType: visualizationType || 'table',
        dimensions: groupByField ? [groupByField] : [],
        measures: valueField ? [valueField] : [],
        filters: sourceFilters.map(filter => ({
          field: filter.field,
          operator: 'eq',
          value: filter.value
        })),
        options: {
          ...this.config,
          widgetType: visualizationType
        }
      };
      
      // Fetch the data
      if (typeof this.fetchChartData === 'function') {
        const response = await this.fetchChartData(chartDataRequest);
        if (this.isMounted) {
          // Process response
          const responseData = response || [];
          
          // Update state with the data
          this.data = responseData;
          this.loading = false;
        }
      } else {
        this.error = 'fetchChartData function not provided';
        this.loading = false;
      }
    } catch (error) {
      if (this.isMounted) {
        console.error('Error fetching data:', error);
        this.error = 'Error loading data';
        this.loading = false;
      }
    }
  }
  
  private renderVisualization() {
    const visualizationData: VisualizationData = {
      rawData: this.data,
      loading: this.loading,
      error: this.error
    };
    
    const visualizationType = this.config.visualizationType || 'table';
    
    switch (visualizationType) {
      case 'table':
        return (
          <table-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
        
      case 'bar':
      case 'hbar':
        return (
          <bar-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'line':
        return (
          <line-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'pie':
      case 'donut':
        return (
          <pie-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'kpi':
        return (
          <kpi-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'scatter':
        return (
          <scatter-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
        
      case 'histogram':
        return (
          <histogram-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
        
      case 'heatmap':
        return (
          <heatmap-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'sunburst':
        return (
          <sunburst-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'bubble':
        return (
          <bubble-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      // For visualization types that haven't been implemented yet
      default:
        return (
          <div class="placeholder-widget">
            <h3>Visualization: {visualizationType}</h3>
            <p>This visualization type is not yet implemented.</p>
          </div>
        );
    }
  }
  
  render() {
    return (
      <Host>
        <base-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="data-widget-container">
            {this.renderVisualization()}
          </div>
        </base-widget>
      </Host>
    );
  }
} 