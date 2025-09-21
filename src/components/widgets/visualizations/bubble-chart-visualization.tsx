import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface BubbleDataPoint {
  x: string | number;
  y: number;
  size: number;
  category: string;
  originalData: any;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'bubble-chart-visualization',
  styleUrl: 'bubble-chart-visualization.scss',
  shadow: true
})
export class BubbleChartVisualization {
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

  private handleMouseMove(event: MouseEvent, category: string | number, value: number, size: any) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      this.tooltip = {
        visible: true,
        text: `${category}: ${value} (Size: ${size})`,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): BubbleDataPoint[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // For standard configuration with x, y, and size fields specified
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    const idField = 'idField' in this.config ? this.config.idField : undefined;
    const parentIdField = 'parentIdField' in this.config ? this.config.parentIdField : undefined;
    
    if (groupByField && valueField) {
      const xField = groupByField;
      const yField = valueField;
      
      // For size, we'll use a third field if specified, otherwise use the same as y
      const sizeField = idField || yField;
      
      // For category (used for coloring), use the parentIdField if specified, otherwise use groupByField
      const categoryField = parentIdField || xField;
      
      const processed = rawData.map(item => ({
        x: item[xField] === null ? 'Unknown' : item[xField],
        y: Number(item[yField] || 0),
        size: Math.max(5, Math.sqrt(Number(item[sizeField] || 0)) * 2), // Scale size for better visualization
        category: String(item[categoryField] || ''),
        originalData: item
      }));
      
      return this.sortDataPoints(processed);
    } 
    // For legacy data format
    else if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      // Try to find a size field, or use Y if not found
      const sizeField = rawData[0]?.Size !== undefined ? 'Size' : 
                        rawData[0]?.Z !== undefined ? 'Z' : 'Y';
      
      // Try to find a category field
      const categoryField = rawData[0]?.Category !== undefined ? 'Category' : 
                            rawData[0]?.Name !== undefined ? 'Name' : 'X';
      
      const processed = rawData.map(item => ({
        x: item.X === null ? 'Unknown' : item.X,
        y: Number(item.Y || 0),
        size: Math.max(5, Math.sqrt(Number(item[sizeField] || 0)) * 2),
        category: String(item[categoryField] || ''),
        originalData: item
      }));
      
      return this.sortDataPoints(processed);
    }
    // For simple multi-column data, try to infer x, y, and size
    else if (rawData.length > 0) {
      const keys = Object.keys(rawData[0]);
      
      // If we have at least 3 columns, use them for x, y, and size
      if (keys.length >= 3) {
        const processed = rawData.map(item => ({
          x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
          y: Number(item[keys[1]] || 0),
          size: Math.max(5, Math.sqrt(Number(item[keys[2]] || 0)) * 2),
          category: String(item[keys.length > 3 ? keys[3] : keys[0]] || ''),
          originalData: item
        }));
        
        return this.sortDataPoints(processed);
      }
      // If we have only 2 columns, use them for x and y, and y for size
      else if (keys.length === 2) {
        const processed = rawData.map(item => ({
          x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
          y: Number(item[keys[1]] || 0),
          size: Math.max(5, Math.sqrt(Number(item[keys[1]] || 0)) * 2),
          category: String(item[keys[0]] || ''),
          originalData: item
        }));
        
        return this.sortDataPoints(processed);
      }
    }
    
