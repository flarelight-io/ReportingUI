import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface BoxWhiskerDataItem {
  category: string;
  min: number;     // Minimum value
  q1: number;      // First quartile (25th percentile)
  median: number;  // Median (50th percentile)
  q3: number;      // Third quartile (75th percentile)
  max: number;     // Maximum value
  outliers?: number[]; // Optional outliers
}

@Component({
  tag: 'box-whisker-chart-visualization',
  styleUrl: 'box-whisker-chart-visualization.scss',
  shadow: true
})
export class BoxWhiskerChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;
  
  @State() tooltipVisible: boolean = false;
  @State() tooltipContent: { title: string, data: { label: string, value: any }[] } = { title: '', data: [] };
  @State() tooltipPosition: { x: number, y: number } = { x: 0, y: 0 };
  
  // Reference to the SVG element
  private svgRef?: SVGElement;
  
  // Calculate statistics for box and whisker plot
  private calculateStatistics(values: number[]): { min: number, q1: number, median: number, q3: number, max: number, outliers: number[] } {
    if (!values || values.length === 0) {
      return { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
    }
    
    // Sort the values
    const sortedValues = [...values].sort((a, b) => a - b);
    
    // Calculate quartiles
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const medianIndex = Math.floor(sortedValues.length * 0.5);
    const q3Index = Math.floor(sortedValues.length * 0.75);
    
    const q1 = sortedValues[q1Index];
    const median = sortedValues[medianIndex];
    const q3 = sortedValues[q3Index];
    
    // Calculate IQR (Interquartile Range)
    const iqr = q3 - q1;
    
    // Calculate whisker boundaries
    const lowerWhisker = Math.max(...sortedValues.filter(v => v >= q1 - 1.5 * iqr && v <= q1));
    const upperWhisker = Math.min(...sortedValues.filter(v => v <= q3 + 1.5 * iqr && v >= q3));
    
    // Identify outliers (values outside the whiskers)
    const outliers = sortedValues.filter(v => v < lowerWhisker || v > upperWhisker);
    
    return {
      min: lowerWhisker,
      q1,
      median,
      q3,
      max: upperWhisker,
      outliers
    };
  }
  
  // Process raw data into format needed for box and whisker plot
  private processData(): BoxWhiskerDataItem[] {
    if (!this.data.rawData || this.data.rawData.length === 0) {
      return [];
    }
    
    const { groupByField, valueField } = this.config;
    
    if (!groupByField || !valueField) {
      // If no grouping field is provided, we can't create categories for box plots
      return [];
    }
    
    // Group data by the groupByField
    const groupedData = {};
    
    for (const item of this.data.rawData) {
      const category = item[groupByField];
      const value = parseFloat(item[valueField]);
      
      if (isNaN(value)) continue;
      
      if (!groupedData[category]) {
        groupedData[category] = [];
      }
      
      groupedData[category].push(value);
    }
    
    // Calculate statistics for each group
    const result: BoxWhiskerDataItem[] = [];
    
    for (const category in groupedData) {
      const values = groupedData[category];
      if (values.length < 5) continue; // Need at least 5 data points for a meaningful box plot
      
      const stats = this.calculateStatistics(values);
      
      result.push({
        category,
        min: stats.min,
        q1: stats.q1,
        median: stats.median,
        q3: stats.q3,
        max: stats.max,
        outliers: stats.outliers
      });
    }
    
    return result;
  }
  
  private getColors() {
    // Default color palette
    return [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
    ];
  }
  
  private handleMouseMove(event: MouseEvent, category: string, stats: { min: number, q1: number, median: number, q3: number, max: number }) {
    // Show tooltip with statistical information
    this.tooltipVisible = true;
    this.tooltipContent = {
      title: category,
      data: [
        { label: 'Min', value: stats.min.toFixed(2) },
        { label: 'Q1', value: stats.q1.toFixed(2) },
        { label: 'Median', value: stats.median.toFixed(2) },
        { label: 'Q3', value: stats.q3.toFixed(2) },
        { label: 'Max', value: stats.max.toFixed(2) },
        { label: 'IQR', value: (stats.q3 - stats.q1).toFixed(2) }
      ]
    };
    
    // Get position relative to the SVG element
    if (this.svgRef) {
      const svgRect = this.svgRef.getBoundingClientRect();
      this.tooltipPosition = {
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }
  
  private handleMouseLeave() {
    this.tooltipVisible = false;
  }
  
  private handleFilterClick(field: string, value: any) {
    if (this.config.sourceId && field) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field,
        value
      });
    }
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
    
    const colors = this.getColors();
    
    // Find the min and max values for scaling
    const allValues = chartData.flatMap(item => [
      item.min, 
      item.q1, 
      item.median, 
      item.q3, 
      item.max, 
      ...(item.outliers || [])
    ]);
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues) * 1.1; // Add 10% padding
    
    // SVG dimensions
    const viewBoxWidth = 200;
    const viewBoxHeight = 120;
    const padding = 15;
    
    // Calculate box width and spacing
    const boxCount = chartData.length;
    const availableWidth = viewBoxWidth - (padding * 2);
    const boxWidth = Math.min(30, (availableWidth / boxCount) * 0.7); // Box width, maximum 30 units
    const boxSpacing = (availableWidth - (boxWidth * boxCount)) / (boxCount + 1); // Even spacing
    
    // Create box and whisker elements
    const boxes = chartData.map((item, i) => {
      const x = padding + boxSpacing + (i * (boxWidth + boxSpacing)) + (boxWidth / 2);
      
      // Scale values to fit in the viewbox
      const scaleY = (val) => {
        const scaledValue = ((val - minValue) / (maxValue - minValue)) * (viewBoxHeight - (padding * 2.5));
        return viewBoxHeight - padding - scaledValue;
      };
      
      const boxTop = scaleY(item.q3);
      const boxBottom = scaleY(item.q1);
      const boxHeight = Math.abs(boxBottom - boxTop);
      
      const minY = scaleY(item.min);
      const maxY = scaleY(item.max);
      const medianY = scaleY(item.median);
      
      const color = colors[i % colors.length];
      
      // Box edges coordinates for tooltip
      const boxBounds = { 
        x1: x - (boxWidth / 2), 
        y1: boxTop, 
        x2: x + (boxWidth / 2), 
        y2: boxBottom 
      };
      
      return {
        key: i,
        color,
        category: item.category,
        stats: {
          min: item.min,
          q1: item.q1,
          median: item.median,
          q3: item.q3,
          max: item.max
        },
        elements: {
          // Box
          box: {
            x: x - (boxWidth / 2),
            y: boxTop,
            width: boxWidth,
            height: boxHeight
          },
          // Median line
          median: {
            x1: x - (boxWidth / 2),
            y1: medianY,
            x2: x + (boxWidth / 2),
            y2: medianY
          },
          // Whiskers (lines from box to min/max)
          upperWhisker: {
            x1: x,
            y1: boxTop,
            x2: x,
            y2: maxY
          },
          lowerWhisker: {
            x1: x,
            y1: boxBottom,
            x2: x,
            y2: minY
          },
          // Whisker caps (horizontal lines at min/max)
          upperCap: {
            x1: x - (boxWidth / 3),
            y1: maxY,
            x2: x + (boxWidth / 3),
            y2: maxY
          },
          lowerCap: {
            x1: x - (boxWidth / 3),
            y1: minY,
            x2: x + (boxWidth / 3),
            y2: minY
          },
          // Outliers (if any)
          outliers: (item.outliers || []).map(outlier => ({
            cx: x,
            cy: scaleY(outlier),
            r: 0.5
          })),
          // Label position
          label: {
            x,
            y: viewBoxHeight - (padding / 2)
          },
          // Invisible rectangle for tooltip/interaction
          interactionZone: {
            ...boxBounds,
            x: boxBounds.x1,
            y: Math.min(maxY, boxBounds.y1),
            width: boxBounds.x2 - boxBounds.x1,
            height: Math.max(Math.abs(minY - maxY), Math.abs(boxBounds.y2 - boxBounds.y1))
          }
        }
      };
    });

    return (
      <div class="box-whisker-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            ref={(el) => this.svgRef = el}
            style={{ maxHeight: '100%' }}
          >
            {this.config.showGrid && (
              <g class="grid-lines">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = padding + (ratio * (viewBoxHeight - (padding * 2)));
                  const value = maxValue - (ratio * (maxValue - minValue));
                  
                  return (
                    <g key={`grid-${i}`}>
                      <line 
                        x1={padding} 
                        y1={y} 
                        x2={viewBoxWidth - padding} 
                        y2={y} 
                        stroke="#ccc" 
                        stroke-width="0.5"
                        stroke-dasharray={i > 0 ? "1,1" : ""}
                      />
                      {this.config.showLabels && (
                        <text 
                          x={padding - 4} 
                          y={y} 
                          font-size="3.5" 
                          text-anchor="end" 
                          alignment-baseline="middle"
                          fill="#666"
                        >
                          {value.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
            
            {/* X and Y axis */}
            <line 
              x1={padding} 
              y1={viewBoxHeight - padding} 
              x2={viewBoxWidth - padding} 
              y2={viewBoxHeight - padding} 
              stroke="#333" 
              stroke-width="1" 
            />
            <line 
              x1={padding} 
              y1={padding} 
              x2={padding} 
              y2={viewBoxHeight - padding} 
              stroke="#333" 
              stroke-width="1" 
            />
            
            {/* Draw box and whiskers */}
            <g class="box-whiskers">
              {boxes.map(box => (
                <g key={box.key} class="box-whisker">
                  {/* Whiskers */}
                  <line 
                    x1={box.elements.upperWhisker.x1} 
                    y1={box.elements.upperWhisker.y1}
                    x2={box.elements.upperWhisker.x2} 
                    y2={box.elements.upperWhisker.y2}
                    stroke={box.color}
                    stroke-width="0.5"
                  />
                  <line 
                    x1={box.elements.lowerWhisker.x1} 
                    y1={box.elements.lowerWhisker.y1}
                    x2={box.elements.lowerWhisker.x2} 
                    y2={box.elements.lowerWhisker.y2}
                    stroke={box.color}
                    stroke-width="0.5"
                  />
                  
                  {/* Whisker caps */}
                  <line 
                    x1={box.elements.upperCap.x1} 
                    y1={box.elements.upperCap.y1}
                    x2={box.elements.upperCap.x2} 
                    y2={box.elements.upperCap.y2}
                    stroke={box.color}
                    stroke-width="0.5"
                  />
                  <line 
                    x1={box.elements.lowerCap.x1} 
                    y1={box.elements.lowerCap.y1}
                    x2={box.elements.lowerCap.x2} 
                    y2={box.elements.lowerCap.y2}
                    stroke={box.color}
                    stroke-width="0.5"
                  />
                  
                  {/* Box */}
                  <rect 
                    x={box.elements.box.x}
                    y={box.elements.box.y}
                    width={box.elements.box.width}
                    height={box.elements.box.height}
                    fill={box.color}
                    fill-opacity="0.5"
                    stroke={box.color}
                    stroke-width="0.5"
                  />
                  
                  {/* Median line */}
                  <line 
                    x1={box.elements.median.x1} 
                    y1={box.elements.median.y1}
                    x2={box.elements.median.x2} 
                    y2={box.elements.median.y2}
                    stroke="#333"
                    stroke-width="1"
                  />
                  
                  {/* Outliers */}
                  {box.elements.outliers.map((outlier, i) => (
                    <circle 
                      key={i}
                      cx={outlier.cx}
                      cy={outlier.cy}
                      r={outlier.r}
                      fill="#333"
                    />
                  ))}
                  
                  {/* Category label */}
                  {this.config.showLabels && (
                    <text 
                      x={box.elements.label.x} 
                      y={viewBoxHeight - (padding / 3)}
                      font-size="3.5"
                      text-anchor="middle"
                      fill="#333"
                    >
                      {box.category}
                    </text>
                  )}
                  
                  {/* Invisible rectangle for interactions */}
                  <rect 
                    x={box.elements.interactionZone.x}
                    y={box.elements.interactionZone.y}
                    width={box.elements.interactionZone.width}
                    height={box.elements.interactionZone.height}
                    fill="transparent"
                    cursor="pointer"
                    onMouseMove={(e) => this.handleMouseMove(e, box.category, box.stats)}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick(this.config.groupByField, box.category)}
                  />
                </g>
              ))}
            </g>
          </svg>
          
          {this.tooltipVisible && (
            <div 
              class="tooltip" 
              style={{ 
                left: `${this.tooltipPosition.x}px`, 
                top: `${this.tooltipPosition.y}px`,
                transform: 'translate(-50%, -100%)',
                marginTop: '-10px'
              }}
            >
              <div class="tooltip-title">{this.tooltipContent.title}</div>
              <div class="tooltip-content">
                {this.tooltipContent.data.map((item, i) => (
                  <div key={i} class="tooltip-row">
                    <span class="tooltip-label">{item.label}:</span>
                    <span class="tooltip-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {this.config.showLegend && (
          <div class="legend-container">
            {chartData.map((item, i) => (
              <div key={i} class="legend-item">
                <div 
                  class="legend-color" 
                  style={{ backgroundColor: colors[i % colors.length] }}
                ></div>
                <div class="legend-label">{item.category}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
} 