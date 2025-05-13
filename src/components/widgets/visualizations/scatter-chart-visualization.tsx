import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface ScatterDataPoint {
  x: string | number;
  y: number;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

@Component({
  tag: 'scatter-chart-visualization',
  styleUrl: 'scatter-chart-visualization.scss',
  shadow: true
})
export class ScatterChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.sourceId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field: fieldName,
        value: value
      });
    }
  }

  private processData(): ScatterDataPoint[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return [];
    }
    
    // For standard chart types
    if (this.config.groupByField && this.config.valueField) {
      const xField = this.config.groupByField;
      const yField = this.config.valueField;
      
      const processed = rawData.map(item => ({
        x: item[xField] === null ? 'Unknown' : item[xField],
        y: Number(item[yField] || 0)
      }));
      
      // Sort by x value (assuming it might be a date or a number)
      return this.sortDataPoints(processed);
    } 
    // For legacy X/Y format
    else if (rawData[0]?.X !== undefined && rawData[0]?.Y !== undefined) {
      const processed = rawData.map(item => ({
        x: item.X === null ? 'Unknown' : item.X,
        y: Number(item.Y || 0)
      }));
      return this.sortDataPoints(processed);
    }
    // For simple two-column data
    else if (rawData.length > 0 && Object.keys(rawData[0]).length === 2) {
      const keys = Object.keys(rawData[0]);
      const processed = rawData.map(item => ({
        x: item[keys[0]] === null ? 'Unknown' : item[keys[0]],
        y: Number(item[keys[1]] || 0)
      }));
      return this.sortDataPoints(processed);
    }
    
    return [];
  }

  private sortDataPoints(data: ScatterDataPoint[]): ScatterDataPoint[] {
    // Try to determine if x is a date
    const isDate = data.length > 0 && 
      (typeof data[0].x === 'string' && !isNaN(Date.parse(data[0].x as string)));
    
    if (isDate) {
      return [...data].sort((a, b) => {
        const dateA = typeof a.x === 'string' ? new Date(a.x) : new Date();
        const dateB = typeof b.x === 'string' ? new Date(b.x) : new Date();
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    // Try to determine if x is a number
    const isNumber = data.length > 0 && 
      (typeof data[0].x === 'number' || 
      (typeof data[0].x === 'string' && !isNaN(Number(data[0].x))));
    
    if (isNumber) {
      return [...data].sort((a, b) => {
        const numA = typeof a.x === 'number' ? a.x : Number(a.x);
        const numB = typeof b.x === 'number' ? b.x : Number(b.x);
        return numA - numB;
      });
    }
    
    // If x is a string, sort alphabetically
    return [...data].sort((a, b) => {
      return String(a.x).localeCompare(String(b.x));
    });
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
    
    const chartData = this.processData();
    
    if (chartData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Find the maximum value for scaling
    const maxValue = Math.max(...chartData.map(item => item.y)) * 1.1; // Add 10% padding
    
    // Calculate optimal aspect ratio for the chart
    const viewBoxWidth = 100;
    const viewBoxHeight = 60;
    
    // Generate points for the scatter plot
    const points = chartData.map((item, index) => {
      const x = 5 + index * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
      const y = viewBoxHeight - 5 - (item.y / maxValue) * (viewBoxHeight - 10);
      return { x, y, category: item.x, value: item.y };
    });
    
    // Calculate regression line if enabled and we have numeric x values
    let regressionLine = null;
    if (this.config.showRegressionLine) {
      // Convert original data points to numeric values for regression calculation
      const numericPoints = chartData
        .filter(item => {
          const numVal = typeof item.x === 'number' ? item.x : 
                        (typeof item.x === 'string' && !isNaN(Number(item.x))) ? Number(item.x) : null;
          return numVal !== null;
        })
        .map(item => ({
          x: typeof item.x === 'number' ? item.x : Number(item.x),
          y: item.y
        }));
      
      if (numericPoints.length >= 2) {
        const regression = this.calculateLinearRegression(numericPoints);
        
        if (regression) {
          // Calculate start and end points of the regression line
          // Map the regression line to SVG coordinates
          const firstIndex = 0;
          const lastIndex = chartData.length - 1;
          
          const firstX = 5 + firstIndex * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
          const lastX = 5 + lastIndex * ((viewBoxWidth - 10) / (chartData.length - 1 || 1));
          
          // Using the regression formula y = mx + b
          // We need to map both x and y values to SVG coordinates
          const mapYToSvg = (value) => viewBoxHeight - 5 - (value / maxValue) * (viewBoxHeight - 10);
          
          // Calculate y values at the first and last points
          const firstPointOrigX = typeof chartData[firstIndex].x === 'number' ? 
                                chartData[firstIndex].x : Number(chartData[firstIndex].x);
          const lastPointOrigX = typeof chartData[lastIndex].x === 'number' ? 
                               chartData[lastIndex].x : Number(chartData[lastIndex].x);
          
          const firstY = regression.slope * firstPointOrigX + regression.intercept;
          const lastY = regression.slope * lastPointOrigX + regression.intercept;
          
          // Map to SVG coordinates
          const startX = firstX;
          const startY = mapYToSvg(firstY);
          const endX = lastX;
          const endY = mapYToSvg(lastY);
          
          regressionLine = {
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            r2: regression.r2
          };
        }
      }
    }
    
    // Define colors
    const colors = this.getColors();
    
    return (
      <div class="scatter-chart-container">
        <div class="visualization-container">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {this.config.showGrid && (
              <>
                {/* Draw grid lines, adjusted for viewbox width */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = viewBoxHeight - 5 - ratio * (viewBoxHeight - 10);
                  return (
                    <line 
                      key={`h-${i}`}
                      x1="5" 
                      y1={y} 
                      x2={viewBoxWidth - 5} 
                      y2={y} 
                      stroke="#ccc" 
                      stroke-width="0.5"
                      stroke-dasharray={i > 0 ? "1,1" : ""}
                    />
                  );
                })}
                
                {/* Vertical grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const x = 5 + ratio * (viewBoxWidth - 10);
                  return (
                    <line 
                      key={`v-${i}`}
                      x1={x} 
                      y1="5" 
                      x2={x} 
                      y2={viewBoxHeight - 5} 
                      stroke="#ccc" 
                      stroke-width="0.5"
                      stroke-dasharray={i > 0 ? "1,1" : ""}
                    />
                  );
                })}
              </>
            )}
            
            {/* Draw regression line if enabled */}
            {this.config.showRegressionLine && regressionLine && (
              <line
                x1={regressionLine.x1}
                y1={regressionLine.y1}
                x2={regressionLine.x2}
                y2={regressionLine.y2}
                stroke="#ff6b6b"
                stroke-width="1"
                stroke-dasharray="1,0"
              />
            )}
            
            {/* Draw points */}
            {points.map((point, i) => (
              <g 
                key={i} 
                transform={`translate(${point.x}, ${point.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => this.handleFilterClick(this.config.groupByField, point.category)}
              >
                <circle 
                  cx="0" 
                  cy="0" 
                  r="1.5" 
                  fill={colors[i % colors.length]} 
                  opacity="0.8"
                />
              </g>
            ))}
            
            {/* X and Y axis */}
            <line 
              x1="5" 
              y1={viewBoxHeight - 5} 
              x2={viewBoxWidth - 5} 
              y2={viewBoxHeight - 5} 
              stroke="#333" 
              stroke-width="1" 
            />
            <line 
              x1="5" 
              y1="5" 
              x2="5" 
              y2={viewBoxHeight - 5} 
              stroke="#333" 
              stroke-width="1" 
            />
            
            {/* Labels (only show if not too many points) */}
            {chartData.length <= 8 && (
              <>
                {points.map((point, i) => {
                  // Only show labels for every other point if there are many
                  if (chartData.length > 5 && i % 2 !== 0) {
                    return null;
                  }
                  
                  const displayText = String(point.category);
                  const truncatedText = displayText.length > 10 
                    ? displayText.substring(0, 10) + '...' 
                    : displayText;
                  
                  return (
                    <text 
                      key={i} 
                      x={point.x} 
                      y={viewBoxHeight - 2} 
                      font-size="2.5" 
                      text-anchor="middle" 
                      fill="#666"
                    >
                      {truncatedText}
                    </text>
                  );
                })}
                
                {this.config.showLabels && points.map((point, i) => {
                  // Only show value labels for every other point if there are many
                  if (chartData.length > 5 && i % 2 !== 0) {
                    return null;
                  }
                  
                  return (
                    <text 
                      key={`value-${i}`} 
                      x={point.x} 
                      y={point.y - 3} 
                      font-size="2.5" 
                      text-anchor="middle" 
                      fill="#444"
                    >
                      {point.value}
                    </text>
                  );
                })}
              </>
            )}
            
            {/* Y-axis value labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = viewBoxHeight - 5 - ratio * (viewBoxHeight - 10);
              const value = Math.round(ratio * maxValue);
              
              return (
                <text 
                  key={`y-label-${i}`} 
                  x="3" 
                  y={y} 
                  font-size="2.5" 
                  text-anchor="end" 
                  dominant-baseline="middle" 
                  fill="#666"
                >
                  {value}
                </text>
              );
            })}
          </svg>
        </div>
        
        {this.config.showLegend && (
          <div class="chart-legend">
            {chartData.length <= 10 ? (
              // If we have a reasonable number of points, show them each in the legend
              chartData.map((item, i) => (
                <div class="legend-item" key={i}>
                  <div 
                    class="color-indicator" 
                    style={{ backgroundColor: colors[i % colors.length] }}
                  ></div>
                  <span class="legend-text">
                    {String(item.x).length > 10 
                      ? String(item.x).substring(0, 10) + '...' 
                      : String(item.x)}: {item.y}
                  </span>
                </div>
              ))
            ) : (
              // If we have too many points, just show a summary
              <div class="legend-item">
                <div class="color-indicator" style={{ backgroundColor: colors[0] }}></div>
                <span class="legend-text">{chartData.length} data points</span>
              </div>
            )}
            
            {/* Add regression line to legend if it exists */}
            {this.config.showRegressionLine && regressionLine && (
              <div class="legend-item">
                <div class="color-indicator regression-indicator" style={{ backgroundColor: '#ff6b6b' }}></div>
                <span class="legend-text">
                  Regression Line (R² = {regressionLine.r2.toFixed(2)})
                </span>
              </div>
            )}
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
  
  private getColors(): string[] {
    return [
      '#4299e1', '#48bb78', '#f6ad55', '#f56565', 
      '#9f7aea', '#38b2ac', '#ed8936', '#667eea',
      '#fc8181', '#68d391', '#cbd5e0', '#feb2b2',
      '#90cdf4', '#c6f6d5', '#fbd38d', '#e9d8fd'
    ];
  }
} 