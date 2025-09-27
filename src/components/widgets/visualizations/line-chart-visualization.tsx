import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

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
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0;
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  componentWillLoad() {
    // Listen for theme changes to force re-render
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }

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
      // Format tooltip text with line breaks and proper formatting
      const formattedValue = ChartThemeUtils.formatNumber(value);
      const displayCategory = String(category).length > 20 
        ? String(category).substring(0, 20) + '...' 
        : String(category);
      
      this.tooltip = {
        visible: true,
        text: `${displayCategory}\n${formattedValue}`,
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
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    if (groupByField && valueField) {
      const xField = groupByField;
      const yField = valueField;
      
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
    
    // Extract config properties for use in render
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
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
    
    // Define colors and theme
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    return (
      <div class="line-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color={colors[0]} stop-opacity="0.3"/>
                <stop offset="100%" stop-color={colors[0]} stop-opacity="0.05"/>
              </linearGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {/* Draw subtle grid lines if enabled */}
            {this.config.showGrid && (
              <g>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = viewBoxHeight - 5 - ratio * (viewBoxHeight - 10);
                  return (
                    <line 
                      key={`h-${i}`} 
                      x1="5" 
                      y1={ChartThemeUtils.snapToPixel(y)} 
                      x2={viewBoxWidth - 5} 
                      y2={ChartThemeUtils.snapToPixel(y)} 
                      stroke="var(--fl-chart-grid-color)" 
                      stroke-width="0.5" 
                      opacity="0.2"
                    />
                  );
                })}
              </g>
            )}
            
            {/* Draw line with clean styling */}
            <path 
              d={pathString} 
              fill="none" 
              stroke={colors[0]} 
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="line-animated"
              style={{
                transition: ChartAnimations.getHoverTransition(),
                animationDelay: '100ms',
                animationFillMode: 'both'
              }}
            />
            
            {/* Draw points with subtle styling */}
            {points.map((point, i) => (
              <g 
                key={i} 
                transform={`translate(${point.x}, ${point.y})`}
                style={{ 
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onClick={() => this.handleFilterClick(groupByField || '', point.category)}
                onMouseEnter={(event) => this.handleMouseMove(event, point.category, point.value)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <circle 
                  cx="0" 
                  cy="0" 
                  r="0.8" 
                  fill={colors[0]}
                  stroke="white"
                  stroke-width="0.5"
                  opacity="0.6"
                  class="point-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                />
                {/* Subtle hover state */}
                <circle 
                  cx="0" 
                  cy="0" 
                  r="2" 
                  fill="transparent"
                  stroke="transparent"
                  stroke-width="0"
                  class="point-hover"
                  style={{
                    transition: ChartAnimations.getHoverTransition()
                  }}
                />
              </g>
            ))}
            
            {/* X and Y axis with subtle styling */}
            <line 
              x1="5" 
              y1={ChartThemeUtils.snapToPixel(viewBoxHeight - 5)} 
              x2={viewBoxWidth - 5} 
              y2={ChartThemeUtils.snapToPixel(viewBoxHeight - 5)} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="0.5" 
              opacity="0.6"
            />
            <line 
              x1={ChartThemeUtils.snapToPixel(5)} 
              y1="5" 
              x2={ChartThemeUtils.snapToPixel(5)} 
              y2={viewBoxHeight - 5} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="0.5" 
              opacity="0.6"
            />
            
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
                      fill="var(--fl-chart-text-secondary)"
                      font-family={theme.fontFamily}
                      font-weight="500"
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
                      fill="var(--fl-chart-text-color)"
                      font-family={theme.fontFamily}
                      font-weight="600"
                      paint-order="stroke fill"
                      stroke="white"
                      stroke-width="0.5"
                    >
                      {ChartThemeUtils.formatNumber(point.value)}
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
        
        {(this.config.showLegend !== false) && (
          <div class="chart-legend">
            <div class="legend-item">
              <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
              <span class="legend-text">{valueField || "Value"}</span>
            </div>
          </div>
        )}
        
        <div class="chart-metadata">
          {groupByField && valueField && (
            <div class="chart-info">
              Group: {groupByField} • Value: {valueField} • Agg: {'aggregation' in this.config ? this.config.aggregation || 'none' : 'none'}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }
} 