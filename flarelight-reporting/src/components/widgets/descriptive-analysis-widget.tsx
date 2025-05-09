import { Component, Prop, h, Host, State, Watch } from '@stencil/core';

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
  
  @State() loading: boolean = true;
  @State() analysisSourceId: string = null;
  
  componentWillLoad() {
    if (this.config.analysisId) {
      this.analysisSourceId = this.config.analysisId;
    }
    this.loading = false;
  }
  
  @Watch('config')
  configChanged() {
    if (this.config.analysisId) {
      this.analysisSourceId = this.config.analysisId;
    }
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
            hideTitle={false}
          >
            <div class="loading-spinner">Loading...</div>
          </base-widget>
        </Host>
      );
    }
    
    if (!this.config.analysisId || !this.analysisSourceId) {
      return (
        <Host>
          <base-widget
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle || "Descriptive Statistics"}
            width={this.width}
            height={this.height}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            hideTitle={false}
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