import { DataSource } from '../api/types/common';

/**
 * Describes a widget type the user can add in the report builder: how big it starts, how small/large it may get and
 * what its initial config is. Apps pass a list of these as `widgetCatalog`; types not listed fall back to the
 * built-in defaults below.
 */
export interface WidgetTypeDefinition {
  /** The widget type as used in the report configuration (`bar`, `kpi`, or an app-defined type). */
  type: string;
  /** Human-readable name, used as the default title of a new widget. */
  label?: string;
  /** For grouping in an app's own palette. */
  category?: string;
  icon?: string;
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  /**
   * Describes the widget's `config` for the builder's default configuration panel: a flat JSON-schema object
   * (`{ properties: { name: { type, enum, description, default } } }`). Built-in types already have one.
   */
  configSchema?: Record<string, any>;
  /** Initial `config` of a new widget of this type. */
  defaultConfig?: (context: { sources: DataSource[] }) => Record<string, any>;
}

const FALLBACK_SIZE = { w: 6, h: 4 };

/** Starting sizes (in grid columns x rows) by widget type, for types the app's catalog doesn't describe. */
const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  text: { w: 12, h: 1 },
  kpi: { w: 3, h: 2 },
  table: { w: 12, h: 5 },
  descriptiveAnalysis: { w: 6, h: 6 },
  sourceInfo: { w: 12, h: 4 }
};

export interface ResolvedWidgetType {
  type: string;
  label: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  defaultConfig?: WidgetTypeDefinition['defaultConfig'];
}

/** The catalog entry for a type merged over the built-in defaults. */
export function resolveWidgetType(type: string, catalog?: WidgetTypeDefinition[]): ResolvedWidgetType {
  const entry = (catalog || []).find(d => d.type === type);
  return {
    type,
    label: (entry && entry.label) || type,
    defaultSize: (entry && entry.defaultSize) || DEFAULT_SIZES[type] || FALLBACK_SIZE,
    minSize: entry && entry.minSize,
    maxSize: entry && entry.maxSize,
    defaultConfig: entry && entry.defaultConfig
  };
}
