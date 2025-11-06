import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequestBuilder } from '../../utils/chart-data-request-builder';

export interface AndersonDarlingNormalityTestWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  hideResultBanner?: boolean;
  hideDataSourceRow?: boolean;
  hideSampleSourceRow?: boolean;
  hideSampleSizeRow?: boolean;
  hideMissingCountRow?: boolean;
  hideMeanRow?: boolean;
  hideStdDevRow?: boolean;
  hideConfidenceLevelRow?: boolean;
  hideA2Row?: boolean;
  hideA2StarRow?: boolean;
  hidePValueRow?: boolean;
  hideA2StarCriticalRow?: boolean;
  hideNullRejectRow?: boolean;
}

export interface AndersonDarlingNormalityTestData {
  SampleSize: number;
  MissingCount: number;
  Mean: number;
  StdDev: number;
  DataSourceName: string;
  SampleSourceName: string;
  ConfidenceLevel: number;
  A2: number | null;
  A2Star: number | null;
  PValue: number | null;
  A2StarCritical: number | null;
  NullReject: boolean | null;
}

@Component({
  tag: 'anderson-darling-normality-test-widget',
  styleUrl: 'anderson-darling-normality-test-widget.scss',
  shadow: true,
})
export class AndersonDarlingNormalityTestWidget {
  @Element() el!: HTMLElement;

  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: AndersonDarlingNormalityTestWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];

  @State() loading: boolean = true;
  @State() testData: AndersonDarlingNormalityTestData | null = null;
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
  configChanged(newValue: AndersonDarlingNormalityTestWidgetConfig, oldValue?: AndersonDarlingNormalityTestWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
  }

  // Process incoming data
  private processData(data: any[]) {
    try {
      if (data && Array.isArray(data) && data.length > 0) {
        // Extract the first element from the array (Anderson-Darling normality test data)
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
      if (!this.reportId) {
        throw new Error('reportId is required');
      }
      
      const chartDataRequest = ChartDataRequestBuilder.buildForAnalysisWidget(
        this.reportId,
        this.config.analysisId,
        this.widgetId,
        'andersonDarlingNormalityTest',
        this.isViewer || false
      );

      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error('Failed to fetch Anderson-Darling normality test data:', error);
      this.error = 'Failed to load data';
      this.loading = false;
    }
  }

  // Get the result message
  private getResultMessage(): string {
    if (!this.testData || this.testData.NullReject === null) return '';

    return this.testData.NullReject ? 'Significant departure from normality' : 'No significant departure from normality';
  }

  // Get the result banner class
  private getResultBannerClass(): string {
    if (!this.testData || this.testData.NullReject === null) return '';

    return this.testData.NullReject ? 'significant' : 'not-significant';
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
  private formatPValue(pValue: number): string {
    if (pValue < 0.001) {
      return pValue.toExponential(2);
    } else if (pValue < 0.01) {
      return this.formatNumber(pValue);
    } else {
      return this.formatNumber(pValue);
    }
  }

  render() {
    let content;

    if (this.loading) {
      content = <div class="loading-spinner">Loading...</div>;
    } else if (this.error) {
      content = <div class="error-message">{this.error}</div>;
    } else if (!this.testData) {
      content = <div class="empty-data">No data available</div>;
    } else {
      const resultMessage = this.getResultMessage();
      const resultBannerClass = this.getResultBannerClass();

      content = (
        <div class="anderson-darling-test-container">
          {/* Result Banner */}
          {!this.config.hideResultBanner && resultMessage && (
            <div class={`result-banner ${resultBannerClass}`}>
              <span class="result-text">{resultMessage}</span>
            </div>
          )}

          {/* Test Parameters and Results */}
          {!this.config.hideDataSourceRow && (
            <div class="parameter-row">
              <span class="parameter-label">Data Source:</span>
              <span class="parameter-value">{this.testData.DataSourceName}</span>
            </div>
          )}

          {!this.config.hideSampleSourceRow && (
            <div class="parameter-row">
              <span class="parameter-label">Sample Source:</span>
              <span class="parameter-value">{this.testData.SampleSourceName}</span>
            </div>
          )}

          <div class="test-parameters">
            <div class="parameter-row">
              <span class="parameter-label">Test:</span>
              <span class="parameter-value">Anderson-Darling Normality Test</span>
            </div>

            {!this.config.hideSampleSizeRow && (
              <div class="parameter-row">
                <span class="parameter-label">Sample size:</span>
                <span class="parameter-value">{this.testData.SampleSize}</span>
              </div>
            )}

            {!this.config.hideMissingCountRow && (
              <div class="parameter-row">
                <span class="parameter-label">Missing Count:</span>
                <span class="parameter-value">{this.testData.MissingCount}</span>
              </div>
            )}

            {!this.config.hideMeanRow && (
              <div class="parameter-row">
                <span class="parameter-label">Mean:</span>
                <span class="parameter-value">{this.formatNumber(this.testData.Mean)}</span>
              </div>
            )}

            {!this.config.hideStdDevRow && (
              <div class="parameter-row">
                <span class="parameter-label">Standard Deviation:</span>
                <span class="parameter-value">{this.formatNumber(this.testData.StdDev)}</span>
              </div>
            )}

            {!this.config.hideConfidenceLevelRow && (
              <div class="parameter-row">
                <span class="parameter-label">Confidence Level:</span>
                <span class="parameter-value">{this.formatConfidenceLevel(this.testData.ConfidenceLevel)}</span>
              </div>
            )}

            {!this.config.hideA2Row && this.testData.A2 !== null && (
              <div class="parameter-row">
                <span class="parameter-label">A²:</span>
                <span class="parameter-value">{this.formatNumber(this.testData.A2)}</span>
              </div>
            )}

            {!this.config.hideA2StarRow && this.testData.A2Star !== null && (
              <div class="parameter-row">
                <span class="parameter-label">Stephens correction for normality (A²*):</span>
                <span class="parameter-value">{this.formatNumber(this.testData.A2Star)}</span>
              </div>
            )}

            {!this.config.hideA2StarCriticalRow && this.testData.A2StarCritical !== null && (
              <div class="parameter-row">
                <span class="parameter-label">A²*-Critical:</span>
                <span class="parameter-value">{this.formatNumber(this.testData.A2StarCritical)}</span>
              </div>
            )}

            {!this.config.hidePValueRow && this.testData.PValue !== null && (
              <div class="parameter-row">
                <span class="parameter-label">p-Value:</span>
                <span class="parameter-value">{this.formatPValue(this.testData.PValue)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <Host>
        <base-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || this.config.analysisName || 'Anderson-Darling Normality Test'}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="anderson-darling-test-widget-container">{content}</div>
        </base-widget>
      </Host>
    );
  }
}
