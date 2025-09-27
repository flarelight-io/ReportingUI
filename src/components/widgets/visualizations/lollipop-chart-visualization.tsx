import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations } from '../../../utils/chart-theme';

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
  tag: 'lollipop-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss', // Reuse the bar chart styling
  shadow: true
})
export class LollipopChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  componentWillLoad() {
    // Listen for theme changes
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme();
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

  private handleMouseMove(event: MouseEvent, item: ChartDataItem) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(item.value);
      const maxCategoryLength = 30;
      const truncatedCategory = item.category.length > maxCategoryLength 
        ? `${item.category.substring(0, maxCategoryLength)}...` 
        : item.category;
      
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
    
    // Use safe string comparison to avoid type errors
    const isHorizontal = String(this.config.visualizationType) === 'lollipop-h';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme();
    const mainColor = colors[0]; // Use first color as the main color
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.value)) * 1.1; // Add 10% padding
    
    // SVG dimensions
    const viewBoxWidth = isHorizontal ? 200 : 200;
    const viewBoxHeight = isHorizontal ? 300 : 100;
    const step = Math.floor(viewBoxWidth / chartData.length);
    
    // Circle radius and stroke width for the lollipops
    const circleRadius = 3;
    const strokeWidth = 1.5;
    
    // Label properties
    const { fontSize, maxTextLength } = this.calculateLabelProperties(chartData);
    
    // Calculate positions for lollipops
    const lollipops = chartData.map((item, index) => {
      const scaledValue = (item.value / maxValue) * 90; // Max height/width is 90% of the available space
      
      if (isHorizontal) {
        // For horizontal lollipops
        // Adjust to prevent lollipops from going outside the bottom boundary
        const totalRows = chartData.length;
        const verticalSpace = viewBoxHeight - 25; // Significantly increase padding at bottom
        const requiredSpace = totalRows * step * 1.45;
        
        // Calculate y position ensuring it stays within the chart boundary
        let y;
        if (requiredSpace > verticalSpace) {
          // Compress the lollipops to fit
          const adjustedStep = verticalSpace / totalRows;
          y = viewBoxHeight - 25 - (index * adjustedStep); // Start much higher
        } else {
          // Regular spacing with adjustment for the last lollipop
          y = viewBoxHeight - 25 - (index * step * 1.45); // Start much higher
          // Ensure the bottom lollipop doesn't extend beyond the chart
          if (index === totalRows - 1) {
            y = Math.min(y, viewBoxHeight - 25 - circleRadius);
          }
        }
        
        return {
          line: {
            x1: 5,
            y1: y,
            x2: 5 + scaledValue - circleRadius,
            y2: y
          },
          circle: {
            cx: 5 + scaledValue,
            cy: y,
            r: circleRadius
          },
          label: {
            x: 5 + scaledValue + circleRadius + 2,
            y: y,
            text: `${item.category} (${item.value})`
          },
          category: item.category,
          value: item.value
        };
      } else {
        // For vertical lollipops
        const x = 5 + (index * step * 0.95) + (step * 0.35); // Center in available slot
        
        return {
          line: {
            x1: x,
            y1: 95,
            x2: x,
            y2: 95 - scaledValue + circleRadius
          },
          circle: {
            cx: x,
            cy: 95 - scaledValue,
            r: circleRadius
          },
          label: {
            x: x,
            y: 97, 
            text: item.category,
            valueY: 95 - scaledValue - circleRadius - 2,
            valueX: x
          },
          category: item.category,
          value: item.value
        };
      }
    });

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
              <radialGradient id="lollipopGradient" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stop-color={mainColor} stop-opacity="1"/>
                <stop offset="100%" stop-color={mainColor} stop-opacity="0.8"/>
              </radialGradient>
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
            
            {/* Draw lollipops with modern styling */}
            {lollipops.map((lollipop, i) => (
              <g 
                key={i}
                style={{ 
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onMouseMove={(e) => this.handleMouseMove(e, { category: lollipop.category, value: lollipop.value })}
                onMouseLeave={() => this.handleMouseLeave()}
                onClick={() => this.handleFilterClick(groupByField || '', lollipop.category)}
                class="lollipop-animated"
              >
                {/* Line part of lollipop */}
                <line 
                  x1={lollipop.line.x1} 
                  y1={lollipop.line.y1} 
                  x2={lollipop.line.x2} 
                  y2={lollipop.line.y2} 
                  stroke={mainColor} 
                  stroke-width={strokeWidth}
                  class="line-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                />
                
                {/* Circle part of lollipop */}
                <circle 
                  cx={lollipop.circle.cx} 
                  cy={lollipop.circle.cy} 
                  r={lollipop.circle.r} 
                  fill="url(#lollipopGradient)"
                  class="point-animated point-glow"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i) + 100}ms`,
                    animationFillMode: 'both'
                  }}
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
            
            {/* Show values if enabled */}
            {this.config.showLabels && (
              <g>
                {lollipops.map((lollipop, i) => (
                  <text 
                    key={`value-${i}`} 
                    x={isHorizontal ? lollipop.circle.cx + circleRadius + 2 : lollipop.circle.cx} 
                    y={isHorizontal ? lollipop.circle.cy : lollipop.circle.cy - circleRadius - 2} 
                    font-size={fontSize * 0.8} 
                    text-anchor="middle" 
                    fill="var(--fl-chart-text-color)"
                    font-family={theme.fontFamily}
                    font-weight="600"
                    paint-order="stroke fill"
                    stroke="rgba(0,0,0,0.1)"
                    stroke-width="0.5"
                    class="text-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(i) + 150}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {ChartThemeUtils.formatNumber(chartData[i].value)}
                  </text>
                ))}
              </g>
            )}
            
            {/* For vertical lollipops, show category labels below */}
            {!isHorizontal && (
              <g>
                {lollipops.map((lollipop, i) => {
                  // Get average text length in the dataset
                  const avgTextLength = chartData.reduce((sum, item) => sum + item.category.length, 0) / chartData.length;
                  
                  // Further adjust font size if average text is long
                  let adjustedFontSize = fontSize;
                  if (avgTextLength > 8) {
                    adjustedFontSize = Math.max(3, fontSize * 0.65);
                  }

                  // Truncate text based on available space
                  const displayText = lollipop.label.text.length > maxTextLength 
                    ? `${lollipop.label.text.substring(0, maxTextLength)}...` 
                    : lollipop.label.text;
                  
                  return (
                    <text 
                      key={i} 
                      x={lollipop.label.x} 
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
                        transformOrigin: `${lollipop.label.x}px 105px`
                      }}
                    >
                      {displayText}
                    </text>
                  );
                })}
              </g>
            )}
            
            {/* For horizontal lollipops, show category labels at the end of each lollipop */}
            {isHorizontal && (
              <g>
                {lollipops.map((lollipop, i) => {
                  // Truncate text based on available space
                  const displayText = lollipop.category.length > 15 
                    ? `${lollipop.category.substring(0, 15)}...` 
                    : lollipop.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={lollipop.circle.cx + circleRadius + 2} 
                      y={lollipop.line.y1} 
                      font-size={fontSize} 
                      text-anchor="start"
                      dominant-baseline="middle" 
                      fill="var(--fl-chart-text-color)"
                      font-family={theme.fontFamily}
                      font-weight="500"
                      class="text-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(i) + 150}ms`,
                        animationFillMode: 'both'
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
        
        {/* Legend with PowerBI-grade styling */}
        {(this.config.showLegend !== false) && (
          <div class="chart-legend">
            <div class="legend-item">
              <div class="color-indicator" style={{ backgroundColor: mainColor }}></div>
              <span class="legend-text">
                {valueField || 'Value'}
              </span>
            </div>
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
  
  private calculateLabelProperties(chartData: ChartDataItem[]) {
    // Base values
    const baseFontSize = 5;
    const baseMaxLength = 20;
    
    // Adjust for number of points
    const pointCountAdjustment = chartData.length <= 4 ? 1.1 : 
                               chartData.length <= 6 ? 1 :
                               chartData.length <= 8 ? 0.8 : 0.6;
    
    // Calculate final values
    const fontSize = Math.max(4, Math.round(baseFontSize * pointCountAdjustment * 10) / 10);
    const maxTextLength = Math.max(4, Math.round(baseMaxLength * pointCountAdjustment));
    
    return { fontSize, maxTextLength };
  }
} 