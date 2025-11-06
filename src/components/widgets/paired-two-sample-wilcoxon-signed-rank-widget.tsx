import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequestBuilder } from '../../utils/chart-data-request-builder';

export interface PairedTwoSampleWilcoxonSignedRankWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  hideResultBanner?: boolean;
  hideDataSourceRow?: boolean;
  hideSampleSource1Row?: boolean;
  hideSampleSource2Row?: boolean;
  hideTestRow?: boolean;
  hideSampleSizeRow?: boolean;
  hideSampleSizeNonZeroRow?: boolean;
  hideZeroCountRow?: boolean;
  hideConfidenceLevelRow?: boolean;
  hideReferenceValueRow?: boolean;
  hideWPlusRow?: boolean;
  hideWMinusRow?: boolean;
  hideWStatRow?: boolean;
  hideMeanWRow?: boolean;
  hideVarWRow?: boolean;
  hideZValueRow?: boolean;
  hidePValueRow?: boolean;
  hideWCriticalRow?: boolean;
  hideHasTiesRow?: boolean;
  hideHasNullPairsRow?: boolean;
  hideContinuityCorrectionRow?: boolean;
  hideVisualRange?: boolean;
}

export interface PairedTwoSampleWilcoxonSignedRankData {
  SampleSize: number;
  SampleSizeNonZero: number;
  ZeroCount: number;
  HasTies: boolean;
  WPlus: number;
  WMinus: number;
  WStat: number;
  MeanW: number;
  VarW: number;
  HasNullPairs: boolean;
  DataSourceName: string;
  SampleSourceName1: string;
  SampleSourceName2: string;
  TestName: string;
  ConfidenceLevel: number;
  ReferenceValue: number;
  ContinuityCorrection: boolean;
  ZValue: number | null;
  PValue: number | null;
  WCritical: number | null;
  NullReject: boolean | null;
}

