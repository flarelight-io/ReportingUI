import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';

export interface BoxWhiskerNormalityPlotWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showOutliers?: boolean;
  boxWidth?: number;
}

@Component({
  tag: 'box-whisker-normality-plot-widget',
  styleUrl: 'box-whisker-normality-plot-widget.scss',
  shadow: true,
})
export class BoxWhiskerNormalityPlotWidget {
  @Element() el!: HTMLElement;

  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: BoxWhiskerNormalityPlotWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];

  @State() loading: boolean = true;
  @State() analysisData: any[] = [];
  @State() error: string | null = null;

  componentWillLoad() {
    // Set up event listeners for direct data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.analysisData = event.detail;
        this.loading = false;
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
      this.analysisData = this.data;
      this.loading = false;
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
  dataChanged(newData: any[]) {
    if (newData && newData.length > 0) {
      this.analysisData = newData;
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
        widgetType: 'boxWhiskerNormalityPlot',
        widgetId: this.widgetId,
      };

      const data = await this.fetchChartData(chartDataRequest);
      this.analysisData = data;
      this.error = null;
      this.loading = false;
    } catch (error) {
      console.error('Failed to fetch box-whisker normality plot data:', error);
      this.error = 'Failed to load data';
      this.loading = false;
    }
  }

  render() {
    if (this.loading) {
      return (
        <Host>
          <div class="box-whisker-normality-plot-widget-container">
            <div class="loading-spinner">Loading...</div>
          </div>
        </Host>
      );
    }

    if (this.error) {
      return (
        <Host>
          <div class="box-whisker-normality-plot-widget-container">
            <div class="error-message">{this.error}</div>
          </div>
        </Host>
      );
    }

    // Create a data-widget configuration for the box-whisker chart
    const chartConfig = {
      sourceId: this.config.analysisId,
      sourceName: this.config.analysisName || this.widgetTitle || 'Box-Whisker Normality Plot',
      visualizationType: 'box-whisker' as const,
      hideTitle: this.config.hideTitle || false,
      showLabels: this.config.showLabels !== false,
      showGrid: this.config.showGrid !== false,
      showLegend: this.config.showLegend !== false,
      showOutliers: this.config.showOutliers !== false,
      boxWidth: this.config.boxWidth || 0.8
    };

    return (
      <Host>
        <div class="box-whisker-normality-plot-widget-container">
          <data-widget
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle}
            config={chartConfig}
            data={this.analysisData}
            fetchChartData={this.fetchChartData}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            isViewer={this.isViewer}
            width={this.width}
            height={this.height}
          />
        </div>
      </Host>
    );
  }
}
