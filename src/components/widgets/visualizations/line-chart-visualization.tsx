import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData, fieldLabel } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, clipLabel } from '../../../utils/bar-layout';
import { niceScale } from '../../../utils/scale';
import { renderValueAxis, formatTick } from '../../../utils/chart-axes';
import { placeTooltip } from '../../../utils/tooltip';

interface LineDataPoint {
  x: string | number;
  y: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'line-chart-visualization',
  styleUrl: 'line-chart-visualization.scss',
  shadow: true
})
export class LineChartVisualization {
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

  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.sourceId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field: fieldName,
        value: value
      });
    }
  }

  private handleMouseMove(event: MouseEvent, category: string | number, value: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with line breaks and proper formatting
      const formattedValue = ChartThemeUtils.formatNumber(value);
      const displayCategory = String(category).length > 20 
        ? String(category).substring(0, 20) + '...' 
        : String(category);
      
      this.tooltip = {
        visible: true,
        text: `${displayCategory}\n${formattedValue}`,
        x: event.clientX,
        y: event.clientY
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): LineDataPoint[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // For standard chart types
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    if (groupByField && valueField) {
      const xField = groupByField;
      const yField = valueField;
      
      const processed = rawData.map(item => ({
        x: item[xField] === null ? 'Unknown' : item[xField],
        y: Number(item[yField] || 0)
      }));
      
      return processed;
    }
    // For legacy X/Y format
    else if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      return rawData.map(item => ({
        x: item.X === null ? 'Unknown' : item.X,
        y: Number(item.Y || 0)
      }));
    }
    // For simple two-column data
    else if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      return rawData.map(item => ({
        x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
        y: Number(item[keys[1]] || 0)
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
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    const scale = niceScale(Math.min(0, ...chartData.map(item => item.y)), Math.max(...chartData.map(item => item.y), 0));
    const minValue = scale.min;
    const maxValue = scale.max;

    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    const pad = 8;
    const tickValues = scale.ticks.map(formatTick);
    const plotXBase = pad + Math.max(...tickValues.map(t => t.length)) * charWidth + 6;
    const plotY = this.config.showLabels ? fontSize + 8 : pad;
    const xLabels = chartData.map(item => clipLabel(String(item.x), 15));
    const longestPx = Math.max(...xLabels.map(l => l.length)) * charWidth;
    const plotX = this.config.showXAxisLabels ? Math.max(plotXBase, pad + longestPx * Math.SQRT1_2 + 2) : plotXBase;
    const bottom = this.config.showXAxisLabels
      ? Math.min(longestPx * Math.SQRT1_2 + fontSize + 8, H * 0.45)
      : pad + 4;
    const plotW = Math.max(0, W - plotX - pad);
    const plotH = Math.max(0, H - plotY - bottom);
    const spacing = plotW / Math.max(1, chartData.length - 1);
    const xStride = Math.max(1, Math.ceil((fontSize * 1.4) / Math.max(1, spacing)));
    const valueStride = Math.max(1, Math.ceil((charWidth * 4) / Math.max(1, spacing)));

    const points = chartData.map((item, index) => ({
      x: chartData.length === 1 ? plotX + plotW / 2 : plotX + index * spacing,
      y: plotY + plotH - ((item.y - minValue) / (maxValue - minValue || 1)) * plotH,
      category: item.x,
      value: item.y
    }));
    const pathString = points.map((point, i) =>
      `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`
    ).join(' ');

    return (
      <div class="line-chart-container" part="chart">
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
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color={colors[0]} stop-opacity="0.3"/>
                <stop offset="100%" stop-color={colors[0]} stop-opacity="0.05"/>
              </linearGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {renderValueAxis({
              ticks: scale.ticks, min: scale.min, max: scale.max,
              plotX, plotY, plotW, plotH, fontSize, fontFamily: theme.fontFamily,
              showGrid: !!this.config.showGrid, gridOpacity: theme.gridlines.opacity
            })}

            {points.length > 1 && (
              <path
                d={`${pathString} L${points[points.length - 1].x},${plotY + plotH} L${points[0].x},${plotY + plotH} Z`}
                fill="url(#lineGradient)"
                stroke="none"
                class="line-area"
              />
            )}
            <path
              d={pathString}
              fill="none"
              stroke={colors[0]}
              stroke-width={theme.lineStrokeWidth || 2}
              stroke-linecap="round"
              stroke-linejoin="round"
              class="line-animated"
              style={{
                transition: ChartAnimations.getHoverTransition(),
                animationDelay: '100ms',
                animationFillMode: 'both'
              }}
            />

            {points.map((point, i) => (
              <g
                key={i}
                transform={`translate(${point.x}, ${point.y})`}
                style={{
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onClick={() => this.handleFilterClick(groupByField || '', point.category)}
                onMouseEnter={(event) => this.handleMouseMove(event, point.category, point.value)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <circle
                  cx="0"
                  cy="0"
                  r={theme.pointRadius || 3}
                  fill={colors[0]}
                  stroke="white"
                  stroke-width="1"
                  opacity="0.8"
                  class="point-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                />
                {/* Larger invisible target so points are easy to hover */}
                <circle
                  cx="0"
                  cy="0"
                  r={Math.max(8, (theme.pointRadius || 3) + 4)}
                  fill="transparent"
                  stroke="transparent"
                  stroke-width="0"
                  class="point-hover"
                  style={{
                    transition: ChartAnimations.getHoverTransition()
                  }}
                />
              </g>
            ))}

            <line
              x1={plotX} y1={ChartThemeUtils.snapToPixel(plotY + plotH)}
              x2={plotX + plotW} y2={ChartThemeUtils.snapToPixel(plotY + plotH)}
              stroke="var(--fl-chart-axis-color)" stroke-width="1" opacity="0.6"
            />
            <line
              x1={ChartThemeUtils.snapToPixel(plotX)} y1={plotY}
              x2={ChartThemeUtils.snapToPixel(plotX)} y2={plotY + plotH}
              stroke="var(--fl-chart-axis-color)" stroke-width="1" opacity="0.6"
            />

            {this.config.showXAxisLabels && points.map((point, i) => {
              if (i % xStride !== 0) return null;
              const ty = plotY + plotH + fontSize + 2;
              return (
                <text
                  key={`x-${i}`}
                  x={point.x}
                  y={ty}
                  font-size={fontSize}
                  text-anchor="end"
                  fill="var(--fl-chart-text-secondary)"
                  font-family={theme.fontFamily}
                  font-weight="500"
                  transform={`rotate(-45, ${point.x}, ${ty})`}
                >
                  {xLabels[i]}
                </text>
              );
            })}

            {this.config.showLabels && points.map((point, i) => {
              if (i % valueStride !== 0) return null;
              return (
                <text
                  key={`value-${i}`}
                  x={point.x}
                  y={point.y - 8}
                  font-size={fontSize}
                  text-anchor="middle"
                  fill="var(--fl-chart-text-color)"
                  font-family={theme.fontFamily}
                  font-weight="600"
                  paint-order="stroke fill"
                  stroke="white"
                  stroke-width="2"
                >
                  {ChartThemeUtils.formatNumber(point.value)}
                </text>
              );
            })}

            
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
            <div class="legend-item">
              <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
              <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>{valueField ? fieldLabel(this.data, valueField) : "Value"}</span>
            </div>
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