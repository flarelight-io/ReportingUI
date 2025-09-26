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

  private valueElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;

  private calculateKpiValue(): { value: number; previousValue?: number; trend?: 'up' | 'down' | 'flat' } {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0) {
      return { value: 0 };
    }
    
    // If valueField is specified, use that
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    const previousValueField = 'previousValueField' in this.config ? (this.config as any).previousValueField : undefined;
    
    if (valueField) {
      const valueFieldName = valueField;
      let value = 0;
      
      // Always take the first row for the main value
      if (rawData.length > 0) {
        value = Number(rawData[0][valueFieldName] || 0);
      }
      
      // Only calculate trend if previousValueField is explicitly specified
      let previousValue;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      
      if (previousValueField && rawData.length > 0) {
        previousValue = Number(rawData[0][previousValueField] || 0);
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
      
      // Only calculate trend if previousValueField is explicitly specified
      if (previousValueField && rawData.length > 0) {
        previousValue = Number(rawData[0][previousValueField] || 0);
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
    
    const prefix = ('prefix' in this.config ? this.config.prefix : undefined) || '';
    const suffix = ('suffix' in this.config ? this.config.suffix : undefined) || '';
    const format = ('format' in this.config ? (this.config as any).format : undefined) || '';
    
    let formattedValue = '';
    
    if (format) {
      // Use custom format pattern (e.g., "##.###,##")
      formattedValue = this.applyCustomFormat(value, format);
    } else {
      // Default formatting
      formattedValue = value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  }

  private applyCustomFormat(value: number, format: string): string {
    // Simple custom format implementation
    // Format patterns like "##.###,##" where:
    // # = optional digit
    // 0 = required digit
    // . = decimal separator
    // , = thousands separator
    
    let formattedValue = '';
    
    // For now, implement basic patterns
    if (format.includes('.')) {
      // Has decimal places
      const parts = format.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];
      
      // Count decimal places
      const decimalPlaces = decimalPart.length;
      
      // Format with specified decimal places
      formattedValue = value.toFixed(decimalPlaces);
      
      // Apply thousands separator if needed
      if (integerPart.includes(',')) {
        const [integer, fractional] = formattedValue.split('.');
        const formattedInteger = parseInt(integer).toLocaleString('en-US');
        formattedValue = formattedInteger + '.' + fractional;
      }
    } else {
      // No decimal places
      formattedValue = Math.round(value).toString();
      
      // Apply thousands separator if needed
      if (format.includes(',')) {
        formattedValue = parseInt(formattedValue).toLocaleString('en-US');
      }
    }
    
    return formattedValue;
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

  private adjustFontSize() {
    if (!this.valueElement) return;
    
    const container = this.valueElement.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Get the text content
    const text = this.valueElement.textContent || '';
    if (!text) return;
    
    // Create a temporary element to measure text width accurately
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.whiteSpace = 'nowrap';
    tempElement.style.fontWeight = '700';
    tempElement.style.fontFamily = getComputedStyle(this.valueElement).fontFamily;
    tempElement.style.lineHeight = '1.2';
    tempElement.textContent = text;
    document.body.appendChild(tempElement);
    
    // Calculate font size based on string length - longer strings get smaller fonts
    const textLength = text.length;
    let baseFontSize;
    
    if (textLength <= 5) {
      baseFontSize = Math.min(containerWidth / 4, containerHeight / 1.5, 4);
    } else if (textLength <= 10) {
      baseFontSize = Math.min(containerWidth / 6, containerHeight / 2, 3);
    } else if (textLength <= 15) {
      baseFontSize = Math.min(containerWidth / 8, containerHeight / 2.5, 2.5);
    } else if (textLength <= 20) {
      baseFontSize = Math.min(containerWidth / 10, containerHeight / 3, 2);
    } else {
      baseFontSize = Math.min(containerWidth / 12, containerHeight / 3.5, 1.5);
    }
    
    baseFontSize = Math.max(baseFontSize, 0.3); // Minimum font size
    
    // Test the calculated font size and reduce if needed
    let fontSize = baseFontSize;
    
    // Keep reducing font size until text fits
    while (fontSize >= 0.3) {
      tempElement.style.fontSize = `${fontSize}rem`;
      
      const textWidth = tempElement.scrollWidth;
      const textHeight = tempElement.scrollHeight;
      
      // Check if text fits with padding
      const fitsWidth = textWidth <= containerWidth * 0.95;
      const fitsHeight = textHeight <= containerHeight * 0.7;
      
      if (fitsWidth && fitsHeight) {
        break; // Text fits, we're done
      }
      
      // Reduce font size by 10% and try again
      fontSize *= 0.9;
    }
    
    // Clean up temporary element
    document.body.removeChild(tempElement);
    
    // Apply the calculated font size
    this.valueElement.style.fontSize = `${fontSize}rem`;
  }

  componentDidLoad() {
    // Adjust font size after component loads with a small delay
    setTimeout(() => this.adjustFontSize(), 10);
    
    // Set up ResizeObserver to handle dynamic resizing
    if (this.valueElement && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        setTimeout(() => this.adjustFontSize(), 10);
      });
      this.resizeObserver.observe(this.valueElement.parentElement);
    }
  }

  componentDidUpdate() {
    // Adjust font size when data changes with a small delay
    setTimeout(() => this.adjustFontSize(), 10);
  }

  disconnectedCallback() {
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
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
          <div class="kpi-value" ref={(el) => this.valueElement = el}>{this.formatValue(kpiData.value)}</div>
          
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