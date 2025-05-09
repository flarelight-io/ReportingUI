export interface ChartDataRequest {
  reportId: string;
  widgetId: string;
  sourceId: string;
  chartType: string;
  dimensions: string[];
  measures: string[];
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  options?: Record<string, any>;
}

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  type: string;
  fields: DataField[];
  metadata?: Record<string, any>;
}

export interface DataField {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  isCalculated?: boolean;
  format?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Filter {
  sourceId: string;
  field: string;
  value: any;
} 