import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

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

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }

  private processData(): StackedChartItem[] {
    const rawData = this.data.rawData || [];
    
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const fields = 'fields' in this.config ? this.config.fields : undefined;
    
    if (rawData.length === 0 || !groupByField || !fields || fields.length === 0) {
      return [];
    }
    
    const groupField = groupByField;
    const valueFields = fields;
    
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
    
    const processed = Object.values(groupedData) as StackedChartItem[];
    
    return processed;
  }

  private handleMouseMove(event: MouseEvent, segment: { field: string, value: number }, category: string) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(segment.value);
      const maxCategoryLength = 30;
      const truncatedCategory = category.length > maxCategoryLength 
        ? `${category.substring(0, maxCategoryLength)}...` 
        : category;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedCategory}\n${segment.field}: ${formattedValue}`,
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
    const fields = 'fields' in this.config ? this.config.fields : undefined;
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Use string comparison to avoid type errors
    const visualizationType = this.config.visualizationType || '';
    const isHorizontal = visualizationType === 'stacked-hbar';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Find the maximum total value for scaling
    const maxValue = Math.max(...chartData.map(item => item.total)) * 1.1; // Add 10% padding
    
    // SVG dimensions
    const viewBoxWidth = isHorizontal ? 200 : 200;
    const viewBoxHeight = isHorizontal ? Math.max(200, chartData.length * 35) : 100;
    const svgViewBoxHeight = isHorizontal ? viewBoxHeight : 130;
    const step = Math.floor(viewBoxWidth / chartData.length);
    
    // Calculate available space
    const availableWidth = viewBoxWidth - (isHorizontal ? 40 : 10);
    const availableHeight = viewBoxHeight - 50;
    
    // Label properties
    const { fontSize, maxTextLength } = this.calculateLabelProperties(chartData);
    
    // Calculate positions and dimensions for bars
    const bars = chartData.map((item, categoryIndex) => {
      const segments = item.values.map((segment, segmentIndex) => {
        const scaledValue = (segment.value / maxValue) * (isHorizontal ? availableWidth * 0.9 : 90); // Scale appropriately
        
        if (isHorizontal) {
          // For horizontal bars
          const categoryYPosition = 30 + (categoryIndex * (availableHeight / chartData.length));
          const barHeight = (availableHeight / chartData.length) * 0.7;
          
          // Calculate starting position based on previous segments
          const startPosition = item.values
            .slice(0, segmentIndex)
            .reduce((sum, prev) => sum + (prev.value / maxValue) * availableWidth * 0.9, 0);
          
          return {
            x: 5 + startPosition,
            y: categoryYPosition,
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
      
      // Calculate center point for category labels
      let centerPoint;
      if (isHorizontal) {
        const categoryYPosition = 30 + (categoryIndex * (availableHeight / chartData.length));
        const barHeight = (availableHeight / chartData.length) * 0.7;
        centerPoint = categoryYPosition + barHeight / 2;
      } else {
        const x = 5 + (categoryIndex * step * 0.95) + (step * 0.7 / 2);
        centerPoint = x;
      }
      
      return {
        category: item.category,
        segments,
        center: centerPoint,
        total: item.total
      };
    });

    return (
      <div class="bar-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${svgViewBoxHeight}`}
            preserveAspectRatio="xMidYMin meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`gradient-${index}`} id={`stackedGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
            
            {/* Draw stacked bars with modern styling */}
            {bars.map((bar, i) => (
              <g key={i}>
                {bar.segments.map((segment, j) => (
                  <rect 
                    key={`${i}-${j}`} 
                    x={segment.x} 
                    y={segment.y} 
                    width={segment.width} 
                    height={segment.height} 
                    fill={`url(#stackedGradient-${j % colors.length})`}
                    class="bar-animated bar-glow"
                    style={{ 
                      cursor: 'pointer',
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(i + j)}ms`,
                      animationFillMode: 'both'
                    }}
                    onMouseMove={(e) => this.handleMouseMove(e, { field: segment.field, value: segment.value }, bar.category)}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick(groupByField || '', bar.category)}
                    filter="url(#softShadow)"
                  />
                ))}
              </g>
            ))}
            
            {/* Category labels with modern styling */}
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
                  const displayText = bar.category.length > maxTextLength 
                    ? `${bar.category.substring(0, maxTextLength)}...` 
                    : bar.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={bar.center} 
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
                        transformOrigin: `${bar.center}px 105px`
                      }}
                    >
                      {displayText}
                    </text>
                  );
                })}
              </g>
            )}
            
            {/* For horizontal bar charts, show labels at the end of each bar */}
            {isHorizontal && (
              <g>
                {bars.map((bar, i) => {                
                  // Calculate the total width of all segments for this bar
                  const totalBarWidth = bar.segments.reduce((sum, segment) => sum + segment.width, 0);
                  
                  // Truncate text based on available space
                  const displayText = bar.category.length > maxTextLength 
                    ? `${bar.category.substring(0, maxTextLength)}...` 
                    : bar.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={5 + totalBarWidth + 2} 
                      y={bar.center} 
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
            {fields && fields.map((field, i) => (
              <div key={i} class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  {field}
                </span>
              </div>
            ))}
          </div>
        )}
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