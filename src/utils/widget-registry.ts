import { DataSource, Filter } from '../api/types/common';
import { ColorTheme } from './chart-theme';

/** The widget definition as it appears in a report configuration. */
export interface RegistryWidget {
  id: string;
  type: string;
  title?: string;
  config?: Record<string, any>;
  [key: string]: any;
}

/** Everything a factory needs to create a widget element for the viewer (or the report builder). */
export interface WidgetCreateContext {
  widget: RegistryWidget;
  reportId?: string;
  isViewer: boolean;
  colorTheme: ColorTheme;
  dataSources: DataSource[];
  activeFilters: Filter[];
  /** Data the viewer already fetched for this widget, if any. */
  data: any | null;
  /** True while that data is still being fetched. */
  loading: boolean;
  /** The app's data function; widgets that fetch for themselves call it. */
  fetchChartData?: Function;
}

export type WidgetFactory = (context: WidgetCreateContext) => HTMLElement;

export interface WidgetTypeRegistration {
  /** Creates the element for a widget of this type and gives it its properties. */
  create: WidgetFactory;
  /**
   * True when the viewer should prefetch this widget's data (through `fetchChartData`, using the widget's
   * `sourceId`) before rendering. Defaults to false.
   */
  fetchesData?: boolean;
}

const registry = new Map<string, WidgetTypeRegistration>();

/**
 * Registers (or replaces) a widget type, so reports can use `{ type: 'my-type' }`. Built-in types are registered
 * the same way and can be replaced.
 *
 * ```ts
 * registerWidgetType('gauge', { create: ({ widget }) => { const el = document.createElement('my-gauge'); el.config = widget.config; return el; } });
 * ```
 */
export function registerWidgetType(type: string, registration: WidgetTypeRegistration | WidgetFactory): void {
  registry.set(type, typeof registration === 'function' ? { create: registration } : registration);
}

export function unregisterWidgetType(type: string): void {
  registry.delete(type);
}

export function getWidgetType(type: string): WidgetTypeRegistration | undefined {
  return registry.get(type);
}

export function getRegisteredWidgetTypes(): string[] {
  return [...registry.keys()];
}

// ---------------------------------------------------------------------------------------------------------
// Built-in types

/** Sends events to an element shortly after creation, once it has been attached (widgets listen for them). */
function dispatchWhenConnected(element: HTMLElement, events: Array<[string, any]>): void {
  setTimeout(() => {
    if (!element.isConnected) return;
    events.forEach(([name, detail]) => element.dispatchEvent(new CustomEvent(name, { detail, bubbles: false })));
  }, 100);
}

function setProps(element: HTMLElement, props: Record<string, any>): void {
  Object.keys(props).forEach(key => { (element as any)[key] = props[key]; });
}

/** The text widget: no data, just its config. */
const textWidget: WidgetFactory = ({ widget }) => {
  const element = document.createElement('text-widget') as unknown as HTMLElement;
  const config = widget.config || { text: '' };
  if (!config.text) config.text = '';
  setProps(element, { widgetId: widget.id, widgetTitle: widget.title || '', readOnly: true, isInEditor: false, config });
  dispatchWhenConnected(element, [['configUpdate', config]]);
  return element;
};

/**
 * Widgets that fetch their own analysis/source data (statistical tests, descriptive statistics, source info, ...).
 * They get the viewer's cached data through a stand-in fetch function when there is any, otherwise the real one.
 */
function analysisWidget(tag: string, options: { colorTheme?: boolean } = {}): WidgetFactory {
  return ctx => {
    const { widget } = ctx;
    const element = document.createElement(tag);
    const config = widget.config || {};
    setProps(element, {
      widgetId: widget.id,
      widgetTitle: widget.title || '',
      reportId: ctx.reportId || '',
      readOnly: true,
      isInEditor: false,
      isViewer: ctx.isViewer
    });
    if (options.colorTheme) (element as any).colorTheme = ctx.colorTheme;
    (element as any).config = config;

    if (ctx.data) {
      (element as any).data = ctx.data;
      (element as any).fetchChartData = () => Promise.resolve(ctx.data);
      const events: Array<[string, any]> = [['dataUpdate', ctx.data], ['configUpdate', config]];
      if (options.colorTheme) events.push(['colorThemeChange', { colorTheme: ctx.colorTheme }]);
      dispatchWhenConnected(element, events);
    } else if (ctx.fetchChartData) {
      (element as any).loading = ctx.loading;
      (element as any).fetchChartData = ctx.fetchChartData;
    }
    return element;
  };
}

