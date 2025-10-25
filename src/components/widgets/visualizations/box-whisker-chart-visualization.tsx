import { Component, Prop, h, Event, EventEmitter, State, Watch } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

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
  @Prop() colorTheme: ColorTheme = "brand";
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;
  
  @State() tooltipVisible: boolean = false;
  @State() tooltipContent: { title: string, data: { label: string, value: any }[] } = { title: '', data: [] };
  @State() tooltipPosition: { x: number, y: number } = { x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes


  componentWillLoad() {
    // Listen for theme changes
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }
  
  // Watch for changes to the colorTheme prop
  @Watch('colorTheme')
  colorThemeChanged() {
    // Force re-render when color theme changes
    this.themeVersion++;
  }
  
  
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
        Min: Number(row.Minimum) || 0,
        Q1: Number(row.Q1) || 0,
        Median: Number(row.Median) || 0,
        Q3: Number(row.Q3) || 0,
        Max: Number(row.Maximum) || 0,
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
  
  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }
  
  private handleMouseMove(event: MouseEvent, category: string, item: BoxWhiskerDataItem) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const maxCategoryLength = 30;
      const truncatedCategory = category.length > maxCategoryLength 
        ? `${category.substring(0, maxCategoryLength)}...` 
        : category;
      
      this.tooltipVisible = true;
      this.tooltipContent = {
        title: truncatedCategory,
        data: [
          { label: 'Sample Size', value: ChartThemeUtils.formatNumber(item.SampleSize) },
          { label: 'Mean', value: ChartThemeUtils.formatNumber(item.Mean) },
          { label: 'Std Dev', value: ChartThemeUtils.formatNumber(item.StdDev) },
          { label: 'Min', value: ChartThemeUtils.formatNumber(item.Min) },
          { label: 'Q1', value: ChartThemeUtils.formatNumber(item.Q1) },
          { label: 'Median', value: ChartThemeUtils.formatNumber(item.Median) },
          { label: 'Q3', value: ChartThemeUtils.formatNumber(item.Q3) },
          { label: 'Max', value: ChartThemeUtils.formatNumber(item.Max) },
          { label: 'IQR', value: ChartThemeUtils.formatNumber(item.IQR) },
          { label: 'Outliers', value: ChartThemeUtils.formatNumber(item.OutlierCount) }
        ]
      };
      
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
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
            style={{ maxHeight: '100%' }}
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`boxGradient-${index}`} id={`boxGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color={color} stop-opacity="1"/>
                  <stop offset="100%" stop-color={color} stop-opacity="0.85"/>
                </linearGradient>
              ))}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {this.config.showGrid && (
              <g class="grid-lines">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = ChartThemeUtils.snapToPixel(padding + (ratio * (viewBoxHeight - (padding * 2))));
                  const value = maxValue - (ratio * (maxValue - minValue));
                  
                  return (
                    <g key={`grid-${i}`}>
                      <line 
                        x1={padding} 
                        y1={y} 
                        x2={viewBoxWidth - padding} 
                        y2={y} 
                        stroke="var(--fl-chart-grid-color)" 
                        stroke-width="1"
                        stroke-dasharray={i > 0 ? "1,1" : ""}
                        opacity={theme.gridlines.opacity}
                      />
                      {this.config.showLabels && (
                        <text 
                          x={padding - 4} 
                          y={y} 
                          font-size="3.5" 
                          text-anchor="end" 
                          alignment-baseline="middle"
                          fill={theme.labelColor}
                          font-family={theme.fontFamily}
                          font-weight="500"
                          class="text-animated"
                          style={{
                            animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                            animationFillMode: 'both'
                          }}
                        >
                          {value.toFixed(3).replace(/\.?0+$/, '')}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
            
            {/* X and Y axis */}
            <line 
              x1={ChartThemeUtils.snapToPixel(padding)} 
              y1={ChartThemeUtils.snapToPixel(viewBoxHeight - padding)} 
              x2={ChartThemeUtils.snapToPixel(viewBoxWidth - padding)} 
              y2={ChartThemeUtils.snapToPixel(viewBoxHeight - padding)} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="1" 
            />
            <line 
              x1={ChartThemeUtils.snapToPixel(padding)} 
              y1={ChartThemeUtils.snapToPixel(padding)} 
              x2={ChartThemeUtils.snapToPixel(padding)} 
              y2={ChartThemeUtils.snapToPixel(viewBoxHeight - padding)} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="1" 
            />
            
            {/* Draw box and whiskers */}
            <g class="box-whiskers">
              {boxes.map((box, boxIndex) => (
                <g key={box.key} class="box-whisker">
                  {/* Whiskers */}
                  <line 
                    x1={box.elements.upperWhisker.x1} 
                    y1={box.elements.upperWhisker.y1}
                    x2={box.elements.upperWhisker.x2} 
                    y2={box.elements.upperWhisker.y2}
                    stroke={theme.axisColor}
                    stroke-width="0.5"
                    class="whisker-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                      animationFillMode: 'both'
                    }}
                  />
                  <line 
                    x1={box.elements.lowerWhisker.x1} 
                    y1={box.elements.lowerWhisker.y1}
                    x2={box.elements.lowerWhisker.x2} 
                    y2={box.elements.lowerWhisker.y2}
                    stroke={theme.axisColor}
                    stroke-width="0.5"
                    class="whisker-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                      animationFillMode: 'both'
                    }}
                  />
                  
                  {/* Whisker caps */}
                  <line 
                    x1={box.elements.upperCap.x1} 
                    y1={box.elements.upperCap.y1}
                    x2={box.elements.upperCap.x2} 
                    y2={box.elements.upperCap.y2}
                    stroke={theme.axisColor}
                    stroke-width="0.5"
                    class="whisker-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                      animationFillMode: 'both'
                    }}
                  />
                  <line 
                    x1={box.elements.lowerCap.x1} 
                    y1={box.elements.lowerCap.y1}
                    x2={box.elements.lowerCap.x2} 
                    y2={box.elements.lowerCap.y2}
                    stroke={theme.axisColor}
                    stroke-width="0.5"
                    class="whisker-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                      animationFillMode: 'both'
                    }}
                  />
                  
                  {/* Box */}
                  <rect 
                    x={box.elements.box.x}
                    y={box.elements.box.y}
                    width={box.elements.box.width}
                    height={box.elements.box.height}
                    fill={`url(#boxGradient-${boxIndex % colors.length})`}
                    stroke={box.color}
                    stroke-width="0.5"
                    class="box-animated box-glow"
                    style={{ 
                      cursor: 'pointer',
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                      animationFillMode: 'both'
                    }}
                    filter="url(#softShadow)"
                  />
                  
                  {/* Median line */}
                  <line 
                    x1={box.elements.median.x1} 
                    y1={box.elements.median.y1}
                    x2={box.elements.median.x2} 
                    y2={box.elements.median.y2}
                    stroke={theme.regressionColor}
                    stroke-width="1.5"
                    class="median-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex) + 50}ms`,
                      animationFillMode: 'both'
                    }}
                  />
                  
                  {/* Outliers */}
                  {box.elements.outliers.map((outlier, i) => (
                    <circle 
                      key={i}
                      cx={outlier.cx}
                      cy={outlier.cy}
                      r={outlier.r}
                      fill={theme.labelColor}
                      class="outlier-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex) + 100}ms`,
                        animationFillMode: 'both'
                      }}
                    />
                  ))}
                  
                  {/* Category label */}
                  {this.config.showLabels && (
                    <text 
                      x={box.elements.label.x} 
                      y={viewBoxHeight - (padding / 3)}
                      font-size="3.5"
                      text-anchor="end"
                      fill={theme.labelColor}
                      font-family={theme.fontFamily}
                      font-weight="500"
                      class="text-rotated-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex) + 150}ms`,
                        animationFillMode: 'both',
                        transformOrigin: `${box.elements.label.x}px ${viewBoxHeight - (padding / 3)}px`
                      }}
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
              class={`chart-tooltip ${this.tooltipVisible ? 'visible' : ''}`}
              style={{ 
                left: `${this.tooltipPosition.x}px`, 
                top: `${this.tooltipPosition.y}px`,
                transform: 'translate(-50%, -100%)'
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
        
        {(this.config.showLegend !== false) && (
          <div class="chart-legend">
            {chartData.map((item, i) => (
              <div key={i} class="legend-item">
                <div 
                  class="color-indicator" 
                  style={{ backgroundColor: colors[i % colors.length] }}
                ></div>
                <span class="legend-text">{item.SampleSourceName || `Group ${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
} 