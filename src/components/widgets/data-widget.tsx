import { Component, Prop, h, Host, State, Watch, Element, Listen } from '@stencil/core';
import { ChartDataRequest, Filter } from '../../api/types/common';
import { FilterChangeEventDetail, VisualizationData } from './visualizations/base-visualization';

export interface DataWidgetConfig {
  sourceId?: string;
  sourceName?: string;
  visualizationType?: 'table' | 'bar' | 'line' | 'pie' | 'donut' | 'hbar' | 'scatter' | 'sunburst' | 'heatmap' | 'bubble' | 'kpi' | 'histogram' | 'stacked-bar' | 'stacked-hbar' | 'clustered-bar' | 'clustered-hbar' | 'lollipop' | 'lollipop-h';
  fields?: string[];
  hideTitle?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showRegressionLine?: boolean;
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  kpiFormatType?: 'number' | 'currency' | 'percentage';
  kpiPrefix?: string;
  kpiSuffix?: string;
  idField?: string;
  parentIdField?: string;
  equalSegments?: boolean;
  columns?: Array<{ field: string; header: string }>;
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
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: DataWidgetConfig = {
    visualizationType: 'table'
  };
  @Prop() availableSources: any[] = [];
  @Prop() activeFilters: Filter[] = [];
  @Prop() fetchChartData: Function;
  @Prop() onFilterChange: Function;
  @Prop() data: any[] = [];
  
  @State() loading: boolean = false;
  @State() internalData: any[] = [];
  @State() error: string = '';
  
  private timeoutId: any = null;
  private isMounted: boolean = false;
  
  // Watch for changes to the data prop
  @Watch('data')
  dataChanged(newValue: any[]) {
    if (newValue && newValue.length > 0) {
      this.internalData = [...newValue];
      this.loading = false;
    }
  }
  
  connectedCallback() {
    this.isMounted = true;
    
    // Setup listener for direct data updates via events
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.internalData = [...event.detail];
        this.loading = false;
      }
    });
    
    // If we already have data from props, use it
    if (this.data && this.data.length > 0) {
      this.internalData = [...this.data];
      this.loading = false;
    } else {
      // Otherwise fetch data if needed
      this.fetchDataFromSource();
    }
  }
  
  disconnectedCallback() {
    this.isMounted = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Remove event listener
    this.el.removeEventListener('dataUpdate', null);
  }
  
  @Watch('config')
  @Watch('activeFilters')
  configChanged() {
    this.fetchDataFromSource();
  }
  
  @Listen('filterChange')
  handleFilterChangeEvent(event: CustomEvent<FilterChangeEventDetail>) {
    const { sourceId, field, value } = event.detail;
    if(this.onFilterChange) {
      this.onFilterChange(sourceId, field, value);
    }
    else{
      this.triggerFilterChange(sourceId, field, value);
    }
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
    
    this.el.dispatchEvent(event);
  }
  
  private async fetchDataFromSource() {
    const { sourceId, visualizationType, valueField, groupByField, labelField, aggregation, fields } = this.config;
    
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
        reportId: this.reportId,
        sourceId: sourceId,
        sourceType: source.type as 'DataImport' | 'DataPreparation' | 'AnalysisResult',
        valueFields: [],
        groupByFields: groupByField ? [{ fieldName: groupByField }] : [],
        labelFields: labelField ? [{ fieldName: labelField }] : [],
        filters: sourceFilters.map(filter => ({
          fieldName: filter.field,
          operation: 'eq',
          value: filter.value
        })),
        isViewer: this.isViewer,
        widgetType: visualizationType
      };

      // Handle value fields based on visualization type
      if (visualizationType === 'stacked-bar' || 
          visualizationType === 'stacked-hbar' ||
          visualizationType === 'clustered-bar' || 
          visualizationType === 'clustered-hbar') {
        // For multi-series charts, use multiple value fields
        if (fields && fields.length > 0) {
          chartDataRequest.valueFields = fields.map(field => ({
            fieldName: field,
            aggregation: aggregation === 'none' ? undefined : aggregation
          }));
        }
      } else {
        // For standard charts, use single value field
        if (valueField) {
          chartDataRequest.valueFields = [{
            fieldName: valueField,
            aggregation: aggregation === 'none' ? undefined : aggregation
          }];
        }
      }
      
      // Fetch the data
      if (typeof this.fetchChartData === 'function') {
        const response = await this.fetchChartData(chartDataRequest);
        if (this.isMounted) {
          // Process response
          const responseData = response || [];
          
          // Update state with the data
          this.internalData = responseData;
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
      rawData: this.internalData.length > 0 ? this.internalData : this.data,
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
      
      case 'stacked-bar':
      case 'stacked-hbar':
        return (
          <stacked-bar-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'clustered-bar':
      case 'clustered-hbar':
        return (
          <clustered-bar-chart-visualization 
            config={this.config} 
            data={visualizationData}
          />
        );
      
      case 'lollipop':
      case 'lollipop-h':
        return (
          <lollipop-chart-visualization 
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