/** The data widget, which renders a visualization chosen by the widget type or its `visualizationType`. */
const dataWidget: WidgetFactory = ctx => {
  const { widget } = ctx;
  const element = document.createElement('data-widget') as unknown as HTMLElement;
  element.setAttribute('widgetId', widget.id);
  setProps(element, {
    widgetId: widget.id,
    widgetTitle: widget.title || '',
    reportId: ctx.reportId || '',
    readOnly: true,
    isInEditor: false,
    isViewer: ctx.isViewer,
    colorTheme: ctx.colorTheme
  });

  // A generic 'data' widget names its visualization in the config; the other types are the visualization
  const visualizationType = widget.type === 'data' ? (widget.config?.visualizationType || 'table') : widget.type;
  const dataConfig = { ...(widget.config || {}), visualizationType };
  setProps(element, { config: dataConfig, availableSources: ctx.dataSources || [], activeFilters: ctx.activeFilters || [] });

  if (ctx.data) {
    (element as any).data = ctx.data;
    dispatchWhenConnected(element, [['dataUpdate', ctx.data], ['configUpdate', dataConfig]]);
    (element as any).loading = false;
    (element as any).fetchChartData = () => Promise.resolve(ctx.data);
  } else if (ctx.fetchChartData) {
    (element as any).loading = ctx.loading;
    (element as any).fetchChartData = ctx.fetchChartData;
    (element as any).config = dataConfig;
  }
  return element;
};

registerWidgetType('text', textWidget);

registerWidgetType('sourceInfo', analysisWidget('source-info-widget'));

const analysisTypes: Record<string, string> = {
  descriptiveAnalysis: 'descriptive-analysis-widget',
  oneSampleHypothesisTest: 'one-sample-hypothesis-test-widget',
  oneSampleWilcoxonSignedRank: 'one-sample-wilcoxon-signed-rank-widget',
  pairedTwoSampleWilcoxonSignedRank: 'paired-two-sample-wilcoxon-signed-rank-widget',
  independentTwoSampleHypothesisTest: 'independent-two-sample-hypothesis-test-widget',
  pairedTwoSampleHypothesisTest: 'paired-two-sample-hypothesis-test-widget',
  welchTwoSampleHypothesisTest: 'welch-two-sample-hypothesis-test-widget',
  OneWayANOVA: 'one-way-anova-widget',
  oneWayANOVA: 'one-way-anova-widget',
  WelchANOVA: 'welch-anova-widget',
  mannWhitneyUTest: 'mann-whitney-u-test-widget',
  kruskalWallisTest: 'kruskal-wallis-test-widget',
  shapiroWilkTest: 'shapiro-wilk-test-widget',
  kolmogorovSmirnovNormalityTest: 'kolmogorov-smirnov-normality-test-widget',
  andersonDarlingNormalityTest: 'anderson-darling-normality-test-widget'
};
Object.keys(analysisTypes).forEach(type => {
  registerWidgetType(type, { create: analysisWidget(analysisTypes[type]), fetchesData: true });
});

// Analysis widgets that also follow the report's color theme
registerWidgetType('correlationAnalysis', { create: analysisWidget('correlation-analysis-widget', { colorTheme: true }), fetchesData: true });
registerWidgetType('boxWhiskerNormalityPlot', { create: analysisWidget('box-whisker-normality-plot-widget', { colorTheme: true }) });

// Every visualization type is rendered by the data widget
[
  'data', 'table', 'kpi', 'bar', 'pie', 'donut', 'line', 'hbar', 'scatter', 'sunburst', 'heatmap', 'bubble', 'histogram',
  'stacked-bar', 'stacked-hbar', 'clustered-bar', 'clustered-hbar', 'lollipop', 'lollipop-h'
].forEach(type => registerWidgetType(type, { create: dataWidget, fetchesData: true }));
