import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData, fieldLabel } from './base-visualization';
import { pivotSeries } from '../../../utils/pivot';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { placeTooltip } from '../../../utils/tooltip';
import { PlotSizeTracker, computeBarFrame, clipLabel } from '../../../utils/bar-layout';
import { niceScale } from '../../../utils/scale';
import { renderValueAxis, formatTick } from '../../../utils/chart-axes';

interface ClusteredChartItem {
  category: string;
  values: {
    field: string;
    value: number;
  }[];
  maxValue: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'clustered-bar-chart-visualization',
  styleUrl: 'bar-chart-visualization.scss', // Reuse the bar chart styling
  shadow: true
})
export class ClusteredBarChartVisualization {
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

  private handleFilterClick(field: string, value: any) {
    this.filterChange.emit({ sourceId: this.config.sourceId, field, value });
  }

  private getColors(): string[] {
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    return theme.series;
  }

  private processData(): ClusteredChartItem[] {
    const rawData = this.data.rawData || [];
    
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const fields = 'fields' in this.config ? this.config.fields : undefined;
    const seriesField = this.getSeriesField();
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;

    // A dimension pivoted into series: rows are { category, series value, value }, one series per distinct value
    if (seriesField && valueField && groupByField) {
      if (rawData.length === 0) return [];
      const pivot = pivotSeries(rawData, groupByField, seriesField, valueField);
      return pivot.categories.map(category => {
        const values = pivot.series.map(series => ({ field: series, value: pivot.value(category, series) }));
        return { category, values, maxValue: Math.max(0, ...values.map(v => v.value)) };
      });
    }

    if (rawData.length === 0 || !groupByField || !fields || fields.length === 0) {
      return [];
    }
    
    const groupField = groupByField;
    const valueFields = fields;
    
    // Group data by category
    const groupedData = rawData.reduce((acc, item) => {
      const categoryValue = String(item[groupField] === null ? 'Unknown' : item[groupField]);
      
      if (!acc[categoryValue]) {
        acc[categoryValue] = {
          category: categoryValue,
          values: valueFields.map(field => ({
            field,
            value: 0
          })),
          maxValue: 0
        };
      }
      
      // Add values for each field
      valueFields.forEach((field, index) => {
        const value = Number(item[field] || 0);
        acc[categoryValue].values[index].value += value;
        // Track the max value in each category for easier scaling
        acc[categoryValue].maxValue = Math.max(acc[categoryValue].maxValue, acc[categoryValue].values[index].value);
      });
      
      return acc;
    }, {});
    
    const processed = Object.values(groupedData) as ClusteredChartItem[];
    
    return processed;
  }

  private getSeriesField(): string | undefined {
    return 'seriesField' in this.config ? (this.config as any).seriesField : undefined;
  }

  /** Series names: the distinct values of the pivoted dimension, or the configured fields. */
  private getSeriesNames(chartData: { values: { field: string }[] }[]): string[] {
    if (this.getSeriesField()) return chartData.length > 0 ? chartData[0].values.map(v => v.field) : [];
    const fields = 'fields' in this.config ? this.config.fields : undefined;
    return fields || [];
  }

  /** Pivoted series names are data values; configured fields get their display name. */
  private seriesLabel(name: string): string {
    return this.getSeriesField() ? name : fieldLabel(this.data, name);
  }

