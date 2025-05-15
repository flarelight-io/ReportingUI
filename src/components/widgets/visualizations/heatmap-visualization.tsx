import { Component, Prop, h, State, Event, EventEmitter } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface HeatmapMatrix {
  rowLabels: string[];
  colLabels: string[];
  data: number[][];
  minValue: number;
  maxValue: number;
}

@Component({
  tag: 'heatmap-visualization',
  styleUrl: 'heatmap-visualization.scss',
  shadow: true
})
export class HeatmapVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @State() tooltip = { visible: false, text: '', x: 0, y: 0 };
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;
  
  // Reference to the SVG element
  private svgRef?: SVGSVGElement;

  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.sourceId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field: fieldName,
        value: value
      });
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
    
    // Case 2: Data in "row, column, value" format
    // Each record has rowField, colField, valueField
    if (this.config.groupByField && this.config.valueField) {
      // This requires a second field to define columns
      if (!this.config.fields || this.config.fields.length < 1) {
        return { rowLabels: [], colLabels: [], data: [], minValue: 0, maxValue: 0 };
      }
      
      const rowField = this.config.groupByField;
      const colField = this.config.fields[0]; // Use the first field as column field
      const valueField = this.config.valueField;
      
      // Get unique row and column values
      const rowLabelsSet = new Set<string>();
      const colLabelsSet = new Set<string>();
      const cellMap = new Map<string, number>();
      
      let minValue = Number.MAX_VALUE;
      let maxValue = Number.MIN_VALUE;
      
      // Build the sets of unique values and cell map
      rawData.forEach(item => {
        const rowLabel = String(item[rowField] === null ? 'Unknown' : item[rowField]);
        const colLabel = String(item[colField] === null ? 'Unknown' : item[colField]);
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
    // Use a color gradient from blue to red via white
    // Colors for the gradient
    const colors = [
      '#313695', // Dark blue
      '#4575b4', // Blue
      '#74add1', // Light blue
      '#abd9e9', // Very light blue
      '#e0f3f8', // Pale blue
      '#ffffbf', // Pale yellow
      '#fee090', // Light orange
      '#fdae61', // Orange
      '#f46d43', // Dark orange
      '#d73027', // Red
      '#a50026'  // Dark red
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
  
  private formatValue(value: number): string {
    // Use toLocaleString to format the number with thousands separators
    return value.toLocaleString(undefined, { 
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2
    });
  }
  
  private handleMouseMove(e: MouseEvent, rowIdx: number, colIdx: number, value: number, heatmapData: HeatmapMatrix) {
    if (this.svgRef) {
      const svgRect = this.svgRef.getBoundingClientRect();
      
      this.tooltip = {
        visible: true,
        text: `${heatmapData.rowLabels[rowIdx]} × ${heatmapData.colLabels[colIdx]}: ${this.formatValue(value)}`,
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
    
    const heatmapData = this.processData();
    
    if (heatmapData.rowLabels.length === 0 || heatmapData.colLabels.length === 0) {
      return <div class="empty-data">No data available for heatmap</div>;
    }
    
    // Calculate dimensions based on number of rows and columns
    const rowCount = heatmapData.rowLabels.length;
    const colCount = heatmapData.colLabels.length;
    
    // Calculate cell size based on available space
    // We need to leave space for labels on both axes
    const maxTextLength = Math.max(
      ...heatmapData.rowLabels.map(label => label.length),
      ...heatmapData.colLabels.map(label => label.length)
    );
    
    // Base padding for row and column labels - reduce colLabelPadding to remove excess whitespace
    const rowLabelPadding = Math.min(maxTextLength * 5, 80);
    const colLabelPadding = 20; // Reduced from 40 to eliminate excess top space
    
    // Calculate cell size constraints
    const cellWidth = 30;
    const cellHeight = 30;
    
    // Calculate total dimensions
    const viewBoxWidth = rowLabelPadding + (cellWidth * colCount);
    const viewBoxHeight = colLabelPadding + (cellHeight * rowCount);
    
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
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            ref={(el) => this.svgRef = el as SVGSVGElement}
          >
            {/* Row labels (y-axis) */}
            {heatmapData.rowLabels.map((label, idx) => (
              <text
                key={`row-${idx}`}
                x={rowLabelPadding - 5}
                y={colLabelPadding + (idx * cellHeight) + (cellHeight / 2)}
                font-size="3"
                text-anchor="end"
                dominant-baseline="middle"
              >
                {label}
              </text>
            ))}
            
            {/* Column labels (x-axis) - rotated for readability */}
            {heatmapData.colLabels.map((label, idx) => (
              <text
                key={`col-${idx}`}
                x={rowLabelPadding + (idx * cellWidth) + (cellWidth / 2)}
                y={colLabelPadding - 5}
                font-size="3"
                text-anchor="end"
                dominant-baseline="middle"
                transform={`rotate(-45, ${rowLabelPadding + (idx * cellWidth) + (cellWidth / 2)}, ${colLabelPadding - 5})`}
              >
                {label}
              </text>
            ))}
            
            {/* Heatmap cells */}
            {cells.map((cell, idx) => (
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
                onClick={() => this.handleFilterClick(
                  this.config.groupByField, 
                  heatmapData.rowLabels[cell.rowIdx]
                )}
              >
                <rect
                  x={rowLabelPadding + (cell.colIdx * cellWidth)}
                  y={colLabelPadding + (cell.rowIdx * cellHeight)}
                  width={cellWidth}
                  height={cellHeight}
                  fill={cell.color}
                  stroke="#fff"
                  stroke-width="0.5"
                />
                
                {/* Show values in cells if needed and if there's enough space */}
                {this.config.showLabels && (
                  <text
                    x={rowLabelPadding + (cell.colIdx * cellWidth) + (cellWidth / 2)}
                    y={colLabelPadding + (cell.rowIdx * cellHeight) + (cellHeight / 2)}
                    font-size="2.5"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill={cell.value > (heatmapData.minValue + heatmapData.maxValue) / 2 ? "#fff" : "#000"}
                  >
                    {this.formatValue(cell.value)}
                  </text>
                )}
              </g>
            ))}
          </svg>
          
          {/* Tooltip */}
          {this.tooltip.visible && (
            <div 
              class="tooltip"
              style={{ 
                left: `${this.tooltip.x}px`, 
                top: `${this.tooltip.y}px`,
              }}
            >
              {this.tooltip.text}
            </div>
          )}
        </div>
        
        {/* Color legend */}
        {this.config.showLegend && (
          <div class="chart-legend">
            <div class="legend-gradient">
              {legendStepValues.map((value, idx) => (
                <div class="legend-step" key={idx}>
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
          </div>
        )}
        
        <div class="chart-metadata">
          {this.config.groupByField && this.config.valueField && (
            <div class="chart-info">
              Group: {this.config.groupByField} • Value: {this.config.valueField} • Agg: {this.config.aggregation}
            </div>
          )}
        </div>
      </div>
    );
  }
} 