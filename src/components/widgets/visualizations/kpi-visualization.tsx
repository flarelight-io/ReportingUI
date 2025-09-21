import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

@Component({
  tag: 'kpi-visualization',
  styleUrl: 'kpi-visualization.scss',
  shadow: true
})
export class KpiVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private calculateKpiValue(): { value: number; previousValue?: number; trend?: 'up' | 'down' | 'flat' } {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return { value: 0 };
    }
    
    // If valueField is specified, use that
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    
    if (valueField) {
      const valueFieldName = valueField;
      let value = 0;
      
      // For a KPI, we typically take the first/latest value
      if (rawData.length > 0) {
        value = Number(rawData[0][valueFieldName] || 0);
      }
      
      // If there are multiple values, we might be able to calculate a trend
      let previousValue;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      
      if (rawData.length > 1) {
        previousValue = Number(rawData[1][valueFieldName] || 0);
        if (value > previousValue) {
          trend = 'up';
        } else if (value < previousValue) {
          trend = 'down';
        }
      }
      
      return { value, previousValue, trend };
    } 
    // For legacy Value format
    else if (rawData[0]?.Value !== undefined) {
      const value = Number(rawData[0].Value || 0);
      let previousValue;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      
      if (rawData.length > 1) {
        previousValue = Number(rawData[1].Value || 0);
        if (value > previousValue) {
          trend = 'up';
        } else if (value < previousValue) {
          trend = 'down';
        }
      }
      
      return { value, previousValue, trend };
    }
    // If just a single number
    else if (rawData.length === 1 && Object.keys(rawData[0]).length === 1) {
      const key = Object.keys(rawData[0])[0];
      return { value: Number(rawData[0][key] || 0) };
    }
    // If array of numbers, take the first one
    else if (typeof rawData[0] === 'number') {
      return { value: rawData[0] };
    }
    
    return { value: 0 };
  }

  private formatValue(value: number): string {
    if (value === undefined || value === null) {
      return '0';
    }
    
    const formatType = ('formatType' in this.config ? this.config.formatType : undefined) || 'number';
    const prefix = ('prefix' in this.config ? this.config.prefix : undefined) || '';
    const suffix = ('suffix' in this.config ? this.config.suffix : undefined) || '';
    
    let formattedValue = '';
    
    switch (formatType) {
      case 'currency':
        formattedValue = value.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
        // Remove $ if a prefix is specified
        if (prefix) {
          formattedValue = formattedValue.replace('$', '');
        }
        break;
        
      case 'percentage':
        formattedValue = value.toLocaleString('en-US', { 
          style: 'percent',
          minimumFractionDigits: 0,
          maximumFractionDigits: 1
        });
        // Remove % if a suffix is specified
        if (suffix) {
          formattedValue = formattedValue.replace('%', '');
        }
        break;
        
      default: // number
        formattedValue = value.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  }

  private getTrendIcon(trend: 'up' | 'down' | 'flat'): string {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  }

  private getTrendClass(trend: 'up' | 'down' | 'flat'): string {
    switch (trend) {
      case 'up':
        return 'trend-up';
      case 'down':
        return 'trend-down';
      default:
        return 'trend-flat';
    }
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    const kpiData = this.calculateKpiValue();
    
    return (
      <div class="kpi-container">
        <div class="kpi-value-container">
          <div class="kpi-value">{this.formatValue(kpiData.value)}</div>
          
          {kpiData.previousValue !== undefined && (
            <div class={`kpi-trend ${this.getTrendClass(kpiData.trend)}`}>
              <span class="trend-icon">{this.getTrendIcon(kpiData.trend)}</span>
              <span class="trend-percentage">
                {Math.abs(Math.round((kpiData.value - kpiData.previousValue) / kpiData.previousValue * 100))}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
} 