import { Component, Prop, h, State, Watch, Listen } from '@stencil/core';
import { DataSource, Filter } from '../../api/types/common';
import { WidgetData } from '../widgets/base-widget';

@Component({
  tag: 'flare-report-viewer',
  styleUrl: 'flare-report-viewer.scss',
  shadow: true
})
export class FlareReportViewer {
  @Prop() reportId: string;
  @Prop() configuration: any;
  @Prop() showPlaceholder: boolean = true;
  @Prop() isViewer: boolean = false;
  @Prop() isFullscreen: boolean = false;
  @Prop() fetchChartData: Function;
  
  @State() widgets: WidgetData[] = [];
  @State() dataSources: DataSource[] = [];
  @State() activeFilters: Filter[] = [];
  
  @Watch('configuration')
  onConfigurationChange() {
    if (this.configuration) {
      this.parseConfiguration(this.configuration);
    }
  }
  
  connectedCallback() {
    if (this.configuration) {
      this.parseConfiguration(this.configuration);
    }
  }
  
  private parseConfiguration(config: any) {
    // Extract widgets and sources from configuration
    if (config.widgets && Array.isArray(config.widgets)) {
      this.widgets = config.widgets;
    }
    
    if (config.sources && Array.isArray(config.sources)) {
      this.dataSources = config.sources;
    }
  }
  
  @Listen('filter-change', { target: 'window' })
  handleFilterChangeEvent(event: CustomEvent) {
    const { sourceId, field, value } = event.detail;
    console.log(`FlareReportViewer received filter-change: source=${sourceId}, field=${field}, value=${value}`);
    this.handleFilterChange(sourceId, field, value);
  }
  
  private handleFilterChange = (sourceId: string, field: string, value: any) => {
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
  }
  
  render() {
    return (
      <div class="flare-report-container">
        <div class="widgets-grid">
          {this.widgets.map((widget) => {
            // Render different widget types based on the widget.type
            switch (widget.type) {
              case 'text':
                return (
                  <div class="widget-container" id={`widget-${widget.id}`} style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}>
                    <text-widget
                      widgetId={widget.id}
                      widgetTitle={widget.title}
                      readOnly={true}
                      isInEditor={false}
                      config={widget.config as any}
                    ></text-widget>
                  </div>
                );
                
              case 'sourceInfo':
                return (
                  <div class="widget-container" id={`widget-${widget.id}`} style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}>
                    <source-info-widget
                      widgetId={widget.id}
                      widgetTitle={widget.title}
                      readOnly={true}
                      isInEditor={false}
                      config={widget.config as any}
                      availableSources={this.dataSources}
                    ></source-info-widget>
                  </div>
                );
              
              case 'descriptiveAnalysis':
                return (
                  <div class="widget-container" id={`widget-${widget.id}`} style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}>
                    <descriptive-analysis-widget
                      widgetId={widget.id}
                      widgetTitle={widget.title}
                      reportId={this.reportId}
                      readOnly={true}
                      isInEditor={false}
                      isViewer={this.isViewer}
                      config={widget.config as any}
                      fetchChartData={this.fetchChartData}
                    ></descriptive-analysis-widget>
                  </div>
                );
                
              case 'correlationAnalysis':
                return (
                  <div class="widget-container" id={`widget-${widget.id}`} style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}>
                    <correlation-analysis-widget
                      widgetId={widget.id}
                      widgetTitle={widget.title}
                      reportId={this.reportId}
                      readOnly={true}
                      isInEditor={false}
                      isViewer={this.isViewer}
                      config={widget.config as any}
                      fetchChartData={this.fetchChartData}
                    ></correlation-analysis-widget>
                  </div>
                );
              
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
                return (
                  <div class="widget-container" id={`widget-${widget.id}`} style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}>
                    <data-widget
                      widgetId={widget.id}
                      widgetTitle={widget.title}
                      reportId={this.reportId}
                      readOnly={true}
                      isInEditor={false}
                      isViewer={this.isViewer}
                      config={{
                        ...widget.config,
                        visualizationType: widget.type === 'data' 
                          ? String(widget.config?.visualizationType || 'table')
                          : widget.type
                      } as any}
                      availableSources={this.dataSources}
                      activeFilters={this.activeFilters}
                      fetchChartData={this.fetchChartData}
                    ></data-widget>
                  </div>
                );
                
              default:
                return (
                  <div class="widget-container" id={`widget-${widget.id}`} style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}>
                    <div class="placeholder-widget">
                      <h3>{widget.title}</h3>
                      <p>Widget type: {widget.type}</p>
                    </div>
                  </div>
                );
            }
          })}
          
          {this.widgets.length === 0 && this.showPlaceholder && (
            <div class="empty-report">
              <p>No widgets in this report</p>
            </div>
          )}
        </div>
      </div>
    );
  }
} 