import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';

export interface KruskalWallisTestWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  hideResultBanner?: boolean;
  hideDataSourceRow?: boolean;
  hideSampleSourceNamesRow?: boolean;
  hideTestRow?: boolean;
  hideTotalNRow?: boolean;
  hideGroupCountRow?: boolean;
  hideDegreesOfFreedomRow?: boolean;
  hideConfidenceLevelRow?: boolean;
  hideSumRi2OverNiRow?: boolean;
  hideHRawRow?: boolean;
  hideCorrectionFactorRow?: boolean;
  hideHStatRow?: boolean;
  hidePValueRow?: boolean;
  hideHCriticalRow?: boolean;
  hideHasTiesRow?: boolean;
  hideVisualRange?: boolean;
}

export interface KruskalWallisTestData {
  TotalN: number;
  GroupCount: number;
  DegreesOfFreedom: number;
  SumRi2OverNi: number;
  HRaw: number;
  CorrectionFactor: number;
  HStat: number;
  HasTies: boolean;
  DataSourceName: string;
  SampleSourceNames: string;
  ConfidenceLevel: number;
  PValue: number | null;
  HCritical: number | null;
  NullReject: boolean | null;
}

@Component({
  tag: 'kruskal-wallis-test-widget',
  styleUrl: 'kruskal-wallis-test-widget.scss',
  shadow: true
})
export class KruskalWallisTestWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: KruskalWallisTestWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  
  @State() loading: boolean = true;
  @State() testData: KruskalWallisTestData | null = null;
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
  configChanged(newValue: KruskalWallisTestWidgetConfig, oldValue?: KruskalWallisTestWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
  }
  
  // Process incoming data
  private processData(data: any[]) {
    try {
      if (data && Array.isArray(data) && data.length > 0) {
        // Extract the first element from the array (Kruskal-Wallis test data)
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
      const chartDataRequest: ChartDataRequest = {
        reportId: this.reportId,
        sourceId: this.config.analysisId,
        sourceType: 'AnalysisResult', 
        valueFields: [],
        groupByFields: [],
        labelFields: [],
        filters: [],
        isViewer: this.isViewer || false,
        widgetType: 'kruskalWallisTest',
        widgetId: this.widgetId
      };
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch Kruskal-Wallis test data:", error);
      this.error = 'Failed to load data';
      this.loading = false;
    }
  }
  
  // Get the test type display name
  private getTestTypeDisplay(): string {
    if (!this.testData) return '';
    
    return `Kruskal-Wallis Test`;
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
  
  // Format h-critical for display
  private formatHCritical(hCritical: number | null): string {
    if (hCritical === null) return 'N/A';
    return this.formatNumber(hCritical);
  }
  
  private getMethodDisplay(): string {
    if (this.testData?.HasTies) {
      return 'Tie-corrected';
    }
    return 'Standard';
  }
  
  // Format sample sources to prevent widget breaking with too many sources
  private formatSampleSources(sampleSources: string): string {
    if (!sampleSources) return 'N/A';
    
    // Split by common delimiters and clean up
    const sources = sampleSources.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (sources.length <= 3) {
      // If 3 or fewer sources, show them all
      return sources.join(', ');
    } else if (sources.length <= 6) {
      // If 4-6 sources, show first 3 and indicate more
      return `${sources.slice(0, 3).join(', ')} (+${sources.length - 3} more)`;
    } else {
      // If more than 6 sources, show first 2 and count
      return `${sources.slice(0, 2).join(', ')} (+${sources.length - 2} more)`;
    }
  }
  
  // Render the visual range/slider for H statistics
  private renderVisualRange() {
    if (!this.testData) return null;
    
    const { HStat, HCritical } = this.testData;
    
    // Only show visual range if we have both HStat and HCritical
    if (HStat === null || HCritical === null) return null;
    
    // Calculate the range for the visual
    const minValue = Math.min(HStat, HCritical);
    const maxValue = Math.max(HStat, HCritical);
    const range = maxValue - minValue;
    
    // For very small ranges, use a minimum visual range to spread out close values
    const minVisualRange = Math.max(range, Math.abs(HStat) * 0.1, 1);
    
    // Add padding to the range (20% on each side, but ensure minimum spread)
    const padding = Math.max(minVisualRange * 0.2, minVisualRange * 0.1);
    const visualMin = minValue - padding;
    const visualMax = maxValue + padding;
    const visualRange = visualMax - visualMin;
    
    // Calculate positions as percentages
    const hStatPosition = ((HStat - visualMin) / visualRange) * 100;
    const hCriticalPosition = ((HCritical - visualMin) / visualRange) * 100;
    
    return (
      <div class="visual-range-container">
        <div class="range-line">
          {/* H Statistic marker and label */}
          <div class="marker-container h-stat" style={{ left: `${hStatPosition}%` }}>
            <div class="marker-line h-stat-line"></div>
            <div class="marker-label">H-Statistics = {this.formatNumber(HStat)}</div>
          </div>
          
          {/* H Critical marker and label */}
          <div class="marker-container h-critical" style={{ left: `${hCriticalPosition}%` }}>
            <div class="marker-line h-critical-line"></div>
            <div class="marker-label">H-Critical = {this.formatNumber(HCritical)}</div>
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
      content = <div class="empty-data">No Kruskal-Wallis test data available</div>;
    } else {
      const resultMessage = this.getResultMessage();
      const testTypeDisplay = this.getTestTypeDisplay();
      
      content = (
        <div class="kruskal-wallis-test-container">
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
            
            {!this.config.hideSampleSourceNamesRow && (
              <div class="parameter-row">
                <span class="parameter-label">Sample Sources:</span>
                <span class="parameter-value">{this.formatSampleSources(this.testData.SampleSourceNames)}</span>
              </div>
            )}
            
            {!this.config.hideTestRow && (
              <div class="parameter-row">
                <span class="parameter-label">Test:</span>
                <span class="parameter-value">{testTypeDisplay}</span>
              </div>
            )}
            
            {!this.config.hideTotalNRow && (
              <div class="parameter-row">
                <span class="parameter-label">Total N:</span>
                <span class="parameter-value">{this.testData.TotalN}</span>
              </div>
            )}
            
            {!this.config.hideGroupCountRow && (
              <div class="parameter-row">
                <span class="parameter-label">Group Count:</span>
                <span class="parameter-value">{this.testData.GroupCount}</span>
              </div>
            )}
            
            {!this.config.hideDegreesOfFreedomRow && (
              <div class="parameter-row">
                <span class="parameter-label">Degrees of Freedom:</span>
                <span class="parameter-value">{this.testData.DegreesOfFreedom}</span>
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
            
            {!this.config.hideSumRi2OverNiRow && (
              <div class="parameter-row">
                <span class="parameter-label">Sum Ri²/Ni:</span>
                <span class="parameter-value sum-ri2-ni-value">{this.formatNumber(this.testData.SumRi2OverNi)}</span>
              </div>
            )}
            
            {!this.config.hideHRawRow && (
              <div class="parameter-row">
                <span class="parameter-label">H-Raw:</span>
                <span class="parameter-value h-raw-value">{this.formatNumber(this.testData.HRaw)}</span>
              </div>
            )}
            
            {!this.config.hideCorrectionFactorRow && (
              <div class="parameter-row">
                <span class="parameter-label">Tie correction:</span>
                <span class="parameter-value correction-factor-value">{this.formatNumber(this.testData.CorrectionFactor)}</span>
              </div>
            )}
            
            {!this.config.hideHStatRow && (
              <div class="parameter-row">
                <span class="parameter-label">H-Statistics:</span>
                <span class="parameter-value h-stat-value">{this.formatNumber(this.testData.HStat)}</span>
              </div>
            )}
            
            {!this.config.hideHCriticalRow && this.testData.HCritical !== null && (
              <div class="parameter-row">
                <span class="parameter-label">H-Critical:</span>
                <span class="parameter-value h-critical-value">{this.formatHCritical(this.testData.HCritical)}</span>
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
          widgetTitle={this.widgetTitle || this.config.analysisName || "Kruskal-Wallis Test"}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="kruskal-wallis-test-widget-container">
            {content}
          </div>
        </base-widget>
      </Host>
    );
  }
}
