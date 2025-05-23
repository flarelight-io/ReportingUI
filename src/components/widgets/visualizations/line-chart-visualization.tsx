import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface LineDataPoint {
  x: string | number;
  y: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'line-chart-visualization',
  styleUrl: 'line-chart-visualization.scss',
  shadow: true
})
export class LineChartVisualization {
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

  private handleMouseMove(event: MouseEvent, category: string | number, value: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      this.tooltip = {
        visible: true,
        text: `${category}: ${value}`,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): LineDataPoint[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // For standard chart types
    if (this.config.groupByField && this.config.valueField) {
      const xField = this.config.groupByField;
      const yField = this.config.valueField;
      
      const processed = rawData.map(item => ({
        x: item[xField] === null ? 'Unknown' : item[xField],
        y: Number(item[yField] || 0)
      }));
      
      // Sort by x value (assuming it might be a date or a number)
      return this.sortDataPoints(processed);
    } 
    // For legacy X/Y format
    else if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      const processed = rawData.map(item => ({
        x: item.X === null ? 'Unknown' : item.X,
        y: Number(item.Y || 0)
      }));
      return this.sortDataPoints(processed);
    }
    // For simple two-column data
    else if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      const processed = rawData.map(item => ({
        x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
        y: Number(item[keys[1]] || 0)
      }));
      return this.sortDataPoints(processed);
    }
    
    return [];
  }

  private sortDataPoints(data: LineDataPoint[]): LineDataPoint[] {
    // Try to determine if x is a date
    const isDate = data.length > 0 && 
      (typeof data[0].x === 'string' && !isNaN(Date.parse(data[0].x as string)));
    
    if (isDate) {
      return [...data].sort((a, b) => {
        const dateA = typeof a.x === 'string' ? new Date(a.x) : new Date();
        const dateB = typeof b.x === 'string' ? new Date(b.x) : new Date();
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    // Try to determine if x is a number
    const isNumber = data.length > 0 && 
      (typeof data[0].x === 'number' || 
      (typeof data[0].x === 'string' && !isNaN(Number(data[0].x))));
    
    if (isNumber) {
      return [...data].sort((a, b) => {
        const numA = typeof a.x === 'number' ? a.x : Number(a.x);
        const numB = typeof b.x === 'number' ? b.x : Number(b.x);
        return numA - numB;
      });
    }
    
    // If x is a string, sort alphabetically
    return [...data].sort((a, b) => {
      return String(a.x).localeCompare(String(b.x));
    });
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.y)) * 1.1; // Add 10% padding
    
    // Calculate optimal aspect ratio
    const viewBoxWidth = 100;
    const viewBoxHeight = 60;
    
    // Generate points for the line, spaced evenly across the width
    const points = chartData.map((item, index) => {
      const x = 5 + index * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
      const y = (viewBoxHeight - 5) - (item.y / maxValue) * (viewBoxHeight - 10);
      return { x, y, category: item.x, value: item.y };
    });
    
    // Create the path string for the line
    const pathString = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`
    ).join(' ');
    
    // Define colors
    const colors = this.getColors();
    
    return (
      <div class="line-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Draw grid lines if enabled */}
            {this.config.showGrid && (
              <g>
                {[0, 25, 50, 75, 100].map((pos, i) => (
                  <line 
                    key={`h-${i}`} 
                    x1="5" 
                    y1={pos} 
                    x2={viewBoxWidth - 5} 
                    y2={pos} 
                    stroke="var(--fl-chart-grid-color, #ddd)" 
                    stroke-width="0.5" 
                    stroke-dasharray="2,2"
                  />
                ))}
                
                {Array.from({length: 5}).map((_, i) => {
                  const xPos = 5 + ((viewBoxWidth - 10) / 4) * i;
                  return (
                    <line 
                      key={`v-${i}`} 
                      x1={xPos} 
                      y1="5" 
                      x2={xPos} 
                      y2={viewBoxHeight - 5} 
                      stroke="var(--fl-chart-grid-color, #ddd)" 
                      stroke-width="0.5" 
                      stroke-dasharray="2,2"
                    />
                  );
                })}
              </g>
            )}
            
            {/* Draw line */}
            <path d={pathString} fill="none" stroke={colors[0]} stroke-width="1.5" />
            
            {/* Draw points */}
            {points.map((point, i) => (
              <g 
                key={i} 
                transform={`translate(${point.x}, ${point.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => this.handleFilterClick(this.config.groupByField, point.category)}
                onMouseEnter={(event) => this.handleMouseMove(event, point.category, point.value)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <circle cx="0" cy="0" r="1.5" fill={colors[0]} />
              </g>
            ))}
            
            {/* X and Y axis */}
            <line x1="5" y1={viewBoxHeight - 5} x2={viewBoxWidth - 5} y2={viewBoxHeight - 5} stroke="var(--fl-chart-axis-color, #666)" stroke-width="1" />
            <line x1="5" y1="5" x2="5" y2={viewBoxHeight - 5} stroke="var(--fl-chart-axis-color, #666)" stroke-width="1" />
            
            {/* Labels (only show if not too many points) */}
            {chartData.length <= 8 && (
              <>
                {points.map((point, i) => {
                  // Only show labels for every other point if there are many
                  if (chartData.length > 5 && i % 2 !== 0) {
                    return null;
                  }
                  
                  const displayText = String(point.category);
                  const truncatedText = displayText.length > 10 
                    ? displayText.substring(0, 10) + '...' 
                    : displayText;
                  
                  return (
                    <text 
                      key={i} 
                      x={point.x} 
                      y={viewBoxHeight - 2} 
                      font-size="2.5" 
                      text-anchor="middle" 
                      fill="#666"
                    >
                      {truncatedText}
                    </text>
                  );
                })}
                
                {this.config.showLabels && points.map((point, i) => {
                  // Only show value labels for every other point if there are many
                  if (chartData.length > 5 && i % 2 !== 0) {
                    return null;
                  }
                  
                  return (
                    <text 
                      key={`value-${i}`} 
                      x={point.x} 
                      y={point.y - 3} 
                      font-size="2.5" 
                      text-anchor="middle" 
                      fill="#444"
                    >
                      {point.value}
                    </text>
                  );
                })}
              </>
            )}
            
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = viewBoxHeight - 5 - ratio * (viewBoxHeight - 10);
              const value = Math.round(ratio * maxValue);
              
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
              <span class="legend-text">{this.config.valueField || "Value"}</span>
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
      '#4299e1', '#48bb78', '#f6ad55', '#f56565', 
      '#9f7aea', '#38b2ac', '#ed8936', '#667eea'
    ];
  }
} 