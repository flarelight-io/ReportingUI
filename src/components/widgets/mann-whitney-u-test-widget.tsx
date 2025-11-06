import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequestBuilder } from '../../utils/chart-data-request-builder';

export interface MannWhitneyUTestWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  hideResultBanner?: boolean;
  hideDataSourceRow?: boolean;
  hideSampleSource1Row?: boolean;
  hideSampleSource2Row?: boolean;
  hideTestRow?: boolean;
  hideN1Row?: boolean;
  hideN2Row?: boolean;
  hideConfidenceLevelRow?: boolean;
  hideExpectedDifferenceRow?: boolean;
  hideW1Row?: boolean;
  hideW2Row?: boolean;
  hideU1Row?: boolean;
  hideU2Row?: boolean;
  hideUStatRow?: boolean;
  hideMeanURow?: boolean;
  hideVarURow?: boolean;
  hideZValueRow?: boolean;
  hidePValueRow?: boolean;
  hideUCriticalRow?: boolean;
  hideHasTiesRow?: boolean;
  hideContinuityCorrectionRow?: boolean;
  hideVisualRange?: boolean;
}

export interface MannWhitneyUTestData {
  N1: number;
  N2: number;
  W1: number;
  W2: number;
  U1: number;
  U2: number;
  UStat: number;
  MeanU: number;
  VarU: number;
  HasTies: boolean;
  DataSourceName: string;
  SampleSourceName1: string;
  SampleSourceName2: string;
  TestName: string;
  ConfidenceLevel: number;
  ExpectedDifference: number;
  ContinuityCorrection: boolean;
  ZValue: number | null;
  PValue: number | null;
  UCritical: number | null;
  NullReject: boolean | null;
}

