import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface HistogramBin {
  label: string;
  count: number;
  binStart?: number;
  binEnd?: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'histogram-chart-visualization',
  styleUrl: 'histogram-chart-visualization.scss',
  shadow: true
})
export class HistogramChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.sourceId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field: fieldName,
        value: value
      });
    }
  }

  private handleMouseMove(event: MouseEvent, label: string, count: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      this.tooltip = {
        visible: true,
        text: `${label}: ${count}`,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): HistogramBin[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // Assume the API has already aggregated data into bins
    // Check common bin data formats
    
    // Format 1: Bins with label and count directly
    if (rawData[0]?.label !== undefined && rawData[0]?.count !== undefined) {
      return rawData.map(item => ({
        label: String(item.label),
        count: Number(item.count || 0),
        binStart: Number(item.binStart || item.min || item.lower || 0),
        binEnd: Number(item.binEnd || item.max || item.upper || 0)
      }));
    }
    
    // Format 2: Bins with range/bucket and frequency/count
    if (rawData[0]?.range !== undefined && rawData[0]?.frequency !== undefined) {
      return rawData.map(item => ({
        label: String(item.range || item.bucket),
        count: Number(item.frequency || item.count || 0),
        binStart: Number(item.binStart || item.lower || 0),
        binEnd: Number(item.binEnd || item.upper || 0)
      }));
    }
    
    // Format 3: Category and value (standard chart data)
    if (this.config.groupByField && this.config.valueField) {
      const labelField = this.config.groupByField;
      const countField = this.config.valueField;
      
      return rawData.map(item => ({
        label: String(item[labelField] === null ? 'Unknown' : item[labelField]),
        count: Number(item[countField] || 0)
      }));
    }
    
    // Format 4: For legacy X/Y or category/value format
    if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      return rawData.map(item => ({
        label: String(item.X),
        count: Number(item.Y || 0)
      }));
    }
    
    // Format 5: For simple two-column data (assume first column is label, second is count)
    if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      return rawData.map(item => ({
        label: String(item[keys[0]]),
        count: Number(item[keys[1]] || 0)
      }));
    }
    
    return [];
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    const histogramData = this.processData();
    
    if (histogramData.length === 0) {
      return <div class="empty-data">No data available for histogram</div>;
    }
    
    // Find the maximum count for scaling
    const maxCount = Math.max(...histogramData.map(bin => bin.count));
    
    // Set viewBox dimensions
    const viewBoxWidth = 100;
    const viewBoxHeight = 60;
    const padding = 10; // Space for labels
    
    // Calculate bar dimensions
    const barWidth = (viewBoxWidth - (padding * 2)) / histogramData.length;
    const actualBarWidth = barWidth; // Full width, no gap
    
    // Define colors
    const colors = this.getColors();
    
    // Generate the bars
    const bars = histogramData.map((bin, index) => {
      const x = padding + (index * barWidth);
      const height = ((bin.count / maxCount) * (viewBoxHeight - (padding * 2)));
      const y = viewBoxHeight - padding - height;
      
      return {
        x,
        y,
        width: actualBarWidth,
        height,
        color: colors[0],
        bin,
        index
      };
    });
    
    return (
      <div class="histogram-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {this.config.showGrid && (
              <>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = viewBoxHeight - padding - (ratio * (viewBoxHeight - (padding * 2)));
                  return (
                    <line 
                      key={`h-${i}`}
                      x1="5" 
                      y1={y} 
                      x2={viewBoxWidth - 5} 
                      y2={y} 
                      stroke="var(--fl-chart-grid-color, #ccc)" 
                      stroke-width="0.5"
                      stroke-dasharray="1,1"
                    />
                  );
                })}
                
                {/* Vertical grid lines */}
                {bars.map((bar, i) => (
                  <line 
                    key={`v-${i}`}
                    x1={bar.x + (bar.width / 2)} 
                    y1="5" 
                    x2={bar.x + (bar.width / 2)} 
                    y2={viewBoxHeight - 5} 
                    stroke="var(--fl-chart-grid-color, #ccc)" 
                    stroke-width="0.5"
                    stroke-dasharray="1,1"
                  />
                ))}
              </>
            )}
            
            {/* Draw histogram bars */}
            {bars.map((bar, i) => (
              <g 
                key={i}
                style={{ cursor: 'pointer' }}
                onClick={() => this.handleFilterClick(this.config.valueField, bar.bin.label)}
                onMouseMove={(event) => this.handleMouseMove(event, bar.bin.label, bar.bin.count)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <rect 
                  x={bar.x} 
                  y={bar.y} 
                  width={bar.width} 
                  height={bar.height || 0.1} // Ensure a minimum height for zero values
                  fill={bar.color}
                  stroke="var(--fl-border-color, rgba(255, 255, 255, 0.2))"
                  stroke-width="0.2"
                />
                
                {/* Show count on top of bars if enabled */}
                {this.config.showLabels && bar.height > 10 && (
                  <text 
                    x={bar.x + (bar.width / 2)}
                    y={bar.y - 2}
                    font-size="2.5"
                    text-anchor="middle"
                    fill="var(--fl-chart-text-color, #666)"
                  >
                    {bar.bin.count}
                  </text>
                )}
              </g>
            ))}
            
            {/* Axes */}
            <line 
              x1="5" 
              y1={viewBoxHeight - padding} 
              x2={viewBoxWidth - 5} 
              y2={viewBoxHeight - padding} 
              stroke="var(--fl-chart-axis-color, #333)" 
              stroke-width="1" 
            />
            <line 
              x1="5" 
              y1="5" 
              x2="5" 
              y2={viewBoxHeight - padding} 
              stroke="var(--fl-chart-axis-color, #333)" 
              stroke-width="1" 
            />
            
            {/* X-axis labels (only show a subset to avoid crowding) */}
            {bars.filter((_, i) => 
              histogramData.length <= 5 || 
              i % Math.max(1, Math.ceil(histogramData.length / 5)) === 0
            ).map((bar, i) => {
              const labelText = bar.bin.label;
              const truncatedLabel = labelText.length > 10 
                ? labelText.substring(0, 10) + '...' 
                : labelText;
              
              return (
                <text 
                  key={`x-label-${i}`}
                  x={bar.x + (bar.width / 2)}
                  y={viewBoxHeight - 2}
                  font-size="2.5"
                  text-anchor="middle"
                  fill="var(--fl-chart-text-color, #666)"
                >
                  {truncatedLabel}
                </text>
              );
            })}
            
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = viewBoxHeight - padding - (ratio * (viewBoxHeight - (padding * 2)));
              const value = Math.round(ratio * maxCount);
              
              return (
                <text 
                  key={`y-label-${i}`}
                  x="3"
                  y={y}
                  font-size="2.5"
                  text-anchor="end"
                  dominant-baseline="middle"
                  fill="var(--fl-chart-text-color, #666)"
                >
                  {value}
                </text>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {this.tooltip.visible && (
            <div 
              class="chart-tooltip"
              style={{ 
                left: `${this.tooltip.x}px`, 
                top: `${this.tooltip.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              {this.tooltip.text}
            </div>
          )}
        </div>
        
        {this.config.showLegend && (
          <div class="chart-legend">
            <div class="legend-item">
              <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
              <span class="legend-text">{this.config.valueField || "Count"}</span>
            </div>
          </div>
        )}
        
        <div class="chart-metadata">
          {this.config.groupByField && this.config.valueField && (
            <div class="chart-info">
              Group: {this.config.groupByField} • Value: {this.config.valueField} • Agg: {this.config.aggregation}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  private getColors(): string[] {
    return [
      'var(--fl-chart-color-1, #4299e1)', 
      'var(--fl-chart-color-2, #48bb78)', 
      'var(--fl-chart-color-3, #f6ad55)', 
      'var(--fl-chart-color-4, #f56565)', 
      'var(--fl-chart-color-5, #9f7aea)', 
      'var(--fl-chart-color-6, #38b2ac)', 
      'var(--fl-chart-color-7, #ed8936)', 
      'var(--fl-chart-color-8, #667eea)',
      'var(--fl-chart-color-9, #fc8181)', 
      'var(--fl-chart-color-10, #68d391)'
    ];
  }
} 