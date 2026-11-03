export interface ChartDataRequest {
  reportId: string; // Required, matches backend Guid
  sourceId: string; // Using string for GUID
  sourceType: 'DataImport' | 'DataPreparation' | 'AnalysisResult' | 'Sources';
  valueFields: ChartField[];
  groupByFields: ChartField[];
  labelFields: ChartField[];
  filters?: ChartFilter[];
  sorts?: ChartSort[];
  pagination?: Pagination;
  isViewer: boolean;
  widgetType?: string;
  widgetId?: string; // Optional, matches backend
}

export interface ChartField {
  fieldName: string;
  aggregation?: "sum" | "avg" | "min" | "max" | "count" | "countDistinct" | "stdDev" | "stdDevPop";
}

export interface ChartSort {
  fieldName: string;
  direction: 'Ascending' | 'Descending';
}

/** Operations the library knows by name. Any other string is allowed and passed to the backend as-is. */
export type KnownFilterOperation =
  "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "is" | "isnot" | "in" | "notin" | "between" | "notbetween" | "isnull" | "isnotnull";

export interface ChartFilter {
  fieldName: string;
  /** Free-form: the known operations autocomplete, but any string your backend understands is accepted. */
  operation: KnownFilterOperation | (string & {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  /** Extra properties from the app's filter are forwarded unchanged. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

/**
 * A filter applied to a source. The shape is open so apps can define their own filters: the library only needs
 * `sourceId` and `field`; the operation, value and any extra properties are passed to `fetchChartData` unchanged.
 *
 * ```ts
 * { sourceId: 'sales', field: 'region', value: 'EMEA' }                                   // equals (default)
 * { sourceId: 'sales', field: 'date', operation: 'between', value: { from: '2025-01-01', to: '2025-03-31' } }
 * { sourceId: 'sales', field: 'status', operation: 'in', value: ['open', 'won'] }
 * { sourceId: 'sales', field: 'owner', operation: 'isnull' }                               // no value needed
 * { sourceId: 'sales', field: 'date', id: 'from', operation: 'gte', value: '2025-01-01' }  // id: several filters per field
 * ```
 */
export interface Filter {
  sourceId: string;
  field: string;
  /** Comparison to apply. Free-form; defaults to 'eq'. */
  operation?: KnownFilterOperation | (string & {});
  /** Any JSON value: a scalar, an array, a `{ from, to }` range, ... Optional for operations that take none. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  /** Tells apart several filters on the same field (for example a date range as `gte` + `lte`). */
  id?: string;
  /** Any extra properties are kept and forwarded to the backend. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
} 