  private handleMouseMove(event: MouseEvent, segment: { field: string, value: number }, category: string) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(segment.value);
      const maxCategoryLength = 30;
      const truncatedCategory = category.length > maxCategoryLength 
        ? `${category.substring(0, maxCategoryLength)}...` 
        : category;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedCategory}\n${this.seriesLabel(segment.field)}: ${formattedValue}`,
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
    const seriesNames = this.getSeriesNames(chartData);
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Use safe string comparison to avoid type errors
    const isHorizontal = String(this.config.visualizationType) === 'clustered-hbar';
    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    
    const scale = niceScale(0, Math.max(...chartData.map(item => item.maxValue), 0));
    const maxValue = scale.max || 1;
    const fieldCount = seriesNames.length || 1;

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const rawLabels = chartData.map(item => clipLabel(item.category, 28));
    const showValues = !!this.config.showLabels;
    const frame = computeBarFrame({
      width: W, height: H, horizontal: isHorizontal, labels: rawLabels, fontSize, valueLabels: showValues, showCategories: true,
      tickLabels: scale.ticks.map(formatTick)
    });
    const { plotX, plotY, plotW, plotH, rotate, slot, labelStride, charWidth } = frame;
    const labels = frame.labels;
    const showCategories = frame.showCategories;

    const groupThickness = Math.max(1, slot * 0.8);
    const barGap = fieldCount > 1 ? Math.min(2, groupThickness / fieldCount * 0.1) : 0;
    const barThickness = Math.max(1, (groupThickness - barGap * (fieldCount - 1)) / fieldCount);

    const bars = chartData.map((item, categoryIndex) => {
      const groupStart = categoryIndex * slot + (slot - groupThickness) / 2;
      const segments = item.values.map((segment, segmentIndex) => {
        const length = (segment.value / maxValue) * (isHorizontal ? plotW : plotH);
        const offset = groupStart + segmentIndex * (barThickness + barGap);
        const color = colors[segmentIndex % colors.length];
        return isHorizontal
          ? { x: plotX, y: plotY + offset, width: length, height: barThickness, color, field: segment.field, value: segment.value }
          : { x: plotX + offset, y: plotY + plotH - length, width: barThickness, height: length, color, field: segment.field, value: segment.value };
      });
      return { category: item.category, label: labels[categoryIndex], segments, center: (isHorizontal ? plotY : plotX) + categoryIndex * slot + slot / 2 };
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
                <linearGradient key={`gradient-${index}`} id={`clusteredGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
                {bar.segments.map((segment, j) => (
                  <rect
                    key={`${i}-${j}`}
                    x={segment.x}
                    y={segment.y}
                    rx={2}
                    width={segment.width}
                    height={segment.height}
                    fill={`url(#clusteredGradient-${j % colors.length})`}
                    class="bar-animated bar-glow"
                    style={{
                      cursor: 'pointer',
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(i + j)}ms`,
                      animationFillMode: 'both'
                    }}
                    onMouseMove={(e) => this.handleMouseMove(e, { field: segment.field, value: segment.value }, bar.category)}
                    onMouseLeave={() => this.handleMouseLeave()}
                    onClick={() => this.handleFilterClick(groupByField || '', bar.category)}
                    filter="url(#softShadow)"
                  />
                ))}
              </g>
            ))}

            {showValues && (
              <g>
                {bars.map((bar, i) => bar.segments.map((segment, j) => {
                  const text = ChartThemeUtils.formatNumber(segment.value);
                  // Skip values that don't fit next to their bar
                  const fits = isHorizontal
                    ? segment.height >= fontSize
                    : segment.width >= text.length * charWidth;
                  if (!fits) return null;
                  return (
                    <text
                      key={`value-${i}-${j}`}
                      x={isHorizontal ? segment.x + segment.width + 4 : segment.x + segment.width / 2}
                      y={isHorizontal ? segment.y + segment.height / 2 : segment.y - 4}
                      font-size={fontSize}
                      text-anchor={isHorizontal ? 'start' : 'middle'}
                      dominant-baseline={isHorizontal ? 'middle' : 'auto'}
                      fill="var(--fl-chart-text-color)"
                      font-family={theme.fontFamily}
                      font-weight="600"
                      class="text-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(i + j) + 100}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {text}
                    </text>
                  );
                }))}
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
                      y={bar.center}
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
                const ty = plotY + plotH + fontSize + 4;
                return (
                  <text
                    key={i}
                    x={bar.center}
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
                      transformOrigin: `${bar.center}px ${ty}px`
                    }}
                  >
                    {bar.label}
                  </text>
                );
              })}
            </g>

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
            {seriesNames.map((field, i) => (
              <div key={i} class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  {this.seriesLabel(field)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}
