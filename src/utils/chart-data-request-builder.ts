import { ChartDataRequest, ChartField, ChartFilter, DataSource, Filter, Pagination } from '../api/types/common';

export interface ChartDataRequestBuilderOptions {
  reportId: string;
  sourceId: string;
  sourceType: 'DataImport' | 'DataPreparation' | 'AnalysisResult' | 'Sources';
  widgetId?: string;
  widgetType?: string;
  isViewer?: boolean;
  valueFields?: ChartField[];
  groupByFields?: ChartField[];
  labelFields?: ChartField[];
  filters?: ChartFilter[];
  sorts?: ChartSort[];
  pagination?: Pagination;
}

export interface ChartSort {
  fieldName: string;
  direction: 'Ascending' | 'Descending';
}

/**
 * Utility class for building ChartDataRequest objects consistently across the application.
 * This ensures all requests match the backend C# ChartDataRequest model.
 */
export class ChartDataRequestBuilder {
  /**
   * Builds a ChartDataRequest for a standard data widget
   */
  static buildForDataWidget(
    reportId: string,
    source: DataSource,
    widgetId: string,
    widgetType: string,
    config: {
      sourceId?: string;
      analysisId?: string;
      valueField?: string;
      valueFields?: string[];
      fields?: string[];
      groupByField?: string;
      labelField?: string;
      aggregation?: string;
      columns?: Array<{ field: string }>;
      xField?: string;
      yField?: string;
      previousValueField?: string;
    },
    activeFilters: Filter[],
    isViewer: boolean = false
  ): ChartDataRequest {
    const sourceId = config.analysisId || config.sourceId || source.id;
    const sourceFilters = widgetType === 'filter' ? [] : activeFilters.filter(f => f.sourceId === sourceId);
    
    const valueFields: ChartField[] = [];
    let groupByFields: ChartField[] = [];
    const labelFields: ChartField[] = [];
    
    const aggregation: "sum" | "avg" | "min" | "max" | "count" | "countDistinct" | "stdDev" | "stdDevPop" | undefined = 
      (config.aggregation === 'none' || !config.aggregation) 
        ? undefined 
        : config.aggregation as "sum" | "avg" | "min" | "max" | "count" | "countDistinct" | "stdDev" | "stdDevPop";
    
    // Handle different visualization types
    if (widgetType === 'stacked-bar' || widgetType === 'stacked-hbar' ||
        widgetType === 'clustered-bar' || widgetType === 'clustered-hbar') {
      // Multi-series charts
      if (config.valueFields && config.valueFields.length > 0) {
        valueFields.push(...config.valueFields.map(field => ({
          fieldName: field,
          aggregation
        })));
      } else if (config.valueField) {
        // Fallback to single valueField if valueFields array is not provided
        valueFields.push({
          fieldName: config.valueField,
          aggregation
        });
      }
      else if (config.fields && config.fields.length > 0) {
        valueFields.push(...config.fields.map(field => ({
          fieldName: field,
          aggregation
        })));
      }
    } else if (widgetType === 'table') {
      // Table visualization
      if (config.columns && config.columns.length > 0) {
        valueFields.push(...config.columns.map(column => ({
          fieldName: column.field,
          aggregation
        })));
      } else if (config.valueFields && config.valueFields.length > 0) {
        valueFields.push(...config.valueFields.map(field => ({
          fieldName: field,
          aggregation
        })));
      } else if (config.fields && config.fields.length > 0) {
        // Fallback to fields if columns not configured
        valueFields.push(...config.fields.map(field => ({
          fieldName: field,
          aggregation
        })));
      }
    } else if (widgetType === 'heatmap') {
      // Heatmap visualization
      if (config.valueField) {
        valueFields.push({
          fieldName: config.valueField,
          aggregation
        });
      }
      if (config.xField && config.yField) {
        labelFields.push(
          { fieldName: config.xField },
          { fieldName: config.yField }
        );
      }
    } else if (widgetType === 'filter') {
      // Filter visualization - value fields become group by fields
      if (config.valueField) {
        valueFields.push({
          fieldName: config.valueField,
          aggregation
        });
      }
      // For filter visualization, groupByFields should match valueFields (set below after valueFields are determined)
    } else if (widgetType === 'kpi') {
      // KPI visualization
      if (config.valueField) {
        valueFields.push({
          fieldName: config.valueField,
          aggregation
        });
      }
      if (config.previousValueField) {
        valueFields.push({
          fieldName: config.previousValueField,
          aggregation
        });
      }
    } else {
      // Standard charts - single value field
      if (config.valueField) {
        valueFields.push({
          fieldName: config.valueField,
          aggregation
        });
      }
    }
    
    // Group by field (unless it's a filter visualization)
    if (widgetType === 'filter') {
      // For filter visualization, groupByFields should match valueFields
      groupByFields = valueFields.map(vf => ({ fieldName: vf.fieldName }));
    } else if (config.groupByField) {
      groupByFields.push({ fieldName: config.groupByField });
    }
    
    // Label field
    if (config.labelField) {
      labelFields.push({ fieldName: config.labelField });
    }
    
    // Convert filters
    // For filter visualization, always use empty filters array
    const filters: ChartFilter[] = widgetType === 'filter' 
      ? [] 
      : sourceFilters.map(filter => ({
          fieldName: filter.field,
          operation: 'eq' as const,
          value: filter.value
        }));
    
    return {
      reportId,
      sourceId,
      sourceType: source.type as 'DataImport' | 'DataPreparation' | 'AnalysisResult' | 'Sources',
      valueFields,
      groupByFields,
      labelFields,
      filters: filters.length > 0 ? filters : undefined,
      isViewer,
      widgetType,
      widgetId
    };
  }
  
  /**
   * Builds a ChartDataRequest for an analysis widget (descriptive, correlation, hypothesis tests, etc.)
   */
  static buildForAnalysisWidget(
    reportId: string | undefined,
    analysisId: string,
    widgetId: string,
    widgetType: string,
    isViewer: boolean = false,
    sorts?: ChartSort[]
  ): ChartDataRequest {
    // Use default GUID if reportId is missing
    const defaultReportId = '00000000-0000-0000-0000-000000000000';
    
    return {
      reportId: reportId || defaultReportId,
      sourceId: analysisId,
      sourceType: 'AnalysisResult',
      valueFields: [],
      groupByFields: [],
      labelFields: [],
      filters: undefined,
      sorts,
      isViewer,
      widgetType,
      widgetId
    };
  }
  
  /**
   * Builds a ChartDataRequest from a generic options object
   */
  static build(options: ChartDataRequestBuilderOptions): ChartDataRequest {
    return {
      reportId: options.reportId,
      sourceId: options.sourceId,
      sourceType: options.sourceType,
      valueFields: options.valueFields || [],
      groupByFields: options.groupByFields || [],
      labelFields: options.labelFields || [],
      filters: options.filters,
      sorts: options.sorts,
      pagination: options.pagination,
      isViewer: options.isViewer ?? false,
      widgetType: options.widgetType,
      widgetId: options.widgetId
    };
  }
}

