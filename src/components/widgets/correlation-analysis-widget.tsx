import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';
import { ChartDataRequest } from '../../api/types/common';

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
  
  private svgRef: SVGElement;
  
  // Default colors for the heatmap
  private colorScale = [
    '#3f00ff', // Strong negative (-1.0 to -0.7)
    '#8280ff', // Moderate negative (-0.7 to -0.3)
    '#e2e2ff', // Weak negative/positive (-0.3 to 0.3)
    '#ff8f80', // Moderate positive (0.3 to 0.7)
    '#ff0f00'  // Strong positive (0.7 to 1.0)
  ];
  
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
        widgetType: 'correlationAnalysis'
      };
      
      const data = await this.fetchChartData(chartDataRequest);
      this.processData(data);
    } catch (error) {
      console.error("Failed to fetch correlation analysis data:", error);
      this.loading = false;
    }
  }
  
  // Helper function to get color for correlation value
  private getCorrelationColor(value: number): string {
    if (value <= -0.7) return this.colorScale[0]; // Strong negative
    if (value <= -0.3) return this.colorScale[1]; // Moderate negative
    if (value <= 0.3) return this.colorScale[2];  // Weak correlation
    if (value <= 0.7) return this.colorScale[3];  // Moderate positive
    return this.colorScale[4]; // Strong positive
  }
  
  // Format correlation value for display
  private formatCorrelationValue(value: number): string {
    // Round to 2 decimal places
    return value.toFixed(2);
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
  
  // Render KPI mode (when only 2 fields)
  private renderKpiVisualization() {
    if (!this.correlationData || this.correlationData.length === 0) {
      return <div class="empty-data">No correlation data available</div>;
    }
    
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
        <div class="kpi-value" style={{ color: this.getCorrelationColor(value) }}>
          {formattedValue}
        </div>
        
        <div class={`kpi-strength ${strengthClass}`}>
          {strengthLabel}
        </div>
        
        <div class="kpi-fields">
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
    
    const cellSize = Math.max(45, Math.floor(Math.min(this.width || 300, this.height || 300) / rowFields.length));
    const fontSize = Math.max(8, Math.min(11, cellSize * 0.4));
    const maxTextLength = Math.max(...rowFields.map(field => field.length));
    const padding = 60 + maxTextLength * fontSize * 0.1;
    
    // Calculate dimensions
    const gridSize = cellSize * rowFields.length;
    const svgWidth = Math.max(Math.min(this.width || 300, this.height || 300), gridSize + padding * 2);
    const svgHeight = Math.max(Math.min(this.width || 300, this.height || 300) - 50, gridSize + padding * 2);
    
    return (
      <div class="heatmap-container">
        <div class="heatmap-visualization">
          <svg 
            ref={(el) => this.svgRef = el}
            width={svgWidth} 
            height={svgHeight} 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Y-axis labels (field names) */}
            {rowFields.map((field, i) => (
              <text
                key={`y-${i}`}
                x={padding - 3}
                y={padding + i * cellSize + cellSize / 2}
                text-anchor="end"
                dominant-baseline="middle"
                font-size={fontSize}
                font-family="sans-serif"
              >
                {field}
              </text>
            ))}
            
            {/* X-axis labels (field names) - rotated for readability */}
            {this.fields.map((field, i) => (
              <text
                key={`x-${i}`}
                x={padding + i * cellSize + cellSize / 2}
                y={padding - 3}
                text-anchor="start"
                dominant-baseline="middle"
                font-size={fontSize}
                font-family="sans-serif"
                transform={`rotate(-45, ${padding + i * cellSize + cellSize / 2}, ${padding - 3})`}
              >
                {field}
              </text>
            ))}
            
            {/* Correlation matrix cells */}
            {matrix.map((row, i) => (
              row.map((value, j) => {
                const tooltipText = `${rowFields[i]} & ${this.fields[j]}: ${this.formatCorrelationValue(value)}`;
                
                return (
                  <g key={`cell-${i}-${j}`}
                    onMouseMove={(e) => this.handleMouseMove(e, tooltipText)}
                    onMouseLeave={() => this.handleMouseLeave()}
                  >
                    <rect
                      x={padding + j * cellSize}
                      y={padding + i * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill={this.getCorrelationColor(value)}
                      stroke="#ffffff"
                      stroke-width="1"
                    />
                    
                    {/* Show correlation values in cells if configured */}
                    {this.config.showLabels && (
                      <text
                        x={padding + j * cellSize + cellSize / 2}
                        y={padding + i * cellSize + cellSize / 2}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size={fontSize}
                        font-family="sans-serif"
                        fill={Math.abs(value) > 0.5 ? "#ffffff" : "#000000"}
                      >
                        {this.formatCorrelationValue(value)}
                      </text>
                    )}
                  </g>
                );
              })
            ))}
          </svg>
          
          {/* Tooltip */}
          {this.tooltip.visible && (
            <div 
              class="heatmap-tooltip"
              style={{ 
                left: `${this.tooltip.x}px`, 
                top: `${this.tooltip.y}px`
              }}
            >
              {this.tooltip.text}
            </div>
          )}
        </div>
        
        {/* Color scale legend */}
        <div class="color-legend">
          <div class="legend-item">
            <div class="color-box" style={{ backgroundColor: this.colorScale[0] }}></div>
            <span>-1.0</span>
          </div>
          <div class="legend-item">
            <div class="color-box" style={{ backgroundColor: this.colorScale[1] }}></div>
            <span>-0.5</span>
          </div>
          <div class="legend-item">
            <div class="color-box" style={{ backgroundColor: this.colorScale[2] }}></div>
            <span>0</span>
          </div>
          <div class="legend-item">
            <div class="color-box" style={{ backgroundColor: this.colorScale[3] }}></div>
            <span>0.5</span>
          </div>
          <div class="legend-item">
            <div class="color-box" style={{ backgroundColor: this.colorScale[4] }}></div>
            <span>1.0</span>
          </div>
        </div>
      </div>
    );
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