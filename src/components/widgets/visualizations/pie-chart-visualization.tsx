import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

interface PieChartDataItem {
  category: string;
  value: number;
  percentage?: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'pie-chart-visualization',
  styleUrl: 'pie-chart-visualization.scss',
  shadow: true
})
export class PieChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
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

  @Watch('colorTheme')
  colorThemeChanged() {
    this.themeVersion++;
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

  private handleMouseMove(event: MouseEvent, category: string, value: number, percentage: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(value);
      const maxCategoryLength = 30;
      const truncatedCategory = category.length > maxCategoryLength 
        ? `${category.substring(0, maxCategoryLength)}...` 
        : category;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedCategory}\n${formattedValue} (${percentage.toFixed(1)}%)`,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): PieChartDataItem[] {
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
      
      return processed;
    }
    // For legacy Group/Value format
    else if (rawData[0]?.Group !== undefined && rawData[0]?.Value !== undefined) {
      return rawData.map(item => ({
        category: String(item.Group === null ? 'Unknown' : item.Group),
        value: Number(item.Value || 0)
      }));
    }
    // For simple two-column data
    else if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      return rawData.map(item => ({
        category: String(item[keys[0]] === null ? 'Unknown' : item[keys[0]]),
        value: Number(item[keys[1]] || 0)
      }));
    }
    
    return [];
  }

  private calculatePercentages(data: PieChartDataItem[]): PieChartDataItem[] {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return data;
    
    return data.map(item => ({
      ...item,
      percentage: Math.round((item.value / total) * 100)
    }));
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
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }

    const dataWithPercentages = this.calculatePercentages(chartData);
    const total = dataWithPercentages.reduce((sum, item) => sum + item.value, 0);
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    const centerX = 50;
    const centerY = 50;
    const radius = 44;
    const innerRadius = this.config.visualizationType === 'donut' ? 24 : 0;

    // Special case handling for single data point
    if (dataWithPercentages.length === 1) {
      const singleItem = dataWithPercentages[0];
      
      // Create a path with a small gap to ensure proper rendering
      const gapAngle = 0.1; // Small gap in degrees to prevent same start/end point
      const startAngle = 0;
      const endAngle = 360 - gapAngle; // Leave small gap
      
      // Calculate SVG arc path
      const startRadians = (startAngle - 90) * Math.PI / 180;
      const endRadians = (endAngle - 90) * Math.PI / 180;
      
      const startX = centerX + radius * Math.cos(startRadians);
      const startY = centerY + radius * Math.sin(startRadians);
      const endX = centerX + radius * Math.cos(endRadians);
      const endY = centerY + radius * Math.sin(endRadians);
      
      // For inner radius (donut)
      const innerStartX = centerX + innerRadius * Math.cos(startRadians);
      const innerStartY = centerY + innerRadius * Math.sin(startRadians);
      const innerEndX = centerX + innerRadius * Math.cos(endRadians);
      const innerEndY = centerY + innerRadius * Math.sin(endRadians);
      
      // Construct the SVG path for the segment
      let path;
      if (this.config.visualizationType === 'donut') {
        // Path for donut segment - outer arc, line to inner arc, inner arc, close
        path = `
          M ${startX} ${startY}
          A ${radius} ${radius} 0 1 1 ${endX} ${endY}
          L ${innerEndX} ${innerEndY}
          A ${innerRadius} ${innerRadius} 0 1 0 ${innerStartX} ${innerStartY}
          Z
        `;
      } else {
        // Path for pie segment - line from center, outer arc, close to center
        path = `
          M ${centerX} ${centerY}
          L ${startX} ${startY}
          A ${radius} ${radius} 0 1 1 ${endX} ${endY}
          Z
        `;
      }
      
      return (
        <div class="pie-chart-container" part="chart">
          <div class="visualization-container" part="plot">
            <svg
              width="100%"
              height="100%"
              viewBox="-25 -10 150 120"
              preserveAspectRatio="xMidYMid meet"
              {...ChartThemeUtils.getSVGAttributes()}
            >
              {/* Define gradients and filters for modern styling */}
              <defs>
                <radialGradient id="pieGradient-0" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color={colors[0]} stop-opacity="1"/>
                  <stop offset="100%" stop-color={colors[0]} stop-opacity="0.8"/>
                </radialGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
                </filter>
              </defs>
              
              <path
                d={path}
                fill={`url(#pieGradient-0)`}
                class="pie-segment-animated pie-segment-hover"
                style={{ 
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition(),
                  animationDelay: '0ms',
                  animationFillMode: 'both'
                }}
                onClick={() => this.handleFilterClick(groupByField || '', singleItem.category)}
                onMouseMove={(event) => this.handleMouseMove(event, singleItem.category, singleItem.value, 100)}
                onMouseLeave={() => this.handleMouseLeave()}
                filter="url(#softShadow)"
              />
              
              {this.config.showLabels && (
                <text 
                  x={centerX} 
                  y={centerY} 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  fill="white"
                  font-size="6"
                  font-weight="600"
                  font-family={theme.fontFamily}
                  paint-order="stroke fill"
                  stroke="rgba(0,0,0,0.3)"
                  stroke-width="0.5"
                >
                  100%
                </text>
              )}
              
              <g>
                <line 
                  x1={centerX}
                  y1={centerY - radius}
                  x2={centerX}
                  y2={centerY - radius - 5}
                  stroke="var(--fl-chart-axis-color, #555)"
                  stroke-width="0.5"
                  stroke-dasharray="1,1"
                />
                
                <text
                  x={centerX}
                  y={centerY - radius - 7}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  font-size="4"
                  fill="var(--fl-chart-text-color, #333)"
                  font-weight="bold"
                >
                  {singleItem.category}
                </text>
              </g>
            </svg>
            
            {/* Tooltip */}
            {this.tooltip.visible && (
              <div 
                part="tooltip" class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
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
            <div class="chart-legend" part="legend">
              <div class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
                <span class="legend-text">{singleItem.category}: {singleItem.value} (100%)</span>
              </div>
            </div>
          )}
          
        </div>
      );
    }

    // Calculate arcs for each segment
    let startAngle = 0;
    const segments = dataWithPercentages.map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const endAngle = startAngle + angle;
      
      // Calculate SVG arc path
      const startRadians = (startAngle - 90) * Math.PI / 180;
      const endRadians = (endAngle - 90) * Math.PI / 180;
      
      const startX = centerX + radius * Math.cos(startRadians);
      const startY = centerY + radius * Math.sin(startRadians);
      const endX = centerX + radius * Math.cos(endRadians);
      const endY = centerY + radius * Math.sin(endRadians);
      
      // For inner radius (donut)
      const innerStartX = centerX + innerRadius * Math.cos(startRadians);
      const innerStartY = centerY + innerRadius * Math.sin(startRadians);
      const innerEndX = centerX + innerRadius * Math.cos(endRadians);
      const innerEndY = centerY + innerRadius * Math.sin(endRadians);
      
      // Arc flags - large arc and sweep flags are 0 or 1 based on angle
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      // Construct the SVG path for the segment
      let path;
      if (this.config.visualizationType === 'donut') {
        // Path for donut segment - outer arc, line to inner arc, inner arc, close
        path = `
          M ${startX} ${startY}
          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
          L ${innerEndX} ${innerEndY}
          A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
          Z
        `;
      } else {
        // Path for pie segment - line from center, outer arc, close to center
        path = `
          M ${centerX} ${centerY}
          L ${startX} ${startY}
          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
          Z
        `;
      }
      
      // Calculate position for internal percentage label
      const midAngleRadians = (startAngle + angle / 2 - 90) * Math.PI / 180;
      const labelRadius = radius * 0.75; // Position label at 75% of the radius
      const labelX = centerX + labelRadius * Math.cos(midAngleRadians);
      const labelY = centerY + labelRadius * Math.sin(midAngleRadians);
      
      // Calculate position for external category labels - keep within viewBox
      const maxLabelDistance = 1.15; // Labels sit just outside the pie edge
      const outerLabelRadius = radius * maxLabelDistance;
      const outerConnectorRadius = radius * 1.02; // Connector end just outside the pie
      const outerLabelX = centerX + outerLabelRadius * Math.cos(midAngleRadians);
      const outerLabelY = centerY + outerLabelRadius * Math.sin(midAngleRadians);
      const connectorX = centerX + outerConnectorRadius * Math.cos(midAngleRadians);
      const connectorY = centerY + outerConnectorRadius * Math.sin(midAngleRadians);
      
      // Determine text anchor based on position around the circle
      const textAnchor = midAngleRadians > Math.PI / 2 && midAngleRadians < 3 * Math.PI / 2 ? "end" : "start";
      
      // Prepare for next segment
      startAngle = endAngle;
      
      return {
        path,
        color: colors[index % colors.length],
        colorIndex: index % colors.length,
        percentage,
        labelX,
        labelY,
        outerLabelX,
        outerLabelY,
        connectorX,
        connectorY,
        textAnchor,
        category: item.category,
        value: item.value,
        angle,
        displayPercentage: item.percentage
      };
    });
    
    // Calculate optimal label properties based on chart properties and segment count
    const fontSize = this.calculateFontSize(segments.length);
    const maxTextLength = this.calculateMaxTextLength(segments.length);
    
    return (
      <div class="pie-chart-container" part="chart">
        <div class="visualization-container" part="plot">
          <svg
            width="100%"
            height="100%"
            viewBox="-25 -10 150 120"
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients for each color */}
            <defs>
              {colors.map((color, index) => (
                <radialGradient key={`pieGradient-${index}`} id={`pieGradient-${index}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color={color} stop-opacity="1"/>
                  <stop offset="100%" stop-color={color} stop-opacity="0.8"/>
                </radialGradient>
              ))}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            
            {/* Draw segments */}
            {segments.map((segment, i) => (
              <path 
                key={i} 
                d={segment.path} 
                fill={`url(#pieGradient-${segment.colorIndex})`}
                class="pie-segment-animated pie-segment-hover"
                style={{ 
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition(),
                  animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                  animationFillMode: 'both'
                }}
                onClick={() => this.handleFilterClick(groupByField || '', segment.category)}
                onMouseMove={(event) => this.handleMouseMove(event, segment.category, segment.value, segment.displayPercentage)}
                onMouseLeave={() => this.handleMouseLeave()}
                filter="url(#softShadow)"
              />
            ))}
            
            {/* Add percentage labels inside segments if they're big enough */}
            {this.config.showLabels && segments.some(segment => segment.angle >= 15) && (
              segments.filter(segment => segment.angle >= 15).map((segment, i) => (
                <text 
                  key={i} 
                  x={segment.labelX} 
                  y={segment.labelY} 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  fill="white"
                  font-size="3"
                  font-weight="bold"
                >
                  {segment.percentage >= 0.08 ? Math.round(segment.percentage * 100) + '%' : ''}
                </text>
              ))
            )}
            
            {/* Add total in center for donut charts when enabled */}
            {this.config.visualizationType === 'donut' && (this.config as any).showTotal && (
              <g>
                <text 
                  x={centerX} 
                  y={centerY - 2} 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  fill="var(--fl-chart-text-color)"
                  font-size="6"
                  font-weight="700"
                  font-family={theme.fontFamily}
                  class="text-animated"
                  style={{
                    animationDelay: '200ms',
                    animationFillMode: 'both'
                  }}
                >
                  {ChartThemeUtils.formatNumber(total)}
                </text>
                <text 
                  x={centerX} 
                  y={centerY + 3} 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  fill="var(--fl-chart-text-secondary)"
                  font-size="3"
                  font-weight="500"
                  font-family={theme.fontFamily}
                  class="text-animated"
                  style={{
                    animationDelay: '250ms',
                    animationFillMode: 'both'
                  }}
                >
                  Total
                </text>
              </g>
            )}
            
            {/* Add category name labels around the outside of the chart - limited to segments larger than 10 degrees */}
            {segments
              .filter(segment => segment.angle >= 10)
              .map((segment, i) => {
                // Calculate the average text length 
                const avgTextLength = dataWithPercentages.reduce((sum, item) => sum + item.category.length, 0) / dataWithPercentages.length;
                
                // Further adjust font size based on segment count and text length,
                // capped at 3.5 SVG units so text width stays predictable within the viewBox
                let adjustedFontSize = fontSize;
                if (avgTextLength > 8 || segments.length > 6) {
                  adjustedFontSize = Math.max(2.5, fontSize * 0.65);
                }
                adjustedFontSize = Math.min(3.5, adjustedFontSize);

                // Truncate text to maxTextLength (scales down as segment count increases)
                const maxLength = maxTextLength;
                const displayText = segment.category.length > maxLength 
                  ? `${segment.category.substring(0, maxLength)}...` 
                  : segment.category;

                return (
                  <g key={`label-${i}`}>
                    {/* Connector line from segment to label */}
                    <line 
                      x1={segment.connectorX}
                      y1={segment.connectorY}
                      x2={segment.outerLabelX}
                      y2={segment.outerLabelY}
                      stroke="var(--fl-chart-axis-color, #555)"
                      stroke-width="0.5"
                      stroke-dasharray="1,1"
                    />
                    
                    {/* Category label */}
                    <text
                      x={segment.outerLabelX}
                      y={segment.outerLabelY}
                      text-anchor={segment.textAnchor}
                      dominant-baseline="middle"
                      font-size={adjustedFontSize}
                      fill="var(--fl-chart-text-color, #333)"
                      font-weight="bold"
                    >
                      {displayText}
                    </text>
                  </g>
                );
            })}
          </svg>
          
          {/* Tooltip */}
          {this.tooltip.visible && (
            <div 
              part="tooltip" class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
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
          <div class="chart-legend" part="legend">
            {segments.map((segment, i) => (
              <div key={i} class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: segment.color }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  {segment.category}: {segment.value} ({segment.displayPercentage}%)
                </span>
              </div>
            ))}
          </div>
        )}
        
      </div>
    );
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }
  
  private calculateFontSize(itemCount: number): number {
    // Base values
    const baseFontSize = 6;
    
    // Adjust based on number of segments
    const segmentCountAdjustment = itemCount <= 4 ? 1.1 : 
                                itemCount <= 6 ? 1 :
                                itemCount <= 8 ? 0.8 : 0.6;
    
    // Calculate final value
    return Math.max(4, Math.round(baseFontSize * segmentCountAdjustment * 10) / 10);
  }
  
  private calculateMaxTextLength(itemCount: number): number {
    // Base value
    const baseMaxLength = 20;
    
    // Adjust based on number of segments
    const segmentCountAdjustment = itemCount <= 4 ? 1.1 : 
                                itemCount <= 6 ? 1 :
                                itemCount <= 8 ? 0.8 : 0.6;
    
    // Calculate final value
    return Math.max(4, Math.round(baseMaxLength * segmentCountAdjustment));
  }
} 