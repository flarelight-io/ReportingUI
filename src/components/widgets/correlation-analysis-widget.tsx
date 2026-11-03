import { Component, Prop, h, Host, State, Watch, Element, Event, EventEmitter } from '@stencil/core';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../utils/chart-theme';
import { placeTooltip } from '../../utils/tooltip';
import { PlotSizeTracker, clipLabel, fitRotatedLabels } from '../../utils/bar-layout';
import { ChartDataRequestBuilder } from '../../utils/chart-data-request-builder';

export interface CorrelationAnalysisWidgetConfig {
  analysisId?: string;
  analysisName?: string;
  hideTitle?: boolean;
  showLabels?: boolean;
  kpiFormatType?: 'number' | 'percentage';
  kpiPrefix?: string;
  kpiSuffix?: string;
  colorScale?: string[];
}



interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'correlation-analysis-widget',
  styleUrl: 'correlation-analysis-widget.scss',
  shadow: true
})
export class CorrelationAnalysisWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer: boolean = false;
  @Prop() config: CorrelationAnalysisWidgetConfig = {};
  @Prop() fetchChartData: Function;
  @Prop() data: any[] = [];
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() loading: boolean = true;
  @State() correlationData: any[] = [];
  @State() fields: string[] = [];
  @State() isKpiMode: boolean = false;
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
  @State() plotWidth: number = 0;
  @State() plotHeight: number = 0;
  
  @Event() filterChange: EventEmitter<{ sourceId: string; field: string; value: any }>;
  
  private plotSize = new PlotSizeTracker(({ width, height }) => {
    if (width !== this.plotWidth) this.plotWidth = width;
    if (height !== this.plotHeight) this.plotHeight = height;
  });

  
  componentWillLoad() {
    // Listen for theme changes
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
    
    // Set up event listeners for direct data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.processData(event.detail);
      }
    });
    
    // Setup listener for color theme changes
    this.el.addEventListener('colorThemeChange', (event: CustomEvent) => {
      if (event.detail && event.detail.colorTheme) {
        this.colorTheme = event.detail.colorTheme;
        this.themeVersion++; // Force re-render
      }
    });
    
    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail) {
        // Theme changes are handled by the theme change listener
        // Custom color scales can still be applied via config if needed
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
    this.plotSize.detach();
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('colorThemeChange', null);
    this.el.removeEventListener('configUpdate', null);
  }
  
  @Watch('data')
  dataChanged(newValue: any[]) {
    if (newValue && newValue.length > 0) {
      this.processData(newValue);
    }
  }
  
  @Watch('config')
  configChanged(newValue: CorrelationAnalysisWidgetConfig, oldValue?: CorrelationAnalysisWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
    
    // Theme changes are handled by the theme change listener
    // Custom color scales can still be applied via config if needed
  }
  
  @Watch('colorTheme')
  colorThemeChanged() {
    // Force re-render when color theme changes
    this.themeVersion++;
  }
  
  // Method to handle external theme updates
  public updateColorTheme(newTheme: ColorTheme) {
    this.colorTheme = newTheme;
    this.themeVersion++;
  }
  
  // Process incoming data
  private processData(data: any[]) {
    if (data && Array.isArray(data) && data.length > 0) {
      this.correlationData = data;
      
      // Extract field names from the first row's keys, excluding "Name"
      const firstRow = data[0];
      const fieldNames = Object.keys(firstRow).filter(key => key !== "Name");
      this.fields = fieldNames;
      
      // Determine if we should use KPI mode (single row = correlation between 2 fields)
      this.isKpiMode = data.length === 1 && fieldNames.length === 1;
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
      const chartDataRequest = ChartDataRequestBuilder.buildForAnalysisWidget(
        this.reportId,
        this.config.analysisId,
        this.widgetId,
        'correlationAnalysis',
        this.isViewer || false
      );
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch correlation analysis data:", error);
      this.loading = false;
    }
  }
  
  // Helper function to get color for correlation value using theme
  private getCorrelationColor(value: number): string {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Use the theme's distinct colors for correlation analysis
    // distinct[0] = strong-, distinct[1] = moderate-, distinct[2] = neutral, 
    // distinct[3] = moderate+, distinct[4] = strong+
    
    if (value >= 0.7) {
      return theme.distinct[4]; // Strong positive
    } else if (value >= 0.3) {
      return theme.distinct[3]; // Moderate positive
    } else if (value > 0) {
      return theme.distinct[3]; // Weak positive (use moderate+)
    } else if (value === 0) {
      return theme.distinct[2]; // Neutral
    } else if (value >= -0.3) {
      return theme.distinct[1]; // Weak negative (use moderate-)
    } else if (value >= -0.7) {
      return theme.distinct[1]; // Moderate negative
    } else {
      return theme.distinct[0]; // Strong negative
    }
  }
  
  
  // Format correlation value for display using theme utilities
  private formatCorrelationValue(value: number): string {
    return ChartThemeUtils.formatNumber(value);
  }
  
  // Handle mouse move for tooltip
  private handleMouseMove(e: MouseEvent, tooltipText: string) {
    this.tooltip = {
      visible: true,
      text: tooltipText,
      x: e.clientX,
      y: e.clientY
    };
  }
  
  // Handle mouse leave for tooltip
  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }
  
  // Handle filter click for interactivity
  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.analysisId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.analysisId,
        field: fieldName,
        value: value
      });
    }
  }
  
  // Render KPI mode (when only 2 fields)
  private renderKpiVisualization() {
    if (!this.correlationData || this.correlationData.length === 0) {
      return <div class="empty-data">No correlation data available</div>;
    }
    
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Get the first row (should be the only one for KPI mode)
    const row = this.correlationData[0];
    
    // Get the first field (should be the only one for KPI mode)
    const field = this.fields[0];
    
    // Get the correlation value
    const value = parseFloat(row[field]);
    
    // Format the value based on KPI settings
    let formattedValue = this.formatCorrelationValue(value);
    
    // Apply formatting based on config
    switch (this.config.kpiFormatType) {
      case 'percentage':
        // Format as percentage (correlation * 100)
        formattedValue = new Intl.NumberFormat('en-US', { 
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(value);
        break;
      default:
        // Use basic formatting
        formattedValue = this.formatCorrelationValue(value);
    }
    
    // Apply custom prefix/suffix if defined
    if (this.config.kpiPrefix) {
      formattedValue = this.config.kpiPrefix + formattedValue;
    }
    
    if (this.config.kpiSuffix) {
      formattedValue = formattedValue + this.config.kpiSuffix;
    }
    
    // Determine correlation strength description
    let strengthLabel = "No Correlation";
    let strengthClass = "strength-none";
    
    if (Math.abs(value) >= 0.7) {
      strengthLabel = value > 0 ? "Strong Positive Correlation" : "Strong Negative Correlation";
      strengthClass = value > 0 ? "strength-strong-positive" : "strength-strong-negative";
    } else if (Math.abs(value) >= 0.3) {
      strengthLabel = value > 0 ? "Moderate Positive Correlation" : "Moderate Negative Correlation";
      strengthClass = value > 0 ? "strength-moderate-positive" : "strength-moderate-negative";
    } else if (Math.abs(value) > 0) {
      strengthLabel = value > 0 ? "Weak Positive Correlation" : "Weak Negative Correlation";
      strengthClass = "strength-weak";
    }
    
    return (
      <div class="kpi-container">
        <div 
          class="kpi-value" 
          style={{ 
            color: this.getCorrelationColor(value),
            fontFamily: theme.fontFamily,
            animationDelay: '100ms',
            animationFillMode: 'both'
          }}
        >
          {formattedValue}
        </div>
        
        <div 
          class={`kpi-strength ${strengthClass}`}
          style={{
            fontFamily: theme.fontFamily,
            animationDelay: '200ms',
            animationFillMode: 'both'
          }}
        >
          {strengthLabel}
        </div>
        
        <div 
          class="kpi-fields"
          style={{
            fontFamily: theme.fontFamily,
            color: theme.labelColor,
            animationDelay: '300ms',
            animationFillMode: 'both'
          }}
        >
          Between {row.Name} and {field}
        </div>
      </div>
    );
  }
  
  // Render heatmap mode (when 3+ fields)
  private renderHeatmapVisualization() {
    if (!this.correlationData || this.correlationData.length === 0) {
      return <div class="empty-data">No correlation data available</div>;
    }
    
    // Create a matrix from the data
    // Each row in correlationData represents a field's correlations with other fields
    const matrix: number[][] = [];
    const rowFields: string[] = this.correlationData.map(row => row.Name);
    
    this.correlationData.forEach(row => {
      const matrixRow: number[] = [];
      this.fields.forEach(field => {
        matrixRow.push(parseFloat(row[field]));
      });
      matrix.push(matrixRow);
    });
    
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    const pad = 8;
    const rowLabels = rowFields.map(f => clipLabel(f, 24));
    const colLabels = this.fields.map(f => clipLabel(f, 18));
    const paddingLeft = pad + Math.min(W * 0.35, Math.max(...rowLabels.map(l => l.length), 1) * charWidth + 10);
    const gridWidth = Math.max(0, W - paddingLeft - pad);
    const cellWidth = gridWidth / Math.max(1, this.fields.length);
    const longestColPx = Math.max(...colLabels.map(l => l.length), 1) * charWidth;
    // Rotate column labels only when they don't fit side by side
    const rotateCols = cellWidth < longestColPx + 6;
    const rotated = rotateCols ? fitRotatedLabels(colLabels, H, fontSize) : null;
    const paddingTop = pad + (rotated ? rotated.height : fontSize + 10);
    const gridHeight = Math.max(0, H - paddingTop - pad);
    const cellHeight = gridHeight / Math.max(1, rowFields.length);
    const rowStride = Math.max(1, Math.ceil((fontSize * 1.3) / Math.max(1, cellHeight)));
    const colStride = Math.max(1, Math.ceil((rotateCols ? fontSize * 1.4 : longestColPx + 6) / Math.max(1, cellWidth)));

    return (
      <div class="heatmap-container" part="chart">
        <div class="visualization-container" part="plot" ref={this.plotSize.attach}>
          {W > 0 && H > 0 && (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: '0' }}
            {...ChartThemeUtils.getSVGAttributes()}
          >
            <defs>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {rowLabels.map((field, i) => i % rowStride === 0 && (
              <text
                key={`y-${i}`}
                x={paddingLeft - 6}
                y={paddingTop + i * cellHeight + cellHeight / 2}
                text-anchor="end"
                dominant-baseline="middle"
                font-size={fontSize}
                font-family={theme.fontFamily}
                font-weight="500"
                fill={theme.labelColor}
                class="text-animated"
                style={{
                  animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                  animationFillMode: 'both'
                }}
              >
                {field}
              </text>
            ))}

            {(rotated ? rotated.labels : colLabels).map((field, i) => {
              if (i % colStride !== 0) return null;
              const x = paddingLeft + i * cellWidth + cellWidth / 2;
              const y = paddingTop - 6;
              return (
                <text
                  key={`x-${i}`}
                  x={x}
                  y={y}
                  text-anchor={rotateCols ? 'start' : 'middle'}
                  font-size={fontSize}
                  font-family={theme.fontFamily}
                  font-weight="500"
                  fill={theme.labelColor}
                  transform={rotateCols ? `rotate(-45, ${x}, ${y})` : undefined}
                  class={rotateCols ? 'text-rotated-animated' : 'text-animated'}
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both',
                    transformOrigin: `${x}px ${y}px`
                  }}
                >
                  {field}
                </text>
              );
            })}

            {matrix.map((row, i) => (
              row.map((value, j) => {
                const tooltipText = `${rowFields[i]} & ${this.fields[j]}: ${this.formatCorrelationValue(value)}`;
                const cellIndex = i * row.length + j;
                const valueText = this.config.showLabels ? this.formatCorrelationValue(value) : '';
                const showValue = !!valueText && cellWidth >= valueText.length * charWidth + 4 && cellHeight >= fontSize + 2;

                return (
                  <g
                    key={`cell-${i}-${j}-${this.themeVersion}`}
                    onMouseMove={(e) => this.handleMouseMove(e, tooltipText)}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick(
                      rowFields[i],
                      this.fields[j]
                    )}
                  >
                    <rect
                      x={paddingLeft + j * cellWidth}
                      y={paddingTop + i * cellHeight}
                      width={cellWidth}
                      height={cellHeight}
                      fill={this.getCorrelationColor(value)}
                      stroke={theme.border}
                      stroke-width="1"
                      class="cell-animated cell-glow"
                      style={{
                        cursor: 'pointer',
                        transition: ChartAnimations.getHoverTransition(),
                        animationDelay: `${ChartAnimations.getStaggerDelay(cellIndex)}ms`,
                        animationFillMode: 'both',
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                      }}
                    />

                    {showValue && (
                      <text
                        x={paddingLeft + j * cellWidth + cellWidth / 2}
                        y={paddingTop + i * cellHeight + cellHeight / 2}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size={fontSize}
                        font-family={theme.fontFamily}
                        font-weight="bold"
                        fill={this.getTextColor(value)}
                        class="text-animated"
                        style={{
                          animationDelay: `${ChartAnimations.getStaggerDelay(cellIndex) + 100}ms`,
                          animationFillMode: 'both'
                        }}
                      >
                        {valueText}
                      </text>
                    )}
                  </g>
                );
              })
            ))}
          </svg>
          )}

          {/* Tooltip with modern styling */}
          {this.tooltip.visible && (
            <div
              part="tooltip" class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
              ref={(el) => placeTooltip(el, this.tooltip.x, this.tooltip.y)}
            >
              <div style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
                {this.tooltip.text}
              </div>
            </div>
          )}
        </div>
        
        {/* Color legend with PowerBI-grade styling */}
        <div class="chart-legend">
          <div class="legend-item">
            <div 
              class="color-indicator" 
              style={{ 
                backgroundColor: this.getCorrelationColor(-1.0)
              }}
            ></div>
            <span class="legend-text">Strong -</span>
          </div>
          <div class="legend-item">
            <div 
              class="color-indicator" 
              style={{ 
                backgroundColor: this.getCorrelationColor(-0.5)
              }}
            ></div>
            <span class="legend-text">Moderate -</span>
          </div>
          <div class="legend-item">
            <div 
              class="color-indicator" 
              style={{ 
                backgroundColor: this.getCorrelationColor(0.0)
              }}
            ></div>
            <span class="legend-text">Neutral</span>
          </div>
          <div class="legend-item">
            <div 
              class="color-indicator" 
              style={{ 
                backgroundColor: this.getCorrelationColor(0.5)
              }}
            ></div>
            <span class="legend-text">Moderate +</span>
          </div>
          <div class="legend-item">
            <div 
              class="color-indicator" 
              style={{ 
                backgroundColor: this.getCorrelationColor(1.0)
              }}
            ></div>
            <span class="legend-text">Strong +</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Helper to determine text color based on background color brightness
  private getTextColor(value: number): string {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    const backgroundColor = this.getCorrelationColor(value);
    
    // Calculate the brightness of the background color
    const brightness = this.getColorBrightness(backgroundColor);
    
    // Use light text on dark backgrounds, dark text on light backgrounds
    // Lowered threshold to 0.6 to ensure all purple colors get white text
    return brightness < 0.6 ? theme.panel : theme.labelColor;
  }
  
  // Helper to calculate color brightness (0 = black, 1 = white)
  private getColorBrightness(hexColor: string): number {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Handle hex colors with alpha (e.g., #RRGGBBAA)
    let r, g, b;
    if (hex.length === 8) {
      // Has alpha channel
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
      const alpha = parseInt(hex.substr(6, 2), 16) / 255;
      
      // Blend with white background (assuming white background)
      r = Math.round(r * alpha + 255 * (1 - alpha));
      g = Math.round(g * alpha + 255 * (1 - alpha));
      b = Math.round(b * alpha + 255 * (1 - alpha));
    } else if (hex.length === 6) {
      // No alpha channel
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else {
      // Fallback for invalid hex
      return 0.5;
    }
    
    // Calculate relative luminance using the standard formula
    // This gives a value between 0 (black) and 1 (white)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance;
  }
  
  render() {
    let content;
    
    if (this.loading) {
      content = <div class="loading-spinner">Loading...</div>;
    } else if (!this.correlationData || this.correlationData.length === 0) {
      content = <div class="empty-data">No correlation data available</div>;
    } else {
      content = this.isKpiMode 
        ? this.renderKpiVisualization() 
        : this.renderHeatmapVisualization();
    }
    
    return (
      <Host>
        <base-widget exportparts="card,header,title,body"
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || this.config.analysisName || "Correlation Analysis"}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class="correlation-widget-container">
            {content}
          </div>
        </base-widget>
      </Host>
    );
  }
} 