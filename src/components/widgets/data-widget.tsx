import { Component, Prop, h, Host, State, Watch, Element, Listen } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './visualizations/base-visualization';
import { Filter } from '../../api/types/common';

// Add debug flag at the top
const DEBUG_MODE = false; // Set to true to enable verbose logging

// Base configuration interface with only truly common properties
interface BaseDataWidgetConfig {
  sourceId?: string;
  sourceName?: string;
  visualizationType?: 'table' | 'bar' | 'line' | 'pie' | 'donut' | 'hbar' | 'scatter' | 'sunburst' | 'heatmap' | 'bubble' | 'kpi' | 'histogram' | 'stacked-bar' | 'stacked-hbar' | 'clustered-bar' | 'clustered-hbar' | 'lollipop' | 'lollipop-h' | 'box-whisker'; // This is the discriminator - must be present
  hideTitle?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

// Box-whisker chart specific configuration
export interface BoxWhiskerChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'box-whisker';
  groupByField: string;
  valueField: string;
  outlierMethod?: 'iqr' | 'standard-deviation';
  whiskerMultiplier?: number;
  showOutliers?: boolean;
  minDataPoints?: number;
  boxWidth?: number;
}

// Scatter chart specific configuration
export interface ScatterChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'scatter';
  xField: string;
  yField: string;
  regressionType?: 'linear' | 'polynomial' | 'exponential';
  pointSize?: number;
  pointOpacity?: number;
}

// Heatmap specific configuration
export interface HeatmapConfig extends BaseDataWidgetConfig {
  visualizationType: 'heatmap';
  xField: string;
  yField: string;
  valueField: string;
  colorScale?: string[];
  colorScaleType?: 'sequential' | 'diverging' | 'categorical';
  showValues?: boolean;
  valueFormat?: 'number' | 'percentage' | 'currency';
}

// Bubble chart specific configuration
export interface BubbleChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'bubble';
  xField: string;
  yField: string;
  sizeField: string;
  minBubbleSize?: number;
  maxBubbleSize?: number;
  bubbleOpacity?: number;
}

// KPI specific configuration
export interface KpiConfig extends BaseDataWidgetConfig {
  visualizationType: 'kpi';
  valueField: string;
  formatType?: 'number' | 'currency' | 'percentage';
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
  showTrend?: boolean;
  trendField?: string;
  trendPeriod?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  colorThresholds?: Array<{
    value: number;
    color: string;
    operator: '<' | '<=' | '>' | '>=' | '=';
  }>;
}

// Table specific configuration
export interface TableConfig extends BaseDataWidgetConfig {
  visualizationType: 'table';
  fields?: string[];
  columns?: Array<{ field: string; header: string }>;
}

// Bar chart specific configuration
export interface BarChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'bar';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Line chart specific configuration
export interface LineChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'line';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Pie chart specific configuration
export interface PieChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'pie';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Donut chart specific configuration
export interface DonutChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'donut';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Horizontal bar chart specific configuration
export interface HBarChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'hbar';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Sunburst chart specific configuration
export interface SunburstChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'sunburst';
  idField?: string;
  parentIdField?: string;
  valueField?: string;
  labelField?: string;
  equalSegments?: boolean;
  fields?: string[];
}

// Histogram specific configuration
export interface HistogramConfig extends BaseDataWidgetConfig {
  visualizationType: 'histogram';
  valueField: string;
  groupByField?: string;
  fields?: string[];
}

// Stacked bar chart specific configuration
export interface StackedBarChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'stacked-bar';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Stacked horizontal bar chart specific configuration
export interface StackedHBarChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'stacked-hbar';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Clustered bar chart specific configuration
export interface ClusteredBarChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'clustered-bar';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Clustered horizontal bar chart specific configuration
export interface ClusteredHBarChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'clustered-hbar';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Lollipop chart specific configuration
export interface LollipopChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'lollipop';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Horizontal lollipop chart specific configuration
export interface LollipopHChartConfig extends BaseDataWidgetConfig {
  visualizationType: 'lollipop-h';
  groupByField?: string;
  valueField?: string;
  labelField?: string;
  aggregation?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  fields?: string[];
}

