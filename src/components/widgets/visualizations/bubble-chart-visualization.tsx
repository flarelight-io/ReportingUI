import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker } from '../../../utils/bar-layout';
import { niceScale } from '../../../utils/scale';
import { formatTick } from '../../../utils/chart-axes';
import { placeTooltip } from '../../../utils/tooltip';

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
    // Listen for theme changes
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

  private handleMouseMove(event: MouseEvent, category: string | number, value: number, size: any) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(value);
      const formattedSize = ChartThemeUtils.formatNumber(size);
      const maxCategoryLength = 30;
      const truncatedCategory = String(category).length > maxCategoryLength 
        ? `${String(category).substring(0, maxCategoryLength)}...` 
        : String(category);
      
      this.tooltip = {
        visible: true,
        text: `${truncatedCategory}\nY: ${formattedValue}\nSize: ${formattedSize}`,
        x: event.clientX,
        y: event.clientY
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
      
      return processed;
    }
    // For legacy data format
    else if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      // Try to find a size field, or use Y if not found
      const sizeField = rawData[0]?.Size !== undefined ? 'Size' :
                        rawData[0]?.Z !== undefined ? 'Z' : 'Y';

      // Try to find a category field
      const categoryField = rawData[0]?.Category !== undefined ? 'Category' :
                            rawData[0]?.Name !== undefined ? 'Name' : 'X';

      return rawData.map(item => ({
        x: item.X === null ? 'Unknown' : item.X,
        y: Number(item.Y || 0),
        size: Math.max(5, Math.sqrt(Number(item[sizeField] || 0)) * 2),
        category: String(item[categoryField] || ''),
        originalData: item
      }));
    }
    // For simple multi-column data, try to infer x, y, and size
    else if (rawData.length > 0) {
      const keys = Object.keys(rawData[0]);

      // If we have at least 3 columns, use them for x, y, and size
      if (keys.length >= 3) {
        return rawData.map(item => ({
          x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
          y: Number(item[keys[1]] || 0),
          size: Math.max(5, Math.sqrt(Number(item[keys[2]] || 0)) * 2),
          category: String(item[keys.length > 3 ? keys[3] : keys[0]] || ''),
          originalData: item
        }));
      }
      // If we have only 2 columns, use them for x and y, and y for size
      else if (keys.length === 2) {
        return rawData.map(item => ({
          x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
          y: Number(item[keys[1]] || 0),
          size: Math.max(5, Math.sqrt(Number(item[keys[1]] || 0)) * 2),
          category: String(item[keys[0]] || ''),
          originalData: item
        }));
      }
    }

    return [];
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
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
    
    const bubbleData = this.processData();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
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
    
    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    const pad = 8;
    // Round axis domains so ticks are clean numbers; bubbles are positioned against the same domain
    const xs = niceScale(minX, maxX);
    const ys = niceScale(minY, maxY);
    const yTicks = ys.ticks.map(formatTick);
    const xTicks = xs.ticks.map(formatTick);
    const axisLeft = pad + Math.max(...yTicks.map(t => t.length)) * charWidth + 6;
    const axisBottom = H - (xValues.length > 0 ? fontSize + 12 : pad);
    const axisTop = pad;
    const axisRight = W - pad;
    // Bubbles are scaled to the available area so they never spill out of the plot
    const maxR = Math.max(4, Math.min(24, Math.min(axisRight - axisLeft, axisBottom - axisTop) * 0.1));
    const xPadding = axisLeft + maxR;
    const yPadding = axisTop + maxR;
    const innerW = Math.max(0, axisRight - maxR - xPadding);
    const innerH = Math.max(0, axisBottom - maxR - yPadding);

    const mapX = (v: number) => xPadding + ((v - xs.min) / (xs.max - xs.min || 1)) * innerW;
    const mapY = (v: number) => axisBottom - maxR - ((v - ys.min) / (ys.max - ys.min || 1)) * innerH;

    const categories = this.getUniqueCategories(bubbleData);

    const bubbles = bubbleData.map((item, index) => {
      let x: number;
      if (typeof item.x === 'number') {
        x = mapX(item.x);
      } else if (typeof item.x === 'string' && !isNaN(Number(item.x))) {
        x = mapX(Number(item.x));
      } else {
        // Non-numeric x values are spaced evenly
        x = xPadding + index * (innerW / (bubbleData.length - 1 || 1));
      }
      const y = mapY(item.y);
      const r = Math.max(4, (item.size / (maxSize || 1)) * maxR);
      const color = this.getCategoryColor(item.category, categories);
      const tooltipContent = `${item.x}: ${item.y} (Size: ${item.originalData[idField || valueField || '']})`;
      return { x, y, r, color, data: item, tooltip: tooltipContent };
    });

    return (
      <div class="bubble-chart-container" part="chart">
        <div class="visualization-container" part="plot" ref={this.plotSize.attach}>
          {W > 0 && H > 0 && (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: '0' }}
          >
            <defs>
              {bubbles.map((bubble, index) => {
                const colorIndex = categories.indexOf(bubble.data.category);
                return (
                  <linearGradient key={`bubbleGradient-${index}`} id={`bubbleGradient-${colorIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color={bubble.color} stop-opacity="0.9" />
                    <stop offset="100%" stop-color={bubble.color} stop-opacity="0.6" />
                  </linearGradient>
                );
              })}
              <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.1)" flood-opacity="0.3"/>
              </filter>
            </defs>
            {this.config.showGrid && (
              <>
                {ys.ticks.map((tick, i) => {
                  const y = ChartThemeUtils.snapToPixel(mapY(tick));
                  return (
                    <line
                      key={`h-${i}`}
                      x1={axisLeft}
                      y1={y}
                      x2={axisRight}
                      y2={y}
                      stroke="var(--fl-chart-grid-color)"
                      stroke-width="1"
                      stroke-dasharray="3,3"
                      opacity={theme.gridlines.opacity}
                    />
                  );
                })}
                {xs.ticks.map((tick, i) => {
                  const x = ChartThemeUtils.snapToPixel(mapX(tick));
                  return (
                    <line
                      key={`v-${i}`}
                      x1={x}
                      y1={axisTop}
                      x2={x}
                      y2={axisBottom}
                      stroke="var(--fl-chart-grid-color)"
                      stroke-width="1"
                      stroke-dasharray="3,3"
                      opacity={theme.gridlines.opacity}
                    />
                  );
                })}
              </>
            )}

            {bubbles.map((bubble, i) => {
              const colorIndex = categories.indexOf(bubble.data.category);
              return (
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
                    fill={`url(#bubbleGradient-${colorIndex})`}
                    class="bubble bubble-animated bubble-glow"
                    style={{
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`
                    }}
                    filter="url(#softShadow)"
                  />

                  {this.config.showLabels && (
                    <text
                      key={`value-${i}`}
                      x="0"
                      y={-bubble.r - 4}
                      text-anchor="middle"
                      font-size={fontSize}
                      fill={theme.labelColor}
                      font-family={theme.fontFamily}
                      font-weight="500"
                      class="bubble-label text-animated"
                      style={{ animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms` }}
                    >
                      {typeof bubble.data.x === 'string' && bubble.data.x.length > 10
                        ? bubble.data.x.substring(0, 10) + '…'
                        : bubble.data.x}
                    </text>
                  )}
                </g>
              );
            })}

            <line
              x1={ChartThemeUtils.snapToPixel(axisLeft)}
              y1={ChartThemeUtils.snapToPixel(axisBottom)}
              x2={ChartThemeUtils.snapToPixel(axisRight)}
              y2={ChartThemeUtils.snapToPixel(axisBottom)}
              stroke="var(--fl-chart-axis-color)"
              stroke-width="1"
            />
            <line
              x1={ChartThemeUtils.snapToPixel(axisLeft)}
              y1={ChartThemeUtils.snapToPixel(axisTop)}
              x2={ChartThemeUtils.snapToPixel(axisLeft)}
              y2={ChartThemeUtils.snapToPixel(axisBottom)}
              stroke="var(--fl-chart-axis-color)"
              stroke-width="1"
            />

            {ys.ticks.map((tick, i) => (
              <text
                key={`y-label-${i}`}
                x={axisLeft - 8}
                y={mapY(tick)}
                font-size={fontSize}
                text-anchor="end"
                dominant-baseline="middle"
                fill="var(--fl-chart-text-secondary)"
                font-family={theme.fontFamily}
              >
                {yTicks[i]}
              </text>
            ))}

            {xValues.length > 0 && xs.ticks.map((tick, i) => (
              <text
                key={`x-label-${i}`}
                x={mapX(tick)}
                y={axisBottom + fontSize + 4}
                font-size={fontSize}
                text-anchor="middle"
                fill="var(--fl-chart-text-secondary)"
                font-family={theme.fontFamily}
              >
                {xTicks[i]}
              </text>
            ))}
          </svg>
          )}

          {/* Tooltip */}
          {this.tooltip.visible && (
            <div 
              part="tooltip" class="chart-tooltip visible"
              ref={(el) => placeTooltip(el, this.tooltip.x, this.tooltip.y)}
            >
              <div>{this.tooltip.text}</div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        {this.config.showLegend && categories.length > 0 && (
          <div class="chart-legend" part="legend">
            {categories.map((category, i) => (
              <div key={i} class="legend-item">
                <div 
                  class="color-indicator" 
                  style={{ backgroundColor: this.getCategoryColor(category, categories) }}
                ></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  {category}
                </span>
              </div>
            ))}
          </div>
        )}
        
      </div>
    );
  }
} 