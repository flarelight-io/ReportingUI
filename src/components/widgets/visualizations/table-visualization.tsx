import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ColorTheme } from '../../../utils/chart-theme';

@Component({
  tag: 'table-visualization',
  styleUrl: 'table-visualization.scss',
  shadow: true
})
export class TableVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Get column headers from config or from data
    let columns = ('columns' in this.config ? this.config.columns : undefined) || [];
    if (columns.length === 0 && rawData.length > 0) {
      columns = Object.keys(rawData[0]).map(field => ({ field, header: field }));
    }
    
    return (
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column.field}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(column => (
                  <td key={`${rowIndex}-${column.field}`}>
                    {row[column.field] !== null && row[column.field] !== undefined 
                      ? String(row[column.field]) 
                      : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
} 