import { Component, Prop, h, State, Event, EventEmitter, Element, Watch } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { HeatmapConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { PlotSizeTracker, clipLabel, fitRotatedLabels } from '../../../utils/bar-layout';
import { placeTooltip } from '../../../utils/tooltip';

interface HeatmapMatrix {
  rowLabels: string[];
  colLabels: string[];
  data: number[][];
  minValue: number;
  maxValue: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'heatmap-visualization',
  styleUrl: 'heatmap-visualization.scss',
  shadow: true
})
export class HeatmapVisualization {
  @Element() el!: HTMLElement;
  @Prop() config: HeatmapConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
  @State() legendFontSize: number = 10;
  @State() plotWidth: number = 0;
  @State() plotHeight: number = 0;

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

  private processData(): HeatmapMatrix {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return { rowLabels: [], colLabels: [], data: [], minValue: 0, maxValue: 0 };
    }
    
    // There are several ways heatmap data might be structured
    // We'll handle a few common formats
    
    // Case 1: Data already in matrix-like format where each row has a Name/Label
    // and columns represent the heatmap columns
    if (rawData[0].Name !== undefined || rawData[0].Label !== undefined) {
      const rowLabelField = rawData[0].Name !== undefined ? 'Name' : 'Label';
      const rowLabels = rawData.map(row => String(row[rowLabelField]));
      
      // Get column labels (excluding the name/label field)
      const colLabels = Object.keys(rawData[0]).filter(key => 
        key !== rowLabelField && key !== 'name' && key !== 'label'
      );
      
      // Build the data matrix
      const matrix: number[][] = [];
      let minValue = Number.MAX_VALUE;
      let maxValue = Number.MIN_VALUE;
      
      rawData.forEach(row => {
        const matrixRow: number[] = [];
        colLabels.forEach(col => {
          const value = Number(row[col] || 0);
          matrixRow.push(value);
          minValue = Math.min(minValue, value);
          maxValue = Math.max(maxValue, value);
        });
        matrix.push(matrixRow);
      });
      
      return {
        rowLabels,
        colLabels,
        data: matrix,
        minValue,
        maxValue
      };
    }
    
    // Case 2: Data in "xField, yField, valueField" format
    const xField = 'xField' in this.config ? this.config.xField : undefined;
    const yField = 'yField' in this.config ? this.config.yField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    if (xField && yField && valueField) {
      // Get unique row and column values
      const rowLabelsSet = new Set<string>();
      const colLabelsSet = new Set<string>();
      const cellMap = new Map<string, number>();
      
      let minValue = Number.MAX_VALUE;
      let maxValue = Number.MIN_VALUE;
      
      // Build the sets of unique values and cell map
      rawData.forEach(item => {
        const rowLabel = String(item[yField] === null ? 'Unknown' : item[yField]);
        const colLabel = String(item[xField] === null ? 'Unknown' : item[xField]);
        const value = Number(item[valueField] || 0);
        
        rowLabelsSet.add(rowLabel);
        colLabelsSet.add(colLabel);
        cellMap.set(`${rowLabel}|${colLabel}`, value);
        
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      });
      
      // Convert sets to arrays
      const rowLabels = Array.from(rowLabelsSet);
      const colLabels = Array.from(colLabelsSet);
      
      // Build the matrix
      const matrix: number[][] = [];
      rowLabels.forEach(rowLabel => {
        const row: number[] = [];
        colLabels.forEach(colLabel => {
          const key = `${rowLabel}|${colLabel}`;
          const value = cellMap.has(key) ? cellMap.get(key) : 0;
          row.push(value);
        });
        matrix.push(row);
      });
      
      return {
        rowLabels,
        colLabels,
        data: matrix,
        minValue,
        maxValue
      };
    }
    
