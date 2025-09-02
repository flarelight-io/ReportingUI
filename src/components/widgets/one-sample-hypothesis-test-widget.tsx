import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';

export interface OneSampleHypothesisTestWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
}

export interface HypothesisTestData {
  sampleSize: number;
  sampleMean: number;
  sampleStdDev: number;
  populationStdDev: number | null;
  populationMean: number;
  confidenceLevel: number;
  dataSourceName: string;
  sampleSourceName: string;
  testName: string;
  uCL: number;
  lCL: number;
  nullReject: boolean;
}

@Component({
  tag: 'one-sample-hypothesis-test-widget',
  styleUrl: 'one-sample-hypothesis-test-widget.scss',
  shadow: true
})
export class OneSampleHypothesisTestWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: OneSampleHypothesisTestWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  
  @State() loading: boolean = true;
  @State() testData: HypothesisTestData | null = null;
  
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
  configChanged(newValue: OneSampleHypothesisTestWidgetConfig, oldValue?: OneSampleHypothesisTestWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
  }
  
  // Process incoming data
  private processData(data: any[]) {
    if (data && Array.isArray(data) && data.length > 0) {
      // Extract the first element from the array (hypothesis test data)
      this.testData = data[0];
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
        widgetType: 'oneSampleHypothesisTest',
        widgetId: this.widgetId
      };
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch hypothesis test data:", error);
      this.loading = false;
    }
  }
  
  // Get the test type display name
  private getTestTypeDisplay(): string {
    if (!this.testData) return '';
    
    const testType = this.testData.populationStdDev ? 'z' : 't';
    return `One-Sample ${testType}-test (${this.testData.testName})`;
  }
  
  // Get the result message
  private getResultMessage(): string {
    if (!this.testData) return '';
    
    return this.testData.nullReject ? 'Significant difference' : 'No significant difference';
  }
  
  // Check if we should show LCL
  private shouldShowLCL(): boolean {
    if (!this.testData) return false;
    return this.testData.testName === 'Left Tailed' || this.testData.testName === 'Two Tailed';
  }
  
  // Check if we should show UCL
  private shouldShowUCL(): boolean {
    if (!this.testData) return false;
    return this.testData.testName === 'Right Tailed' || this.testData.testName === 'Two Tailed';
  }
  
  // Format confidence level for display
  private formatConfidenceLevel(level: number): string {
    return `${level}%`;
  }
  
  // Format number for display
  private formatNumber(value: number, decimals: number = 3): string {
    return value.toFixed(decimals);
  }
  
  // Render the visual range/slider
  private renderVisualRange() {
    if (!this.testData) return null;
    
    const { lCL, uCL, populationMean } = this.testData;
    const showLCL = this.shouldShowLCL();
    const showUCL = this.shouldShowUCL();
    
    // Calculate the range for the visual
    const minValue = showLCL ? Math.min(lCL, populationMean) : populationMean;
    const maxValue = showUCL ? Math.max(uCL, populationMean) : populationMean;
    const range = maxValue - minValue;
    
    // Add some padding to the range (20% on each side)
    const padding = Math.max(range * 0.2, 5);
    const visualMin = minValue - padding;
    const visualMax = maxValue + padding;
    const visualRange = visualMax - visualMin;
    
    // Calculate positions as percentages
    const lCLPosition = showLCL ? ((lCL - visualMin) / visualRange) * 100 : 0;
    const uCLPosition = showUCL ? ((uCL - visualMin) / visualRange) * 100 : 100;
    const populationMeanPosition = ((populationMean - visualMin) / visualRange) * 100;
    
    return (
      <div class="visual-range-container">
        <div class="range-line">
          {/* LCL marker and label */}
          {showLCL && (
            <div class="marker-container" style={{ left: `${lCLPosition}%` }}>
              <div class="marker-line"></div>
              <div class="marker-label">{this.formatNumber(lCL)}</div>
            </div>
          )}
          
          {/* Population mean marker and label */}
          <div class="marker-container population-mean" style={{ left: `${populationMeanPosition}%` }}>
            <div class="marker-line population-mean-line"></div>
            <div class="marker-label">{this.formatNumber(populationMean)}</div>
          </div>
          
          {/* UCL marker and label */}
          {showUCL && (
            <div class="marker-container" style={{ left: `${uCLPosition}%` }}>
              <div class="marker-line"></div>
              <div class="marker-label">{this.formatNumber(uCL)}</div>
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
              <span class="parameter-value">{this.testData.dataSourceName}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Sample Source:</span>
              <span class="parameter-value">{this.testData.sampleSourceName}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Test:</span>
              <span class="parameter-value">{testTypeDisplay}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Sample size:</span>
              <span class="parameter-value">{this.testData.sampleSize}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Confidence Level:</span>
              <span class="parameter-value">{this.formatConfidenceLevel(this.testData.confidenceLevel)}</span>
            </div>
            
            <div class="parameter-row">
              <span class="parameter-label">Reference Mean:</span>
              <span class="parameter-value">{this.formatNumber(this.testData.populationMean)}</span>
            </div>
            
            {this.shouldShowLCL() && (
              <div class="parameter-row">
                <span class="parameter-label">Lower Confidence Limit (LCL):</span>
                <span class="parameter-value lcl-value">{this.formatNumber(this.testData.lCL)}</span>
              </div>
            )}
            
            {this.shouldShowUCL() && (
              <div class="parameter-row">
                <span class="parameter-label">Upper Confidence Limit (UCL):</span>
                <span class="parameter-value ucl-value">{this.formatNumber(this.testData.uCL)}</span>
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
          widgetTitle={this.widgetTitle || this.config.analysisName || "Hypothesis Test"}
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