@Component({
  tag: 'paired-two-sample-wilcoxon-signed-rank-widget',
  styleUrl: 'paired-two-sample-wilcoxon-signed-rank-widget.scss',
  shadow: true
})
export class PairedTwoSampleWilcoxonSignedRankWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: PairedTwoSampleWilcoxonSignedRankWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  
  @State() loading: boolean = true;
  @State() testData: PairedTwoSampleWilcoxonSignedRankData | null = null;
  @State() error: string | null = null;
  
  componentWillLoad() {
    // Set up event listeners for direct data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.processData(event.detail);
      }
    });
    
    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail) {
        // Handle any config updates if needed
      }
    });
    
    // Check if we have data from props
    if (this.data && this.data.length > 0) {
      this.processData(this.data);
    } else if (this.config.analysisId) {
      this.fetchData();
    } else {
      this.loading = false;
    }
  }
  
  disconnectedCallback() {
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('configUpdate', null);
  }
  
  @Watch('data')
  dataChanged(newValue: any[]) {
    if (newValue && newValue.length > 0) {
      this.processData(newValue);
    }
  }
  
  @Watch('config')
  configChanged(newValue: PairedTwoSampleWilcoxonSignedRankWidgetConfig, oldValue?: PairedTwoSampleWilcoxonSignedRankWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
  }
  
  // Process incoming data
  private processData(data: any[]) {
    try {
      if (data && Array.isArray(data) && data.length > 0) {
        // Extract the first element from the array (paired two sample wilcoxon signed rank test data)
        this.testData = data[0];
        this.loading = false;
        this.error = null;
      } else {
        this.error = 'No data available';
        this.loading = false;
      }
    } catch (err) {
      this.error = 'Error processing data';
      this.loading = false;
    }
  }
  
  private async fetchData() {
    if (!this.config.analysisId) {
      this.loading = false;
      return;
    }
    
    if (!this.fetchChartData) {
      console.error("fetchChartData function not provided");
      this.error = 'No data fetch function available';
      this.loading = false;
      return;
    }
    
    try {
      this.loading = true;
      
      // Use the standard getChartData method
      if (!this.reportId) {
        throw new Error('reportId is required');
      }
      
      const chartDataRequest = ChartDataRequestBuilder.buildForAnalysisWidget(
        this.reportId,
        this.config.analysisId,
        this.widgetId,
        'pairedTwoSampleWilcoxonSignedRank',
        this.isViewer || false
      );
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch Paired Two Sample Wilcoxon signed rank test data:", error);
      this.error = 'Failed to load data';
      this.loading = false;
    }
  }
  
  // Get the test type display name
  private getTestTypeDisplay(): string {
    if (!this.testData) return '';
    
    return `Paired Two-Sample Wilcoxon Signed Rank Test (${this.testData.TestName})`;
  }
  
  // Get the result message
  private getResultMessage(): string {
    if (!this.testData || this.testData.NullReject === null) return '';
    
    return this.testData.NullReject ? 'Significant difference' : 'No significant difference';
  }
  
  // Format confidence level for display
  private formatConfidenceLevel(level: number): string {
    // Format percentage to up to 3 significant decimal places
    if (level % 1 === 0) {
      // Whole number - no decimal places
      return `${level}%`;
    } else {
      // Has decimal places - show up to 3 significant decimal places
      const rounded = Math.round(level * 1000) / 1000;
      return `${rounded}%`;
    }
  }
  
  // Format number for display
  private formatNumber(value: number): string {
    // Use exponential notation for very small values
    if (Math.abs(value) < 0.001 && value !== 0) {
      return value.toExponential(3);
    }
    
    // Format to up to 3 significant decimal places
    if (value % 1 === 0) {
      // Whole number - no decimal places
      return value.toString();
    } else {
      // Has decimal places - show up to 3 significant decimal places
      const rounded = Math.round(value * 1000) / 1000;
      return rounded.toString();
    }
  }
  
  // Format p-value for display
  private formatPValue(pValue: number | null): string {
    if (pValue === null) return 'N/A';
    return this.formatNumber(pValue);
  }
  
  // Format z-value for display
  private formatZValue(zValue: number | null): string {
    if (zValue === null) return 'N/A';
    return this.formatNumber(zValue);
  }
  
  private getMethodDisplay(): string {
    if (this.testData?.ZValue !== null) {
      return 'Normal (tie-corrected)';
    }
    return 'Exact';
  }
  
  // Render the visual range/slider for W statistics
  private renderVisualRange() {
    if (!this.testData) return null;
    
    const { WPlus, WMinus, MeanW } = this.testData;
    
    // Calculate the range for the visual
    const minValue = Math.min(WPlus, WMinus, MeanW);
    const maxValue = Math.max(WPlus, WMinus, MeanW);
    const range = maxValue - minValue;
    
    // For very small ranges, use a minimum visual range to spread out close values
    const minVisualRange = Math.max(range, Math.abs(MeanW) * 0.1, 1);
    
    // Add padding to the range (20% on each side, but ensure minimum spread)
    const padding = Math.max(minVisualRange * 0.2, minVisualRange * 0.1);
    const visualMin = minValue - padding;
    const visualMax = maxValue + padding;
    const visualRange = visualMax - visualMin;
    
    // Calculate positions as percentages
    const wPlusPosition = ((WPlus - visualMin) / visualRange) * 100;
    const wMinusPosition = ((WMinus - visualMin) / visualRange) * 100;
    const meanWPosition = ((MeanW - visualMin) / visualRange) * 100;
    
    return (
      <div class="visual-range-container">
        <div class="range-line">
          {/* W+ marker and label */}
          <div class="marker-container w-plus" style={{ left: `${wPlusPosition}%` }}>
            <div class="marker-line w-plus-line"></div>
            <div class="marker-label">W+ = {this.formatNumber(WPlus)}</div>
          </div>
          
          {/* Mean W marker and label */}
          <div class="marker-container mean-w" style={{ left: `${meanWPosition}%` }}>
            <div class="marker-line mean-w-line"></div>
            <div class="marker-label">Mean = {this.formatNumber(MeanW)}</div>
          </div>
          
          {/* W- marker and label */}
          <div class="marker-container w-minus" style={{ left: `${wMinusPosition}%` }}>
            <div class="marker-line w-minus-line"></div>
            <div class="marker-label">W- = {this.formatNumber(WMinus)}</div>
          </div>
          
        </div>
      </div>
    );
  }
  
  render() {
    let content;
    
    if (this.loading) {
      content = <div class="loading-spinner">Loading...</div>;
    } else if (this.error) {
      content = <div class="error-message">{this.error}</div>;
    } else if (!this.testData) {
      content = <div class="empty-data">No Paired Two Sample Wilcoxon signed rank test data available</div>;
    } else {
      const resultMessage = this.getResultMessage();
      const testTypeDisplay = this.getTestTypeDisplay();
      
      content = (
        <div class="wilcoxon-test-container">
          {/* Result Banner */}
          {!this.config.hideResultBanner && (
            <div class="result-banner">
              <span class="result-text">{resultMessage}</span>
            </div>
          )}
          
          {/* Test Parameters and Results */}
          <div class="test-parameters">
            {!this.config.hideDataSourceRow && (
              <div class="parameter-row">
                <span class="parameter-label">Data Source:</span>
                <span class="parameter-value">{this.testData.DataSourceName}</span>
              </div>
            )}
            
            {!this.config.hideSampleSource1Row && (
              <div class="parameter-row">
                <span class="parameter-label">First Measurement Source:</span>
                <span class="parameter-value">{this.testData.SampleSourceName1}</span>
              </div>
            )}
            
            {!this.config.hideSampleSource2Row && (
              <div class="parameter-row">
                <span class="parameter-label">Second Measurement Source:</span>
                <span class="parameter-value">{this.testData.SampleSourceName2}</span>
              </div>
            )}
            
            {!this.config.hideTestRow && (
              <div class="parameter-row">
                <span class="parameter-label">Test:</span>
                <span class="parameter-value">{testTypeDisplay}</span>
              </div>
            )}
            
            {!this.config.hideSampleSizeRow && (
              <div class="parameter-row">
                <span class="parameter-label">Sample size:</span>
                <span class="parameter-value">{this.testData.SampleSize}</span>
              </div>
            )}
            
            {!this.config.hideHasTiesRow && (
              <div class="parameter-row">
                <span class="parameter-label">Has ties:</span>
                <span class="parameter-value">{this.testData.HasTies ? 'Yes' : 'No'}</span>
              </div>
            )}
            
            {!this.config.hideHasNullPairsRow && (
              <div class="parameter-row">
                <span class="parameter-label">Has null pairs:</span>
                <span class="parameter-value">{this.testData.HasNullPairs ? 'Yes' : 'No'}</span>
              </div>
            )}
            
            {!this.config.hideConfidenceLevelRow && (
              <div class="parameter-row">
                <span class="parameter-label">Confidence Level:</span>
                <span class="parameter-value">{this.formatConfidenceLevel(this.testData.ConfidenceLevel)}</span>
              </div>
            )}
            
            {!this.config.hideContinuityCorrectionRow && (
              <div class="parameter-row">
                <span class="parameter-label">Continuity Correction:</span>
                <span class="parameter-value">{this.testData.ContinuityCorrection ? 'Yes' : 'No'}</span>
              </div>
            )}
            
            {!this.config.hideWPlusRow && (
              <div class="parameter-row">
                <span class="parameter-label">W+ (positive ranks):</span>
                <span class="parameter-value w-plus-value">{this.formatNumber(this.testData.WPlus)}</span>
              </div>
            )}
            
            {!this.config.hideWMinusRow && (
              <div class="parameter-row">
                <span class="parameter-label">W- (negative ranks):</span>
                <span class="parameter-value w-minus-value">{this.formatNumber(this.testData.WMinus)}</span>
              </div>
            )}
            
            {!this.config.hideWStatRow && (
              <div class="parameter-row">
                <span class="parameter-label">W Statistic:</span>
                <span class="parameter-value w-stat-value">{this.formatNumber(this.testData.WStat)}</span>
              </div>
            )}
            
            {!this.config.hideMeanWRow && (
              <div class="parameter-row">
                <span class="parameter-label">Mean W:</span>
                <span class="parameter-value mean-w-value">{this.formatNumber(this.testData.MeanW)}</span>
              </div>
            )}
            
            {!this.config.hideVarWRow && (
              <div class="parameter-row">
                <span class="parameter-label">Variance W:</span>
                <span class="parameter-value var-w-value">{this.formatNumber(this.testData.VarW)}</span>
              </div>
            )}
            
            {!this.config.hideWCriticalRow && this.testData.WCritical !== null && (
              <div class="parameter-row">
                <span class="parameter-label">W-Critical:</span>
                <span class="parameter-value w-critical-value">{this.formatNumber(this.testData.WCritical)}</span>
              </div>
            )}
            
            {!this.config.hideZValueRow && this.testData.ZValue !== null && (
              <div class="parameter-row">
                <span class="parameter-label">Z-Score:</span>
                <span class="parameter-value z-value">{this.formatZValue(this.testData.ZValue)}</span>
              </div>
            )}
            
            {!this.config.hidePValueRow && this.testData.PValue !== null && (
              <div class="parameter-row">
                <span class="parameter-label">p-Value:</span>
                <span class="parameter-value p-value">{this.formatPValue(this.testData.PValue)}</span>
              </div>
            )}
            
            <div class="parameter-row">
              <span class="parameter-label">Method:</span>
              <span class="parameter-value method-value">{this.getMethodDisplay()}</span>
            </div>
            
            {!this.config.hideReferenceValueRow && (
              <div class="parameter-row">
                <span class="parameter-label">Reference Value:</span>
                <span class="parameter-value reference-median-value">{this.formatNumber(this.testData.ReferenceValue)}</span>
              </div>
            )}
          </div>
          
          {/* Visual Range */}
          {!this.config.hideVisualRange && this.renderVisualRange()}
        </div>
      );
    }
    
    return (
      <Host>
        <base-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || this.config.analysisName || "Paired Two Sample Wilcoxon Signed Rank Test"}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="wilcoxon-test-widget-container">
            {content}
          </div>
        </base-widget>
      </Host>
    );
  }
}