    // If none of the formats match, return empty data
    return { rowLabels: [], colLabels: [], data: [], minValue: 0, maxValue: 0 };
  }

  private getColorForValue(value: number, min: number, max: number): string {
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    
    // Create a professional heatmap color scale using theme colors
    // Use the theme's series colors as base and create a gradient
    const baseColors = theme.series.slice(0, 6); // Use first 6 theme colors
    const colors = [
      baseColors[0], // Darkest - primary brand color
      baseColors[1], // Dark
      baseColors[2], // Medium-dark
      baseColors[3], // Medium
      baseColors[4], // Light
      baseColors[5] || baseColors[4] // Lightest
    ];
    
    // If min and max are the same, return middle color
    if (min === max) {
      return colors[Math.floor(colors.length / 2)];
    }
    
    // Calculate position in the color scale (0 to 1)
    const normalizedValue = (value - min) / (max - min);
    
    // Convert to index in color array
    const index = Math.min(colors.length - 1, Math.floor(normalizedValue * colors.length));
    
    return colors[index];
  }
  
  // Helper to determine text color based on background color
  private getTextColor(value: number, min: number, max: number): string {
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    // If value is in the upper half of the range, use light text
    // Otherwise use dark text for better contrast
    const midPoint = (min + max) / 2;
    return value > midPoint ? theme.labelColor : theme.panel;
  }
  
  private formatValue(value: number): string {
    // Custom formatter with max 2 decimal places and k/m/b suffixes
    if (value >= 1000000000) {
      const formatted = (value / 1000000000).toFixed(2).replace(/\.?0+$/, '');
      return formatted + 'B';
    } else if (value >= 1000000) {
      const formatted = (value / 1000000).toFixed(2).replace(/\.?0+$/, '');
      return formatted + 'M';
    } else if (value >= 1000) {
      const formatted = (value / 1000).toFixed(2).replace(/\.?0+$/, '');
      return formatted + 'k';
    }
    // For smaller numbers, format to max 2 decimal places and remove trailing zeros
    return parseFloat(value.toFixed(2)).toString();
  }
  
  private handleMouseMove(e: MouseEvent, rowIdx: number, colIdx: number, value: number, heatmapData: HeatmapMatrix) {
    const svgRect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = this.formatValue(value);
      // Use full labels in tooltip (not truncated)
      const rowLabel = heatmapData.rowLabels[rowIdx];
      const colLabel = heatmapData.colLabels[colIdx];
      
      this.tooltip = {
        visible: true,
        text: `${rowLabel} × ${colLabel}\n${formattedValue}`,
        x: e.clientX,
        y: e.clientY
      };
    }
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    const heatmapData = this.processData();
    const theme = ChartThemeUtils.getTheme(this.colorTheme, this.el);
    
    if (heatmapData.rowLabels.length === 0 || heatmapData.colLabels.length === 0) {
      return <div class="empty-data">No data available for heatmap</div>;
    }
    
    const rowCount = heatmapData.rowLabels.length;
    const colCount = heatmapData.colLabels.length;

    // Lay out in real pixels so text keeps a constant, readable size at any container size
    const W = this.plotWidth;
    const H = this.plotHeight;
    const fontSize = Math.max(10, (theme.fontSize || 12) - 1);
    const charWidth = fontSize * 0.58;
    const pad = 8;
    const rowLabels = heatmapData.rowLabels.map(l => clipLabel(l, 24));
    const colLabels = heatmapData.colLabels.map(l => clipLabel(l, 18));
    const rowLabelWidth = Math.min(W * 0.35, Math.max(...rowLabels.map(l => l.length), 1) * charWidth + 12);
    const heatmapOffsetX = pad + rowLabelWidth;
    const heatmapWidth = Math.max(0, W - heatmapOffsetX - pad);
    const cellWidth = heatmapWidth / Math.max(1, colCount);
    const longestColPx = Math.max(...colLabels.map(l => l.length), 1) * charWidth;
    // Rotate column labels only when they don't fit side by side
    const rotateCols = cellWidth < longestColPx + 6;
    const rotated = rotateCols ? fitRotatedLabels(colLabels, H, fontSize) : null;
    const colLabelHeight = rotated ? rotated.height : fontSize + 10;
    const heatmapOffsetY = pad + colLabelHeight;
    const heatmapHeight = Math.max(0, H - heatmapOffsetY - pad);
    const cellHeight = heatmapHeight / Math.max(1, rowCount);
    const rowStride = Math.max(1, Math.ceil((fontSize * 1.3) / Math.max(1, cellHeight)));
    const colStride = Math.max(1, Math.ceil((rotateCols ? fontSize * 1.4 : longestColPx + 6) / Math.max(1, cellWidth)));

    const cells = [];
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const value = heatmapData.data[rowIdx][colIdx];
        cells.push({
          rowIdx,
          colIdx,
          value,
          color: this.getColorForValue(value, heatmapData.minValue, heatmapData.maxValue)
        });
      }
    }

    // Legend buckets showing value ranges
    const legendSteps = 5;
    const legendBuckets: { start: number; end: number; color: string }[] = [];
    const valueRange = heatmapData.maxValue - heatmapData.minValue;

    if (valueRange === 0) {
      legendBuckets.push({
        start: heatmapData.minValue,
        end: heatmapData.maxValue,
        color: this.getColorForValue(heatmapData.minValue, heatmapData.minValue, heatmapData.maxValue)
      });
    } else {
      for (let i = 0; i < legendSteps; i++) {
        const start = heatmapData.minValue + (i / legendSteps) * valueRange;
        const end = heatmapData.minValue + ((i + 1) / legendSteps) * valueRange;
        const midpoint = (start + end) / 2;
        legendBuckets.push({
          start,
          end,
          color: this.getColorForValue(midpoint, heatmapData.minValue, heatmapData.maxValue)
        });
      }
    }

    return (
      <div class="heatmap-container" part="chart">
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
              {Array.from({ length: 6 }, (_, i) => {
                const color = this.getColorForValue(
                  heatmapData.minValue + (i / 5) * (heatmapData.maxValue - heatmapData.minValue),
                  heatmapData.minValue,
                  heatmapData.maxValue
                );
                return (
                  <linearGradient key={`heatmapGradient-${i}`} id={`heatmapGradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color={color} stop-opacity="1"/>
                    <stop offset="100%" stop-color={color} stop-opacity="0.85"/>
                  </linearGradient>
                );
              })}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {rowLabels.map((label, idx) => idx % rowStride === 0 && (
              <text
                key={`row-${idx}`}
                x={heatmapOffsetX - 6}
                y={heatmapOffsetY + (idx * cellHeight) + (cellHeight / 2)}
                font-size={fontSize}
                text-anchor="end"
                dominant-baseline="middle"
                fill={theme.labelColor}
                font-family={theme.fontFamily}
                font-weight="500"
                class="text-animated"
                style={{
                  animationDelay: `${ChartAnimations.getStaggerDelay(idx)}ms`,
                  animationFillMode: 'both'
                }}
              >
                {label}
              </text>
            ))}

            {(rotated ? rotated.labels : colLabels).map((label, idx) => {
              if (idx % colStride !== 0) return null;
              const xPos = heatmapOffsetX + (idx * cellWidth) + (cellWidth / 2);
              const yPos = heatmapOffsetY - 6;
              return rotateCols ? (
                <text
                  key={`col-${idx}`}
                  x={xPos}
                  y={yPos}
                  font-size={fontSize}
                  text-anchor="start"
                  transform={`rotate(-45, ${xPos}, ${yPos})`}
                  fill={theme.labelColor}
                  font-family={theme.fontFamily}
                  font-weight="500"
                  class="text-rotated-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(idx)}ms`,
                    animationFillMode: 'both',
                    transformOrigin: `${xPos}px ${yPos}px`
                  }}
                >
                  {label}
                </text>
              ) : (
                <text
                  key={`col-${idx}`}
                  x={xPos}
                  y={yPos}
                  font-size={fontSize}
                  text-anchor="middle"
                  fill={theme.labelColor}
                  font-family={theme.fontFamily}
                  font-weight="500"
                  class="text-animated"
                  style={{
                    animationDelay: `${ChartAnimations.getStaggerDelay(idx)}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {label}
                </text>
              );
            })}

            {cells.map((cell, idx) => {
              const normalizedValue = (cell.value - heatmapData.minValue) / (heatmapData.maxValue - heatmapData.minValue);
              const gradientIndex = Math.min(5, Math.max(0, Math.floor((normalizedValue || 0) * 5)));
              const valueText = this.config.showValues ? this.formatValue(cell.value) : '';
              const showValue = !!valueText && cellWidth >= valueText.length * charWidth + 4 && cellHeight >= fontSize + 2;

              return (
                <g
                  key={`cell-${idx}`}
                  onMouseMove={(e) => this.handleMouseMove(
                    e,
                    cell.rowIdx,
                    cell.colIdx,
                    cell.value,
                    heatmapData
                  )}
                  onMouseLeave={() => {
                    this.tooltip = { ...this.tooltip, visible: false };
                  }}
                  onClick={() => {}}
                >
                  <rect
                    x={heatmapOffsetX + (cell.colIdx * cellWidth)}
                    y={heatmapOffsetY + (cell.rowIdx * cellHeight)}
                    width={cellWidth}
                    height={cellHeight}
                    fill={`url(#heatmapGradient-${gradientIndex})`}
                    stroke={theme.border}
                    stroke-width="1"
                    class="cell-animated cell-glow"
                    style={{
                      cursor: 'pointer',
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(idx)}ms`,
                      animationFillMode: 'both'
                    }}
                    filter="url(#softShadow)"
                  />

                  {showValue && (
                    <text
                      x={heatmapOffsetX + (cell.colIdx * cellWidth) + (cellWidth / 2)}
                      y={heatmapOffsetY + (cell.rowIdx * cellHeight) + (cellHeight / 2)}
                      font-size={fontSize}
                      text-anchor="middle"
                      dominant-baseline="middle"
                      fill={this.getTextColor(cell.value, heatmapData.minValue, heatmapData.maxValue)}
                      font-weight="bold"
                      font-family={theme.fontFamily}
                      class="text-animated"
                      style={{
                        animationDelay: `${ChartAnimations.getStaggerDelay(idx) + 100}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {valueText}
                    </text>
                  )}
                </g>
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
        
        {/* Color legend */}
        {(this.config.showLegend !== false) && (
          <div class="chart-legend" part="legend">
            {legendBuckets.map((bucket, idx) => {
              const startLabel = this.formatValue(bucket.start);
              const endLabel = this.formatValue(bucket.end);
              const rangeLabel = bucket.start === bucket.end
                ? startLabel
                : `${startLabel} - ${endLabel}`;
              
              return (
                <div key={idx} class="legend-item">
                  <div 
                    class="color-indicator" 
                    style={{ 
                      backgroundColor: bucket.color
                    }}
                  ></div>
                  <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>{rangeLabel}</span>
                </div>
              );
            })}
          </div>
        )}
        
      </div>
    );
  }
} 