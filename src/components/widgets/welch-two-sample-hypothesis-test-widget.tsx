import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';

export interface WelchTwoSampleHypothesisTestWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
}

export interface WelchTwoSampleHypothesisTestData {
  SampleSizeGroup1: number;
  SampleSizeGroup2: number;
  SampleMeanGroup1: number;
  SampleMeanGroup2: number;
  SampleStdDevGroup1: number;
  SampleStdDevGroup2: number;
  ConfidenceLevel: number;
  DataSourceName: string;
  SampleSourceNameGroup1: string;
  SampleSourceNameGroup2: string;
  TestName: 'LeftTailed' | 'RightTailed' | 'TwoTailed';
  UCL: number;
  LCL: number;
  NullReject: boolean;
}

@Component({
  tag: 'welch-two-sample-hypothesis-test-widget',
  styleUrl: 'welch-two-sample-hypothesis-test-widget.scss',
  shadow: true
})
export class WelchTwoSampleHypothesisTestWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: WelchTwoSampleHypothesisTestWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  
  @State() loading: boolean = true;
  @State() testData: WelchTwoSampleHypothesisTestData | null = null;
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
  configChanged(newValue: WelchTwoSampleHypothesisTestWidgetConfig, oldValue?: WelchTwoSampleHypothesisTestWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
  }
  
  // Process incoming data
  private processData(data: any[]) {
    try {
      if (data && Array.isArray(data) && data.length > 0) {
        // Extract the first element from the array (hypothesis test data)
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
    
    try {
      this.loading = true;
      
      // Use the standard getChartData method
      const chartDataRequest: ChartDataRequest = {
        reportId: this.reportId,
        sourceId: this.config.analysisId,
        sourceType: 'AnalysisResult', 
        valueFields: [],
        groupByFields: [],
        labelFields: [],
        filters: [],
        isViewer: this.isViewer || false,
        widgetType: 'welchTwoSampleHypothesisTest',
        widgetId: this.widgetId
      };
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch Welch's two-sample hypothesis test data:", error);
      this.error = 'Failed to load data';
      this.loading = false;
    }
  }
  
  // Get the test type display name - always returns Welch's Two Sample t-test
  private getTestTypeDisplay(): string {
    if (!this.testData) return '';
    
    return `Welch's Two Sample t-test (${this.testData.TestName})`;
  }
  
  // Get the result message
  private getResultMessage(): string {
    if (!this.testData) return '';
    
    return this.testData.NullReject ? 'Significant difference' : 'No significant difference';
  }
  
  // Check if we should show LCL
  private shouldShowLCL(): boolean {
    if (!this.testData) return false;
    return this.testData.TestName === 'LeftTailed' || this.testData.TestName === 'TwoTailed';
  }
  
  // Check if we should show UCL
  private shouldShowUCL(): boolean {
    if (!this.testData) return false;
    return this.testData.TestName === 'RightTailed' || this.testData.TestName === 'TwoTailed';
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
  private formatNumber(value: number, decimals: number = 3): string {
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
  
  // Render the visual range/slider
  private renderVisualRange() {
    if (!this.testData) return null;
    
    const { LCL, UCL, SampleMeanGroup1, SampleMeanGroup2 } = this.testData;
    const showLCL = this.shouldShowLCL();
    const showUCL = this.shouldShowUCL();
    
    // Calculate the means difference
    const meansDifference = SampleMeanGroup1 - SampleMeanGroup2;
    
    // Calculate the range for the visual, always include 0
    const minValue = showLCL ? Math.min(LCL, meansDifference, 0) : Math.min(meansDifference, 0);
    const maxValue = showUCL ? Math.max(UCL, meansDifference, 0) : Math.max(meansDifference, 0);
    const range = maxValue - minValue;
    
    // For very small ranges, use a minimum visual range to spread out close values
    const minVisualRange = Math.max(range, Math.abs(meansDifference) * 0.1, 1);
    
    // Add padding to the range (20% on each side, but ensure minimum spread)
    const padding = Math.max(minVisualRange * 0.2, minVisualRange * 0.1);
    const visualMin = minValue - padding;
    const visualMax = maxValue + padding;
    const visualRange = visualMax - visualMin;
    
    // Calculate positions as percentages
    const lCLPosition = showLCL ? ((LCL - visualMin) / visualRange) * 100 : 0;
    const uCLPosition = showUCL ? ((UCL - visualMin) / visualRange) * 100 : 100;
    const meansDifferencePosition = ((meansDifference - visualMin) / visualRange) * 100;
    const zeroPosition = ((0 - visualMin) / visualRange) * 100;
    
    return (
      <div class="visual-range-container">
        <div class="range-line">
          {/* LCL marker and label */}
          {showLCL && (
            <div class="marker-container" style={{ left: `${lCLPosition}%` }}>
              <div class="marker-line"></div>
              <div class="marker-label">{this.formatNumber(LCL)}</div>
            </div>
          )}
          
          {/* Zero marker and label */}
          <div class="marker-container zero-marker" style={{ left: `${zeroPosition}%` }}>
            <div class="marker-line zero-line"></div>
            <div class="marker-label zero-label">0</div>
          </div>
          
          {/* Means difference marker and label */}
          <div class="marker-container group-mean group1" style={{ left: `${meansDifferencePosition}%` }}>
            <div class="marker-line group-mean-line group1"></div>
            <div class="marker-label group1-label">Means Difference: {this.formatNumber(meansDifference)}</div>
          </div>
          
          {/* UCL marker and label */}
          {showUCL && (
            <div class="marker-container" style={{ left: `${uCLPosition}%` }}>
              <div class="marker-line"></div>
              <div class="marker-label">{this.formatNumber(UCL)}</div>
            </div>
          )}
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
      content = <div class="empty-data">No hypothesis test data available</div>;
    } else {
      const resultMessage = this.getResultMessage();
      const testTypeDisplay = this.getTestTypeDisplay();
      
      content = (
        <div class="hypothesis-test-container">
          {/* Result Banner */}
          <div class="result-banner">
            <span class="result-text">{resultMessage}</span>
          </div>
          
          {/* Test Parameters and Results */}
          <div class="test-parameters">
            <div class="parameter-row">
              <span class="parameter-label">Data Source:</span>
              <span class="parameter-value">{this.testData.DataSourceName}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Group 1 Sample Source:</span>
              <span class="parameter-value">{this.testData.SampleSourceNameGroup1}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Group 2 Sample Source:</span>
              <span class="parameter-value">{this.testData.SampleSourceNameGroup2}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Test:</span>
              <span class="parameter-value">{testTypeDisplay}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Group 1 Sample Size:</span>
              <span class="parameter-value">{this.testData.SampleSizeGroup1}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Group 2 Sample Size:</span>
              <span class="parameter-value">{this.testData.SampleSizeGroup2}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Confidence Level:</span>
              <span class="parameter-value">{this.formatConfidenceLevel(this.testData.ConfidenceLevel)}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Means Difference:</span>
              <span class="parameter-value">{this.formatNumber(this.testData.SampleMeanGroup1 - this.testData.SampleMeanGroup2)}</span>
            </div>
            
            {this.shouldShowLCL() && (
              <div class="parameter-row">
                <span class="parameter-label">Lower Confidence Limit (LCL):</span>
                <span class="parameter-value lcl-value">{this.formatNumber(this.testData.LCL)}</span>
              </div>
            )}
            
            {this.shouldShowUCL() && (
              <div class="parameter-row">
                <span class="parameter-label">Upper Confidence Limit (UCL):</span>
                <span class="parameter-value ucl-value">{this.formatNumber(this.testData.UCL)}</span>
              </div>
            )}
          </div>
          
          {/* Visual Range */}
          {this.renderVisualRange()}
        </div>
      );
    }
    
    return (
      <Host>
        <base-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || this.config.analysisName || "Welch's Two Sample Hypothesis Test"}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="hypothesis-test-widget-container">
            {content}
          </div>
        </base-widget>
      </Host>
    );
  }
}