// Union type for all data widget configurations
export type DataWidgetConfig = 
  | TableConfig
  | BarChartConfig
  | LineChartConfig
  | PieChartConfig
  | DonutChartConfig
  | HBarChartConfig
  | ScatterChartConfig
  | SunburstChartConfig
  | HeatmapConfig
  | BubbleChartConfig
  | KpiConfig
  | HistogramConfig
  | StackedBarChartConfig
  | StackedHBarChartConfig
  | ClusteredBarChartConfig
  | ClusteredHBarChartConfig
  | LollipopChartConfig
  | LollipopHChartConfig
  | BoxWhiskerChartConfig;

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
  @Prop() data: any[] = [];
  
  @State() loading: boolean = false;
  @State() internalData: any[] = [];
  @State() error: string = '';
  
  private timeoutId: any = null;
  private isMounted: boolean = false;
  private lastFetchTimestamp: number = 0; // Track last fetch time
  private fetchInProgress: boolean = false; // Prevent duplicate fetches
  
  // Watch for changes to the data prop
  @Watch('data')
  dataChanged(newValue: any[]) {
    if (newValue && newValue.length > 0) {
      this.internalData = [...newValue];
      this.loading = false;
    }
  }
  
  // Add method to refresh data on demand
  public refreshData() {
    if (DEBUG_MODE) console.log('refreshData called for widget', this.widgetId);
    // Reset any cache flags
    this.lastFetchTimestamp = 0;
    this.fetchInProgress = false;
    // Force refetch data
    this.fetchDataFromSource(true);
  }
  
  connectedCallback() {
    this.isMounted = true;
    
    // Setup listener for direct data updates via events
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (DEBUG_MODE) console.log('dataUpdate event received', event.detail);
      if (event.detail) {
        this.internalData = [...event.detail];
        this.loading = false;
      } else {
        // If detail is null, it means we should refetch the data
        if (DEBUG_MODE) console.log('Null data update event - refetching data');
        this.fetchDataFromSource(true); // Force refresh
      }
    });
    
    // Add listeners for filter clearing and application
    window.addEventListener('filters-cleared', () => {
      if (DEBUG_MODE) console.log('filters-cleared event received for widget', this.widgetId);
      this.refreshData();
    });
    
    window.addEventListener('filters-applied', () => {
      if (DEBUG_MODE) console.log('filters-applied event received for widget', this.widgetId);
      this.refreshData();
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
    
    // Clean up all event listeners
    this.el.removeEventListener('dataUpdate', null);
    window.removeEventListener('filters-cleared', null);
    window.removeEventListener('filters-applied', null);
  }
  
  @Watch('config')
  configChanged() {
    if (DEBUG_MODE) console.log('Config changed for widget', this.widgetId);
    this.fetchDataFromSource();
  }
  
  @Watch('activeFilters')
  activeFiltersChanged() {
    if (DEBUG_MODE) console.log('Active filters changed for widget', this.widgetId, this.activeFilters);
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
    
    this.el.dispatchEvent(event);
  }
  
  private async fetchDataFromSource(forceRefresh: boolean = false) {
    if (DEBUG_MODE) console.log('fetchDataFromSource called for widget', this.widgetId, forceRefresh ? '(forced)' : '');
    
    // Throttle fetch calls and prevent concurrent fetches
    const now = Date.now();
    if (!forceRefresh && now - this.lastFetchTimestamp < 300) {
      if (DEBUG_MODE) console.log('Throttling fetch - too soon after last fetch');
      return;
    }
    
    if (!forceRefresh && this.fetchInProgress) {
      if (DEBUG_MODE) console.log('Fetch already in progress, skipping duplicate request');
      return;
    }
    
    this.lastFetchTimestamp = now;
    this.fetchInProgress = true;
    
    const { sourceId, visualizationType } = this.config;
    
    // Safely extract properties that may not exist on all config types
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const labelField = 'labelField' in this.config ? this.config.labelField : undefined;
    const aggregation = 'aggregation' in this.config ? this.config.aggregation : undefined;
    const fields = 'fields' in this.config ? this.config.fields : undefined;
    
    // Skip if necessary conditions aren't met
    if (!sourceId || !this.isMounted) {
      this.loading = false;
      this.fetchInProgress = false;
      return;
    }
    
    // Find the source by id
    const source = this.availableSources.find(s => s.id === sourceId);
    if (!source) {
      this.error = 'Data source not found';
      this.loading = false;
      this.fetchInProgress = false;
      return;
    }
    
    // Set loading state
    this.loading = true;
    
    try {
      // Get filters for this source
      const sourceFilters = this.activeFilters.filter(f => f.sourceId === sourceId);
      if (DEBUG_MODE) console.log('Fetching data with filters:', sourceFilters);
      
      // Create a cache key for this specific request
      const filterKey = sourceFilters.length > 0 ? 
        JSON.stringify(sourceFilters.map(f => `${f.field}:${f.value}`).sort()) : 
        'nofilters';
      
      // Create chart data request with timestamp to bust cache
      const request: any = {
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
        widgetType: visualizationType,
        widgetId: this.widgetId,
        _cacheKey: `${sourceId}:${filterKey}:${this.widgetId}`,
        _timestamp: now
      };

      // Handle value fields based on visualization type
      if (visualizationType === 'stacked-bar' || 
          visualizationType === 'stacked-hbar' ||
          visualizationType === 'clustered-bar' || 
          visualizationType === 'clustered-hbar') {
        // For multi-series charts, use multiple value fields
        if (fields && fields.length > 0) {
          request.valueFields = fields.map(field => ({
            fieldName: field,
            aggregation: aggregation === 'none' ? undefined : aggregation
          }));
        }
      } else {
        // For standard charts, use single value field
        if (valueField) {
          request.valueFields = [{
            fieldName: valueField,
            aggregation: aggregation === 'none' ? undefined : aggregation
          }];
        }
      }
      
      // Fetch the data
      if (typeof this.fetchChartData === 'function') {
        const response = await this.fetchChartData(request);
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
    } finally {
      this.fetchInProgress = false;
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
      
      case 'box-whisker':
        return (
          <box-whisker-chart-visualization 
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