@Component({
  tag: 'mann-whitney-u-test-widget',
  styleUrl: 'mann-whitney-u-test-widget.scss',
  shadow: true
})
export class MannWhitneyUTestWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: MannWhitneyUTestWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  
  @State() loading: boolean = true;
  @State() testData: MannWhitneyUTestData | null = null;
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
  configChanged(newValue: MannWhitneyUTestWidgetConfig, oldValue?: MannWhitneyUTestWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
  }
  
  // Process incoming data
  private processData(data: any[]) {
    try {
      if (data && Array.isArray(data) && data.length > 0) {
        // Extract the first element from the array (Mann-Whitney U test data)
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
        'mannWhitneyUTest',
        this.isViewer || false
      );
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch Mann-Whitney U test data:", error);
      this.error = 'Failed to load data';
      this.loading = false;
    }
  }
  
  // Get the test type display name
  private getTestTypeDisplay(): string {
    if (!this.testData) return '';
    
    return `Mann-Whitney U Test (${this.testData.TestName})`;
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
  
  // Render the visual range/slider for U statistics
  private renderVisualRange() {
    if (!this.testData) return null;
    
    const { U1, U2, MeanU } = this.testData;
    
    // Calculate the range for the visual
    const minValue = Math.min(U1, U2, MeanU);
    const maxValue = Math.max(U1, U2, MeanU);
    const range = maxValue - minValue;
    
    // For very small ranges, use a minimum visual range to spread out close values
    const minVisualRange = Math.max(range, Math.abs(MeanU) * 0.1, 1);
    
    // Add padding to the range (20% on each side, but ensure minimum spread)
    const padding = Math.max(minVisualRange * 0.2, minVisualRange * 0.1);
    const visualMin = minValue - padding;
    const visualMax = maxValue + padding;
    const visualRange = visualMax - visualMin;
    
    // Calculate positions as percentages
    const u1Position = ((U1 - visualMin) / visualRange) * 100;
    const u2Position = ((U2 - visualMin) / visualRange) * 100;
    const meanUPosition = ((MeanU - visualMin) / visualRange) * 100;
    
    return (
      <div class="visual-range-container">
        <div class="range-line">
          {/* U1 marker and label */}
          <div class="marker-container u1" style={{ left: `${u1Position}%` }}>
            <div class="marker-line u1-line"></div>
            <div class="marker-label">U1 = {this.formatNumber(U1)}</div>
          </div>
          
          {/* Mean U marker and label */}
          <div class="marker-container mean-u" style={{ left: `${meanUPosition}%` }}>
            <div class="marker-line mean-u-line"></div>
            <div class="marker-label">Mean = {this.formatNumber(MeanU)}</div>
          </div>
          
          {/* U2 marker and label */}
          <div class="marker-container u2" style={{ left: `${u2Position}%` }}>
            <div class="marker-line u2-line"></div>
            <div class="marker-label">U2 = {this.formatNumber(U2)}</div>
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
      content = <div class="empty-data">No Mann-Whitney U test data available</div>;
    } else {
      const resultMessage = this.getResultMessage();
      const testTypeDisplay = this.getTestTypeDisplay();
      
      content = (
        <div class="mann-whitney-test-container">
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
                <span class="parameter-label">First Sample Source:</span>
                <span class="parameter-value">{this.testData.SampleSourceName1}</span>
              </div>
            )}
            
            {!this.config.hideSampleSource2Row && (
              <div class="parameter-row">
                <span class="parameter-label">Second Sample Source:</span>
                <span class="parameter-value">{this.testData.SampleSourceName2}</span>
              </div>
            )}
            
            {!this.config.hideTestRow && (
              <div class="parameter-row">
                <span class="parameter-label">Test:</span>
                <span class="parameter-value">{testTypeDisplay}</span>
              </div>
            )}
            
            {!this.config.hideN1Row && (
              <div class="parameter-row">
                <span class="parameter-label">Sample size 1 (N1):</span>
                <span class="parameter-value">{this.testData.N1}</span>
              </div>
            )}
            
            {!this.config.hideN2Row && (
              <div class="parameter-row">
                <span class="parameter-label">Sample size 2 (N2):</span>
                <span class="parameter-value">{this.testData.N2}</span>
              </div>
            )}
            
            {!this.config.hideHasTiesRow && (
              <div class="parameter-row">
                <span class="parameter-label">Has ties:</span>
                <span class="parameter-value">{this.testData.HasTies ? 'Yes' : 'No'}</span>
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
            
            {!this.config.hideW1Row && (
              <div class="parameter-row">
                <span class="parameter-label">W1 (ranks for sample 1):</span>
                <span class="parameter-value w1-value">{this.formatNumber(this.testData.W1)}</span>
              </div>
            )}
            
            {!this.config.hideW2Row && (
              <div class="parameter-row">
                <span class="parameter-label">W2 (ranks for sample 2):</span>
                <span class="parameter-value w2-value">{this.formatNumber(this.testData.W2)}</span>
              </div>
            )}
            
            {!this.config.hideU1Row && (
              <div class="parameter-row">
                <span class="parameter-label">U1 (Mann-Whitney U for sample 1):</span>
                <span class="parameter-value u1-value">{this.formatNumber(this.testData.U1)}</span>
              </div>
            )}
            
            {!this.config.hideU2Row && (
              <div class="parameter-row">
                <span class="parameter-label">U2 (Mann-Whitney U for sample 2):</span>
                <span class="parameter-value u2-value">{this.formatNumber(this.testData.U2)}</span>
              </div>
            )}
            
            {!this.config.hideUStatRow && (
              <div class="parameter-row">
                <span class="parameter-label">U Statistic:</span>
                <span class="parameter-value u-stat-value">{this.formatNumber(this.testData.UStat)}</span>
              </div>
            )}
            
            {!this.config.hideMeanURow && (
              <div class="parameter-row">
                <span class="parameter-label">Mean U:</span>
                <span class="parameter-value mean-u-value">{this.formatNumber(this.testData.MeanU)}</span>
              </div>
            )}
            
            {!this.config.hideVarURow && (
              <div class="parameter-row">
                <span class="parameter-label">Variance U:</span>
                <span class="parameter-value var-u-value">{this.formatNumber(this.testData.VarU)}</span>
              </div>
            )}
            
            {!this.config.hideUCriticalRow && this.testData.UCritical !== null && (
              <div class="parameter-row">
                <span class="parameter-label">U-Critical:</span>
                <span class="parameter-value u-critical-value">{this.formatNumber(this.testData.UCritical)}</span>
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
            
            {!this.config.hideExpectedDifferenceRow && (
              <div class="parameter-row">
                <span class="parameter-label">Expected Difference:</span>
                <span class="parameter-value expected-difference-value">{this.formatNumber(this.testData.ExpectedDifference)}</span>
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
          widgetTitle={this.widgetTitle || this.config.analysisName || "Mann-Whitney U Test"}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="mann-whitney-test-widget-container">
            {content}
          </div>
        </base-widget>
      </Host>
    );
  }
}
