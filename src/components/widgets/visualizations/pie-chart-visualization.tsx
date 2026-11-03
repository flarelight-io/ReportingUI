import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, clipLabel } from '../../../utils/bar-layout';
import { placeTooltip } from '../../../utils/tooltip';

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
  @State() plotWidth: number = 0;
  @State() plotHeight: number = 0;

  @Element() el: HTMLElement;

  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private adjustingFont: boolean = false;
  private plotSize = new PlotSizeTracker(({ width, height }) => {
    if (width !== this.plotWidth) this.plotWidth = width;
    if (height !== this.plotHeight) this.plotHeight = height;
  });

  disconnectedCallback() {
    this.plotSize.detach();
  }

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
        x: event.clientX,
        y: event.clientY
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    
    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    // Outside labels need room on both sides; in small cells the legend and tooltip carry the names
    const showOuterLabels = W >= 260 && H >= 180;
    const labelChars = 14;
    const sideMargin = showOuterLabels ? labelChars * charWidth + 22 : 8;
    const vertMargin = showOuterLabels ? fontSize + 14 : 8;
    const centerX = W / 2;
    const centerY = H / 2;
    const radius = Math.max(0, Math.min((W - sideMargin * 2) / 2, (H - vertMargin * 2) / 2));
    const innerRadius = this.config.visualizationType === 'donut' ? radius * 0.55 : 0;

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
          <div class="visualization-container" part="plot" ref={this.plotSize.attach}>
            {W > 0 && H > 0 && (
<svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ position: 'absolute', inset: '0' }}
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
                  font-size={fontSize + 2}
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
                  y2={centerY - radius - 10}
                  stroke="var(--fl-chart-axis-color, #555)"
                  stroke-width="0.5"
                  stroke-dasharray="1,1"
                />
                
                <text
                  x={centerX}
                  y={centerY - radius - 18}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  font-size={fontSize}
                  fill="var(--fl-chart-text-color, #333)"
                  font-weight="bold"
                >
                  {singleItem.category}
                </text>
              </g>
            </svg>
)}
            
            
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
      const labelRadius = innerRadius ? (radius + innerRadius) / 2 : radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(midAngleRadians);
      const labelY = centerY + labelRadius * Math.sin(midAngleRadians);
      
      // Calculate position for external category labels - keep within viewBox
      const outerLabelRadius = radius + 14; // Labels sit just outside the pie edge
      const outerConnectorRadius = radius + 2; // Connector end just outside the pie
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
    

    
    return (
      <div class="pie-chart-container" part="chart">
        <div class="visualization-container" part="plot" ref={this.plotSize.attach}>
          {W > 0 && H > 0 && (
<svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: '0' }}
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
              segments.filter(segment => segment.angle >= 15 && radius * 0.7 * (segment.angle * Math.PI / 180) >= charWidth * 4).map((segment, i) => (
                <text 
                  key={i} 
                  x={segment.labelX} 
                  y={segment.labelY} 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  fill="white"
                  font-size={fontSize}
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
                  y={centerY - fontSize * 0.5}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill="var(--fl-chart-text-color)"
                  font-size={fontSize + 4}
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
                  y={centerY + fontSize}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill="var(--fl-chart-text-secondary)"
                  font-size={fontSize - 1}
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
            
            {/* Category names around the outside, skipping any that would overlap a neighbour */}
            {showOuterLabels && (() => {
              const lastY: Record<string, number> = {};
              return segments
                .filter(segment => segment.angle >= 10)
                .map((segment, i) => {
                  const side = segment.textAnchor;
                  if (lastY[side] !== undefined && Math.abs(segment.outerLabelY - lastY[side]) < fontSize * 1.2) return null;
                  lastY[side] = segment.outerLabelY;
                  return (
                    <g key={`label-${i}`}>
                      <line
                        x1={segment.connectorX}
                        y1={segment.connectorY}
                        x2={segment.outerLabelX}
                        y2={segment.outerLabelY}
                        stroke="var(--fl-chart-axis-color, #555)"
                        stroke-width="1"
                        stroke-dasharray="3,3"
                      />
                      <text
                        x={segment.outerLabelX + (side === 'end' ? -4 : 4)}
                        y={segment.outerLabelY}
                        text-anchor={side}
                        dominant-baseline="middle"
                        font-size={fontSize}
                        fill="var(--fl-chart-text-color, #333)"
                        font-family={theme.fontFamily}
                        font-weight="bold"
                      >
                        {clipLabel(segment.category, labelChars)}
                      </text>
                    </g>
                  );
                });
            })()}
          </svg>
)}
          
          
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    return theme.series;
  }
}
