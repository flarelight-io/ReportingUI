import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

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
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

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
      this.tooltip = {
        visible: true,
        text: `${category}: ${value} (${percentage}%)`,
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
    if (this.config.groupByField && this.config.valueField) {
      const groupField = this.config.groupByField;
      const valueField = this.config.valueField;
      
      const processed = rawData.map(item => ({
        category: String(item[groupField] === null ? 'Unknown' : item[groupField]),
        value: Number(item[valueField] || 0)
      }));
      
      // Sort by value descending
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
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }

    const dataWithPercentages = this.calculatePercentages(chartData);
    const total = dataWithPercentages.reduce((sum, item) => sum + item.value, 0);
    const colors = this.getColors();
    
    // Rendering constants for the chart - reduced radius to leave space for labels
    const centerX = 50;
    const centerY = 50;
    const radius = 40; // Reduced from 45 to provide more space for labels
    const innerRadius = this.config.visualizationType === 'donut' ? 22 : 0;

    // Special case handling for single data point
    if (dataWithPercentages.length === 1) {
      const singleItem = dataWithPercentages[0];
      
      return (
        <div class="pie-chart-container">
          <div class="visualization-container">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {this.config.visualizationType === 'donut' ? (
                <g>
                  <defs>
                    <mask id={`donutHole-${this.config.sourceId || 'pie'}`}>
                      <rect x="0" y="0" width="100" height="100" fill="white" />
                      <circle cx={centerX} cy={centerY} r={innerRadius} fill="black" />
                    </mask>
                  </defs>
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill={colors[0]}
                    mask={`url(#donutHole-${this.config.sourceId || 'pie'})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => this.handleFilterClick(this.config.groupByField, singleItem.category)}
                    onMouseMove={(event) => this.handleMouseMove(event, singleItem.category, singleItem.value, 100)}
                    onMouseLeave={() => this.handleMouseLeave()}
                  />
                </g>
              ) : (
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill={colors[0]}
                  style={{ cursor: 'pointer' }}
                  onClick={() => this.handleFilterClick(this.config.groupByField, singleItem.category)}
                  onMouseMove={(event) => this.handleMouseMove(event, singleItem.category, singleItem.value, 100)}
                  onMouseLeave={() => this.handleMouseLeave()}
                />
              )}
              
              {this.config.showLabels && (
                <text 
                  x={centerX} 
                  y={centerY} 
                  text-anchor="middle" 
                  dominant-baseline="middle"
                  fill="white"
                  font-size="6"
                  font-weight="bold"
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
          
          {this.config.showLegend && (
            <div class="chart-legend">
              <div class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
                <span class="legend-text">{singleItem.category}: {singleItem.value} (100%)</span>
              </div>
            </div>
          )}
          
          <div class="chart-metadata">
            {this.config.groupByField && this.config.valueField && (
              <div class="chart-info">
                Group: {this.config.groupByField} • Value: {this.config.valueField} • Agg: {this.config.aggregation}
              </div>
            )}
          </div>
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
      const maxLabelDistance = 1.15; // Reduced from 1.2 to ensure labels stay in viewBox
      const outerLabelRadius = radius * maxLabelDistance;
      const outerConnectorRadius = radius * 1.02; // Shorter connectors
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
      <div class="pie-chart-container">
        <div class="visualization-container">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Draw segments */}
            {segments.map((segment, i) => (
              <path 
                key={i} 
                d={segment.path} 
                fill={segment.color}
                style={{ cursor: 'pointer' }}
                onClick={() => this.handleFilterClick(this.config.groupByField, segment.category)}
                onMouseMove={(event) => this.handleMouseMove(event, segment.category, segment.value, segment.displayPercentage)}
                onMouseLeave={() => this.handleMouseLeave()}
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
            
            {/* Add category name labels around the outside of the chart - limited to segments larger than 10 degrees */}
            {segments
              .filter(segment => segment.angle >= 10)
              .map((segment, i) => {
                // Calculate the average text length 
                const avgTextLength = dataWithPercentages.reduce((sum, item) => sum + item.category.length, 0) / dataWithPercentages.length;
                
                // Further adjust font size based on segment count and text length
                let adjustedFontSize = fontSize;
                if (avgTextLength > 8 || segments.length > 6) {
                  adjustedFontSize = Math.max(2.5, fontSize * 0.65);
                }
                
                // Truncate text based on available space and segment size
                const maxLength = Math.min(maxTextLength, Math.max(3, Math.floor(segment.angle / 10)));
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
        
        {this.config.showLegend && (
          <div class="chart-legend">
            {segments.map((segment, i) => {
              // Truncate category name in legend if too long
              const displayText = segment.category.length > 15 
                ? `${segment.category.substring(0, 15)}...` 
                : segment.category;
              
              return (
                <div key={i} class="legend-item">
                  <div class="color-indicator" style={{ backgroundColor: segment.color }}></div>
                  <span class="legend-text">
                    {displayText}: {segment.value} ({segment.displayPercentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        <div class="chart-metadata">
          {this.config.groupByField && this.config.valueField && (
            <div class="chart-info">
              Group: {this.config.groupByField} • Value: {this.config.valueField} • 
              Agg: {this.config.aggregation || 'none'}
            </div>
          )}
        </div>
      </div>
    );
  }

  private getColors(): string[] {
    return [
      '#4299e1', '#48bb78', '#f6ad55', '#f56565', 
      '#9f7aea', '#38b2ac', '#ed8936', '#667eea',
      '#fc8181', '#68d391', '#cbd5e0', '#feb2b2',
      '#90cdf4', '#c6f6d5', '#fbd38d', '#e9d8fd'
    ];
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