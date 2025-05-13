import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface StackedChartItem {
  category: string;
  values: {
    field: string;
    value: number;
  }[];
  total: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'stacked-bar-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss', // Reuse the bar chart styling
  shadow: true
})
export class StackedBarChartVisualization {
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

  private processData(): StackedChartItem[] {
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
          total: 0
        };
      }
      
      // Add values for each field
      valueFields.forEach((field, index) => {
        const value = Number(item[field] || 0);
        acc[categoryValue].values[index].value += value;
        acc[categoryValue].total += value;
      });
      
      return acc;
    }, {});
    
    // Convert to array and sort by total
    const processed = Object.values(groupedData) as StackedChartItem[];
    processed.sort((a, b) => b.total - a.total);
    
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
    
    // Use string comparison to avoid type errors
    const visualizationType = this.config.visualizationType || '';
    const isHorizontal = visualizationType === 'stacked-hbar';
    const colors = this.getColors();
    
    // Find the maximum total value for scaling
    const maxValue = Math.max(...chartData.map(item => item.total)) * 1.1; // Add 10% padding
    
    // SVG dimensions
    const viewBoxWidth = isHorizontal ? 200 : 200;
    const viewBoxHeight = isHorizontal ? 300 : 100;
    const step = Math.floor(viewBoxWidth / chartData.length);
    
    // Label properties
    const { fontSize, maxTextLength } = this.calculateLabelProperties(chartData);
    
    // Calculate positions and dimensions for bars
    const bars = chartData.map((item, categoryIndex) => {
      const segments = item.values.map((segment, segmentIndex) => {
        const scaledValue = (segment.value / maxValue) * 90; // Max bar height/width is 90% of the available space
        
        if (isHorizontal) {
          // For horizontal bars
          // Adjust to prevent bars from going outside the bottom boundary
          const totalRows = chartData.length;
          const barHeight = step * 0.8; // Bar height
          const verticalSpace = viewBoxHeight - 45; // Significantly increase padding at bottom
          const requiredSpace = totalRows * step * 1.45;
          
          // Adjust the vertical position calculation based on available space
          let y;
          if (requiredSpace > verticalSpace) {
            // Compress the bars to fit
            const adjustedStep = verticalSpace / totalRows;
            y = viewBoxHeight - 45 - (categoryIndex * adjustedStep); // Start much higher
          } else {
            // Regular spacing with adjustment for the last bar
            y = viewBoxHeight - 45 - (categoryIndex * step * 1.45); // Start much higher
            // Ensure the bottom bar doesn't extend beyond the chart
            if (categoryIndex === totalRows - 1) {
              y = Math.min(y, viewBoxHeight - 45 - barHeight);
            }
          }
          
          // Calculate starting position based on previous segments
          const startPosition = item.values
            .slice(0, segmentIndex)
            .reduce((sum, prev) => sum + (prev.value / maxValue) * 90, 0);
          
          return {
            x: 5 + startPosition,
            y,
            width: scaledValue,
            height: barHeight,
            color: colors[segmentIndex % colors.length],
            field: segment.field,
            value: segment.value
          };
        } else {
          // For vertical bars
          const x = 5 + (categoryIndex * step * 0.95);
          const width = step * 0.7; // Bar width
          
          // Calculate starting position based on previous segments
          const startHeight = item.values
            .slice(0, segmentIndex)
            .reduce((sum, prev) => sum + (prev.value / maxValue) * 90, 0);
          
          return {
            x,
            y: 95 - startHeight - scaledValue,
            width,
            height: scaledValue,
            color: colors[segmentIndex % colors.length],
            field: segment.field,
            value: segment.value
          };
        }
      });
      
      return {
        category: item.category,
        segments
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
            
            {/* Draw stacked bars */}
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
            
            {/* X and Y axis */}
            <line x1="5" y1={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} x2={viewBoxWidth - 5} y2={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} stroke="#333" stroke-width="1" />
            <line x1="5" y1="5" x2="5" y2={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} stroke="#333" stroke-width="1" />
            
            {/* Category labels */}
            {!isHorizontal && (
              <g>
                {chartData.map((item, i) => {
                  const x = 5 + (i * step * 0.95) + (step * 0.7 / 2);
                  
                  // Truncate text based on available space
                  const displayText = item.category.length > maxTextLength 
                    ? `${item.category.substring(0, maxTextLength)}...` 
                    : item.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={x} 
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
            
            {/* For horizontal bar charts, show labels on the bars */}
            {isHorizontal && (
              <g>
                {bars.map((bar, i) => {
                  const y = viewBoxHeight - 45 - (i * step * 1.25) + (step * 0.8 / 2);
                  
                  // Calculate total width
                  const totalWidth = bar.segments.reduce((sum, segment) => sum + segment.width, 0);
                  
                  // Truncate text based on available space
                  const displayText = bar.category.length > maxTextLength 
                    ? `${bar.category.substring(0, maxTextLength)}...` 
                    : bar.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={5 + totalWidth + 2} 
                      y={y} 
                      font-size={fontSize} 
                      dominant-baseline="middle" 
                      fill="#555"
                    >
                      {displayText} ({chartData[i].total})
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
  
  private calculateLabelProperties(chartData: StackedChartItem[]) {
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