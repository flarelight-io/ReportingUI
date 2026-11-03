import { BUILT_IN_CONFIG_SCHEMAS } from './widget-config-schemas';

/**
 * The model behind the report builder's default configuration panel: turns the config schema of a widget type (a flat
 * JSON-schema object, `{ properties: { name: { type, enum, description, default, ... } } }`) into form fields. The
 * built-in schemas come from `schema.json` (see `scripts/generate-config-schemas.js`); apps can describe their own widget
 * types the same way through `WidgetTypeDefinition.configSchema`.
 */

export type FieldKind = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'source' | 'field' | 'fieldList' | 'aggregation' | 'json';

export interface FormField {
  key: string;
  label: string;
  kind: FieldKind;
  description?: string;
  options?: string[];
  default?: any;
  min?: number;
  max?: number;
  /** `main` fields are shown up front, `more` ones under "More options". */
  group: 'main' | 'more';
}

export interface ConfigFormLabels {
  title: string;
  source: string;
  none: string;
  apply: string;
  add: string;
  cancel: string;
  moreOptions: string;
  rawConfig: string;
  invalidJson: string;
  noSources: string;
  addTitle: string;
  configureTitle: string;
}

export const DEFAULT_CONFIG_FORM_LABELS: ConfigFormLabels = {
  title: 'Title',
  source: 'Data source',
  none: '(none)',
  apply: 'Apply',
  add: 'Add',
  cancel: 'Cancel',
  moreOptions: 'More options',
  rawConfig: 'Raw configuration (JSON)',
  invalidJson: 'This is not valid JSON.',
  noSources: 'No data sources available.',
  addTitle: 'Add {type}',
  configureTitle: 'Configure {type}'
};

/** Names offered as suggestions for `aggregation`; any other name is accepted too. */
export const AGGREGATION_SUGGESTIONS = ['none', 'sum', 'avg', 'min', 'max', 'count', 'countDistinct', 'median', 'stdDev', 'stdDevPop'];

const COMMON_KEYS = ['sourceId', 'visualizationType', 'hideTitle', 'colorTheme'];

const VALUE_AXIS = ['axisMin', 'axisMax', 'percentAxis'];
const CATEGORY_CHART = ['groupByField', 'valueField', 'aggregation'];

/** Which options matter for each visualization type (the rest go under "More options"). */
const VISUALIZATION_KEYS: Record<string, string[]> = {
  pie: [...CATEGORY_CHART, 'showLegend', 'showLabels'],
  donut: [...CATEGORY_CHART, 'showLegend', 'showLabels'],
  bar: [...CATEGORY_CHART, 'sortField', 'sortDirection', 'showLabels', 'showGrid', ...VALUE_AXIS],
  hbar: [...CATEGORY_CHART, 'sortField', 'sortDirection', 'showLabels', 'showGrid', ...VALUE_AXIS],
  lollipop: [...CATEGORY_CHART, 'sortField', 'sortDirection', 'showLabels', 'showGrid', ...VALUE_AXIS],
  'lollipop-h': [...CATEGORY_CHART, 'sortField', 'sortDirection', 'showLabels', 'showGrid', ...VALUE_AXIS],
  line: [...CATEGORY_CHART, 'showGrid', 'showLegend', 'showXAxisLabels', ...VALUE_AXIS],
  'stacked-bar': [...CATEGORY_CHART, 'fields', 'showLegend', 'showLabels', 'showGrid', ...VALUE_AXIS],
  'stacked-hbar': [...CATEGORY_CHART, 'fields', 'showLegend', 'showLabels', 'showGrid', ...VALUE_AXIS],
  'clustered-bar': [...CATEGORY_CHART, 'fields', 'showLegend', 'showLabels', 'showGrid', ...VALUE_AXIS],
  'clustered-hbar': [...CATEGORY_CHART, 'fields', 'showLegend', 'showLabels', 'showGrid', ...VALUE_AXIS],
  scatter: ['fields', 'groupByField', 'valueField', 'labelField', 'showRegressionLine', 'showLegend', 'showGrid'],
  bubble: ['fields', 'groupByField', 'valueField', 'labelField', 'showLegend', 'showGrid'],
  kpi: ['valueField', 'aggregation', 'kpiFormatType', 'kpiPrefix', 'kpiSuffix'],
  table: ['fields', 'columns', 'sortField', 'sortDirection', 'aggregation'],
  heatmap: [...CATEGORY_CHART, 'showLegend'],
  histogram: ['valueField', 'aggregation', 'showGrid', ...VALUE_AXIS],
  'box-whisker': [...CATEGORY_CHART, 'showLegend', 'showGrid'],
  sunburst: ['idField', 'parentIdField', 'valueField', 'labelField', 'equalSegments', 'showLegend'],
  filter: ['valueField', 'multiSelect', 'placeholder']
};

