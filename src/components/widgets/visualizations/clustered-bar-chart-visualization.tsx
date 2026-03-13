import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

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

  private processData(): ClusteredChartItem[] {
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
    
    // Use safe string comparison to avoid type errors
    const isHorizontal = String(this.config.visualizationType) === 'clustered-hbar';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.maxValue)) * 1.1; // Add 10% padding
    
    // SVG dimensions and spacing
    const viewBoxWidth = 200;
    const viewBoxHeight = isHorizontal ? Math.max(200, chartData.length * 35) : 100;
    const svgViewBoxHeight = isHorizontal ? viewBoxHeight : 130;
    
    // Calculate spacing based on available space and number of bars
    const categoryCount = chartData.length;
    const fieldCount = fields?.length || 1;
    
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
            x: 5, // Start position at left axis
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
            viewBox={`0 0 ${viewBoxWidth} ${svgViewBoxHeight}`}
            preserveAspectRatio="xMidYMin meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`gradient-${index}`} id={`clusteredGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
            
            {/* Draw clustered bars with modern styling */}
            {bars.map((bar, i) => (
              <g key={i}>
                {bar.segments.map((segment, j) => (
                  <rect 
                    key={`${i}-${j}`} 
                    x={segment.x} 
                    y={segment.y} 
                    width={segment.width} 
                    height={segment.height} 
                    fill={`url(#clusteredGradient-${j % colors.length})`}
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
            
            {/* Show values on the bars if enabled */}
            {this.config.showLabels && (
              <g>
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
                        fill={isHorizontal ? "var(--fl-chart-text-color)" : "white"}
                        font-family={theme.fontFamily}
                        font-weight="600"
                        paint-order="stroke fill"
                        stroke="rgba(0,0,0,0.1)"
                        stroke-width="0.5"
                        class="text-animated"
                        style={{
                          animationDelay: `${ChartAnimations.getStaggerDelay(i + j) + 100}ms`,
                          animationFillMode: 'both'
                        }}
                      >
                        {ChartThemeUtils.formatNumber(segment.value)}
                      </text>
                    );
                  })
                ))}
              </g>
            )}
            
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
            
            {/* For horizontal bar charts, show labels at the end of each bar group */}
            {isHorizontal && (
              <g>
                {bars.map((bar, i) => {
                  // Find the rightmost segment (highest x + width) in this bar group
                  const rightmostSegment = bar.segments.reduce((rightmost, segment) => {
                    const segmentRight = segment.x + segment.width;
                    return segmentRight > rightmost ? segmentRight : rightmost;
                  }, 0);
                  
                  // Truncate text based on available space
                  const displayText = bar.category.length > maxTextLength 
                    ? `${bar.category.substring(0, maxTextLength)}...` 
                    : bar.category;
                  
                  return (
                    <text 
                      key={i} 
                      x={rightmostSegment + 2} 
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