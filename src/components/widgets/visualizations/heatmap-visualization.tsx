import { Component, Prop, h, State, Event, EventEmitter, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { HeatmapConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';

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
  @State() containerSize: { width: number; height: number } = { width: 800, height: 600 };
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;
  

  componentWillLoad() {
    // Listen for theme changes
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }

  componentDidLoad() {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.updateContainerSize();
      // Listen for resize events
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          this.updateContainerSize();
        });
        const container = this.el.shadowRoot?.querySelector('.visualization-container');
        if (container) {
          resizeObserver.observe(container);
        }
      }
    });
  }

  private updateContainerSize() {
    const container = this.el.shadowRoot?.querySelector('.visualization-container') as HTMLElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const newSize = {
        width: Math.max(rect.width || 800, 800),
        height: Math.max(rect.height || 600, 600)
      };
      // Only update if size changed significantly to avoid unnecessary re-renders
      if (Math.abs(newSize.width - this.containerSize.width) > 10 || 
          Math.abs(newSize.height - this.containerSize.height) > 10) {
        this.containerSize = newSize;
      }
    }
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
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
  
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
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
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top
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
    
    // Extract config properties for use in render
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    const heatmapData = this.processData();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
    if (heatmapData.rowLabels.length === 0 || heatmapData.colLabels.length === 0) {
      return <div class="empty-data">No data available for heatmap</div>;
    }
    
    // Calculate dimensions based on number of rows and columns
    const rowCount = heatmapData.rowLabels.length;
    const colCount = heatmapData.colLabels.length;
    
    // Fixed padding for labels - consistent sizing
    const rowLabelPadding = 120; // Space for row labels (left side)
    const colLabelPadding = 80; // Space for rotated column labels (top)
    
    // Calculate available space for the heatmap grid (excluding labels)
    // Use most of the container space, leaving minimal padding
    const availableWidth = this.containerSize.width - rowLabelPadding - 20; // 20 for minimal side padding
    const availableHeight = this.containerSize.height - colLabelPadding - 20; // 20 for minimal top/bottom padding
    
    // Calculate optimal cell size to use available space more aggressively
    const cellWidth = Math.max(50, Math.floor(availableWidth / colCount));
    const cellHeight = Math.max(50, Math.floor(availableHeight / rowCount));
    
    // Use consistent cell size (square cells) - prefer larger size to fill space
    const cellSize = Math.max(cellWidth, cellHeight);
    
    // Calculate heatmap grid dimensions
    const heatmapWidth = cellSize * colCount;
    const heatmapHeight = cellSize * rowCount;
    
    // Calculate total content dimensions (heatmap + labels)
    const contentWidth = rowLabelPadding + heatmapWidth;
    const contentHeight = colLabelPadding + heatmapHeight;
    
    // Add small equal padding on all sides to center the content in viewBox
    const padding = 20;
    const finalViewBoxWidth = contentWidth + (padding * 2);
    const finalViewBoxHeight = contentHeight + (padding * 2);
    
    // Calculate offset to center the content in the viewBox
    const contentOffsetX = padding;
    const contentOffsetY = padding;
    
    // Calculate offset to position labels and heatmap (centered)
    const heatmapOffsetX = contentOffsetX + rowLabelPadding;
    const heatmapOffsetY = contentOffsetY + colLabelPadding;
    
    // We'll create a list of all cells for rendering
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
    
    // For the legend, we'll create gradient steps
    const legendSteps = 5;
    const legendStepValues = [];
    for (let i = 0; i <= legendSteps; i++) {
      const value = heatmapData.minValue + (i / legendSteps) * (heatmapData.maxValue - heatmapData.minValue);
      legendStepValues.push(value);
    }
    
    return (
      <div class="heatmap-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${finalViewBoxWidth} ${finalViewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {/* Create gradient definitions for each color in the heatmap scale */}
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
            {/* Row labels (y-axis) */}
            {heatmapData.rowLabels.map((label, idx) => {
              const truncatedLabel = this.truncateText(label, 15);
              // Scale font size with cell size - base 14px, scale up with larger cells
              const labelFontSize = Math.max(14, Math.min(18, cellSize * 0.28));
              return (
                <text
                  key={`row-${idx}`}
                  x={heatmapOffsetX - 10}
                  y={heatmapOffsetY + (idx * cellSize) + (cellSize / 2)}
                  font-size={labelFontSize}
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
                  {truncatedLabel}
                </text>
              );
            })}
            
            {/* Column labels (x-axis) - rotated for readability */}
            {heatmapData.colLabels.map((label, idx) => {
              const truncatedLabel = this.truncateText(label, 12);
              const xPos = heatmapOffsetX + (idx * cellSize) + (cellSize / 2);
              const yPos = heatmapOffsetY - 20;
              // Scale font size with cell size - base 14px, scale up with larger cells
              const labelFontSize = Math.max(14, Math.min(18, cellSize * 0.28));
              return (
                <text
                  key={`col-${idx}`}
                  x={xPos}
                  y={yPos}
                  font-size={labelFontSize}
                  text-anchor="start"
                  dominant-baseline="middle"
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
                  {truncatedLabel}
                </text>
              );
            })}
            
            {/* Heatmap cells */}
            {cells.map((cell, idx) => {
              // Calculate gradient index based on color intensity
              const normalizedValue = (cell.value - heatmapData.minValue) / (heatmapData.maxValue - heatmapData.minValue);
              const gradientIndex = Math.min(5, Math.floor(normalizedValue * 5));
              
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
                    x={heatmapOffsetX + (cell.colIdx * cellSize)}
                    y={heatmapOffsetY + (cell.rowIdx * cellSize)}
                    width={cellSize}
                    height={cellSize}
                    fill={`url(#heatmapGradient-${gradientIndex})`}
                    stroke={theme.border}
                    stroke-width="0.5"
                    class="cell-animated cell-glow"
                    style={{ 
                      cursor: 'pointer',
                      transition: ChartAnimations.getHoverTransition(),
                      animationDelay: `${ChartAnimations.getStaggerDelay(idx)}ms`,
                      animationFillMode: 'both'
                    }}
                    filter="url(#softShadow)"
                  />
                
                  {/* Show values in cells if needed and if there's enough space */}
                  {this.config.showValues && (
                    <text
                      x={heatmapOffsetX + (cell.colIdx * cellSize) + (cellSize / 2)}
                      y={heatmapOffsetY + (cell.rowIdx * cellSize) + (cellSize / 2)}
                      font-size={Math.max(13, Math.min(16, cellSize * 0.26))}
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
                      {this.formatValue(cell.value)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Tooltip with modern styling */}
          {this.tooltip.visible && (
            <div 
              class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
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
        
        {/* Color legend */}
        {(this.config.showLegend !== false) && (
          <div class="chart-legend">
            {legendStepValues.map((value, idx) => (
              <div key={idx} class="legend-item">
                <div 
                  class="color-indicator" 
                  style={{ 
                    backgroundColor: this.getColorForValue(
                      value, 
                      heatmapData.minValue, 
                      heatmapData.maxValue
                    ) 
                  }}
                ></div>
                <span class="legend-text">{this.formatValue(value)}</span>
              </div>
            ))}
          </div>
        )}
        
        <div class="chart-info-text">
          {groupByField && valueField && (
            <span>
              Group: {groupByField} • Value: {valueField} • 
              Agg: {'aggregation' in this.config ? this.config.aggregation || 'none' : 'none'}
            </span>
          )}
        </div>
      </div>
    );
  }
} 