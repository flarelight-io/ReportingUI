import { Component, Prop, h, Event, EventEmitter, State, Watch } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

interface ChartDataItem {
  category: string;
  value: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'bar-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss',
  shadow: true
})
export class BarChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  componentWillLoad() {
    // Listen for theme changes
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }
  
  // Watch for changes to the colorTheme prop
  @Watch('colorTheme')
  colorThemeChanged() {
    // Force re-render when color theme changes
    this.themeVersion++;
  }

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }

  private processData(): ChartDataItem[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // For standard chart types
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    if (groupByField && valueField) {
      const groupField = groupByField;
      const valueFieldName = valueField;
      
      const processed = rawData.map(item => ({
        category: String(item[groupField] === null ? 'Unknown' : item[groupField]),
        value: Number(item[valueFieldName] || 0)
      }));
      
      processed.sort((a, b) => b.value - a.value);
      return processed;
    } 
    // For legacy Group/Value format
    else if (rawData[0]?.Group !== undefined && rawData[0]?.Value !== undefined) {
      const processed = rawData.map(item => ({
        category: String(item.Group === null ? 'Unknown' : item.Group),
        value: Number(item.Value || 0)
      }));
      processed.sort((a, b) => b.value - a.value);
      return processed;
    }
    // For simple two-column data
    else if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      const processed = rawData.map(item => ({
        category: String(item[keys[0]] === null ? 'Unknown' : item[keys[0]]),
        value: Number(item[keys[1]] || 0)
      }));
      processed.sort((a, b) => b.value - a.value);
      return processed;
    }
    
    return [];
  }

  private handleMouseMove(event: MouseEvent, barCategory: string, barValue: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(barValue);
      const maxCategoryLength = 30;
      const truncatedCategory = barCategory.length > maxCategoryLength 
        ? `${barCategory.substring(0, maxCategoryLength)}...` 
        : barCategory;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedCategory}\n${formattedValue}`,
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
    
    // Extract config properties for use in render
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Determine if this is a horizontal bar chart
    const isHorizontal = this.config.visualizationType === 'hbar';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.value)) * 1.1; // Add 10% padding
    
    // For horizontal bar charts, adjust viewBox width based on aspect ratio
    const viewBoxWidth = isHorizontal ? 200 : 200;
    const viewBoxHeight = isHorizontal ? 300 : 100;
    const step = Math.floor(viewBoxWidth / chartData.length);
    
    // Calculate positions and dimensions for bars
    const bars = chartData.map((item, index) => {
      const scaledValue = (item.value / maxValue) * 90; // Max bar height/width is 90% of the available space
      const colorIndex = index % colors.length; // Get the correct color index
      
      if (isHorizontal) {
        // For horizontal bars
        const totalRows = chartData.length;
        const barHeight = step * 0.8; // Bar height is 80% of available slot
        const verticalSpace = viewBoxHeight - 35; // Significantly increase padding at bottom
        const requiredSpace = totalRows * step * 1.45;
        
        // Adjust the vertical position calculation if there are many bars
        let y;
        if (requiredSpace > verticalSpace) {
          // Compress the bars to fit the available space
          const adjustedStep = verticalSpace / totalRows;
          y = viewBoxHeight - 35 - (index * adjustedStep); // Start much higher
        } else {
          // Regular spacing, ensure the last bar stays inside the chart area
          y = viewBoxHeight - 35 - (index * step * 1.45); // Start much higher
          // Ensure the bottom bar doesn't extend beyond the chart
          if (index === totalRows - 1) {
            y = Math.min(y, viewBoxHeight - 35 - barHeight);
          }
        }
        
        return {
          x: 5, // Horizontal bars should be glued to Y-axis (left edge)
          y,
          width: scaledValue,
          height: barHeight,
          color: colors[colorIndex],
          colorIndex: colorIndex,
          label: {
            x: 5 + scaledValue + 2, // Label position matches bar position
            y: y + barHeight / 2,
            text: `${item.category} (${ChartThemeUtils.formatNumber(item.value)})`
          },
          category: item.category,
          value: item.value
        };
      } else {
        // For vertical bars - add small spacing from X-axis (bottom edge)
        const x = 8 + (index * step * 0.95);
        const width = step * 0.7; // Bar width is 70% of available slot
        
        return {
          x,
          y: 95 - scaledValue,
          width,
          height: scaledValue,
          color: colors[colorIndex],
          colorIndex: colorIndex,
          label: {
            x: x + width / 2,
            y: 97, 
            text: item.category,
            valueY: 95 - scaledValue - 2,
            valueX: x + width / 2
          },
          category: item.category,
          value: item.value
        };
      }
    });
    
    // Calculate optimal label properties based on chart properties
    const calculateLabelProperties = () => {
      // Base values
      const baseFontSize = 5;
      const baseMaxLength = 20;
      
      // Use fixed values for widget size since we don't have access to width
      const widthAdjustment = 1;
      
      // Adjust for number of bars
      const barCountAdjustment = chartData.length <= 4 ? 1.1 : 
                                chartData.length <= 6 ? 1 :
                                chartData.length <= 8 ? 0.8 : 0.6;
      
      // Calculate final values
      const fontSize = Math.max(4, Math.round(baseFontSize * widthAdjustment * barCountAdjustment * 10) / 10);
      const maxTextLength = Math.max(4, Math.round(baseMaxLength * widthAdjustment * barCountAdjustment));
      
      return { fontSize, maxTextLength };
    };
    
    // Get calculated properties
    const { fontSize, maxTextLength } = calculateLabelProperties();

    return (
      <div class="bar-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
            preserveAspectRatio="xMidYMin meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color={color} stop-opacity="1"/>
                  <stop offset="100%" stop-color={color} stop-opacity="0.85"/>
                </linearGradient>
              ))}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>

            {this.config.showGrid && (
              <g>
                {/* Draw Y-axis grid lines only (PowerBI style) */}
                {[0, 25, 50, 75, 100].map((pos, i) => (
                  <line 
                    key={i}
                    x1="5" 
                    y1={ChartThemeUtils.snapToPixel(pos)} 
                    x2={viewBoxWidth - 5} 
                    y2={ChartThemeUtils.snapToPixel(pos)} 
                    stroke="var(--fl-chart-grid-color)" 
                    stroke-width="1" 
                    opacity={theme.gridlines.opacity}
                  />
                ))}
              </g>
            )}
            
            {/* Draw bars with modern styling */}
            {bars.map((bar, i) => (
              <g key={i}>
                <rect 
                  x={bar.x} 
                  y={bar.y} 
                  width={bar.width} 
                  height={bar.height} 
                  fill={`url(#barGradient-${bar.colorIndex})`}
                  class="bar-animated bar-glow"
                  style={{ 
                    cursor: 'pointer',
                    transition: ChartAnimations.getHoverTransition(),
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                  onMouseMove={(e) => this.handleMouseMove(e, bar.category, bar.value)}
                  onMouseLeave={() => this.handleMouseLeave()}
                  onClick={() => this.handleFilterClick(groupByField || '', bar.category)}
                  filter="url(#softShadow)"
                />
              </g>
            ))}
            
            {/* X and Y axis with proper styling */}
            <line 
              x1="5" 
              y1={ChartThemeUtils.snapToPixel(isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5)} 
              x2={viewBoxWidth - 5} 
              y2={ChartThemeUtils.snapToPixel(isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5)} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="1" 
            />
            <line 
              x1={ChartThemeUtils.snapToPixel(5)} 
              y1="5" 
              x2={ChartThemeUtils.snapToPixel(5)} 
              y2={isHorizontal ? viewBoxHeight - 2 : viewBoxHeight - 5} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="1" 
            />
            
            {/* Show values on the bars if enabled */}
            {this.config.showLabels && (
              <g>
                {bars.map((bar, i) => (
                  <text 
                    key={`value-${i}`} 
                    x={bar.label.valueX} 
                    y={bar.label.valueY} 
                    font-size={fontSize} 
                    text-anchor="middle" 
                    fill="var(--fl-chart-text-color)"
                    font-weight="600"
                    font-family={theme.fontFamily}
                    paint-order="stroke fill"
                    stroke="rgba(0,0,0,0.1)"
                    stroke-width="0.5"
                    class="text-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(i) + 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {ChartThemeUtils.formatNumber(chartData[i].value)}
                  </text>
                ))}
              </g>
            )}
            
            {/* For horizontal bar charts, show labels on the bars */}
            {isHorizontal && (
              <g>
                {bars.map((bar, i) => (
                  <text 
                    key={i} 
                    x={bar.label.x} 
                    y={bar.label.y} 
                    font-size={fontSize} 
                    dominant-baseline="middle" 
                    fill="var(--fl-chart-text-color)"
                    font-family={theme.fontFamily}
                    font-weight="500"
                  >
                    {bar.label.text.length > 15 ? `${bar.label.text.substring(0, 15)}...` : bar.label.text}
                  </text>
                ))}
              </g>
            )}
            
            {/* Category labels for vertical bar charts */}
            {!isHorizontal && (
              <g>
                {bars.map((bar, i) => {
                  // Get average text length in the dataset
                  const avgTextLength = chartData.reduce((sum, item) => sum + item.category.length, 0) / chartData.length;
                  
                  // Further adjust font size if average text is long
                  let adjustedFontSize = fontSize;
                  if (avgTextLength > 8) {
                    adjustedFontSize = Math.max(3, fontSize * 0.65);
                  }

                  // Truncate text based on available space
                  const displayText = bar.label.text.length > maxTextLength 
                    ? `${bar.label.text.substring(0, maxTextLength)}...` 
                    : bar.label.text;
                  
                  return (
                    <text 
                      key={i} 
                      x={bar.label.x} 
                      y={105} 
                      font-size={adjustedFontSize}
                      text-anchor="end"
                      fill="var(--fl-chart-text-color)"
                      font-family={theme.fontFamily}
                      font-weight="500"
                      class="text-rotated-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(i) + 150}ms`,
                        animationFillMode: 'both',
                        transformOrigin: `${bar.label.x}px 105px`
                      }}
                    >
                      {displayText}
                    </text>
                  );
                })}
              </g>
            )}
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
            {bars.map((bar, i) => (
              <div key={i} class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: bar.color }}></div>
                <span class="legend-text">
                  {bar.category.length > 10 ? `${bar.category.substring(0, 10)}...` : bar.category}: {ChartThemeUtils.formatNumber(bar.value)}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div class="chart-info-text">
          {groupByField && valueField && (
            <span>
              Group: {groupByField} • Value: {valueField} • 
              Agg: {'aggregation' in this.config ? this.config.aggregation || 'none' : 'none'}
            </span>
          )}
        </div>
      </div>
    );
  }
} 