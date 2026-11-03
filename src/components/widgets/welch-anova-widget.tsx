import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequestBuilder } from '../../utils/chart-data-request-builder';

export interface WelchAnovaData {
  SumOfSquares: number;
  WelchMS: number;
  FRatio: number;
  NumDF: number;
  DenDF: number;
  PValue?: number;
  FCritical?: number;
  PCritical?: number;
  DataSourceName: string;
  ConfidenceLevel: number;
  NullReject: boolean;
}

export interface WelchAnovaWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  hideResultBanner?: boolean;
  hideDataSourceRow?: boolean;
  hideTestRow?: boolean;
  hideConfidenceLevelRow?: boolean;
  hideAnovaTable?: boolean;
  hideCriticalValues?: boolean;
  hideVisualRange?: boolean;
}

@Component({
  tag: 'welch-anova-widget',
  styleUrl: 'welch-anova-widget.scss',
  shadow: true
})
export class WelchAnovaWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: WelchAnovaWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any = null;
  
  @State() loading: boolean = true;
  @State() analysisSourceId: string = null;
  @State() analysisData: any = null;
  @State() transformedData: any[] = [];
  
  componentWillLoad() {
    // Set up event listeners for direct data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.processData(event.detail);
      }
    });
    
    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail && event.detail.analysisId) {
        this.analysisSourceId = event.detail.analysisId;
      }
    });
    
    // Check if we have data from props first
    if (this.data && Array.isArray(this.data) && this.data.length > 0) {
      this.processData(this.data);
    } else if (this.config.analysisId) {
      this.fetchData();
    } else {
      this.loading = false;
    }
  }
  
  @Watch('config')
  configChanged(newConfig: WelchAnovaWidgetConfig, oldConfig?: WelchAnovaWidgetConfig) {
    if (newConfig.analysisId !== oldConfig?.analysisId && newConfig.analysisId) {
      this.fetchData();
    }
  }
  
  @Watch('data')
  dataChanged(newData: any) {
    if (newData && newData.length > 0) {
      this.processData(newData);
    }
  }
  
  disconnectedCallback() {
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('configUpdate', null);
  }
  
  // Process incoming data
  private processData(data: any[]) {
    try {
      if (data && Array.isArray(data) && data.length > 0) {
        this.analysisData = data;
        this.transformData(data);
        this.loading = false;
      } else {
        this.loading = false;
      }
    } catch (error) {
      console.error("Failed to process Welch's ANOVA data:", error);
      this.loading = false;
    }
  }
  
  private async fetchData() {
    if (!this.config.analysisId) {
      this.loading = false;
      return;
    }
    
    if (!this.fetchChartData) {
      this.loading = false;
      return;
    }
    
    try {
      this.loading = true;
      
      // Use the standard getChartData method
      const chartDataRequest = ChartDataRequestBuilder.buildForAnalysisWidget(
        this.reportId,
        this.config.analysisId,
        this.widgetId,
        'welchAnova',
        this.isViewer || false,
        []
      );
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch Welch's ANOVA data:", error);
      this.loading = false;
    }
  }
  
  transformData(data: any[]) {
    if (!Array.isArray(data) || data.length === 0) {
      this.transformedData = [];
      return;
    }
    
    // Transform the raw data to have proper display values
    this.analysisData = data.map(item => ({
      ...item,
      SumOfSquares: this.formatNumber(item.SumOfSquares),
      WelchMS: this.formatNumber(item.WelchMS),
      FRatio: this.formatNumber(item.FRatio),
      NumDF: this.formatNumber(item.NumDF),
      DenDF: this.formatNumber(item.DenDF),
      PValue: this.formatPValue(item.PValue)
    }));
  }
  
  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      return '';
    }
    
    // Use exponential notation for very small numbers
    if (Math.abs(value) < 0.001 && value !== 0) {
      return value.toExponential(3);
    }
    
    // Format to 3 decimal places and remove trailing zeros
    return parseFloat(value.toFixed(3)).toString();
  }
  
  formatPValue(value: number | null | undefined): string {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      return '';
    }
    
    // Use exponential notation for very small numbers
    if (value < 0.001 && value !== 0) {
      return value.toExponential(3);
    }
    
    // Format to 3 decimal places and remove trailing zeros
    return parseFloat(value.toFixed(3)).toString();
  }

  getWelchAnovaInfo(): any {
    // Read directly from the data prop - this is the source of truth
    if (this.data && Array.isArray(this.data) && this.data.length > 0) {
      return {
        dataSourceName: this.data[0].DataSourceName,
        confidenceLevel: this.data[0].ConfidenceLevel,
        nullReject: this.data[0].NullReject
      };
    }
    
    return null;
  }
  
  render() {
    if (this.loading) {
      return (
        <Host>
          <base-widget exportparts="card,header,title,body"
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle || "Welch's ANOVA"}
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
          <base-widget exportparts="card,header,title,body"
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle || "Welch's ANOVA"}
            width={this.width}
            height={this.height}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            hideTitle={this.config.hideTitle || false}
          >
            <div class="empty-analysis">
              <p>No analysis selected</p>
              <p class="help-text">Configure this widget to select a Welch's ANOVA analysis</p>
            </div>
          </base-widget>
        </Host>
      );
    }
    
    // When we have the analysis data source ID, render a DataWidget with table visualization
    return (
      <Host>
        <base-widget exportparts="card,header,title,body"
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || this.config.analysisName || "Welch's ANOVA"}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle || false}
        >
          <div class="welch-anova-widget-container">
            {/* Welch ANOVA Results Banner and Parameters */}
            {(() => {
              // Use the same data source as the data-widget
              const dataSource = this.analysisData || this.data;
              if (!dataSource || !Array.isArray(dataSource) || dataSource.length === 0) {
                return null;
              }
              
              const firstRow = dataSource[0];
              const resultMessage = firstRow.NullReject ? 'Significant difference' : 'No significant difference';
              
              return (
                <div class="anova-results-container">
                  {/* Result Banner */}
                  {!this.config.hideResultBanner && (
                    <div class="result-banner">
                      <span class="result-text">{resultMessage}</span>
                    </div>
                  )}
                  
                  {/* Welch ANOVA Parameters */}
                  <div class="test-parameters">
                    {!this.config.hideDataSourceRow && (
                      <div class="parameter-row">
                        <span class="parameter-label">Data Source:</span>
                        <span class="parameter-value">{firstRow.DataSourceName}</span>
                      </div>
                    )}
                    
                    {!this.config.hideTestRow && (
                      <div class="parameter-row">
                        <span class="parameter-label">Test:</span>
                        <span class="parameter-value">Welch&apos;s ANOVA</span>
                      </div>
                    )}
                    
                    {!this.config.hideConfidenceLevelRow && (
                      <div class="parameter-row">
                        <span class="parameter-label">Confidence Level:</span>
                        <span class="parameter-value">{firstRow.ConfidenceLevel.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Welch ANOVA Results Table */}
            {!this.config.hideAnovaTable && (
              <div class="anova-table-section">
                <data-widget
                  widgetId={`${this.widgetId}-table`}
                  widgetTitle=""
                  reportId={this.reportId}
                  width={this.width}
                  height={this.height ? this.height - 120 : undefined}
                  readOnly={this.readOnly}
                  isViewer={this.isViewer}
                  isInEditor={this.isInEditor}
                  fetchChartData={this.fetchChartData}
                  data={this.analysisData}
                  availableSources={[{
                    id: this.analysisSourceId,
                    name: this.config.analysisName || "Welch's ANOVA",
                    alias: this.config.analysisName || "WelchAnova",
                    type: 'AnalysisResult'
                  }]}
                  config={{
                    sourceId: this.analysisSourceId,
                    visualizationType: 'table',
                    columns: [
                      { field: 'SumOfSquares', header: 'Weighted Sum of Squares' },
                      { field: 'WelchMS', header: 'Welch Mean Square' },
                      { field: 'NumDF', header: 'Numerator DF' },
                      { field: 'DenDF', header: 'Denominator DF' },
                      { field: 'FRatio', header: 'Welch F Statistic' },
                      { field: 'PValue', header: 'p-Value' }
                    ],
                    hideTitle: true
                  }}
                  activeFilters={[]}
                ></data-widget>
              </div>
            )}
            
            {/* Additional Critical Values */}
            {!this.config.hideCriticalValues && (() => {
              const dataSource = this.analysisData || this.data;
              if (!dataSource || !Array.isArray(dataSource) || dataSource.length === 0) {
                return null;
              }
              
              const firstRow = dataSource[0];
              return (
                <div class="critical-values-section">
                  <div class="test-parameters">
                    <div class="parameter-row">
                      <span class="parameter-label">F-Critical:</span>
                      <span class="parameter-value">{this.formatNumber(firstRow.FCritical)}</span>
                    </div>
                    
                    <div class="parameter-row">
                      <span class="parameter-label">p-Critical:</span>
                      <span class="parameter-value">{this.formatPValue(firstRow.PCritical)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </base-widget>
      </Host>
    );
  }
}
