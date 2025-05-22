import { Component, h, State, Element } from '@stencil/core';

const DEBUG_MODE = false; // Set to true to enable verbose logging

@Component({
  tag: 'report-demo',
  styleUrl: 'report-demo.scss',
  shadow: true
})
export class ReportDemo {
  @Element() hostElement: HTMLElement;
  
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

  @State() darkMode = false;
  @State() activeFilter: { sourceId: string; field: string; value: any } | null = null;
  
  // Cache data for each source when filtered
  private filteredDataCache: { [sourceId: string]: any[] } = {};
  private reportViewerRef: HTMLElement = null;
  // Queue of filters to apply once the report viewer is available
  private pendingFilters: Array<{ sourceId: string; field: string; value: any } | null> = [];
  private reportViewerReady = false;
  // Add a cache timestamp to avoid duplicate processing
  private lastFilterChangeTimestamp = 0;
  private filterProcessingInProgress = false;
  
  // Use a direct reference to the element via ref callback
  private setReportViewerRef = (el: HTMLElement) => {
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
      this.reportViewerRef = this.hostElement.querySelector('flare-report-viewer');
      
      // Try document-wide selector as fallback
      if (!this.reportViewerRef) {
        this.reportViewerRef = document.querySelector('flare-report-viewer');
      }
      
      // Try alternate selector with direct path
      if (!this.reportViewerRef) {
        this.reportViewerRef = document.querySelector('.report-container > flare-report-viewer');
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
  };

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
      reportContainer = this.hostElement.querySelector('.report-container');
    }
    
    if (!reportContainer) {
      reportContainer = document.querySelector('.report-container');
    }
    
    // Use shadow DOM correctly if needed
    if (!reportContainer && this.hostElement.shadowRoot) {
      reportContainer = this.hostElement.shadowRoot.querySelector('.report-container');
    }
    
    if (reportContainer) {
      if (DEBUG_MODE) console.log('Found report container, rebuilding report viewer');
      
      // Store configuration
      const currentConfig = JSON.parse(JSON.stringify(this.demoConfiguration));
      
      // Clear container
      reportContainer.innerHTML = '';
      
      // Create new report viewer
      const newViewer = document.createElement('flare-report-viewer');
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
  
  private getBaseData(sourceId: string) {
    // Mock data based on the source ID or chart type
    switch (sourceId) {
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
        return [
          { Name: 'Variable A', 'Variable A': 1.00, 'Variable B': 0.72, 'Variable C': -0.35, 'Variable D': 0.18 },
          { Name: 'Variable B', 'Variable A': 0.72, 'Variable B': 1.00, 'Variable C': -0.28, 'Variable D': 0.25 },
          { Name: 'Variable C', 'Variable A': -0.35, 'Variable B': -0.28, 'Variable C': 1.00, 'Variable D': -0.56 },
          { Name: 'Variable D', 'Variable A': 0.18, 'Variable B': 0.25, 'Variable C': -0.56, 'Variable D': 1.00 }
        ];
      
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
          <div class="theme-toggle">
            <button onClick={this.toggleTheme} class="toggle-button">
              {this.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
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
        
        <div class="report-container" id="flarelight-report-container">
          <flare-report-viewer
            ref={this.setReportViewerRef}
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