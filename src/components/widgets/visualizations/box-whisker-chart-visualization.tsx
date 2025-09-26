import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface BoxWhiskerDataItem {
  SampleSize: number;
  MissingCount: number;
  Mean: number;
  StdDev: number;
  Min: number;
  Q1: number;
  Median: number;
  Q3: number;
  Max: number;
  IQR: number;
  LowerWhisker: number | null;
  UpperWhisker: number | null;
  OutlierCountLow: number;
  OutlierCountHigh: number;
  OutlierCount: number;
  OutliersPreviewJson: number[] | null;
  DataSourceName: string;
  SampleSourceName: string;
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
  
  
  // Process raw data into format needed for box and whisker plot
  private processData(): BoxWhiskerDataItem[] {
    if (!this.data.rawData || this.data.rawData.length === 0) {
      return [];
    }
    
    // Process each row as a box-whisker data item
    return this.data.rawData.map((row) => {
      // Parse OutliersPreviewJson if it exists
      let outliers: number[] | null = null;
      if (row.OutliersPreviewJson) {
        try {
          outliers = typeof row.OutliersPreviewJson === 'string' 
            ? JSON.parse(row.OutliersPreviewJson) 
            : row.OutliersPreviewJson;
        } catch (e) {
          console.warn('Failed to parse OutliersPreviewJson:', e);
          outliers = null;
        }
      }
      
      return {
        SampleSize: Number(row.SampleSize) || 0,
        MissingCount: Number(row.MissingCount) || 0,
        Mean: Number(row.Mean) || 0,
        StdDev: Number(row.StdDev) || 0,
        Min: Number(row.Min) || 0,
        Q1: Number(row.Q1) || 0,
        Median: Number(row.Median) || 0,
        Q3: Number(row.Q3) || 0,
        Max: Number(row.Max) || 0,
        IQR: Number(row.IQR) || 0,
        LowerWhisker: row.LowerWhisker ? Number(row.LowerWhisker) : null,
        UpperWhisker: row.UpperWhisker ? Number(row.UpperWhisker) : null,
        OutlierCountLow: Number(row.OutlierCountLow) || 0,
        OutlierCountHigh: Number(row.OutlierCountHigh) || 0,
        OutlierCount: Number(row.OutlierCount) || 0,
        OutliersPreviewJson: outliers,
        DataSourceName: String(row.DataSourceName) || '',
        SampleSourceName: String(row.SampleSourceName) || ''
      };
    });
  }
  
  private getColors() {
    // Default color palette
    return [
      'var(--fl-chart-color-1, #4e79a7)', 
      'var(--fl-chart-color-2, #f28e2c)', 
      'var(--fl-chart-color-3, #e15759)', 
      'var(--fl-chart-color-4, #76b7b2)', 
      'var(--fl-chart-color-5, #59a14f)',
      'var(--fl-chart-color-6, #edc949)', 
      'var(--fl-chart-color-7, #af7aa1)', 
      'var(--fl-chart-color-8, #ff9da7)', 
      'var(--fl-chart-color-9, #9c755f)', 
      'var(--fl-chart-color-10, #bab0ab)'
    ];
  }
  
  private handleMouseMove(event: MouseEvent, category: string, item: BoxWhiskerDataItem) {
    // Show tooltip with statistical information
    this.tooltipVisible = true;
    this.tooltipContent = {
      title: category,
      data: [
        { label: 'Sample Size', value: item.SampleSize.toString() },
        { label: 'Mean', value: item.Mean.toFixed(2) },
        { label: 'Std Dev', value: item.StdDev.toFixed(2) },
        { label: 'Min', value: item.Min.toFixed(2) },
        { label: 'Q1', value: item.Q1.toFixed(2) },
        { label: 'Median', value: item.Median.toFixed(2) },
        { label: 'Q3', value: item.Q3.toFixed(2) },
        { label: 'Max', value: item.Max.toFixed(2) },
        { label: 'IQR', value: item.IQR.toFixed(2) },
        { label: 'Outliers', value: item.OutlierCount.toString() }
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


  private calculateOptimalDimensions() {
    // Use fixed dimensions for now to prevent hover issues
    // This ensures consistent sizing regardless of container changes
    return { width: 200, height: 120 };
  }
  
  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    // Extract config properties for use in render
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    const colors = this.getColors();
    
    // Find the min and max values for scaling
    // First, get the main data range (whiskers, not outliers)
    const mainDataValues = chartData.flatMap(item => [
      item.LowerWhisker !== null ? item.LowerWhisker : item.Min,
      item.UpperWhisker !== null ? item.UpperWhisker : item.Max,
      item.Q1,
      item.Median,
      item.Q3
    ]);
    
    // Get all values including outliers for reference
    const allValues = chartData.flatMap(item => [
      item.Min, 
      item.Q1, 
      item.Median, 
      item.Q3, 
      item.Max, 
      ...(item.OutliersPreviewJson || [])
    ]);
    
    const mainMinValue = Math.min(...mainDataValues);
    const mainMaxValue = Math.max(...mainDataValues);
    const allMinValue = Math.min(...allValues);
    const allMaxValue = Math.max(...allValues);
    
    // Use all data range (including outliers) for scaling to ensure outliers are visible
    // But add reasonable padding to prevent outliers from touching chart edges
    const outlierRange = allMaxValue - allMinValue;
    const mainRange = mainMaxValue - mainMinValue;
    
    let minValue, maxValue;
    if (outlierRange > mainRange * 3) {
      // If outliers are very extreme, use a more conservative approach
      // that shows the main data clearly but still includes some outliers
      const outlierPadding = mainRange * 0.3; // 30% padding beyond main range
      minValue = Math.max(allMinValue, mainMinValue - outlierPadding);
      maxValue = Math.min(allMaxValue, mainMaxValue + outlierPadding);
    } else {
      // Normal case: use all data range (including outliers)
      minValue = allMinValue;
      maxValue = allMaxValue;
    }
    
    // Add 5% padding to the final range to ensure outliers don't touch edges
    const range = maxValue - minValue;
    const rangePadding = range * 0.05;
    minValue -= rangePadding;
    maxValue += rangePadding;
    
    // Calculate optimal SVG dimensions based on container size
    const { width: viewBoxWidth, height: viewBoxHeight } = this.calculateOptimalDimensions();
    const padding = Math.min(15, Math.round(viewBoxWidth * 0.075)); // Responsive padding
    
    // Calculate box width and spacing
    const boxCount = chartData.length;
    const availableWidth = viewBoxWidth - (padding * 2);
    // Use the boxWidth config setting (default 0.8, range 0.1-1.0)
    const boxWidthRatio = (this.config as any).boxWidth || 0.8;
    const boxWidth = Math.min(30, (availableWidth / boxCount) * boxWidthRatio);
    const boxSpacing = (availableWidth - (boxWidth * boxCount)) / (boxCount + 1); // Even spacing
    
    // Create box and whisker elements
    const boxes = chartData.map((item, i) => {
      const x = padding + boxSpacing + (i * (boxWidth + boxSpacing)) + (boxWidth / 2);
      
      // Scale values to fit in the viewbox
      const scaleY = (val) => {
        const scaledValue = ((val - minValue) / (maxValue - minValue)) * (viewBoxHeight - (padding * 2.5));
        return viewBoxHeight - padding - scaledValue;
      };
      
      const boxTop = scaleY(item.Q3);
      const boxBottom = scaleY(item.Q1);
      const boxHeight = Math.abs(boxBottom - boxTop);
      
      // Use proper whisker endpoints, fallback to Min/Max if whiskers are null
      const lowerWhiskerY = scaleY(item.LowerWhisker !== null ? item.LowerWhisker : item.Min);
      const upperWhiskerY = scaleY(item.UpperWhisker !== null ? item.UpperWhisker : item.Max);
      const medianY = scaleY(item.Median);
      
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
        category: item.SampleSourceName || `Group ${i + 1}`,
        stats: {
          min: item.Min,
          q1: item.Q1,
          median: item.Median,
          q3: item.Q3,
          max: item.Max
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
          // Whiskers (lines from box to whisker endpoints)
          upperWhisker: {
            x1: x,
            y1: boxTop,
            x2: x,
            y2: upperWhiskerY
          },
          lowerWhisker: {
            x1: x,
            y1: boxBottom,
            x2: x,
            y2: lowerWhiskerY
          },
          // Whisker caps (horizontal lines at whisker endpoints)
          upperCap: {
            x1: x - (boxWidth / 3),
            y1: upperWhiskerY,
            x2: x + (boxWidth / 3),
            y2: upperWhiskerY
          },
          lowerCap: {
            x1: x - (boxWidth / 3),
            y1: lowerWhiskerY,
            x2: x + (boxWidth / 3),
            y2: lowerWhiskerY
          },
          // Outliers (if any)
          outliers: (item.OutliersPreviewJson || []).map(outlier => ({
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
            y: Math.min(upperWhiskerY, boxBounds.y1),
            width: boxBounds.x2 - boxBounds.x1,
            height: Math.max(Math.abs(lowerWhiskerY - upperWhiskerY), Math.abs(boxBounds.y2 - boxBounds.y1))
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
                        stroke="var(--fl-chart-grid-color, #ccc)" 
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
                          fill="var(--fl-chart-text-color, #666)"
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
              stroke="var(--fl-chart-axis-color, #333)" 
              stroke-width="1" 
            />
            <line 
              x1={padding} 
              y1={padding} 
              x2={padding} 
              y2={viewBoxHeight - padding} 
              stroke="var(--fl-chart-axis-color, #333)" 
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
                    stroke="var(--fl-chart-axis-color, #555)"
                    stroke-width="0.5"
                  />
                  <line 
                    x1={box.elements.lowerWhisker.x1} 
                    y1={box.elements.lowerWhisker.y1}
                    x2={box.elements.lowerWhisker.x2} 
                    y2={box.elements.lowerWhisker.y2}
                    stroke="var(--fl-chart-axis-color, #555)"
                    stroke-width="0.5"
                  />
                  
                  {/* Whisker caps */}
                  <line 
                    x1={box.elements.upperCap.x1} 
                    y1={box.elements.upperCap.y1}
                    x2={box.elements.upperCap.x2} 
                    y2={box.elements.upperCap.y2}
                    stroke="var(--fl-chart-axis-color, #555)"
                    stroke-width="0.5"
                  />
                  <line 
                    x1={box.elements.lowerCap.x1} 
                    y1={box.elements.lowerCap.y1}
                    x2={box.elements.lowerCap.x2} 
                    y2={box.elements.lowerCap.y2}
                    stroke="var(--fl-chart-axis-color, #555)"
                    stroke-width="0.5"
                  />
                  
                  {/* Box */}
                  <rect 
                    x={box.elements.box.x}
                    y={box.elements.box.y}
                    width={box.elements.box.width}
                    height={box.elements.box.height}
                    fill={box.color}
                    fill-opacity="0.7"
                    stroke={box.color}
                    stroke-width="0.5"
                  />
                  
                  {/* Median line */}
                  <line 
                    x1={box.elements.median.x1} 
                    y1={box.elements.median.y1}
                    x2={box.elements.median.x2} 
                    y2={box.elements.median.y2}
                    stroke="var(--fl-chart-text-color, #333)"
                    stroke-width="1"
                  />
                  
                  {/* Outliers */}
                  {box.elements.outliers.map((outlier, i) => (
                    <circle 
                      key={i}
                      cx={outlier.cx}
                      cy={outlier.cy}
                      r={outlier.r}
                      fill="var(--fl-chart-text-color, #333)"
                    />
                  ))}
                  
                  {/* Category label */}
                  {this.config.showLabels && (
                    <text 
                      x={box.elements.label.x} 
                      y={viewBoxHeight - (padding / 3)}
                      font-size="3.5"
                      text-anchor="end"
                      fill="var(--fl-chart-text-color, #333)"
                      transform={`rotate(-45, ${box.elements.label.x}, ${viewBoxHeight - (padding / 3)})`}
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
                    onMouseMove={(e) => this.handleMouseMove(e, box.category, chartData[box.key])}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick('DataSourceName', chartData[box.key].DataSourceName || chartData[box.key].SampleSourceName)}
                  />
                </g>
              ))}
            </g>
          </svg>
          
          {this.tooltipVisible && (
            <div 
              class="chart-tooltip" 
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
          <div class="chart-legend">
            {chartData.map((item, i) => (
              <div key={i} class="legend-item">
                <div 
                  class="color-indicator" 
                  style={{ backgroundColor: colors[i % colors.length] }}
                ></div>
                <div class="legend-text">{item.SampleSourceName || `Group ${i + 1}`}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
} 