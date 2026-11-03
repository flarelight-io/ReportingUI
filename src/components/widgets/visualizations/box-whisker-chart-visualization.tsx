import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, clipLabel } from '../../../utils/bar-layout';
import { placeTooltip } from '../../../utils/tooltip';

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
  @State() legendFontSize: number = 10;
  @State() plotWidth: number = 0;
  @State() plotHeight: number = 0;

  @Element() el: HTMLElement;

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
        x: event.clientX,
        y: event.clientY
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
    
    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    const pad = 8;
    const fmt = (v: number) => v.toFixed(3).replace(/\.?0+$/, '');
    const tickValues = [0, 0.25, 0.5, 0.75, 1].map(ratio => fmt(maxValue - ratio * (maxValue - minValue)));
    const showTicks = !!(this.config.showGrid && this.config.showLabels);
    const categoryLabels = chartData.map((item, i) => clipLabel(item.SampleSourceName || `Group ${i + 1}`));
    const longestPx = Math.max(...categoryLabels.map(l => l.length)) * charWidth;

    const plotX = pad + (showTicks ? Math.max(...tickValues.map(t => t.length)) * charWidth + 6 : 0);
    const plotY = pad;
    const bottom = this.config.showLabels
      ? Math.min(longestPx * Math.SQRT1_2 + fontSize + 8, H * 0.45)
      : pad + 4;
    const plotW = Math.max(0, W - plotX - pad);
    const plotH = Math.max(0, H - plotY - bottom);

    const boxCount = chartData.length;
    const slot = plotW / boxCount;
    const labelStride = Math.max(1, Math.ceil((fontSize * 1.4) / Math.max(1, slot)));
    // Use the boxWidth config setting (default 0.8, range 0.1-1.0)
    const boxWidthRatio = (this.config as any).boxWidth || 0.8;
    const boxWidth = Math.max(4, Math.min(60, slot * boxWidthRatio));
    const scaleY = (val: number) => plotY + plotH - ((val - minValue) / (maxValue - minValue || 1)) * plotH;

    const boxes = chartData.map((item, i) => {
      const x = plotX + slot * i + slot / 2;

      const boxTop = scaleY(item.Q3);
      const boxBottom = scaleY(item.Q1);
      const boxHeight = Math.abs(boxBottom - boxTop);

      // Use proper whisker endpoints, fallback to Min/Max if whiskers are null
      const lowerWhiskerY = scaleY(item.LowerWhisker !== null ? item.LowerWhisker : item.Min);
      const upperWhiskerY = scaleY(item.UpperWhisker !== null ? item.UpperWhisker : item.Max);
      const medianY = scaleY(item.Median);

      const color = colors[i % colors.length];

      return {
        key: i,
        color,
        category: item.SampleSourceName || `Group ${i + 1}`,
        label: categoryLabels[i],
        stats: {
          min: item.Min,
          q1: item.Q1,
          median: item.Median,
          q3: item.Q3,
          max: item.Max
        },
        elements: {
          box: { x: x - boxWidth / 2, y: boxTop, width: boxWidth, height: Math.max(boxHeight, 1) },
          median: { x1: x - boxWidth / 2, y1: medianY, x2: x + boxWidth / 2, y2: medianY },
          upperWhisker: { x1: x, y1: boxTop, x2: x, y2: upperWhiskerY },
          lowerWhisker: { x1: x, y1: boxBottom, x2: x, y2: lowerWhiskerY },
          upperCap: { x1: x - boxWidth / 3, y1: upperWhiskerY, x2: x + boxWidth / 3, y2: upperWhiskerY },
          lowerCap: { x1: x - boxWidth / 3, y1: lowerWhiskerY, x2: x + boxWidth / 3, y2: lowerWhiskerY },
          outliers: (item.OutliersPreviewJson || []).map(outlier => ({ cx: x, cy: scaleY(outlier), r: 3 })),
          label: { x, y: plotY + plotH + fontSize + 4 },
          // Invisible rectangle for tooltip/interaction
          interactionZone: {
            x: x - boxWidth / 2,
            y: Math.min(upperWhiskerY, boxTop),
            width: boxWidth,
            height: Math.max(Math.abs(lowerWhiskerY - upperWhiskerY), boxHeight)
          }
        }
      };
    });

    return (
      <div class="box-whisker-chart-container" part="chart">
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
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = ChartThemeUtils.snapToPixel(plotY + ratio * plotH);
                  return (
                    <g key={`grid-${i}`}>
                      <line
                        x1={plotX}
                        y1={y}
                        x2={plotX + plotW}
                        y2={y}
                        stroke="var(--fl-chart-grid-color)"
                        stroke-width="1"
                        stroke-dasharray={i > 0 ? "3,3" : ""}
                        opacity={theme.gridlines.opacity}
                      />
                      {this.config.showLabels && (
                        <text
                          x={plotX - 6}
                          y={y}
                          font-size={fontSize}
                          text-anchor="end"
                          dominant-baseline="middle"
                          fill={theme.labelColor}
                          font-family={theme.fontFamily}
                          font-weight="500"
                        >
                          {tickValues[i]}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            <line
              x1={ChartThemeUtils.snapToPixel(plotX)}
              y1={ChartThemeUtils.snapToPixel(plotY + plotH)}
              x2={ChartThemeUtils.snapToPixel(plotX + plotW)}
              y2={ChartThemeUtils.snapToPixel(plotY + plotH)}
              stroke="var(--fl-chart-axis-color)"
              stroke-width="1"
            />
            <line
              x1={ChartThemeUtils.snapToPixel(plotX)}
              y1={ChartThemeUtils.snapToPixel(plotY)}
              x2={ChartThemeUtils.snapToPixel(plotX)}
              y2={ChartThemeUtils.snapToPixel(plotY + plotH)}
              stroke="var(--fl-chart-axis-color)"
              stroke-width="1"
            />

            <g class="box-whiskers">
              {boxes.map((box, boxIndex) => (
                <g key={box.key} class="box-whisker">
                  {[box.elements.upperWhisker, box.elements.lowerWhisker, box.elements.upperCap, box.elements.lowerCap].map((line, li) => (
                    <line
                      key={li}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={theme.axisColor}
                      stroke-width="1"
                      class="whisker-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                        animationFillMode: 'both'
                      }}
                    />
                  ))}

                  <rect
                    x={box.elements.box.x}
                    y={box.elements.box.y}
                    width={box.elements.box.width}
                    height={box.elements.box.height}
                    fill={`url(#boxGradient-${boxIndex % colors.length})`}
                    stroke={box.color}
                    stroke-width="1"
                    class="box-animated box-glow"
                    style={{
                      cursor: 'pointer',
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex)}ms`,
                      animationFillMode: 'both'
                    }}
                    filter="url(#softShadow)"
                  />

                  <line
                    x1={box.elements.median.x1}
                    y1={box.elements.median.y1}
                    x2={box.elements.median.x2}
                    y2={box.elements.median.y2}
                    stroke={theme.regressionColor}
                    stroke-width="2"
                    class="median-animated"
                    style={{
                      animationDelay: `${ChartAnimations.getStaggerDelay(boxIndex) + 50}ms`,
                      animationFillMode: 'both'
                    }}
                  />

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

                  {this.config.showLabels && boxIndex % labelStride === 0 && (
                    <text
                      x={box.elements.label.x}
                      y={box.elements.label.y}
                      font-size={fontSize}
                      text-anchor="end"
                      fill={theme.labelColor}
                      font-family={theme.fontFamily}
                      font-weight="500"
                      transform={`rotate(-45, ${box.elements.label.x}, ${box.elements.label.y})`}
                    >
                      {box.label}
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
          )}

          {this.tooltipVisible && (
            <div 
              part="tooltip" class={`chart-tooltip ${this.tooltipVisible ? 'visible' : ''}`}
              ref={(el) => placeTooltip(el, this.tooltipPosition.x, this.tooltipPosition.y)}
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
          <div class="chart-legend" part="legend">
            {chartData.map((item, i) => (
              <div key={i} class="legend-item">
                <div 
                  class="color-indicator" 
                  style={{ backgroundColor: colors[i % colors.length] }}
                ></div>
                <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>{item.SampleSourceName || `Group ${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
} 