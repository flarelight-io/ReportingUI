import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData, fieldLabel } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ColorTheme, ChartThemeUtils } from '../../../utils/chart-theme';
import { Filter } from '../../../api/types/common';

@Component({
  tag: 'filter-visualization',
  styleUrl: 'filter-visualization.scss',
  shadow: true
})
export class FilterVisualization {
  @Element() el: HTMLElement;

  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  @Prop() activeFilters: Filter[] = [];
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  @State() selectedValues: string[] = [];
  @State() uniqueValues: string[] = [];
  @State() themeVersion: number = 0;

  componentWillLoad() {
    // Re-render when the light/dark mode, color theme or CSS color variables change
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
    this.extractUniqueValues();
    this.updateSelectedValuesFromActiveFilters();
  }

  componentWillUpdate() {
    this.extractUniqueValues();
    this.updateSelectedValuesFromActiveFilters();
  }

  @Watch('activeFilters')
  activeFiltersChanged() {
    this.updateSelectedValuesFromActiveFilters();
  }

  private updateSelectedValuesFromActiveFilters() {
    const valueField = 'valueField' in this.config ? this.config.valueField : '';
    const sourceId = this.config.sourceId || '';
    
    if (!valueField || !sourceId) {
      this.selectedValues = [];
      return;
    }

    // Find filters for this specific source and field
    const relevantFilters = this.activeFilters.filter(filter => 
      filter.sourceId === sourceId && filter.field === valueField
    );

    if (relevantFilters.length > 0) {
      // Extract values from the filters
      const values: string[] = [];
      relevantFilters.forEach(filter => {
        if (Array.isArray(filter.value)) {
          values.push(...filter.value);
        } else if (filter.value !== null && filter.value !== undefined) {
          values.push(String(filter.value));
        }
      });
      this.selectedValues = [...new Set(values)]; // Remove duplicates
    } else {
      this.selectedValues = [];
    }
  }

  private extractUniqueValues() {
    const rawData = this.data.rawData || [];
    const valueField = 'valueField' in this.config ? this.config.valueField : '';
    
    if (!valueField || rawData.length === 0) {
      this.uniqueValues = [];
      return;
    }

    // Extract unique values from the specified field
    const values = new Set<string>();
    rawData.forEach(row => {
      const value = row[valueField];
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value));
      }
    });

    this.uniqueValues = Array.from(values).sort();
  }

  private handleButtonClick(value: string) {
    const multiSelect = 'multiSelect' in this.config ? this.config.multiSelect : false;
    const sourceId = this.config.sourceId || '';

    if (multiSelect) {
      // Toggle value in multi-select mode
      const index = this.selectedValues.indexOf(value);
      if (index > -1) {
        this.selectedValues = this.selectedValues.filter(v => v !== value);
      } else {
        this.selectedValues = [...this.selectedValues, value];
      }
    } else {
      // Single select mode - toggle if already selected, otherwise select
      if (this.selectedValues.includes(value)) {
        this.selectedValues = [];
      } else {
        this.selectedValues = [value];
      }
    }

    // Emit filter change event
    this.filterChange.emit({
      sourceId,
      field: 'valueField' in this.config ? this.config.valueField : '',
      value: this.selectedValues.length > 0 ? this.selectedValues : null
    });
  }

  private handleSelectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const multiSelect = 'multiSelect' in this.config ? this.config.multiSelect : false;
    const sourceId = this.config.sourceId || '';

    if (multiSelect) {
      // Multi-select mode - add the selected value to the list
      const selectedValue = target.value;
      if (selectedValue && !this.selectedValues.includes(selectedValue)) {
        this.selectedValues = [...this.selectedValues, selectedValue];
      }
      // Reset the select to show placeholder
      target.value = '';
    } else {
      // Single select mode
      this.selectedValues = target.value ? [target.value] : [];
    }

    // Emit filter change event
    this.filterChange.emit({
      sourceId,
      field: 'valueField' in this.config ? this.config.valueField : '',
      value: this.selectedValues.length > 0 ? this.selectedValues : null
    });
  }

  private removeSelectedValue(value: string) {
    this.selectedValues = this.selectedValues.filter(v => v !== value);
    
    // Emit filter change event
    this.filterChange.emit({
      sourceId: this.config.sourceId || '',
      field: 'valueField' in this.config ? this.config.valueField : '',
      value: this.selectedValues.length > 0 ? this.selectedValues : null
    });
  }

  private isValueSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  private getButtonColor(index: number): string {
    return ChartThemeUtils.getSeriesColor(index, this.colorTheme, this.el);
  }

  private renderButtons() {
    return (
      <div class="filter-buttons">
        {this.uniqueValues.map((value, index) => {
          const isSelected = this.isValueSelected(value);
          const buttonColor = this.getButtonColor(index);
          
          return (
            <button
              key={value}
              class={`filter-button ${isSelected ? 'selected' : ''}`}
              style={{
                '--button-color': buttonColor,
                '--button-hover-color': ChartThemeUtils.getHoverColor(buttonColor)
              }}
              onClick={() => this.handleButtonClick(value)}
            >
              {value}
            </button>
          );
        })}
      </div>
    );
  }

  private renderSelect() {
    const multiSelect = 'multiSelect' in this.config ? this.config.multiSelect : false;
    const placeholder = 'placeholder' in this.config ? this.config.placeholder : 'Select values...';

    if (multiSelect) {
      // For multi-select, show a single dropdown with selected values displayed
      const selectedText = this.selectedValues.length > 0 
        ? `${this.selectedValues.length} selected` 
        : placeholder;
      
      return (
        <div class="multi-select-container">
          <select
            class="filter-select multi-select"
            onChange={(e) => this.handleSelectChange(e)}
          >
            <option value="">{selectedText}</option>
            {this.uniqueValues.map(value => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>
          {this.selectedValues.length > 0 && (
            <div class="selected-values">
              {this.selectedValues.map(value => (
                <span key={value} class="selected-tag">
                  {value}
                  <button 
                    class="remove-tag" 
                    onClick={() => this.removeSelectedValue(value)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <select
          class="filter-select single-select"
          onChange={(e) => this.handleSelectChange(e)}
        >
          <option value="">{placeholder}</option>
          {this.uniqueValues.map(value => (
            <option
              key={value}
              value={value}
              selected={this.isValueSelected(value)}
            >
              {value}
            </option>
          ))}
        </select>
      );
    }
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    if (this.uniqueValues.length === 0) {
      return <div class="empty-data">No data available for filtering</div>;
    }

    const valueField = 'valueField' in this.config ? this.config.valueField : '';
    const multiSelect = 'multiSelect' in this.config ? this.config.multiSelect : false;
    const showButtons = this.uniqueValues.length < 7;

    return (
      <div class="filter-container">
        <div class="filter-header">
          <h4 class="filter-title">Filter by {fieldLabel(this.data, valueField)}</h4>
          {multiSelect && (
            <span class="filter-mode">Multi-select</span>
          )}
        </div>
        
        <div class="filter-content">
          {showButtons ? this.renderButtons() : this.renderSelect()}
        </div>
        
        {this.selectedValues.length > 0 && (
          <div class="filter-summary">
            <span class="selected-count">
              {this.selectedValues.length} selected
            </span>
            <button
              class="clear-button"
              onClick={() => {
                this.selectedValues = [];
                this.filterChange.emit({
                  sourceId: this.config.sourceId || '',
                  field: valueField,
                  value: null
                });
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    );
  }
}
