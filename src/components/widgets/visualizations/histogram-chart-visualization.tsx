import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, computeBarFrame, clipLabel } from '../../../utils/bar-layout';
import { niceScale } from '../../../utils/scale';
import { renderValueAxis, formatTick } from '../../../utils/chart-axes';
import { placeTooltip } from '../../../utils/tooltip';

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
        x: event.clientX,
        y: event.clientY
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
    
    const scale = niceScale(0, Math.max(...histogramData.map(bin => bin.count), 0));
    const maxCount = scale.max || 1;

    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const rawLabels = histogramData.map(bin => clipLabel(bin.label, 28));
    const frame = computeBarFrame({
      width: W, height: H, horizontal: false, labels: rawLabels, fontSize,
      valueLabels: !!this.config.showLabels, showCategories: true, tickLabels: scale.ticks.map(formatTick)
    });
    const { plotX, plotY, plotW, plotH, rotate, slot, labelStride, charWidth } = frame;
    const labels = frame.labels;
    const showCategories = frame.showCategories;
    const valueStride = Math.max(1, Math.ceil((charWidth * 4) / slot));

    const bars = histogramData.map((bin, index) => {
      const height = (bin.count / maxCount) * plotH;
      return { x: plotX + index * slot, y: plotY + plotH - height, width: slot, height, color: colors[0], bin, index };
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
              <linearGradient id="histogramGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color={colors[0]} stop-opacity="1"/>
                <stop offset="100%" stop-color={colors[0]} stop-opacity="0.85"/>
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
                  height={Math.max(bar.height, 0.5)} // Keep zero-count bins visible as a hairline
                  fill="url(#histogramGradient)"
                  class="bar-glow"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                  filter="url(#softShadow)"
                />

                {this.config.showLabels && i % valueStride === 0 && (
                  <text
                    x={bar.x + (bar.width / 2)}
                    y={bar.y - 4}
                    font-size={fontSize}
                    text-anchor="middle"
                    fill="var(--fl-chart-text-color)"
                    font-family={theme.fontFamily}
                    font-weight="600"
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

            {showCategories && bars.map((bar, i) => {
              if (i % labelStride !== 0) return null;
              const cx = bar.x + bar.width / 2;
              const ty = plotY + plotH + fontSize + 4;
              return (
                <text
                  key={`x-label-${i}`}
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
                  {labels[i]}
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
}
