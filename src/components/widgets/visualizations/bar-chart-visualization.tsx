import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { placeTooltip } from '../../../utils/tooltip';
import { PlotSizeTracker, computeBarFrame, clipLabel } from '../../../utils/bar-layout';
import { niceScale } from '../../../utils/scale';
import { renderValueAxis, formatTick } from '../../../utils/chart-axes';

interface ChartDataItem {
  category: string;
  value: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'bar-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss',
  shadow: true
})
export class BarChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0;
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

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    return theme.series;
  }

  private processData(): ChartDataItem[] {
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

  private handleMouseMove(event: MouseEvent, barCategory: string, barValue: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(barValue);
      const maxCategoryLength = 30;
      const truncatedCategory = barCategory.length > maxCategoryLength 
        ? `${barCategory.substring(0, maxCategoryLength)}...` 
        : barCategory;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedCategory}\n${formattedValue}`,
        x: event.clientX,
        y: event.clientY
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
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Determine if this is a horizontal bar chart
    const isHorizontal = this.config.visualizationType === 'hbar';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    
    const scale = niceScale(0, Math.max(...chartData.map(item => item.value), 0));
    const maxValue = scale.max || 1;

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const rawLabels = chartData.map(item => clipLabel(item.category, 28));
    // In a small cell the legend already names every category, so skip axis labels rather than cram them
    const wantCategories = !(this.config.showLegend !== false && H < 140);
    const frame = computeBarFrame({
      width: W, height: H, horizontal: isHorizontal, labels: rawLabels, fontSize,
      valueLabels: !!this.config.showLabels, showCategories: wantCategories,
      tickLabels: scale.ticks.map(formatTick)
    });
    const { plotX, plotY, plotW, plotH, rotate, slot: slotSize, labelStride, charWidth } = frame;
    const labels = frame.labels;
    const showCategories = frame.showCategories;
    const valueStride = isHorizontal
      ? Math.max(1, Math.ceil((fontSize * 1.3) / slotSize))
      : Math.max(1, Math.ceil((charWidth * 4) / slotSize));

    const bars = chartData.map((item, index) => {
      const colorIndex = index % colors.length;
      const length = (item.value / maxValue) * (isHorizontal ? plotW : plotH);
      const thickness = Math.max(1, slotSize * 0.7);
      const gapOffset = (slotSize - thickness) / 2;
      if (isHorizontal) {
        // First category sits at the bottom, matching the previous layout
        const y = plotY + plotH - (index + 1) * slotSize + gapOffset;
        return { x: plotX, y, width: length, height: thickness, color: colors[colorIndex], colorIndex, label: labels[index], category: item.category, value: item.value };
      }
      return { x: plotX + index * slotSize + gapOffset, y: plotY + plotH - length, width: thickness, height: length, color: colors[colorIndex], colorIndex, label: labels[index], category: item.category, value: item.value };
    });

    return (
      <div class="bar-chart-container" part="chart">
        <div class="visualization-container" part="plot" ref={this.plotSize.attach}>
          {W > 0 && H > 0 && (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: '0' }}
            {...ChartThemeUtils.getSVGAttributes()}
          >
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color={color} stop-opacity="1"/>
                  <stop offset="100%" stop-color={color} stop-opacity="0.85"/>
                </linearGradient>
              ))}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>

            {renderValueAxis({
              ticks: scale.ticks, min: scale.min, max: scale.max,
              plotX, plotY, plotW, plotH, fontSize, fontFamily: theme.fontFamily,
              horizontal: isHorizontal, showGrid: !!this.config.showGrid, gridOpacity: theme.gridlines.opacity
            })}

            {bars.map((bar, i) => (
              <g key={i}>
                <rect
                  x={bar.x}
                  y={bar.y}
                  rx={2}
                  width={bar.width}
                  height={bar.height}
                  fill={`url(#barGradient-${bar.colorIndex})`}
                  class="bar-animated bar-glow"
                  style={{
                    cursor: 'pointer',
                    transition: ChartAnimations.getHoverTransition(),
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                  onMouseMove={(e) => this.handleMouseMove(e, bar.category, bar.value)}
                  onMouseLeave={() => this.handleMouseLeave()}
                  onClick={() => this.handleFilterClick(groupByField || '', bar.category)}
                  filter="url(#softShadow)"
                />
              </g>
            ))}

            <line
              x1={plotX} y1={ChartThemeUtils.snapToPixel(plotY + plotH)}
              x2={plotX + plotW} y2={ChartThemeUtils.snapToPixel(plotY + plotH)}
              stroke="var(--fl-chart-axis-color)" stroke-width="1"
            />
            <line
              x1={ChartThemeUtils.snapToPixel(plotX)} y1={plotY}
              x2={ChartThemeUtils.snapToPixel(plotX)} y2={plotY + plotH}
              stroke="var(--fl-chart-axis-color)" stroke-width="1"
            />

            {this.config.showLabels && (
              <g>
                {bars.map((bar, i) => i % valueStride === 0 && (
                  <text
                    key={`value-${i}`}
                    x={isHorizontal ? bar.x + bar.width + 4 : bar.x + bar.width / 2}
                    y={isHorizontal ? bar.y + bar.height / 2 : bar.y - 4}
                    font-size={fontSize}
                    text-anchor={isHorizontal ? 'start' : 'middle'}
                    dominant-baseline={isHorizontal ? 'middle' : 'auto'}
                    fill="var(--fl-chart-text-color)"
                    font-weight="600"
                    font-family={theme.fontFamily}
                    class="text-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(i) + 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {ChartThemeUtils.formatNumber(bar.value)}
                  </text>
                ))}
              </g>
            )}

            <g>
              {showCategories && bars.map((bar, i) => {
                if (i % labelStride !== 0) return null;
                if (isHorizontal) {
                  return (
                    <text
                      key={i}
                      x={plotX - 6}
                      y={bar.y + bar.height / 2}
                      font-size={fontSize}
                      text-anchor="end"
                      dominant-baseline="middle"
                      fill="var(--fl-chart-text-color)"
                      font-family={theme.fontFamily}
                      font-weight="500"
                    >
                      {bar.label}
                    </text>
                  );
                }
                const cx = bar.x + bar.width / 2;
                const ty = plotY + plotH + fontSize + 4;
                return (
                  <text
                    key={i}
                    x={cx}
                    y={ty}
                    font-size={fontSize}
                    text-anchor={rotate ? 'end' : 'middle'}
                    fill="var(--fl-chart-text-color)"
                    font-family={theme.fontFamily}
                    font-weight="500"
                    class={rotate ? 'text-rotated-animated' : 'text-animated'}
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(i) + 150}ms`,
                      animationFillMode: 'both',
                      transformOrigin: `${cx}px ${ty}px`
                    }}
                  >
                    {bar.label}
                  </text>
                );
              })}
            </g>
          </svg>
          )}

          {/* Tooltip with modern styling */}
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
            {bars.map((bar, i) => (
              <div key={i} class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: bar.color }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  {bar.category}: {ChartThemeUtils.formatNumber(bar.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
} 