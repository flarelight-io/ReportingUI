export interface ChartDataRequest {
  reportId?: string;
  sourceId: string; // Using string for GUID
  sourceType: 'DataImport' | 'DataPreparation' | 'AnalysisResult';
  valueFields: ChartField[];
  groupByFields: ChartField[];
  labelFields: ChartField[];
  filters?: ChartFilter[];
  pagination?: Pagination;
  isViewer: boolean;
  widgetType?: string;
}

export interface ChartField {
  fieldName: string;
  aggregation?: "sum" | "avg" | "min" | "max" | "count" | "countDistinct" | "stdDev" | "stdDevPop";
}

export interface ChartFilter {
  fieldName: string;
  operation: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "is" | "isnot" | "in" | "notin" | "between" | "notbetween" | "isnull" | "isnotnull";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface Pagination {
  pageNumber: number;
  pageSize: number;
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