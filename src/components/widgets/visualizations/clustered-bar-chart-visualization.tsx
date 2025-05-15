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
    
    // SVG dimensions and spacing
    const viewBoxWidth = 200;
    const viewBoxHeight = isHorizontal ? Math.max(200, chartData.length * 35) : 100;
    
    // Calculate spacing based on available space and number of bars
    const categoryCount = chartData.length;
    const fieldCount = this.config.fields?.length || 1;
    
    // Calculate total available space
    const availableWidth = viewBoxWidth - (isHorizontal ? 50 : 20); // More space for labels in horizontal mode
    const availableHeight = viewBoxHeight - 50;
    
    // Calculate optimal step size and padding
    const usableWidth = isHorizontal ? availableWidth : availableWidth * 0.9; // Leave some margin on the sides
    const categoryWidth = usableWidth / categoryCount;
    const categoryPadding = Math.max(2, categoryWidth * 0.15); // 15% padding between categories
    const barWidth = (categoryWidth - categoryPadding) / fieldCount;
    const barGap = Math.min(barWidth * 0.1, 1); // Small gap between bars in the same category
    
    // Label properties
    const { fontSize, maxTextLength } = this.calculateLabelProperties(chartData);
    
    // Calculate positions and dimensions for bars
    const bars = chartData.map((item, categoryIndex) => {
      const segments = item.values.map((segment, segmentIndex) => {
        const scaledValue = (segment.value / maxValue) * (isHorizontal ? availableWidth * 0.85 : 85); // Scale appropriately
        
        if (isHorizontal) {
          // For horizontal bars - start Y position for this category group
          const categoryYPosition = 30 + (categoryIndex * (availableHeight / categoryCount));
          const categoryHeight = (availableHeight / categoryCount) * 0.8;
          const segmentHeight = (categoryHeight - (barGap * (fieldCount - 1))) / fieldCount;
          
          // Y position for this specific segment
          const y = categoryYPosition + (segmentIndex * (segmentHeight + barGap));
          
          return {
            x: 45, // Start position after labels
            y,
            width: scaledValue,
            height: segmentHeight,
            color: colors[segmentIndex % colors.length],
            field: segment.field,
            value: segment.value
          };
        } else {
          // For vertical bars - start X position for this category group
          const categoryXStart = 10 + (categoryIndex * categoryWidth);
          const usableCategoryWidth = categoryWidth - categoryPadding;
          const segmentWidth = (usableCategoryWidth - (barGap * (fieldCount - 1))) / fieldCount;
          
          // X position for this specific segment
          const x = categoryXStart + (segmentIndex * (segmentWidth + barGap));
          
          return {
            x,
            y: 95 - scaledValue,
            width: segmentWidth,
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
        const categoryYPosition = 30 + (categoryIndex * (availableHeight / categoryCount));
        const categoryHeight = (availableHeight / categoryCount) * 0.8;
        // Center is in the middle of the category's vertical space
        centerPoint = categoryYPosition + (categoryHeight / 2);
      } else {
        const categoryXStart = 10 + (categoryIndex * categoryWidth);
        const usableCategoryWidth = categoryWidth - categoryPadding;
        // Center is in the middle of the category's horizontal space
        centerPoint = categoryXStart + (usableCategoryWidth / 2);
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
            {/* Background and grid elements */}
            <g class="chart-background">
              {this.config.showGrid && (
                <g>
                  {/* Draw grid lines */}
                  {isHorizontal ? (
                    // Horizontal grid lines for horizontal bar chart
                    Array.from({length: 5}).map((_, i) => {
                      const xPos = 45 + (i * availableWidth / 4);
                      return <line key={`v-${i}`} x1={xPos} y1="30" x2={xPos} y2={viewBoxHeight - 10} stroke="#ccc" stroke-width="0.5" stroke-dasharray={i > 0 ? "1,1" : ""} />
                    })
                  ) : (
                    // Grid lines for vertical bar chart - revised to align properly
                    <g>
                      {/* Horizontal grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const yPos = 95 - (ratio * 85); // Aligned with the chart height
                        return (
                          <line 
                            key={`h-${i}`} 
                            x1="10" 
                            y1={yPos} 
                            x2={viewBoxWidth - 10} 
                            y2={yPos} 
                            stroke="#ccc" 
                            stroke-width="0.5"
                            stroke-dasharray={i > 0 ? "1,1" : ""}
                          />
                        );
                      })}
                      
                      {/* Category divider grid lines */}
                      {Array.from({length: categoryCount + 1}).map((_, i) => {
                        if (i === 0 || i === categoryCount) return null; // Skip first and last
                        const xPos = 10 + (i * categoryWidth);
                        return (
                          <line 
                            key={`v-div-${i}`} 
                            x1={xPos} 
                            y1="10" 
                            x2={xPos} 
                            y2="95" 
                            stroke="#ccc" 
                            stroke-width="0.5"
                            stroke-dasharray="2,2"
                          />
                        );
                      })}
                    </g>
                  )}
                </g>
              )}
            </g>
            
            {/* Draw clustered bars */}
            <g class="chart-bars">
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
            </g>
            
            {/* Show values on the bars if enabled */}
            {this.config.showLabels && (
              <g class="chart-labels">
                {bars.map((bar, i) => (
                  bar.segments.map((segment, j) => {
                    // Calculate position for labels
                    const x = isHorizontal ? segment.x + segment.width + 2 : segment.x + segment.width / 2;
                    const y = isHorizontal ? segment.y + segment.height / 2 : segment.y - 2;
                    
                    // Only show labels if there's enough space
                    const labelSpace = isHorizontal ? segment.width : segment.height;
                    if (labelSpace < 10) return null; // Skip small segments
                    
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
            
            {/* Category labels */}
            <g class="chart-categories">
              {!isHorizontal && bars.map((bar, i) => {
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
              
              {/* For horizontal bar charts, show labels on the left */}
              {isHorizontal && bars.map((bar, i) => {
                // Truncate text based on available space
                const displayText = bar.category.length > maxTextLength 
                  ? `${bar.category.substring(0, maxTextLength)}...` 
                  : bar.category;
                
                return (
                  <text 
                    key={i} 
                    x={40} 
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
            
            {/* X and Y axis - Always draw regardless of showGrid setting - DRAWN LAST to ensure visibility */}
            <g class="chart-axes">
              {isHorizontal ? (
                // Axis for horizontal bar chart
                <>
                  <line x1="45" y1="30" x2="45" y2={viewBoxHeight - 10} stroke="#333" stroke-width="1.5" />
                  <line x1="45" y1={viewBoxHeight - 10} x2={viewBoxWidth - 10} y2={viewBoxHeight - 10} stroke="#333" stroke-width="1.5" />
                  
                  {/* X-axis labels */}
                  {Array.from({length: 5}).map((_, i) => {
                    const xPos = 45 + (i * availableWidth / 4);
                    const value = Math.round((i * maxValue / 4) * 100) / 100;
                    return (
                      <text
                        key={`x-label-${i}`}
                        x={xPos}
                        y={viewBoxHeight - 5}
                        font-size={fontSize * 0.8}
                        text-anchor="middle"
                        fill="#666"
                      >
                        {value}
                      </text>
                    );
                  })}
                </>
              ) : (
                // Axis for vertical bar chart
                <>
                  <line x1="10" y1="95" x2={viewBoxWidth - 10} y2="95" stroke="#333" stroke-width="1.5" />
                  <line x1="10" y1="10" x2="10" y2="95" stroke="#333" stroke-width="1.5" />
                  
                  {/* Y-axis labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const yPos = 95 - (ratio * 85);
                    const value = Math.round((ratio * maxValue) * 100) / 100;
                    return (
                      <text
                        key={`y-label-${i}`}
                        x="8"
                        y={yPos}
                        font-size={fontSize * 0.8}
                        text-anchor="end"
                        dominant-baseline="middle"
                        fill="#666"
                      >
                        {value}
                      </text>
                    );
                  })}
                </>
              )}
            </g>
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