import { Component, Prop, h, State, Watch, Element, Listen } from '@stencil/core';
import { DataSource, Filter, ChartDataRequest } from '../../api/types/common';
import { WidgetData } from '../widgets/base-widget';

interface WidgetDataCache {
  [widgetId: string]: any;
}

@Component({
  tag: 'flare-report-viewer',
  styleUrl: 'flare-report-viewer.scss',
  shadow: false
})
export class FlareReportViewer {
  @Element() el!: HTMLElement;
  
  @Prop() reportId: string;
  @Prop() configuration: any;
  @Prop() showPlaceholder: boolean = true;
  @Prop() isViewer: boolean = false;
  @Prop() isFullscreen: boolean = false;
  @Prop() fetchChartData: Function;
  
  @State() widgets: WidgetData[] = [];
  @State() dataSources: DataSource[] = [];
  @State() activeFilters: Filter[] = [];
  @State() widgetData: WidgetDataCache = {};
  
  private gridContainer?: HTMLElement;
  private dataFetchPromises: { [widgetId: string]: Promise<any> } = {};
  private isMounted: boolean = false;
  
  @Watch('configuration')
  onConfigurationChange() {
    console.log('Configuration changed:', this.configuration);
    if (this.configuration) {
      this.parseConfiguration(this.configuration);
      // Reset widget data cache when configuration changes
      this.widgetData = {};
      // Rerender widgets when configuration changes
      this.renderWidgets();
    }
  }
  
  connectedCallback() {
    console.log('FlareReportViewer connected, config:', this.configuration);
    if (this.configuration) {
      this.parseConfiguration(this.configuration);
    }
  }
  
  componentDidLoad() {
    console.log('FlareReportViewer did load, initializing widgets');
    this.isMounted = true;
    // Get the grid container element
    this.gridContainer = this.el.querySelector('.widget-grid');
    
    if (this.gridContainer) {
      // If we already have widget data pre-fetched, render widgets
      if (Object.keys(this.widgetData).length > 0) {
        this.renderWidgets();
      } else if (this.widgets.length > 0 && this.fetchChartData) {
        // If no data yet but widgets exist, fetch data first
        this.prefetchWidgetData().then(() => {
          if (this.isMounted) {
            this.renderWidgets();
          }
        });
      } else {
        // Otherwise just render widgets (will show empty/loading state)
        this.renderWidgets();
      }
    } else {
      console.error('Could not find grid container element');
    }
  }
  
  disconnectedCallback() {
    this.isMounted = false;
  }
  
  private parseConfiguration(config: any) {
    console.log('Parsing configuration', config);
    // Parse widgets and data sources
    if (config.widgets && Array.isArray(config.widgets)) {
      this.widgets = config.widgets;
      console.log('Found widgets:', this.widgets.length);
    } else {
      console.warn('No widgets found in configuration');
      this.widgets = [];
    }
    
    if (config.sources && Array.isArray(config.sources)) {
      this.dataSources = config.sources;
      console.log('Found data sources:', this.dataSources.length);
    } else {
      console.warn('No data sources found in configuration');
      this.dataSources = [];
    }
    
    // Pre-fetch data for all widgets
    if (this.widgets.length > 0 && this.fetchChartData) {
      this.prefetchWidgetData();
    }
  }
  
  private async prefetchWidgetData() {
    console.log("Pre-fetching data for all widgets");
    
    // Create fetch promises for each widget that needs data
    this.widgets.forEach(widget => {
      if (this.needsFetchChartData(widget.type)) {
        const sourceId = widget.config?.sourceId;
        if (!sourceId) return;
        
        const source = this.dataSources.find(s => s.id === sourceId);
        if (!source) return;
        
        // Create the data fetch promise
        this.dataFetchPromises[widget.id] = this.fetchDataForWidget(widget, source);
      }
    });
    
    // Wait for all fetch promises to resolve
    await Promise.all(Object.values(this.dataFetchPromises));
    console.log("All widget data pre-fetched", this.widgetData);
  }
  
