import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface ClusteredChartItem {
  category: string;
  values: {
    field: string;
    value: number;
  }[];
  maxValue: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'clustered-bar-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss', // Reuse the bar chart styling
  shadow: true
})
export class ClusteredBarChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    return [
      '#4f46e5', // indigo-600
      '#0ea5e9', // sky-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#84cc16', // lime-500
      '#f97316'  // orange-500
    ];
  }

  private processData(): ClusteredChartItem[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0 || !this.config.groupByField || !this.config.fields || this.config.fields.length === 0) {
      return [];
    }
    
    const groupField = this.config.groupByField;
    const valueFields = this.config.fields;
    
    // Group data by category
    const groupedData = rawData.reduce((acc, item) => {
      const categoryValue = String(item[groupField] === null ? 'Unknown' : item[groupField]);
      
      if (!acc[categoryValue]) {
        acc[categoryValue] = {
          category: categoryValue,
          values: valueFields.map(field => ({
            field,
            value: 0
          })),
          maxValue: 0
        };
      }
      
      // Add values for each field
      valueFields.forEach((field, index) => {
        const value = Number(item[field] || 0);
        acc[categoryValue].values[index].value += value;
        // Track the max value in each category for easier scaling
        acc[categoryValue].maxValue = Math.max(acc[categoryValue].maxValue, acc[categoryValue].values[index].value);
      });
      
      return acc;
    }, {});
    
    // Convert to array and sort by max value
    const processed = Object.values(groupedData) as ClusteredChartItem[];
    processed.sort((a, b) => b.maxValue - a.maxValue);
    
    return processed;
  }

  private handleMouseMove(event: MouseEvent, segment: { field: string, value: number }, category: string) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      this.tooltip = {
        visible: true,
        text: `${category} - ${segment.field}: ${segment.value}`,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
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
    
    // Use safe string comparison to avoid type errors
    const isHorizontal = String(this.config.visualizationType) === 'clustered-hbar';
    const colors = this.getColors();
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.maxValue)) * 1.1; // Add 10% padding
    
    // SVG dimensions
    const viewBoxWidth = isHorizontal ? 200 : 200;
    const viewBoxHeight = isHorizontal ? 300 : 100;
    
    // Calculate spacing based on available space and number of bars
    const categoryCount = chartData.length;
    const fieldCount = this.config.fields?.length || 1;
    
    // Calculate total available space
    const availableWidth = viewBoxWidth - 10;
    const availableHeight = viewBoxHeight - 50;
    
    // Dynamic spacing calculation based on number of categories and fields
    // Decrease spacing factor as number of categories or fields increases
    const categorySpacingFactor = Math.max(0.1, Math.min(0.25, 0.3 - (0.02 * categoryCount) - (0.01 * fieldCount)));
    
    // Calculate step size and bar dimensions
    const totalSpace = isHorizontal ? availableHeight : availableWidth;
    const categoryStep = Math.floor(totalSpace / categoryCount);
    const categoryGap = Math.max(2, categoryStep * categorySpacingFactor); // Ensure minimum gap
    const barWidth = (categoryStep - categoryGap) / fieldCount; // Width of each bar
    const barGap = Math.min(barWidth * 0.2, 2); // Gap between bars in the same category, with maximum
    
    // Label properties
    const { fontSize, maxTextLength } = this.calculateLabelProperties(chartData);
    
    // Calculate positions and dimensions for bars
    const bars = chartData.map((item, categoryIndex) => {
      const segments = item.values.map((segment, segmentIndex) => {
        const scaledValue = (segment.value / maxValue) * 90; // Max bar height/width is 90% of available space
        
        if (isHorizontal) {
          // For horizontal bars
          const categoryPosition = viewBoxHeight - 45 - (categoryIndex * categoryStep);
          const y = categoryPosition - (segmentIndex * (barWidth + barGap)) - barWidth;
          
          return {
            x: 5,
            y,
            width: scaledValue,
            height: barWidth,
            color: colors[segmentIndex % colors.length],
            field: segment.field,
            value: segment.value
          };
        } else {
          // For vertical bars
          const categoryPosition = 5 + (categoryIndex * categoryStep);
          const x = categoryPosition + (segmentIndex * (barWidth + barGap));
          
          return {
            x,
            y: 95 - scaledValue,
            width: barWidth,
            height: scaledValue,
            color: colors[segmentIndex % colors.length],
            field: segment.field,
            value: segment.value
          };
        }
      });
      
      // Calculate the center point for category labels
      let centerPoint;
      if (isHorizontal) {
        const categoryPosition = viewBoxHeight - 45 - (categoryIndex * categoryStep);
        // Center point is in the middle of all segments
        centerPoint = categoryPosition - ((fieldCount - 1) * (barWidth + barGap) / 2);
      } else {
        const categoryPosition = 5 + (categoryIndex * categoryStep);
        // Center point is in the middle of all segments
        centerPoint = categoryPosition + ((fieldCount - 1) * (barWidth + barGap) / 2);
      }
      
      return {
        category: item.category,
        segments,
        center: centerPoint
      };
    });

    return (
      <div class="bar-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
            preserveAspectRatio="xMidYMin meet"
          >
            {this.config.showGrid && (
              <g>
                {/* Draw grid lines */}
                {[0, 25, 50, 75, 100].map((pos, i) => (
                  <g key={i}>
                    <line x1="5" y1={pos} x2={viewBoxWidth - 5} y2={pos} stroke="#ccc" stroke-width="0.5" />
                    {Array.from({length: 5}).map((_, j) => {
                      const xPos = 5 + (j * (viewBoxWidth - 10) / 4);
                      return <line key={`v-${j}`} x1={xPos} y1="5" x2={xPos} y2={viewBoxHeight - 5} stroke="#ccc" stroke-width="0.5" />
                    })}
                  </g>
                ))}
              </g>
            )}
            
            {/* Draw clustered bars */}
            {bars.map((bar, i) => (
              <g key={i}>
                {bar.segments.map((segment, j) => (
                  <rect 
                    key={`${i}-${j}`} 
                    x={segment.x} 
                    y={segment.y} 
                    width={segment.width} 
                    height={segment.height} 
                    fill={segment.color}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={(e) => this.handleMouseMove(e, { field: segment.field, value: segment.value }, bar.category)}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick(this.config.groupByField, bar.category)}
                  />
                ))}
              </g>
            ))}
            
            {/* Show values on the bars if enabled */}
            {this.config.showLabels && (
              <g>
                {bars.map((bar, i) => (
                  bar.segments.map((segment, j) => {
                    // Calculate position for labels
                    const x = isHorizontal ? segment.x + segment.width + 2 : segment.x + segment.width / 2;
                    const y = isHorizontal ? segment.y + segment.height / 2 : segment.y - 2;
                    
                    return (
                      <text 
                        key={`value-${i}-${j}`} 
                        x={x} 
                        y={y} 
                        font-size={fontSize * 0.8} 
                        text-anchor={isHorizontal ? "start" : "middle"}
                        dominant-baseline={isHorizontal ? "middle" : "auto"}
                        fill={isHorizontal ? "#555" : "white"}
                        font-weight="bold"
                      >
                        {segment.value}
                      </text>
                    );
                  })
                ))}
              </g>
            )}
            
            {/* X and Y axis */}
            <line x1="5" y1={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} x2={viewBoxWidth - 5} y2={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} stroke="#333" stroke-width="1" />
            <line x1="5" y1="5" x2="5" y2={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} stroke="#333" stroke-width="1" />
            
            {/* Category labels */}
            {!isHorizontal && (
              <g>
                {bars.map((bar, i) => {
                  // Truncate text based on available space
                  const displayText = bar.category.length > maxTextLength 
                    ? `${bar.category.substring(0, maxTextLength)}...` 
                    : bar.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={bar.center} 
                      y={105} 
                      font-size={fontSize}
                      text-anchor="middle"
                      fill="#333"
                    >
                      {displayText}
                    </text>
                  );
                })}
              </g>
            )}
            
            {/* For horizontal bar charts, show labels on the left */}
            {isHorizontal && (
              <g>
                {bars.map((bar, i) => {
                  // Truncate text based on available space
                  const displayText = bar.category.length > maxTextLength 
                    ? `${bar.category.substring(0, maxTextLength)}...` 
                    : bar.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={3} 
                      y={bar.center} 
                      font-size={fontSize} 
                      text-anchor="end"
                      dominant-baseline="middle" 
                      fill="#555"
                    >
                      {displayText}
                    </text>
                  );
                })}
              </g>
            )}
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
        
        {/* Legend */}
        {this.config.showLegend && (
          <div class="chart-legend">
            {this.config.fields && this.config.fields.map((field, i) => (
              <div key={i} class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span class="legend-text">
                  {field.length > 15 ? `${field.substring(0, 15)}...` : field}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div class="chart-info-text">
          {this.config.groupByField && this.config.fields && (
            <span>
              Group: {this.config.groupByField} • Values: {this.config.fields.join(', ')} • 
              Agg: {this.config.aggregation || 'none'}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  private calculateLabelProperties(chartData: ClusteredChartItem[]) {
    // Base values
    const baseFontSize = 5;
    const baseMaxLength = 20;
    
    // Adjust for number of bars
    const barCountAdjustment = chartData.length <= 4 ? 1.1 : 
                              chartData.length <= 6 ? 1 :
                              chartData.length <= 8 ? 0.8 : 0.6;
    
    // Calculate final values
    const fontSize = Math.max(4, Math.round(baseFontSize * barCountAdjustment * 10) / 10);
    const maxTextLength = Math.max(4, Math.round(baseMaxLength * barCountAdjustment));
    
    return { fontSize, maxTextLength };
  }
} 