import { Component, Prop, h, Host, State, Watch, Element, Event, EventEmitter } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';
import { ChartThemeUtils, ChartAnimations } from '../../utils/chart-theme';

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
  
  @State() loading: boolean = true;
  @State() correlationData: any[] = [];
  @State() fields: string[] = [];
  @State() isKpiMode: boolean = false;
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
  
  @Event() filterChange: EventEmitter<{ sourceId: string; field: string; value: any }>;
  
  private svgRef: SVGElement;
  
  // Default colors for the heatmap
  private colorScale = [
    'var(--fl-correlation-negative-strong, #3f00ff)', // Strong negative (-1.0 to -0.7)
    'var(--fl-correlation-negative-moderate, #8280ff)', // Moderate negative (-0.7 to -0.3)
    'var(--fl-correlation-neutral, #e2e2ff)', // Weak negative/positive (-0.3 to 0.3)
    'var(--fl-correlation-positive-moderate, #ff8f80)', // Moderate positive (0.3 to 0.7)
    'var(--fl-correlation-positive-strong, #ff0f00)'  // Strong positive (0.7 to 1.0)
  ];
  
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
    
    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail) {
        if (event.detail.colorScale) {
          this.colorScale = event.detail.colorScale;
        }
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
  configChanged(newValue: CorrelationAnalysisWidgetConfig, oldValue?: CorrelationAnalysisWidgetConfig) {
    if (newValue.analysisId !== oldValue?.analysisId && newValue.analysisId) {
      this.fetchData();
    }
    
    if (newValue.colorScale) {
      this.colorScale = newValue.colorScale;
    }
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
      const chartDataRequest: ChartDataRequest = {
        reportId: this.reportId,
        sourceId: this.config.analysisId,
        sourceType: 'AnalysisResult', 
        valueFields: [],
        groupByFields: [],
        labelFields: [],
        filters: [],
        isViewer: this.isViewer || false,
        widgetType: 'correlationAnalysis',
        widgetId: this.widgetId
      };
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch correlation analysis data:", error);
      this.loading = false;
    }
  }
  
  // Helper function to get color for correlation value using theme
  private getCorrelationColor(value: number): string {
    const theme = ChartThemeUtils.getTheme();
    
    // Create a professional correlation color scale with better contrast:
    // - Primary theme color with gradient for positive values (0 to +1)
    // - Highlight color for neutral/zero values (0)
    // - Shades of highlight color for negative values (-1 to 0)
    
    // For positive values: use primary theme color with increasing intensity
    if (value > 0) {
      if (value >= 0.7) return theme.series[0]; // Strong positive - full primary color
      if (value >= 0.3) return theme.series[2]; // Moderate positive - use 3rd color for better contrast
      return theme.series[4]; // Weak positive - use 5th color for better contrast
    }
    
    // For zero: use highlight/neutral color
    if (value === 0) {
      return theme.regressionColor; // Use the analytical highlight color
    }
    
    // For negative values: use shades of highlight color with better contrast
    if (value >= -0.3) return theme.regressionColor + 'CC'; // Weak negative - highlight with high opacity
    if (value >= -0.7) return theme.regressionColor + '99'; // Moderate negative - medium opacity
    return theme.regressionColor + '66'; // Strong negative - lower opacity but still visible
  }
  
  // Format correlation value for display using theme utilities
  private formatCorrelationValue(value: number): string {
    return ChartThemeUtils.formatNumber(value);
  }
  
  // Handle mouse move for tooltip
  private handleMouseMove(e: MouseEvent, tooltipText: string) {
    if (this.svgRef) {
      const svgRect = this.svgRef.getBoundingClientRect();
      this.tooltip = {
        visible: true,
        text: tooltipText,
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top
      };
    }
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
    
    const theme = ChartThemeUtils.getTheme();
    
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
    
    const theme = ChartThemeUtils.getTheme();
    
    // Calculate cell size based on available space and number of fields
    const availableWidth = this.width || 400;
    const availableHeight = this.height || 400;
    const maxFields = Math.max(rowFields.length, this.fields.length);
    
    // Ensure minimum cell size but allow for more fields
    const cellSize = Math.max(35, Math.floor(Math.min(availableWidth, availableHeight) / (maxFields + 2)));
    const fontSize = Math.max(8, Math.min(12, cellSize * 0.35));
    
    // Calculate padding based on text length
    const maxTextLength = Math.max(
      ...rowFields.map(field => field.length),
      ...this.fields.map(field => field.length)
    );
    const paddingLeft = Math.max(80, maxTextLength * fontSize * 0.6);
    const paddingTop = Math.max(80, maxTextLength * fontSize * 0.4);
    
    // Calculate dimensions
    const gridWidth = cellSize * this.fields.length;
    const gridHeight = cellSize * rowFields.length;
    const svgWidth = paddingLeft + gridWidth + 20; // Add some margin
    const svgHeight = paddingTop + gridHeight + 20; // Add some margin
    
    return (
      <div class="heatmap-container">
        <div class="visualization-container">
          <svg 
            ref={(el) => this.svgRef = el}
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {/* Create gradient definitions for the correlation scale */}
              {Array.from({ length: 7 }, (_, i) => {
                // Create a more granular scale: -1, -0.7, -0.3, 0, 0.3, 0.7, 1
                const value = -1 + (i / 3) * 2; // -1, -0.33, 0.33, 1
                const color = this.getCorrelationColor(value);
                return (
                  <linearGradient key={`correlationGradient-${i}`} id={`correlationGradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color={color} stop-opacity="1"/>
                    <stop offset="100%" stop-color={color} stop-opacity="0.85"/>
                  </linearGradient>
                );
              })}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {/* Y-axis labels (field names) */}
            {rowFields.map((field, i) => (
              <text
                key={`y-${i}`}
                x={paddingLeft - 5}
                y={paddingTop + i * cellSize + cellSize / 2}
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
            
            {/* X-axis labels (field names) - rotated for readability */}
            {this.fields.map((field, i) => (
              <text
                key={`x-${i}`}
                x={paddingLeft + (i * cellSize) + (cellSize / 2)}
                y={paddingTop - field.length * fontSize * 0.1}
                text-anchor="start"
                dominant-baseline="middle"
                font-size={fontSize}
                font-family={theme.fontFamily}
                font-weight="500"
                fill={theme.labelColor}
                transform={`rotate(-45, ${paddingLeft + i * cellSize + cellSize / 2}, ${paddingTop - field.length * fontSize * 0.1})`}
                class="text-rotated-animated"
                style={{
                  animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                  animationFillMode: 'both',
                  transformOrigin: `${paddingLeft + i * cellSize + cellSize / 2}px ${paddingTop - field.length * fontSize * 0.1}px`
                }}
              >
                {field}
              </text>
            ))}
            
            {/* Correlation matrix cells */}
            {matrix.map((row, i) => (
              row.map((value, j) => {
                const tooltipText = `${rowFields[i]} & ${this.fields[j]}: ${this.formatCorrelationValue(value)}`;
                const cellIndex = i * row.length + j;
                
                // Calculate gradient index based on correlation value
                const normalizedValue = (value + 1) / 2; // Convert from [-1,1] to [0,1]
                const gradientIndex = Math.min(6, Math.floor(normalizedValue * 6));
                
                return (
                  <g 
                    key={`cell-${i}-${j}`}
                    onMouseMove={(e) => this.handleMouseMove(e, tooltipText)}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick(
                      rowFields[i],
                      this.fields[j]
                    )}
                  >
                    <rect
                      x={paddingLeft + j * cellSize}
                      y={paddingTop + i * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill={`url(#correlationGradient-${gradientIndex})`}
                      stroke={theme.border}
                      stroke-width="0.5"
                      class="cell-animated cell-glow"
                      style={{ 
                        cursor: 'pointer',
                        transition: ChartAnimations.getHoverTransition(),
                        animationDelay: `${ChartAnimations.getStaggerDelay(cellIndex)}ms`,
                        animationFillMode: 'both'
                      }}
                      filter="url(#softShadow)"
                    />
                    
                    {/* Show correlation values in cells if configured */}
                    {this.config.showLabels && (
                      <text
                        x={paddingLeft + j * cellSize + cellSize / 2}
                        y={paddingTop + i * cellSize + cellSize / 2}
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
                        {this.formatCorrelationValue(value)}
                      </text>
                    )}
                  </g>
                );
              })
            ))}
          </svg>
          
          {/* Tooltip with modern styling */}
          {this.tooltip.visible && (
            <div 
              class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
              style={{ 
                left: `${this.tooltip.x}px`, 
                top: `${this.tooltip.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
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
    const theme = ChartThemeUtils.getTheme();
    const backgroundColor = this.getCorrelationColor(value);
    
    // Calculate the brightness of the background color
    const brightness = this.getColorBrightness(backgroundColor);
    
    // Use light text on dark backgrounds, dark text on light backgrounds
    return brightness < 0.5 ? theme.panel : theme.labelColor;
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
        <base-widget
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