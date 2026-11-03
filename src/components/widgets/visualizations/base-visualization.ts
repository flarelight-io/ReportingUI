import { DataWidgetConfig } from '../data-widget';
import { ColorTheme } from '../../../utils/chart-theme';

export interface VisualizationData {
  rawData: any[];
  /** Data field name -> display name from the source's fields (only entries that differ from the name). */
  fieldLabels?: Record<string, string>;
  processedData?: any;
  loading: boolean;
  error?: string;
}

export interface FilterChangeEventDetail {
  sourceId: string;
  field: string;
  value: any;
}

export interface BaseVisualizationProps {
  config: DataWidgetConfig;
  data: VisualizationData;
  colorTheme?: ColorTheme;
}

/** Display name for a data field when the source configures one, otherwise the field name itself. */
export function fieldLabel(data: VisualizationData | undefined, name: string): string {
  if (!name) return name;
  const labels = data && data.fieldLabels;
  if (!labels) return name;
  if (labels[name]) return labels[name];
  const lower = name.toLowerCase();
  const key = Object.keys(labels).find(k => k.toLowerCase() === lower);
  return key ? labels[key] : name;
}

/** Builds the field name -> display name map for a source's fields, skipping fields without a distinct display name. */
export function buildFieldLabels(fields: { name: string; displayName?: string }[] | undefined): Record<string, string> {
  const labels: Record<string, string> = {};
  (fields || []).forEach(f => {
    const display = f && typeof f.displayName === 'string' ? f.displayName.trim() : '';
    if (f && f.name && display && display !== f.name) labels[f.name] = display;
  });
  return labels;
}
