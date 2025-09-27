import { DataWidgetConfig } from '../data-widget';
import { ColorTheme } from '../../../utils/chart-theme';

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
  colorTheme?: ColorTheme;
} 