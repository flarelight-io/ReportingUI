import { DataWidgetConfig } from '../data-widget';

export interface VisualizationData {
  rawData: any[];
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
} 