import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, clipLabel } from '../../../utils/bar-layout';
import { placeTooltip } from '../../../utils/tooltip';

interface ScatterDataPoint {
  x: string | number;
  y: number;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'scatter-chart-visualization',
  styleUrl: 'scatter-chart-visualization.scss',
  shadow: true
})
export class ScatterChartVisualization {
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

  private processData(): ScatterDataPoint[] {
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
  
  private calculateLinearRegression(points: { x: number, y: number }[]): RegressionResult | null {
    // Need at least 2 points for a regression line
    if (!points || points.length < 2) {
      return null;
    }
    
    // Calculate means
    const n = points.length;
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    
    for (const point of points) {
      numerator += (point.x - meanX) * (point.y - meanY);
      denominator += (point.x - meanX) * (point.x - meanX);
    }
    
    // Avoid division by zero
    if (denominator === 0) {
      return null;
    }
    
    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calculate coefficient of determination (r-squared)
    let ssRes = 0; // Sum of squared residuals
    let ssTot = 0; // Total sum of squares
    
    for (const point of points) {
      const predicted = slope * point.x + intercept;
      ssRes += Math.pow(point.y - predicted, 2);
      ssTot += Math.pow(point.y - meanY, 2);
    }
    
    // Avoid division by zero
    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
    
    return { slope, intercept, r2 };
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
    const showRegressionLine = 'showRegressionLine' in this.config ? this.config.showRegressionLine : undefined;
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    const maxValue = Math.max(...chartData.map(item => item.y), 0) * 1.1 || 1; // Add 10% padding

    const colors = this.getColors();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    const pad = 8;
    const tickValues = [0, 0.25, 0.5, 0.75, 1].map(ratio => ChartThemeUtils.formatNumber(ratio * maxValue));
    const plotX = pad + Math.max(...tickValues.map(t => t.length)) * charWidth + 6;
    const plotY = this.config.showLabels ? fontSize + 8 : pad;
    const xLabels = chartData.map(item => clipLabel(String(item.x), 10));
    const longestPx = Math.max(...xLabels.map(l => l.length)) * charWidth;
    const bottom = fontSize + 12;
    const plotW = Math.max(0, W - plotX - pad);
    const plotH = Math.max(0, H - plotY - bottom);
    const spacing = plotW / Math.max(1, chartData.length - 1);
    const xStride = Math.max(1, Math.ceil((longestPx + 6) / Math.max(1, spacing)));
    const valueStride = Math.max(1, Math.ceil((charWidth * 4) / Math.max(1, spacing)));
    const mapY = (value: number) => plotY + plotH - (value / maxValue) * plotH;

    const points = chartData.map((item, index) => ({
      x: chartData.length === 1 ? plotX + plotW / 2 : plotX + index * spacing,
      y: mapY(item.y),
      category: item.x,
      value: item.y
    }));

    // Regression line over the numeric x values, drawn from the first to the last point
    let regressionLine = null;
    if (showRegressionLine) {
      const numericPoints = chartData
        .filter(item => typeof item.x === 'number' || (typeof item.x === 'string' && !isNaN(Number(item.x))))
        .map(item => ({ x: Number(item.x), y: item.y }));

      if (numericPoints.length >= 2) {
        const regression = this.calculateLinearRegression(numericPoints);
        if (regression) {
          const first = chartData[0];
          const last = chartData[chartData.length - 1];
          regressionLine = {
            x1: points[0].x,
            y1: mapY(regression.slope * Number(first.x) + regression.intercept),
            x2: points[points.length - 1].x,
            y2: mapY(regression.slope * Number(last.x) + regression.intercept),
            r2: regression.r2
          };
        }
      }
    }

    return (
      <div class="scatter-chart-container" part="chart">
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
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {this.config.showGrid && (
              <>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = plotY + plotH - ratio * plotH;
                  return (
                    <line
                      key={`h-${i}`}
                      x1={plotX}
                      y1={ChartThemeUtils.snapToPixel(y)}
                      x2={plotX + plotW}
                      y2={ChartThemeUtils.snapToPixel(y)}
                      stroke="var(--fl-chart-grid-color)"
                      stroke-width="1"
                      opacity="0.5"
                    />
                  );
                })}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const x = plotX + ratio * plotW;
                  return (
                    <line
                      key={`v-${i}`}
                      x1={ChartThemeUtils.snapToPixel(x)}
                      y1={plotY}
                      x2={ChartThemeUtils.snapToPixel(x)}
                      y2={plotY + plotH}
                      stroke="var(--fl-chart-grid-color)"
                      stroke-width="1"
                      opacity="0.5"
                    />
                  );
                })}
              </>
            )}

            {showRegressionLine && regressionLine && (
              <line
                x1={regressionLine.x1}
                y1={regressionLine.y1}
                x2={regressionLine.x2}
                y2={regressionLine.y2}
                stroke={theme.regressionColor}
                stroke-width={theme.lineStrokeWidth || 2}
                stroke-dasharray="none"
                opacity="0.9"
                class="regression-line"
                style={{
                  transition: ChartAnimations.getHoverTransition()
                }}
              />
            )}

            {points.map((point, i) => (
              <g
                key={i}
                transform={`translate(${point.x}, ${point.y})`}
                style={{
                  cursor: 'pointer',
                  transition: ChartAnimations.getHoverTransition()
                }}
                onClick={() => this.handleFilterClick(groupByField || '', point.category)}
                onMouseMove={(event) => this.handleMouseMove(event, point.category, point.value)}
                onMouseLeave={() => this.handleMouseLeave()}
              >
                <circle
                  cx="0"
                  cy="0"
                  r={Math.max(4, theme.pointRadius || 3)}
                  fill={colors[i % colors.length]}
                  stroke="white"
                  stroke-width="1"
                  opacity="0.8"
                  class="point-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(i)}ms`,
                    animationFillMode: 'both'
                  }}
                  filter="url(#softShadow)"
                />
                {/* Larger invisible target so points are easy to hover */}
                <circle
                  cx="0"
                  cy="0"
                  r="9"
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

            {points.map((point, i) => i % xStride === 0 && (
              <text
                key={i}
                x={point.x}
                y={plotY + plotH + fontSize + 4}
                font-size={fontSize}
                text-anchor="middle"
                fill="var(--fl-chart-text-color, #666)"
                font-family={theme.fontFamily}
              >
                {xLabels[i]}
              </text>
            ))}

            {this.config.showLabels && points.map((point, i) => i % valueStride === 0 && (
              <text
                key={`value-${i}`}
                x={point.x}
                y={point.y - 8}
                font-size={fontSize}
                text-anchor="middle"
                fill="var(--fl-chart-text-color, #444)"
                font-family={theme.fontFamily}
              >
                {ChartThemeUtils.formatNumber(point.value)}
              </text>
            ))}

            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <text
                key={`y-label-${i}`}
                x={plotX - 6}
                y={plotY + plotH - ratio * plotH}
                font-size={fontSize}
                text-anchor="end"
                dominant-baseline="middle"
                fill="var(--fl-chart-text-color, #666)"
                font-family={theme.fontFamily}
              >
                {tickValues[i]}
              </text>
            ))}
          </svg>
          )}

          {/* Tooltip */}
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
            {chartData.length <= 10 ? (
              // If we have a reasonable number of points, show them each in the legend
              chartData.map((item, i) => (
                <div class="legend-item" key={i}>
                  <div 
                    class="color-indicator" 
                    style={{ backgroundColor: colors[i % colors.length] }}
                  ></div>
                  <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                    {String(item.x)}: {item.y}
                  </span>
                </div>
              ))
            ) : (
              // If we have too many points, just show a summary
              <div class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>{chartData.length} data points</span>
              </div>
            )}

            {/* Add regression line to legend if it exists */}
            {showRegressionLine && regressionLine && (
              <div class="legend-item">
                <div class="color-indicator regression-indicator" style={{ backgroundColor: theme.regressionColor }}></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>
                  Regression Line (R² = {regressionLine.r2.toFixed(2)})
                </span>
              </div>
            )}
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