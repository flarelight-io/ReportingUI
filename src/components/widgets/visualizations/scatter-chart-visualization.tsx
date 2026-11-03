import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { placeTooltip } from '../../../utils/tooltip';

interface ScatterDataPoint {
  x: string | number;
  y: number;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'scatter-chart-visualization',
  styleUrl: 'scatter-chart-visualization.scss',
  shadow: true
})
export class ScatterChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0;
  @State() legendFontSize: number = 10;

  @Element() el: HTMLElement;

  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private adjustingFont: boolean = false;

  componentWillLoad() {
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }

  componentDidRender() {
    if (this.adjustingFont) return;
    requestAnimationFrame(() => {
      const legend = this.el.shadowRoot?.querySelector('.chart-legend') as HTMLElement;
      if (!legend) return;
      if (legend.scrollHeight > legend.clientHeight && this.legendFontSize > 6) {
        this.adjustingFont = true;
        this.legendFontSize = Math.max(6, this.legendFontSize - 1);
        this.adjustingFont = false;
      }
    });
  }

  @Watch('data')
  onDataChange() {
    this.legendFontSize = 10;
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
        x: event.clientX,
        y: event.clientY
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): ScatterDataPoint[] {
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
      
      return processed;
    }
    // For legacy X/Y format
    else if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      return rawData.map(item => ({
        x: item.X === null ? 'Unknown' : item.X,
        y: Number(item.Y || 0)
      }));
    }
    // For simple two-column data
    else if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      return rawData.map(item => ({
        x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
        y: Number(item[keys[1]] || 0)
      }));
    }

    return [];
  }
  
  private calculateLinearRegression(points: { x: number, y: number }[]): RegressionResult | null {
    // Need at least 2 points for a regression line
    if (!points || points.length < 2) {
      return null;
    }
    
    // Calculate means
    const n = points.length;
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    
    for (const point of points) {
      numerator += (point.x - meanX) * (point.y - meanY);
      denominator += (point.x - meanX) * (point.x - meanX);
    }
    
    // Avoid division by zero
    if (denominator === 0) {
      return null;
    }
    
    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calculate coefficient of determination (r-squared)
    let ssRes = 0; // Sum of squared residuals
    let ssTot = 0; // Total sum of squares
    
    for (const point of points) {
      const predicted = slope * point.x + intercept;
      ssRes += Math.pow(point.y - predicted, 2);
      ssTot += Math.pow(point.y - meanY, 2);
    }
    
    // Avoid division by zero
    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
    
    return { slope, intercept, r2 };
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
    const showRegressionLine = 'showRegressionLine' in this.config ? this.config.showRegressionLine : undefined;
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.y)) * 1.1; // Add 10% padding
    
    // Calculate optimal aspect ratio for the chart
    const viewBoxWidth = 100;
    const viewBoxHeight = 60;
    
    // Generate points for the scatter plot
    const points = chartData.map((item, index) => {
      const x = 5 + index * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
      const y = viewBoxHeight - 5 - (item.y / maxValue) * (viewBoxHeight - 10);
      return { x, y, category: item.x, value: item.y };
    });
    
    // Calculate regression line if enabled and we have numeric x values
    let regressionLine = null;
    if (showRegressionLine) {
      // Convert original data points to numeric values for regression calculation
      const numericPoints = chartData
        .filter(item => {
          const numVal = typeof item.x === 'number' ? item.x : 
                        (typeof item.x === 'string' && !isNaN(Number(item.x))) ? Number(item.x) : null;
          return numVal !== null;
        })
        .map(item => ({
          x: typeof item.x === 'number' ? item.x : Number(item.x),
          y: item.y
        }));
      
      if (numericPoints.length >= 2) {
        const regression = this.calculateLinearRegression(numericPoints);
        
        if (regression) {
          // Calculate start and end points of the regression line
          // Map the regression line to SVG coordinates
          const firstIndex = 0;
          const lastIndex = chartData.length - 1;
          
          const firstX = 5 + firstIndex * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
          const lastX = 5 + lastIndex * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
          
          // Using the regression formula y = mx + b
          // We need to map both x and y values to SVG coordinates
          const mapYToSvg = (value) => viewBoxHeight - 5 - (value / maxValue) * (viewBoxHeight - 10);
          
          // Calculate y values at the first and last points
          const firstPointOrigX = typeof chartData[firstIndex].x === 'number' ? 
                                chartData[firstIndex].x : Number(chartData[firstIndex].x);
          const lastPointOrigX = typeof chartData[lastIndex].x === 'number' ? 
                               chartData[lastIndex].x : Number(chartData[lastIndex].x);
          
          const firstY = regression.slope * firstPointOrigX + regression.intercept;
          const lastY = regression.slope * lastPointOrigX + regression.intercept;
          
          // Map to SVG coordinates
          const startX = firstX;
          const startY = mapYToSvg(firstY);
          const endX = lastX;
          const endY = mapYToSvg(lastY);
          
          regressionLine = {
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            r2: regression.r2
          };
        }
      }
    }
    
    // Define colors and theme
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    return (
      <div class="scatter-chart-container" part="chart">
        <div class="visualization-container" part="plot">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {/* Draw subtle grid lines if enabled */}
            {this.config.showGrid && (
              <>
                {/* Horizontal grid lines */}
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
                
                {/* Vertical grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const x = 5 + ratio * (viewBoxWidth - 10);
                  return (
                    <line 
                      key={`v-${i}`}
                      x1={ChartThemeUtils.snapToPixel(x)} 
                      y1="5" 
                      x2={ChartThemeUtils.snapToPixel(x)} 
                      y2={viewBoxHeight - 5} 
                      stroke="var(--fl-chart-grid-color)" 
                      stroke-width="0.5"
                      opacity="0.2"
                    />
                  );
                })}
              </>
            )}
            
            {/* Draw regression line if enabled */}
            {showRegressionLine && regressionLine && (
              <line
                x1={regressionLine.x1}
                y1={regressionLine.y1}
                x2={regressionLine.x2}
                y2={regressionLine.y2}
                stroke={theme.regressionColor}
                stroke-width="1"
                stroke-dasharray="none"
                opacity="0.9"
                class="regression-line"
                style={{
                  transition: ChartAnimations.getHoverTransition()
                }}
              />
            )}
            
            {/* Draw points with modern styling */}
            {points.map((point, i) => (
              <g 
                key={i} 
                transform={`translate(${point.x}, ${point.y})`}
                style={{ 
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onClick={() => this.handleFilterClick(groupByField || '', point.category)}
                onMouseMove={(event) => this.handleMouseMove(event, point.category, point.value)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <circle 
                  cx="0" 
                  cy="0" 
                  r="1.2" 
                  fill={colors[i % colors.length]} 
                  stroke="white"
                  stroke-width="0.5"
                  opacity="0.7"
                  class="point-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                  filter="url(#softShadow)"
                />
                {/* Subtle hover state */}
                <circle 
                  cx="0" 
                  cy="0" 
                  r="2.5" 
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
                      fill="var(--fl-chart-text-color, #666)"
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
                      fill="var(--fl-chart-text-color, #444)"
                    >
                      {point.value}
                    </text>
                  );
                })}
              </>
            )}
            
            {/* Y-axis value labels */}
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
              part="tooltip" class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
              ref={(el) => placeTooltip(el, this.tooltip.x, this.tooltip.y)}
            >
              <div style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
                {this.tooltip.text}
              </div>
            </div>
          )}
        </div>
        
        {(this.config.showLegend !== false) && (
          <div class="chart-legend" part="legend">
            {chartData.length <= 10 ? (
              // If we have a reasonable number of points, show them each in the legend
              chartData.map((item, i) => (
                <div class="legend-item" key={i}>
                  <div 
                    class="color-indicator" 
                    style={{ backgroundColor: colors[i % colors.length] }}
                  ></div>
                  <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                    {String(item.x)}: {item.y}
                  </span>
                </div>
              ))
            ) : (
              // If we have too many points, just show a summary
              <div class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>{chartData.length} data points</span>
              </div>
            )}

            {/* Add regression line to legend if it exists */}
            {showRegressionLine && regressionLine && (
              <div class="legend-item">
                <div class="color-indicator regression-indicator" style={{ backgroundColor: theme.regressionColor }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  Regression Line (R² = {regressionLine.r2.toFixed(2)})
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }
} 