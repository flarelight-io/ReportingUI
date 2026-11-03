import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, computeBarFrame, clipLabel } from '../../../utils/bar-layout';
import { niceScale } from '../../../utils/scale';
import { renderValueAxis, formatTick } from '../../../utils/chart-axes';
import { placeTooltip } from '../../../utils/tooltip';

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
  tag: 'lollipop-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss', // Reuse the bar chart styling
  shadow: true
})
export class LollipopChartVisualization {
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

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
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

  private handleMouseMove(event: MouseEvent, item: ChartDataItem) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(item.value);
      const maxCategoryLength = 30;
      const truncatedCategory = item.category.length > maxCategoryLength 
        ? `${item.category.substring(0, maxCategoryLength)}...` 
        : item.category;
      
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
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Use safe string comparison to avoid type errors
    const isHorizontal = String(this.config.visualizationType) === 'lollipop-h';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    const mainColor = colors[0]; // Use first color as the main color
    
    const scale = niceScale(0, Math.max(...chartData.map(item => item.value), 0));
    const maxValue = scale.max || 1;

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const labels = chartData.map(item => clipLabel(item.category));
    const showValues = !!this.config.showLabels;
    const frame = computeBarFrame({
      width: W, height: H, horizontal: isHorizontal, labels, fontSize, valueLabels: showValues, showCategories: true,
      tickLabels: scale.ticks.map(formatTick)
    });
    const { plotX, plotY, plotW, plotH, rotate, slot, labelStride, charWidth } = frame;
    const circleRadius = Math.max(3, Math.min(6, slot * 0.25));
    const strokeWidth = 1.5;
    const valueStride = isHorizontal
      ? Math.max(1, Math.ceil((fontSize * 1.3) / slot))
      : Math.max(1, Math.ceil((charWidth * 4) / slot));

    const lollipops = chartData.map((item, index) => {
      const length = (item.value / maxValue) * (isHorizontal ? plotW : plotH);
      const center = (isHorizontal ? plotY : plotX) + index * slot + slot / 2;
      if (isHorizontal) {
        return {
          line: { x1: plotX, y1: center, x2: plotX + Math.max(0, length - circleRadius), y2: center },
          circle: { cx: plotX + length, cy: center, r: circleRadius },
          center, label: labels[index], category: item.category, value: item.value
        };
      }
      return {
        line: { x1: center, y1: plotY + plotH, x2: center, y2: plotY + plotH - Math.max(0, length - circleRadius) },
        circle: { cx: center, cy: plotY + plotH - length, r: circleRadius },
        center, label: labels[index], category: item.category, value: item.value
      };
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
              <radialGradient id="lollipopGradient" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stop-color={mainColor} stop-opacity="1"/>
                <stop offset="100%" stop-color={mainColor} stop-opacity="0.8"/>
              </radialGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {renderValueAxis({
              ticks: scale.ticks, min: scale.min, max: scale.max,
              plotX, plotY, plotW, plotH, fontSize, fontFamily: theme.fontFamily,
              horizontal: isHorizontal, showGrid: !!this.config.showGrid, gridOpacity: theme.gridlines.opacity
            })}

            {lollipops.map((lollipop, i) => (
              <g
                key={i}
                style={{
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onMouseMove={(e) => this.handleMouseMove(e, { category: lollipop.category, value: lollipop.value })}
                onMouseLeave={() => this.handleMouseLeave()}
                onClick={() => this.handleFilterClick(groupByField || '', lollipop.category)}
                class="lollipop-animated"
              >
                <line
                  x1={lollipop.line.x1}
                  y1={lollipop.line.y1}
                  x2={lollipop.line.x2}
                  y2={lollipop.line.y2}
                  stroke={mainColor}
                  stroke-width={strokeWidth}
                  class="line-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                />
                <circle
                  cx={lollipop.circle.cx}
                  cy={lollipop.circle.cy}
                  r={lollipop.circle.r}
                  fill="url(#lollipopGradient)"
                  class="point-animated point-glow"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i) + 100}ms`,
                    animationFillMode: 'both'
                  }}
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

            {showValues && (
              <g>
                {lollipops.map((lollipop, i) => i % valueStride === 0 && (
                  <text
                    key={`value-${i}`}
                    x={isHorizontal ? lollipop.circle.cx + circleRadius + 4 : lollipop.circle.cx}
                    y={isHorizontal ? lollipop.circle.cy : lollipop.circle.cy - circleRadius - 4}
                    font-size={fontSize}
                    text-anchor={isHorizontal ? 'start' : 'middle'}
                    dominant-baseline={isHorizontal ? 'middle' : 'auto'}
                    fill="var(--fl-chart-text-color)"
                    font-family={theme.fontFamily}
                    font-weight="600"
                    class="text-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(i) + 150}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {ChartThemeUtils.formatNumber(lollipop.value)}
                  </text>
                ))}
              </g>
            )}

            <g>
              {lollipops.map((lollipop, i) => {
                if (i % labelStride !== 0) return null;
                if (isHorizontal) {
                  return (
                    <text
                      key={i}
                      x={plotX - 6}
                      y={lollipop.center}
                      font-size={fontSize}
                      text-anchor="end"
                      dominant-baseline="middle"
                      fill="var(--fl-chart-text-color)"
                      font-family={theme.fontFamily}
                      font-weight="500"
                    >
                      {lollipop.label}
                    </text>
                  );
                }
                const ty = plotY + plotH + fontSize + 4;
                return (
                  <text
                    key={i}
                    x={lollipop.center}
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
                      transformOrigin: `${lollipop.center}px ${ty}px`
                    }}
                  >
                    {lollipop.label}
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
        
        {/* Legend with PowerBI-grade styling */}
        {(this.config.showLegend !== false) && (
          <div class="chart-legend" part="legend">
            <div class="legend-item">
              <div class="color-indicator" style={{ backgroundColor: mainColor }}></div>
              <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                {valueField || 'Value'}
              </span>
            </div>
          </div>
        )}
        
      </div>
    );
  }
}