    return [];
  }

  private sortDataPoints(data: BubbleDataPoint[]): BubbleDataPoint[] {
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
  
  private getUniqueCategories(data: BubbleDataPoint[]): string[] {
    const categories = new Set<string>();
    data.forEach(item => categories.add(item.category));
    return Array.from(categories);
  }
  
  private getCategoryColor(category: string, categories: string[]): string {
    const colors = this.getColors();
    const index = categories.indexOf(category);
    return colors[index % colors.length];
  }
  
  private getColors(): string[] {
    return [
      '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01', 
      '#46BDC6', '#7BAAF7', '#F07B72', '#FCD04F', '#71C287',
      '#FFA550', '#76CFCF', '#ABD0FD', '#F7B1AB', '#FEE29C',
      '#ADC7C0'
    ];
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
    const idField = 'idField' in this.config ? this.config.idField : undefined;
    const parentIdField = 'parentIdField' in this.config ? this.config.parentIdField : undefined;
    
    const bubbleData = this.processData();
    
    if (bubbleData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Find min and max values for x, y, and size for proper scaling
    const xValues = bubbleData.map(d => typeof d.x === 'number' ? d.x : typeof d.x === 'string' && !isNaN(Number(d.x)) ? Number(d.x) : null)
                             .filter(x => x !== null) as number[];
    
    const minX = xValues.length ? Math.min(...xValues) : 0;
    const maxX = xValues.length ? Math.max(...xValues) : 100;
    
    const yValues = bubbleData.map(d => d.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    const sizeValues = bubbleData.map(d => d.size);
    const maxSize = Math.max(...sizeValues);
    
    // Calculate optimal aspect ratio for the chart
    const viewBoxWidth = 100;
    const viewBoxHeight = 60;
    
    // Increase padding to account for bubble sizes and prevent overflow
    const xPadding = 10 + maxSize / 2;
    const yPadding = 5 + maxSize / 2;
    
    // Get unique categories for coloring
    const categories = this.getUniqueCategories(bubbleData);
    
    // Generate bubbles
    const bubbles = bubbleData.map((item, index) => {
      let x: number;
      
      // Handle different types of x values
      if (typeof item.x === 'number') {
        // Scale numeric x values to view box
        x = xPadding + ((item.x - minX) / (maxX - minX || 1)) * (viewBoxWidth - 2 * xPadding);
      } else if (typeof item.x === 'string' && !isNaN(Number(item.x))) {
        // Convert numeric strings to numbers
        const numX = Number(item.x);
        x = xPadding + ((numX - minX) / (maxX - minX || 1)) * (viewBoxWidth - 2 * xPadding);
      } else {
        // For non-numeric x values, space them evenly
        x = xPadding + index * ((viewBoxWidth - 2 * xPadding) / (bubbleData.length - 1 || 1));
      }
      
      // Scale y value to view box (invert because SVG coordinates go from top to bottom)
      const y = viewBoxHeight - yPadding - ((item.y - minY) / (maxY - minY || 1)) * (viewBoxHeight - 2 * yPadding);
      
      // Scale bubble size relative to max size (to avoid overly large bubbles)
      // Reduce the maximum size of bubbles to ensure they fit within the chart area
      const scaleFactor = Math.min(0.8, maxSize > 20 ? 20 / maxSize : 1);
      const scaledSize = item.size * scaleFactor;
      
      // Get color based on category
      const color = this.getCategoryColor(item.category, categories);
      
      // Generate tooltip content
      const tooltipContent = `${item.x}: ${item.y} (Size: ${item.originalData[idField || valueField || '']})`;
      
      return {
        x,
        y,
        r: scaledSize,
        color,
        data: item,
        tooltip: tooltipContent
      };
    });
    
    return (
      <div class="bubble-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {this.config.showGrid && (
              <>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = viewBoxHeight - yPadding - ratio * (viewBoxHeight - 2 * yPadding);
                  return (
                    <line 
                      key={`h-${i}`}
                      x1={xPadding} 
                      y1={y} 
                      x2={viewBoxWidth - xPadding} 
                      y2={y} 
                      stroke="var(--fl-chart-grid-color, #ccc)" 
                      stroke-width="0.5"
                      stroke-dasharray={i > 0 ? "1,1" : ""}
                    />
                  );
                })}
                
                {/* Vertical grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const x = xPadding + ratio * (viewBoxWidth - 2 * xPadding);
                  return (
                    <line 
                      key={`v-${i}`}
                      x1={x} 
                      y1={yPadding} 
                      x2={x} 
                      y2={viewBoxHeight - yPadding} 
                      stroke="var(--fl-chart-grid-color, #ccc)" 
                      stroke-width="0.5"
                      stroke-dasharray={i > 0 ? "1,1" : ""}
                    />
                  );
                })}
              </>
            )}
            
            {/* Draw bubbles */}
            {bubbles.map((bubble, i) => (
              <g 
                key={i} 
                transform={`translate(${bubble.x}, ${bubble.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => this.handleFilterClick(groupByField || '', bubble.data.x)}
                onMouseMove={(event) => this.handleMouseMove(event, bubble.data.x, bubble.data.y, bubble.data.size)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <circle 
                  cx="0" 
                  cy="0" 
                  r={bubble.r}
                  fill={bubble.color} 
                  opacity="0.7"
                  stroke={bubble.color}
                  stroke-width="1"
                  class="bubble"
                >
                </circle>
                
                {this.config.showLabels && (
                  <text 
                    key={`value-${i}`} 
                    x="0" 
                    y={-bubble.r - 2} 
                    text-anchor="middle" 
                    font-size="3" 
                    fill="var(--fl-chart-text-color, #333)"
                    class="bubble-label"
                  >
                    {typeof bubble.data.x === 'string' && bubble.data.x.length > 10 
                      ? bubble.data.x.substring(0, 10) + '...' 
                      : bubble.data.x}
                  </text>
                )}
              </g>
            ))}
            
            {/* X and Y axis */}
            <line 
              x1={xPadding} 
              y1={viewBoxHeight - yPadding} 
              x2={viewBoxWidth - xPadding} 
              y2={viewBoxHeight - yPadding} 
              stroke="var(--fl-chart-axis-color, #333)" 
              stroke-width="1" 
            />
            <line 
              x1={xPadding} 
              y1={yPadding} 
              x2={xPadding} 
              y2={viewBoxHeight - yPadding} 
              stroke="var(--fl-chart-axis-color, #333)" 
              stroke-width="1" 
            />
            
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = viewBoxHeight - yPadding - ratio * (viewBoxHeight - 2 * yPadding);
              const value = minY + ratio * (maxY - minY);
              
              return (
                <text 
                  key={`y-label-${i}`} 
                  x={xPadding - 1} 
                  y={y} 
                  font-size="3" 
                  text-anchor="end" 
                  dominant-baseline="middle" 
                  fill="var(--fl-chart-text-color, #666)"
                >
                  {value.toFixed(value > 100 ? 0 : value > 10 ? 1 : 2)}
                </text>
              );
            })}
            
            {/* X-axis labels - only show if we have numeric x values */}
            {xValues.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const x = xPadding + ratio * (viewBoxWidth - 2 * xPadding);
              const value = minX + ratio * (maxX - minX);
              
              return (
                <text 
                  key={`x-label-${i}`} 
                  x={x} 
                  y={viewBoxHeight - yPadding + 3} 
                  font-size="3" 
                  text-anchor="middle" 
                  fill="var(--fl-chart-text-color, #666)"
                >
                  {value.toFixed(value > 100 ? 0 : value > 10 ? 1 : 2)}
                </text>
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
        
        {/* Legend */}
        {this.config.showLegend && categories.length > 0 && (
          <div class="chart-legend">
            {categories.map((category, i) => (
              <div key={i} class="legend-item">
                <div 
                  class="color-indicator" 
                  style={{ backgroundColor: this.getCategoryColor(category, categories) }}
                ></div>
                <span class="legend-text">
                  {category.length > 15 
                    ? category.substring(0, 15) + '...' 
                    : category}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div class="chart-metadata">
          {groupByField && valueField && (
            <div class="chart-info">
              X: {groupByField} • Y: {valueField} • 
    Size: {idField || valueField || 'N/A'} •
    Color: {parentIdField || groupByField || 'N/A'}
            </div>
          )}
        </div>
      </div>
    );
  }
} 