  private async fetchDataForWidget(widget: WidgetData, source: DataSource): Promise<any> {
    if (!this.fetchChartData) {
      console.error("fetchChartData function not available");
      return null;
    }
    
    try {
      console.log(`Fetching data for widget ${widget.id} (${widget.type})`);
      
      const sourceId = widget.config?.sourceId as string;
      const valueField = widget.config?.valueField as string;
      const groupByField = widget.config?.groupByField as string;
      const rawAggregation = widget.config?.aggregation as string;
      
      // Get relevant filters for this source
      const sourceFilters = this.activeFilters.filter(f => f.sourceId === sourceId);
      
      // Determine visualization type
      const visualizationType = widget.type === 'data'
        ? (widget.config?.visualizationType as string || 'table')
        : widget.type;
      
      // Create chart data request
      const chartDataRequest: ChartDataRequest = {
        reportId: this.reportId,
        sourceId: sourceId,
        sourceType: source.type as 'DataImport' | 'DataPreparation' | 'AnalysisResult',
        valueFields: valueField ? [
          {
            fieldName: valueField,
            aggregation: (!rawAggregation || rawAggregation === 'none') 
              ? undefined 
              : rawAggregation as "sum" | "avg" | "min" | "max" | "count" | "countDistinct" | "stdDev" | "stdDevPop"
          }
        ] : [],
        groupByFields: groupByField ? [{ fieldName: groupByField }] : [],
        labelFields: [],
        filters: sourceFilters.map(filter => ({
          fieldName: filter.field,
          operation: 'eq',
          value: filter.value
        })),
        isViewer: this.isViewer,
        widgetType: visualizationType
      };
      
      console.log(`Chart data request for ${widget.id}:`, chartDataRequest);
      
      // Fetch the data
      const response = await this.fetchChartData(chartDataRequest);
      console.log(`Data received for ${widget.id}:`, response);
      
      // Store in widget data cache
      this.widgetData = {
        ...this.widgetData,
        [widget.id]: response || []
      };
      
      return response;
    } catch (error) {
      console.error(`Error fetching data for widget ${widget.id}:`, error);
      return null;
    }
  }
  
  private needsFetchChartData(widgetType: string): boolean {
    return ['data', 'table', 'kpi', 'bar', 'pie', 'donut', 'line', 'hbar', 
            'scatter', 'sunburst', 'heatmap', 'bubble', 'histogram',
            'descriptiveAnalysis', 'correlationAnalysis'].includes(widgetType);
  }
  
  private renderWidgets() {
    if (!this.gridContainer) {
      console.error('Grid container not found, cannot render widgets');
      return;
    }
    
    if (!this.isMounted) {
      console.log('Component not mounted yet, will render later');
      return;
    }
    
    console.log('Rendering widgets:', this.widgets.length);
    
    // Clear existing content
    this.gridContainer.innerHTML = '';
    
    // No widgets? Show placeholder if needed
    if (!this.widgets || this.widgets.length === 0) {
      console.log('No widgets to display, showing placeholder:', this.showPlaceholder);
      if (this.showPlaceholder) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'empty-report';
        emptyElement.innerHTML = '<p>No widgets in this report</p>';
        this.gridContainer.appendChild(emptyElement);
      }
      return;
    }
    
    // Create all widget elements
    this.widgets.forEach((widget, index) => {
      console.log(`Creating widget ${index + 1}/${this.widgets.length}: ${widget.type} (${widget.id})`);
      
      // Create the widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'widget-item';
      widgetContainer.setAttribute('data-id', widget.id);
      
      // Position the widget using grid properties
      widgetContainer.style.gridColumn = `span ${widget.w || 6}`;
      widgetContainer.style.gridRow = `span ${widget.h || 4}`;
      
      // Create the widget element
      const widgetElement = this.createWidgetElement(widget);
      
      // Append the widget to the container
      widgetContainer.appendChild(widgetElement);
      
      // Add to grid
      this.gridContainer.appendChild(widgetContainer);
    });
    
