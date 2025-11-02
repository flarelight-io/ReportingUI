import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';

export interface DescriptiveAnalysisWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  columns?: string[];
}

@Component({
  tag: 'descriptive-analysis-widget',
  styleUrl: 'descriptive-analysis-widget.scss',
  shadow: true
})
export class DescriptiveAnalysisWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: DescriptiveAnalysisWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any = null;
  
  @State() loading: boolean = true;
  @State() analysisSourceId: string = null;
  @State() analysisData: any = null;
  
  // Store original fetchChartData to avoid recursion
  private originalFetchChartData: Function;
  
  // Format number to max 2 decimal places
  private formatNumber(value: any): any {
    if (typeof value === 'number' && !isNaN(value)) {
      // Format to 2 decimal places and remove trailing zeros
      return parseFloat(value.toFixed(2));
    }
    return value;
  }
  
  // Format all numeric values in the analysis data
  private formatAnalysisData(data: any): any {
    if (!data) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.formatAnalysisData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const formatted: any = {};
      for (const key in data) {
        formatted[key] = this.formatAnalysisData(data[key]);
      }
      return formatted;
    }
    
    return this.formatNumber(data);
  }
  
  componentWillLoad() {
    // Store reference to original fetchChartData if it's available
    if (this.fetchChartData && typeof this.fetchChartData === 'function') {
      this.originalFetchChartData = this.fetchChartData;
    }
    
    if (this.config.analysisId) {
      this.analysisSourceId = this.config.analysisId;
    }
    
    // If we already have data from props, use it
    if (this.data) {
      this.analysisData = this.formatAnalysisData(this.data);
      this.loading = false;
    } else {
      this.loading = false;
    }
    
    // Listen for data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.analysisData = this.formatAnalysisData(event.detail);
        this.loading = false;
      }
    });
    
    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail && event.detail.analysisId) {
        this.analysisSourceId = event.detail.analysisId;
      }
    });
  }
  
  @Watch('config')
  configChanged(newConfig: DescriptiveAnalysisWidgetConfig) {
    if (newConfig.analysisId) {
      this.analysisSourceId = newConfig.analysisId;
    }
  }
  
  @Watch('data')
  dataChanged(newData: any) {
    if (newData) {
      this.analysisData = this.formatAnalysisData(newData);
      this.loading = false;
    }
  }
  
  @Watch('fetchChartData')
  fetchChartDataChanged(newValue: Function) {
    // Update stored reference when prop changes
    if (newValue && typeof newValue === 'function') {
      this.originalFetchChartData = newValue;
    }
  }
  
  disconnectedCallback() {
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('configUpdate', null);
  }
  
  // Use arrow function to preserve 'this' context when passed as prop
  fetchAndFormatData = async (request: ChartDataRequest) => {
    // Get the original fetchChartData function, ensuring it's initialized
    // If originalFetchChartData isn't set yet, fall back to the prop
    const fetchFn = this.originalFetchChartData || this.fetchChartData;
    
    if (!fetchFn || typeof fetchFn !== 'function') {
      throw new Error('fetchChartData function not available');
    }
    
    // Use stored original reference to avoid recursion
    const data = await fetchFn(request);
    return this.formatAnalysisData(data);
  }

  render() {
    if (this.loading) {
      return (
        <Host>
          <base-widget
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle || "Descriptive Statistics"}
            width={this.width}
            height={this.height}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            hideTitle={this.config.hideTitle || false}
          >
            <div class="loading-spinner">Loading...</div>
          </base-widget>
        </Host>
      );
    }
    
    if (!this.config.analysisId && !this.analysisSourceId) {
      return (
        <Host>
          <base-widget
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle || "Descriptive Statistics"}
            width={this.width}
            height={this.height}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            hideTitle={this.config.hideTitle || false}
          >
            <div class="empty-analysis">
              <p>No analysis selected</p>
              <p class="help-text">Configure this widget to select a descriptive statistics analysis</p>
            </div>
          </base-widget>
        </Host>
      );
    }
    
    // When we have the analysis data source ID, render a DataWidget with table visualization
    return (
      <Host>
        <data-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || this.config.analysisName || "Descriptive Statistics"}
          reportId={this.reportId}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isViewer={this.isViewer}
          isInEditor={this.isInEditor}
          fetchChartData={this.fetchAndFormatData}
          data={this.analysisData}
          availableSources={[{
            id: this.analysisSourceId,
            name: this.config.analysisName || "Descriptive Statistics",
            alias: this.config.analysisName || "DescriptiveStatistics",
            type: 'AnalysisResult'
          }]}
          config={{
            sourceId: this.analysisSourceId,
            visualizationType: 'table',
            columns: this.config.columns?.map(column => ({ field: column, header: column })) || [],
            hideTitle: this.config.hideTitle
          }}
          activeFilters={[]}
        ></data-widget>
      </Host>
    );
  }
} 