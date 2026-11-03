import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

interface HistogramBin {
  label: string;
  count: number;
  binStart?: number;
  binEnd?: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'histogram-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss', // Reuse the bar chart styling
  shadow: true
})
export class HistogramChartVisualization {
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

  private handleMouseMove(event: MouseEvent, label: string, count: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long labels
      const formattedCount = ChartThemeUtils.formatNumber(count);
      const maxLabelLength = 30;
      const truncatedLabel = label.length > maxLabelLength 
        ? `${label.substring(0, maxLabelLength)}...` 
        : label;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedLabel}\n${formattedCount}`,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): HistogramBin[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // Assume the API has already aggregated data into bins
    // Check common bin data formats
    
    // Format 1: Bins with label and count directly
    if (rawData[0]?.label !== undefined && rawData[0]?.count !== undefined) {
      return rawData.map(item => ({
        label: String(item.label),
        count: Number(item.count || 0),
        binStart: Number(item.binStart || item.min || item.lower || 0),
        binEnd: Number(item.binEnd || item.max || item.upper || 0)
      }));
    }
    
    // Format 2: Bins with range/bucket and frequency/count
    if (rawData[0]?.range !== undefined && rawData[0]?.frequency !== undefined) {
      return rawData.map(item => ({
        label: String(item.range || item.bucket),
        count: Number(item.frequency || item.count || 0),
        binStart: Number(item.binStart || item.lower || 0),
        binEnd: Number(item.binEnd || item.upper || 0)
      }));
    }
    
    // Format 3: Category and value (standard chart data)
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    if (groupByField && valueField) {
      const labelField = groupByField;
      const countField = valueField;
      
      return rawData.map(item => ({
        label: String(item[labelField] === null ? 'Unknown' : item[labelField]),
        count: Number(item[countField] || 0)
      }));
    }
    
    // Format 4: For legacy X/Y or category/value format
    if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      return rawData.map(item => ({
        label: String(item.X),
        count: Number(item.Y || 0)
      }));
    }
    
    // Format 5: For simple two-column data (assume first column is label, second is count)
    if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      return rawData.map(item => ({
        label: String(item[keys[0]]),
        count: Number(item[keys[1]] || 0)
      }));
    }
    
    return [];
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    // Extract config properties for use in render
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    const histogramData = this.processData();
    
    if (histogramData.length === 0) {
      return <div class="empty-data">No data available for histogram</div>;
    }
    
    // Find the maximum count for scaling
    const maxCount = Math.max(...histogramData.map(bin => bin.count));
    
    // Set viewBox dimensions to match other charts
    const viewBoxWidth = 200;
    const viewBoxHeight = 100;
    const svgViewBoxHeight = 130; // Rotated x-axis labels sit at y=105 and extend to ~y=125
    
    // Calculate bar dimensions
    const barWidth = (viewBoxWidth - 10) / histogramData.length;
    const actualBarWidth = barWidth; // Full width, no gap
    
    // Define colors and theme
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    // Generate the bars
    const bars = histogramData.map((bin, index) => {
      const x = 5 + (index * barWidth);
      const height = ((bin.count / maxCount) * 90);
      const y = 95 - height;
      
      return {
        x,
        y,
        width: actualBarWidth,
        height,
        color: colors[0],
        bin,
        index
      };
    });
    
    return (
      <div class="bar-chart-container" part="chart">
        <div class="visualization-container" part="plot">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${svgViewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              <linearGradient id="histogramGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color={colors[0]} stop-opacity="1"/>
                <stop offset="100%" stop-color={colors[0]} stop-opacity="0.85"/>
              </linearGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {this.config.showGrid && (
              <g>
                {/* Draw Y-axis grid lines only (PowerBI style) */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const yPos = 95 - (ratio * 90);
                  return (
                    <line 
                      key={i}
                      x1="5" 
                      y1={ChartThemeUtils.snapToPixel(yPos)} 
                      x2={viewBoxWidth - 5} 
                      y2={ChartThemeUtils.snapToPixel(yPos)} 
                      stroke="var(--fl-chart-grid-color)" 
                      stroke-width="1" 
                      opacity={theme.gridlines.opacity}
                    />
                  );
                })}
              </g>
            )}
            
            {/* Draw histogram bars with modern styling */}
            {bars.map((bar, i) => (
              <g 
                key={i}
                style={{ 
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onClick={() => this.handleFilterClick(valueField || '', bar.bin.label)}
                onMouseMove={(event) => this.handleMouseMove(event, bar.bin.label, bar.bin.count)}
                onMouseLeave={() => this.handleMouseLeave()}
                class="bar-animated"
              >
                <rect 
                  x={bar.x} 
                  y={bar.y} 
                  width={bar.width} 
                  height={bar.height || 0.1} // Ensure a minimum height for zero values
                  fill="url(#histogramGradient)"
                  class="bar-glow"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                  filter="url(#softShadow)"
                />
                
                {/* Show count on top of bars if enabled */}
                {this.config.showLabels && bar.height > 10 && (
                  <text 
                    x={bar.x + (bar.width / 2)}
                    y={bar.y - 2}
                    font-size="4"
                    text-anchor="middle"
                    fill="var(--fl-chart-text-color)"
                    font-family={theme.fontFamily}
                    font-weight="600"
                    paint-order="stroke fill"
                    stroke="rgba(0,0,0,0.1)"
                    stroke-width="0.5"
                    class="text-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(i) + 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {ChartThemeUtils.formatNumber(bar.bin.count)}
                  </text>
                )}
              </g>
            ))}
            
            {/* X and Y axis with proper styling */}
            <line 
              x1="5" 
              y1={ChartThemeUtils.snapToPixel(viewBoxHeight - 5)} 
              x2={viewBoxWidth - 5} 
              y2={ChartThemeUtils.snapToPixel(viewBoxHeight - 5)} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="1" 
            />
            <line 
              x1={ChartThemeUtils.snapToPixel(5)} 
              y1="5" 
              x2={ChartThemeUtils.snapToPixel(5)} 
              y2={viewBoxHeight - 5} 
              stroke="var(--fl-chart-axis-color)" 
              stroke-width="1" 
            />
            
            {/* X-axis labels (only show a subset to avoid crowding) */}
            {(() => {
              const { maxTextLength } = this.calculateLabelProperties(histogramData.length);
              return bars.filter((_, i) =>
                histogramData.length <= 5 ||
                i % Math.max(1, Math.ceil(histogramData.length / 5)) === 0
              ).map((bar, i) => {
              const labelText = bar.bin.label;
              const truncatedLabel = labelText.length > maxTextLength
                ? labelText.substring(0, maxTextLength) + '...'
                : labelText;
              
              return (
                <text
                  key={`x-label-${i}`}
                  x={bar.x + (bar.width / 2)}
                  y={105}
                  font-size="4"
                  text-anchor="end"
                  fill="var(--fl-chart-text-color)"
                  font-family={theme.fontFamily}
                  font-weight="500"
                  class="text-rotated-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i) + 150}ms`,
                    animationFillMode: 'both',
                    transformOrigin: `${bar.x + (bar.width / 2)}px 105px`
                  }}
                >
                  {truncatedLabel}
                </text>
              );
            });
            })()}
            
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yPos = 95 - (ratio * 90);
              const value = Math.round(ratio * maxCount);
              
              return (
                <text 
                  key={`y-label-${i}`}
                  x="3"
                  y={yPos}
                  font-size="4"
                  text-anchor="end"
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
                  {ChartThemeUtils.formatNumber(value)}
                </text>
              );
            })}
          </svg>
          
          {/* Tooltip with modern styling */}
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
        
        {/* Legend with PowerBI-grade styling */}
        {(this.config.showLegend !== false) && (
          <div class="chart-legend" part="legend">
            <div class="legend-item">
              <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
              <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                {valueField || "Count"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }

  private calculateLabelProperties(binCount: number) {
    const baseFontSize = 5;
    const baseMaxLength = 20;
    const countAdjustment = binCount <= 4 ? 1.1 :
                            binCount <= 6 ? 1 :
                            binCount <= 8 ? 0.8 : 0.6;
    const fontSize = Math.max(4, Math.round(baseFontSize * countAdjustment * 10) / 10);
    const maxTextLength = Math.max(4, Math.round(baseMaxLength * countAdjustment));
    return { fontSize, maxTextLength };
  }
} 