    console.log('Widgets rendered');
  }
  
  private createWidgetElement(widget: WidgetData): HTMLElement {
    // Get cached data for this widget
    const widgetDataCache = this.widgetData[widget.id] || null;
    const dataIsLoading = this.dataFetchPromises[widget.id] && !widgetDataCache;
    
    let element: HTMLElement;
    
    switch (widget.type) {
      case 'text':
        // Create text widget
        element = document.createElement('text-widget');
        element.setAttribute('widgetId', widget.id);
        element.setAttribute('widgetTitle', widget.title || '');
        element.setAttribute('readOnly', 'true');
        element.setAttribute('isInEditor', 'false');
        
        const textConfig = widget.config || { text: '' };
        if (!textConfig.text) textConfig.text = '';
        
        // Set the config as both attribute and direct property
        element.setAttribute('config', JSON.stringify(textConfig));
        (element as any).config = textConfig;
        
        // Dispatch a config update event
        setTimeout(() => {
          if (element.isConnected) {
            const configEvent = new CustomEvent('configUpdate', {
              detail: textConfig,
              bubbles: false
            });
            element.dispatchEvent(configEvent);
            console.log(`Dispatched configUpdate event for text widget ${widget.id}`);
          }
        }, 100);
        break;
        
      case 'sourceInfo':
        // Create source info widget
        element = document.createElement('source-info-widget');
        element.setAttribute('widgetId', widget.id);
        element.setAttribute('widgetTitle', widget.title || '');
        element.setAttribute('readOnly', 'true');
        element.setAttribute('isInEditor', 'false');
        
        // Set config as both attribute and direct property
        const sourceInfoConfig = widget.config || {};
        element.setAttribute('config', JSON.stringify(sourceInfoConfig));
        (element as any).config = sourceInfoConfig;
        
        // Set available sources as both attribute and direct property
        element.setAttribute('availableSources', JSON.stringify(this.dataSources || []));
        (element as any).availableSources = this.dataSources || [];
        
        // Dispatch a config update event
        setTimeout(() => {
          if (element.isConnected) {
            const configEvent = new CustomEvent('configUpdate', {
              detail: sourceInfoConfig,
              bubbles: false
            });
            element.dispatchEvent(configEvent);
            console.log(`Dispatched configUpdate event for source info widget ${widget.id}`);
          }
        }, 100);
        break;
        
      case 'descriptiveAnalysis':
        // Create descriptive analysis widget
        element = document.createElement('descriptive-analysis-widget');
        element.setAttribute('widgetId', widget.id);
        element.setAttribute('widgetTitle', widget.title || '');
        element.setAttribute('reportId', this.reportId || '');
        element.setAttribute('readOnly', 'true');
        element.setAttribute('isInEditor', 'false');
        element.setAttribute('isViewer', String(this.isViewer));
        
        // Set the config as both attribute and direct property
        const descriptiveConfig = widget.config || {};
        element.setAttribute('config', JSON.stringify(descriptiveConfig));
        (element as any).config = descriptiveConfig;
        
        // Directly pass pre-fetched data to the component through a custom property
        if (widgetDataCache) {
          console.log(`Using cached data for ${widget.id}`, widgetDataCache);
          
          // Set data as both attribute and direct property
          element.setAttribute('data', JSON.stringify(widgetDataCache));
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              console.log(`Dispatched dataUpdate event for ${widget.id}`);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: descriptiveConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          element.setAttribute('loading', String(dataIsLoading));
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'correlationAnalysis':
        // Create correlation analysis widget  
        element = document.createElement('correlation-analysis-widget');
        element.setAttribute('widgetId', widget.id);
        element.setAttribute('widgetTitle', widget.title || '');
        element.setAttribute('reportId', this.reportId || '');
        element.setAttribute('readOnly', 'true');
        element.setAttribute('isInEditor', 'false');
        element.setAttribute('isViewer', String(this.isViewer));
        
        // Set the config as both attribute and direct property
        const correlationConfig = widget.config || {};
        element.setAttribute('config', JSON.stringify(correlationConfig));
        (element as any).config = correlationConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          console.log(`Using cached data for ${widget.id}`, widgetDataCache);
          
          // Set data as both attribute and direct property
          element.setAttribute('data', JSON.stringify(widgetDataCache));
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              console.log(`Dispatched dataUpdate event for ${widget.id}`);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: correlationConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          element.setAttribute('loading', String(dataIsLoading));
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'data':
      case 'table':
      case 'kpi':
      case 'bar':
      case 'pie':
      case 'donut':
      case 'line':
      case 'hbar':
      case 'scatter':
      case 'sunburst':
      case 'heatmap':
      case 'bubble':
      case 'histogram':
        // Create data widget with specific visualization type
        element = document.createElement('data-widget');
        element.setAttribute('widgetId', widget.id);
        element.setAttribute('widgetTitle', widget.title || '');
        element.setAttribute('reportId', this.reportId || '');
        element.setAttribute('readOnly', 'true');
        element.setAttribute('isInEditor', 'false');
        element.setAttribute('isViewer', String(this.isViewer));
        
        // Use the widget type as visualization type if it's not a generic data widget
        const visualizationType = widget.type === 'data'
          ? (widget.config?.visualizationType || 'table')
          : widget.type;
          
        const dataConfig = { 
          ...(widget.config || {}),
          visualizationType: visualizationType
        };
        
        console.log(`Setting config for ${widget.id} with visualizationType: ${visualizationType}`, dataConfig);
        
        element.setAttribute('config', JSON.stringify(dataConfig));
        element.setAttribute('availableSources', JSON.stringify(this.dataSources || []));
        element.setAttribute('activeFilters', JSON.stringify(this.activeFilters || []));
        
        // IMPORTANT FIX: Directly pass the data as a CustomEvent since setAttribute may not work for complex data
        if (widgetDataCache) {
          console.log(`Using cached data for ${widget.id}`, widgetDataCache);
          
          // First set the data property directly
          (element as any).data = widgetDataCache;
          
          // Then set the config property directly (not just as an attribute)
          (element as any).config = dataConfig;
          
          // Then dispatch a custom event to ensure the component picks up the data
          setTimeout(() => {
            if (element.isConnected) {
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              console.log(`Dispatched dataUpdate event for ${widget.id}`);
              
              // Also dispatch a config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: dataConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
              console.log(`Dispatched configUpdate event for ${widget.id}`);
            }
          }, 100);
          
          // Also set loading state property 
          (element as any).loading = false;
          
          // And pass a mock fetchChartData that returns the cached data
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
        } else if (this.fetchChartData) {
          // If no cached data but we have the fetch function
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
          // Also set the config directly
          (element as any).config = dataConfig;
        }
        break;
        
      default:
        // Create a placeholder div for unknown widget types
        element = document.createElement('div');
        element.className = 'placeholder-widget';
        element.innerHTML = `
          <h3>${widget.title || 'Unknown Widget'}</h3>
          <p>Widget type: ${widget.type}</p>
        `;
        break;
    }
    
    // Set common styles
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.display = 'block';
    
    return element;
  }
  
  // Handle filter changes
  @Listen('filter-change', { target: 'window' })
  handleFilterChangeEvent(event: CustomEvent) {
    const { sourceId, field, value } = event.detail;
    console.log(`FlareReportViewer received filter-change: source=${sourceId}, field=${field}, value=${value}`);
    this.handleFilterChange(sourceId, field, value);
  }
  
  handleFilterChange = (sourceId: string, field: string, value: any) => {
    // Update filters
    const existingFilterIndex = this.activeFilters.findIndex(
      filter => filter.sourceId === sourceId && filter.field === field
    );
    
    const newFilters = [...this.activeFilters];
    
    if (existingFilterIndex >= 0) {
      if (value === null || value === undefined) {
        // Remove filter
        newFilters.splice(existingFilterIndex, 1);
      } else {
        // Update filter
        newFilters[existingFilterIndex] = { sourceId, field, value };
      }
    } else if (value !== null && value !== undefined) {
      // Add new filter
      newFilters.push({ sourceId, field, value });
    }
    
    this.activeFilters = newFilters;
    
    // Reset cache and re-fetch data with new filters
    this.widgetData = {};
    this.dataFetchPromises = {};
    
    // Re-fetch data for all widgets
    if (this.widgets.length > 0 && this.fetchChartData) {
      this.prefetchWidgetData();
    } else {
      // If we can't fetch new data, just re-render with existing data
      this.renderWidgets();
    }
  }
  
  render() {
    console.log('Rendering FlareReportViewer');
    return (
      <div class="flare-report-container">
        <div class="widget-grid"></div>
      </div>
    );
  }
} 