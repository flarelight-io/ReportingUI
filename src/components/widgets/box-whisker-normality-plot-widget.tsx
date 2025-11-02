import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';
import { ColorTheme } from '../../utils/chart-theme';

export interface BoxWhiskerNormalityPlotWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showOutliers?: boolean;
  boxWidth?: number;
  colorTheme?: ColorTheme; // Widget-level color theme override
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
  @Prop() availableSources: any[] = [];
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  @Prop() colorTheme: ColorTheme = "brand";

  @State() loading: boolean = true;
  @State() analysisData: any[] = [];
  @State() error: string | null = null;

  private isMounted: boolean = false;
  private lastFetchTimestamp: number = 0;
  private fetchInProgress: boolean = false;

  connectedCallback() {
    this.isMounted = true;
    
    // Setup listener for direct data updates via events
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.analysisData = event.detail;
        this.loading = false;
        this.error = null;
      } else {
        // If detail is null, it means we should refetch the data
        this.fetchData(true); // Force refresh
      }
    });

    // Setup listener for color theme changes
    this.el.addEventListener('colorThemeChange', (event: CustomEvent) => {
      if (event.detail && event.detail.colorTheme) {
        this.colorTheme = event.detail.colorTheme;
      }
    });

    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail) {
        // Handle any config updates if needed
      }
    });

    // Add listeners for filter clearing and application
    window.addEventListener('filters-cleared', () => {
      this.fetchData(true);
    });
    
    window.addEventListener('filters-applied', () => {
      this.fetchData(true);
    });

    // Check if we have data from props
    if (this.data && this.data.length > 0) {
      this.analysisData = this.data;
      this.loading = false;
      this.error = null;
    } else if (this.config && this.config.analysisId) {
      this.fetchData();
    } else {
      this.loading = false;
      this.error = null;
    }
  }

  disconnectedCallback() {
    this.isMounted = false;
    
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('colorThemeChange', null);
    this.el.removeEventListener('configUpdate', null);
    window.removeEventListener('filters-cleared', null);
    window.removeEventListener('filters-applied', null);
  }

  @Watch('data')
  dataChanged(newData: any[]) {
    if (newData && newData.length > 0) {
      this.analysisData = newData;
      this.loading = false;
      this.error = null;
    }
  }

  @Watch('colorTheme')
  colorThemeChanged() {
    // Force re-render when color theme changes
    // The data-widget will pick up the new theme
  }

  @Watch('config')
  configChanged(newValue: BoxWhiskerNormalityPlotWidgetConfig, oldValue?: BoxWhiskerNormalityPlotWidgetConfig) {
    // Handle config changes more robustly
    if (!newValue || !newValue.analysisId) {
      // Config was cleared or is invalid - don't fetch data
      console.warn(`Box-whisker widget ${this.widgetId}: Config was cleared or invalid`, { newValue, oldValue });
      this.loading = false;
      this.error = null;
      return;
    }
    
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      console.log(`Box-whisker widget ${this.widgetId}: Config analysisId changed from ${oldValue?.analysisId} to ${newValue.analysisId}`);
      this.fetchData(true);
    }
  }

  private async fetchData(forceRefresh: boolean = false) {
    if (!this.config || !this.config.analysisId) {
      this.loading = false;
      this.error = null;
      return;
    }

    // Throttle fetch calls and prevent concurrent fetches
    const now = Date.now();
    if (!forceRefresh && now - this.lastFetchTimestamp < 300) {
      return;
    }
    
    if (!forceRefresh && this.fetchInProgress) {
      return;
    }
    
    this.lastFetchTimestamp = now;
    this.fetchInProgress = true;

    // Skip if component is not mounted
    if (!this.isMounted) {
      this.loading = false;
      this.fetchInProgress = false;
      return;
    }

    try {
      this.loading = true;
      this.error = null;

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
    } finally {
      this.fetchInProgress = false;
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

    // Determine effective color theme: widget-level override takes precedence over report-level default
    const effectiveColorTheme = this.config.colorTheme || this.colorTheme;

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
      boxWidth: this.config.boxWidth || 0.8,
      colorTheme: effectiveColorTheme // Pass effective theme to data-widget config
    };

    return (
      <Host>
        <div class="box-whisker-normality-plot-widget-container">
          <data-widget
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle}
            config={chartConfig}
            availableSources={this.availableSources}
            data={this.analysisData}
            fetchChartData={this.fetchChartData}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            isViewer={this.isViewer}
            width={this.width}
            height={this.height}
            colorTheme={effectiveColorTheme}
          />
        </div>
      </Host>
    );
  }
}
