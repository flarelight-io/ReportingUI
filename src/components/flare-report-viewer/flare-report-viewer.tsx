import { Component, Prop, h, State, Watch, Element, Listen } from '@stencil/core';
import { DataSource, Filter, ChartDataRequest } from '../../api/types/common';
import { WidgetData } from '../widgets/base-widget';

const DEBUG_MODE = false; // Set to true to enable verbose logging

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
  private resizeObserver: ResizeObserver | null = null;
  private handleResize = () => {
    if (this.isMounted && this.gridContainer) {
      this.setEqualGridDimensions();
    }
  };
  
  @Watch('configuration')
  onConfigurationChange() {
    if (this.configuration) {
      this.parseConfiguration(this.configuration);
      // Reset widget data cache when configuration changes
      this.widgetData = {};
      // Rerender widgets when configuration changes
      this.renderWidgets();
    }
  }
  
  connectedCallback() {
    if (this.configuration) {
      this.parseConfiguration(this.configuration);
    }
  }
  
  componentDidLoad() {
    this.isMounted = true;
    // Get the grid container element
    this.gridContainer = this.el.querySelector('.widget-grid');
    
    if (this.gridContainer) {
      // Set equal row height to column width
      this.setEqualGridDimensions();
      
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
      
      // Add resize observer to update grid dimensions when window resizes
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(this.gridContainer);
      } else {
        // Fallback for browsers without ResizeObserver
        window.addEventListener('resize', this.handleResize);
      }
    } else {
      console.error('Could not find grid container element');
    }
  }
  
  disconnectedCallback() {
    this.isMounted = false;
    
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Clean up resize event listener
    window.removeEventListener('resize', this.handleResize);
  }
  
  private parseConfiguration(config: any) {
    // Parse widgets and data sources
    if (config.widgets && Array.isArray(config.widgets)) {
      this.widgets = config.widgets;
    } else {
      console.warn('No widgets found in configuration');
      this.widgets = [];
    }
    
    if (config.sources && Array.isArray(config.sources)) {
      this.dataSources = config.sources;
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
  }
  
  private async fetchDataForWidget(widget: WidgetData, source: DataSource): Promise<any> {
    if (!this.fetchChartData) {
      console.error("fetchChartData function not available");
      return null;
    }
    
    try {
      const sourceId = widget.config?.sourceId as string;
      const valueField = widget.config?.valueField as string;
      const groupByField = widget.config?.groupByField as string;
      const rawAggregation = widget.config?.aggregation as string;
      
      // Get relevant filters for this source
      const sourceFilters = this.activeFilters.filter(f => f.sourceId === sourceId);
      
      // Create cache key based on source and filters
      const filterKey = sourceFilters.length > 0 ? 
        JSON.stringify(sourceFilters.map(f => `${f.field}:${f.value}`).sort()) : 
        'nofilters';
      
      const cacheKey = `${sourceId}:${filterKey}`;
      
      // Check if we already have this data in the cache
      if (this.widgetData[widget.id] && !this.activeFilters.some(f => f.sourceId === sourceId)) {
        if (DEBUG_MODE) console.log(`Using cached data for widget ${widget.id}`);
        return this.widgetData[widget.id];
      }
      
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
      
      // Add cache key to request as extra property outside the typed object
      const requestWithCache = {
        ...chartDataRequest,
        _cacheKey: cacheKey
      };
      
      // Fetch the data
      const response = await this.fetchChartData(requestWithCache);
      
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
      return;
    }
    
    // Clear existing content
    this.gridContainer.innerHTML = '';
    
    // No widgets? Show placeholder if needed
    if (!this.widgets || this.widgets.length === 0) {
      if (this.showPlaceholder) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'empty-report';
        emptyElement.innerHTML = '<p>No widgets in this report</p>';
        this.gridContainer.appendChild(emptyElement);
      }
      return;
    }
    
    // Create all widget elements
    this.widgets.forEach((widget) => {
      // Create the widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'widget-item';
      widgetContainer.setAttribute('data-id', widget.id);
      
      // Position the widget using grid properties
      // Set both size (span) and position (start)
      // Using zero-based coordinates (add 1 when applying to grid since CSS grid is 1-based)
      const x = (widget.x !== undefined) ? widget.x : 0; // Default to first column (0) if not specified
      const y = (widget.y !== undefined) ? widget.y : 0; // Default to first row (0) if not specified
      const w = widget.w || 6; // Default width of 6 grid units
      const h = widget.h || 4; // Default height of 4 grid units
      
      // Set both size (span) and position (start)
      // Add 1 to x and y because CSS grid is 1-based, but our coordinates are 0-based
      widgetContainer.style.gridColumn = `${x + 1} / span ${w}`;
      widgetContainer.style.gridRow = `${y + 1} / span ${h}`;
      
      // Create the widget element
      const widgetElement = this.createWidgetElement(widget);
      
      // Append the widget to the container
      widgetContainer.appendChild(widgetElement);
      
      // Add to grid
      this.gridContainer.appendChild(widgetContainer);
    });
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
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        
        const textConfig = widget.config || { text: '' };
        if (!textConfig.text) textConfig.text = '';
        
        // Set the config as both attribute and direct property
        (element as any).config = textConfig;
        
        // Dispatch a config update event
        setTimeout(() => {
          if (element.isConnected) {
            const configEvent = new CustomEvent('configUpdate', {
              detail: textConfig,
              bubbles: false
            });
            element.dispatchEvent(configEvent);
          }
        }, 100);
        break;
        
      case 'sourceInfo':
        // Create source info widget
        element = document.createElement('source-info-widget');
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        
        // Set config as direct property
        const sourceInfoConfig = widget.config || {};
        (element as any).config = sourceInfoConfig;
        
        // Set available sources as direct property
        (element as any).availableSources = this.dataSources || [];
        
        // Dispatch a config update event
        setTimeout(() => {
          if (element.isConnected) {
            const configEvent = new CustomEvent('configUpdate', {
              detail: sourceInfoConfig,
              bubbles: false
            });
            element.dispatchEvent(configEvent);
          }
        }, 100);
        break;
        
      case 'descriptiveAnalysis':
        // Create descriptive analysis widget
        element = document.createElement('descriptive-analysis-widget');
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const descriptiveConfig = widget.config || {};
        (element as any).config = descriptiveConfig;
        
        // Directly pass pre-fetched data to the component through a custom property
        if (widgetDataCache) {
          // Set data directly
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
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'correlationAnalysis':
        // Create correlation analysis widget  
        element = document.createElement('correlation-analysis-widget');
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const correlationConfig = widget.config || {};
        (element as any).config = correlationConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Set data directly
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
          (element as any).loading = dataIsLoading;
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
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Use the widget type as visualization type if it's not a generic data widget
        const visualizationType = widget.type === 'data'
          ? (widget.config?.visualizationType || 'table')
          : widget.type;
          
        const dataConfig = { 
          ...(widget.config || {}),
          visualizationType: visualizationType
        };
        
        // Set properties directly
        (element as any).config = dataConfig;
        (element as any).availableSources = this.dataSources || [];
        (element as any).activeFilters = this.activeFilters || [];
        
        // Directly pass the data
        if (widgetDataCache) {
          // Set data directly
          (element as any).data = widgetDataCache;
          
          // Dispatch a custom event to ensure the component picks up the data
          setTimeout(() => {
            if (element.isConnected) {
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Also dispatch a config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: dataConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
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
    if (DEBUG_MODE) console.log('Filter change event received in report viewer:', event.detail);    
    const { sourceId, field, value } = event.detail;    
    this.handleFilterChange(sourceId, field, value);  
  }
  
  // Track active filter changes to prevent duplicate processing
  private filterUpdateInProgress = false;
  private lastFilterTimestamp = 0;

  handleFilterChange = (sourceId: string, field: string, value: any) => {
    // Prevent excessive filter updates
    const now = Date.now();
    if (now - this.lastFilterTimestamp < 300) {
      if (DEBUG_MODE) console.log('Throttling filter changes - too frequent');
      return;
    }
    this.lastFilterTimestamp = now;
    
    // Prevent recursive filter processing
    if (this.filterUpdateInProgress) {
      if (DEBUG_MODE) console.log('Filter update already in progress, ignoring nested call');
      return;
    }
    
    this.filterUpdateInProgress = true;
    
    try {
      if (DEBUG_MODE) console.log('Handling filter change in report viewer:', sourceId, field, value);
      
      // Special case for wildcard clearing
      if (sourceId === '*' && field === '*' && (value === null || value === undefined)) {
        if (DEBUG_MODE) console.log('Wildcard filter clearing detected, removing all filters');
        this.activeFilters = [];
        
        // Reset widget data cache
        this.widgetData = {};
        this.dataFetchPromises = {};
        
        // Force render with empty filters
        const forceRender = async () => {
          // First, force fetch all data with no filters
          await this.prefetchWidgetData();
          
          // Then completely rebuild the widget grid
          if (this.gridContainer) {
            // Clear the container
            this.gridContainer.innerHTML = '';
            
            // Rebuild all widgets from scratch
            this.renderWidgets();
            
            // Dispatch an event that filter clearing is complete
            const event = new CustomEvent('filters-cleared', {
              bubbles: true
            });
            this.el.dispatchEvent(event);
            
            if (DEBUG_MODE) console.log('Widget grid completely rebuilt after clearing all filters');
          }
        };
        
        // Start the rendering process
        forceRender();
        return;
      }
      
      // Update filters
      const existingFilterIndex = this.activeFilters.findIndex(
        filter => filter.sourceId === sourceId && filter.field === field
      );
      
      const newFilters = [...this.activeFilters];
      
      if (existingFilterIndex >= 0) {
        if (value === null || value === undefined) {
          // Remove filter
          if (DEBUG_MODE) console.log('Removing existing filter');
          newFilters.splice(existingFilterIndex, 1);
        } else {
          // Update filter
          if (DEBUG_MODE) console.log('Updating existing filter');
          newFilters[existingFilterIndex] = { sourceId, field, value };
        }
      } else if (value !== null && value !== undefined) {
        // Add new filter
        if (DEBUG_MODE) console.log('Adding new filter');
        newFilters.push({ sourceId, field, value });
      }
      
      if (DEBUG_MODE) console.log('New active filters:', newFilters);
      this.activeFilters = newFilters;
      
      // Reset cache and re-fetch data with new filters
      if (DEBUG_MODE) console.log('Clearing widget data cache');
      this.widgetData = {};
      this.dataFetchPromises = {};
      
      // Instead of trying to update existing widgets, completely recreate them
      // First, prefetch data with the new filters
      if (this.widgets.length > 0 && this.fetchChartData) {
        if (DEBUG_MODE) console.log('Pre-fetching data for all widgets with new filters');
        
        // Rebuild the entire widget grid after data is fetched
        this.prefetchWidgetData().then(() => {
          if (DEBUG_MODE) console.log('Data pre-fetch complete, completely rebuilding widgets');
          
          // Force a complete rebuild of all widgets
          if (this.gridContainer) {
            // Clear the container
            this.gridContainer.innerHTML = '';
            
            // Rebuild all widgets from scratch
            this.renderWidgets();
            
            if (DEBUG_MODE) console.log('Widget grid completely rebuilt with new filters applied');
            
            // Dispatch event to notify that filters have been applied
            const event = new CustomEvent('filters-applied', {
              bubbles: true,
              detail: { filters: this.activeFilters }
            });
            this.el.dispatchEvent(event);
          }
        });
      } else {
        // If we can't fetch new data, just re-render with existing data
        if (DEBUG_MODE) console.log('Rendering widgets with existing data');
        this.renderWidgets();
      }
    } finally {
      this.filterUpdateInProgress = false;
    }
  }
  
  private setEqualGridDimensions() {
    if (!this.gridContainer) return;
    
    // Get the width of the grid
    const gridWidth = this.gridContainer.offsetWidth;
    
    // Calculate column width (account for gap)
    const numColumns = 12;
    const gapSize = 15; // Should match the gap size in CSS
    const totalGapWidth = gapSize * (numColumns - 1);
    const columnWidth = (gridWidth - totalGapWidth) / numColumns;
    
    // Set the row height to match column width
    this.gridContainer.style.gridAutoRows = `${columnWidth}px`;
  }
  
  render() {
    return (
      <div class="flare-report-container">
        <div class="widget-grid"></div>
      </div>
    );
  }
} 