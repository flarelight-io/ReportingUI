import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';

export interface DescriptiveAnalysisWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
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
  @Prop() isInEditor: boolean = true;
  @Prop() isViewer: boolean = false;
  @Prop() config: DescriptiveAnalysisWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any = null;
  
  @State() loading: boolean = true;
  @State() analysisSourceId: string = null;
  @State() analysisData: any = null;
  
  componentWillLoad() {
    if (this.config.analysisId) {
      this.analysisSourceId = this.config.analysisId;
    }
    
    // If we already have data from props, use it
    if (this.data) {
      this.analysisData = this.data;
      this.loading = false;
    } else {
      this.loading = false;
    }
    
    // Listen for data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.analysisData = event.detail;
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
      this.analysisData = newData;
      this.loading = false;
    }
  }
  
  disconnectedCallback() {
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('configUpdate', null);
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
          fetchChartData={this.fetchChartData}
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
            columns: [],
            hideTitle: this.config.hideTitle
          }}
          activeFilters={[]}
        ></data-widget>
      </Host>
    );
  }
} 