/** `groupByField` becomes "Group by field". */
export function humanize(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The config schema of a widget type: the app's (from the catalog) wins over the built-in one. */
export function configSchemaFor(type: string, catalog?: { type: string; configSchema?: Record<string, any> }[]): Record<string, any> | undefined {
  const entry = (catalog || []).find(d => d.type === type);
  return (entry && entry.configSchema) || BUILT_IN_CONFIG_SCHEMAS[type];
}

function kindOf(key: string, prop: any): FieldKind {
  if (key === 'sourceId') return 'source';
  if (key === 'aggregation') return 'aggregation';
  if (/Field$/.test(key) && (!prop.type || prop.type === 'string')) return 'field';
  if (prop.type === 'array' && prop.items && prop.items.type === 'string') return 'fieldList';
  if (Array.isArray(prop.enum)) return 'select';
  switch (prop.type) {
    case 'boolean': return 'boolean';
    case 'number':
    case 'integer': return 'number';
    case 'string': return key === 'text' ? 'textarea' : 'text';
    default: return 'json';
  }
}

/**
 * Fields for a schema, in the order they should appear. For widgets with a `visualizationType` the options relevant to
 * the chosen type come first; everything else is still there under `more`, so nothing the schema describes is lost.
 */
export function buildFields(schema: Record<string, any> | undefined, config: Record<string, any> = {}): FormField[] {
  const properties: Record<string, any> = (schema && schema.properties) || {};
  const keys = Object.keys(properties).filter(key => key !== 'sourceName');
  const hasVisualization = 'visualizationType' in properties;
  const visualization = (config.visualizationType || (properties.visualizationType && properties.visualizationType.default)) as string | undefined;
  const relevant = hasVisualization ? [...COMMON_KEYS, ...((visualization && VISUALIZATION_KEYS[visualization]) || [])] : keys;
  const mainKeys = relevant.filter(key => key in properties);
  const moreKeys = keys.filter(key => !mainKeys.includes(key));

  const field = (key: string, group: 'main' | 'more'): FormField => {
    const prop = properties[key];
    return {
      key,
      label: prop.title || humanize(key),
      kind: kindOf(key, prop),
      description: prop.description,
      options: Array.isArray(prop.enum) ? prop.enum.map(String) : undefined,
      default: prop.default,
      min: prop.minimum,
      max: prop.maximum,
      group
    };
  };
  return [...mainKeys.map(key => field(key, 'main')), ...moreKeys.map(key => field(key, 'more'))];
}

/**
 * Sets (or, for an empty value, removes) one key of a config. Numbers and JSON are parsed; a value that doesn't parse
 * returns `undefined` so the form can show the problem instead of storing it.
 */
export function setConfigValue(config: Record<string, any>, field: Pick<FormField, 'key' | 'kind'>, raw: any): Record<string, any> | undefined {
  const next = { ...config };
  const empty = raw === undefined || raw === null || raw === '';
  if (empty) {
    delete next[field.key];
    return next;
  }
  switch (field.kind) {
    case 'number': {
      const n = Number(raw);
      if (!isFinite(n)) return undefined;
      next[field.key] = n;
      break;
    }
    case 'boolean':
      next[field.key] = !!raw;
      break;
    case 'fieldList': {
      const names = String(raw).split(',').map(name => name.trim()).filter(Boolean);
      if (names.length) next[field.key] = names; else delete next[field.key];
      break;
    }
    case 'json':
    case 'aggregation': {
      // Aggregations are usually plain names; an object ({ type: 'percentile', p: 0.95 }) is written as JSON
      if (typeof raw === 'string' && /^\s*[{[]/.test(raw)) {
        try { next[field.key] = JSON.parse(raw); } catch { return undefined; }
      } else if (field.kind === 'json' && typeof raw === 'string') {
        try { next[field.key] = JSON.parse(raw); } catch { return undefined; }
      } else {
        next[field.key] = raw;
      }
      break;
    }
    default:
      next[field.key] = raw;
  }
  return next;
}

/** `fields` is stored as a list of names but edited as comma-separated text. */
export function fieldListToText(value: any): string {
  return Array.isArray(value) ? value.join(', ') : '';
}
