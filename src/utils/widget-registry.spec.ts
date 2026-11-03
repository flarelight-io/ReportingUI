import {
  WidgetCreateContext, getRegisteredWidgetTypes, getWidgetType, registerWidgetType, unregisterWidgetType
} from './widget-registry';

const context = (overrides: Partial<WidgetCreateContext> = {}): WidgetCreateContext => ({
  widget: { id: 'w1', type: 'bar', title: 'Title', config: { sourceId: 's1' } },
  reportId: 'r1',
  isViewer: true,
  colorTheme: 'brand',
  dataSources: [],
  activeFilters: [],
  data: null,
  loading: false,
  fetchChartData: undefined,
  ...overrides
});

describe('built-in widget types', () => {
  it('registers every type the viewer used to handle', () => {
    const types = getRegisteredWidgetTypes();
    [
      'text', 'sourceInfo', 'data', 'table', 'kpi', 'bar', 'pie', 'donut', 'line', 'hbar', 'scatter', 'sunburst', 'heatmap',
      'bubble', 'histogram', 'stacked-bar', 'stacked-hbar', 'clustered-bar', 'clustered-hbar', 'lollipop', 'lollipop-h',
      'descriptiveAnalysis', 'correlationAnalysis', 'oneSampleHypothesisTest', 'oneSampleWilcoxonSignedRank',
      'pairedTwoSampleWilcoxonSignedRank', 'independentTwoSampleHypothesisTest', 'pairedTwoSampleHypothesisTest',
      'welchTwoSampleHypothesisTest', 'WelchANOVA', 'OneWayANOVA', 'oneWayANOVA', 'mannWhitneyUTest', 'kruskalWallisTest',
      'shapiroWilkTest', 'kolmogorovSmirnovNormalityTest', 'andersonDarlingNormalityTest', 'boxWhiskerNormalityPlot'
    ].forEach(type => expect(types).toContain(type));
  });

  it('prefetches data only for the types that fetched before', () => {
    ['bar', 'table', 'kpi', 'lollipop-h', 'correlationAnalysis', 'oneWayANOVA', 'shapiroWilkTest'].forEach(type =>
      expect(getWidgetType(type)!.fetchesData).toBe(true));
    ['text', 'sourceInfo', 'boxWhiskerNormalityPlot'].forEach(type =>
      expect(!!getWidgetType(type)!.fetchesData).toBe(false));
  });

  it('creates a data widget configured for its visualization', () => {
    const el: any = getWidgetType('bar')!.create(context());
    expect(el.tagName.toLowerCase()).toBe('data-widget');
    expect(el.widgetId).toBe('w1');
    expect(el.config.visualizationType).toBe('bar');
    expect(el.config.sourceId).toBe('s1');
    expect(el.readOnly).toBe(true);
    expect(el.isViewer).toBe(true);
  });

  it("uses the config's visualizationType for a generic data widget, defaulting to a table", () => {
    const generic: any = getWidgetType('data')!.create(context({ widget: { id: 'w', type: 'data', config: { visualizationType: 'pie' } } }));
    expect(generic.config.visualizationType).toBe('pie');
    const bare: any = getWidgetType('data')!.create(context({ widget: { id: 'w', type: 'data' } }));
    expect(bare.config.visualizationType).toBe('table');
  });

  it('hands over already-fetched data with a stand-in fetch function, or the real one while loading', async () => {
    const withData: any = getWidgetType('bar')!.create(context({ data: [{ a: 1 }] }));
    expect(withData.data).toEqual([{ a: 1 }]);
    await expect(withData.fetchChartData()).resolves.toEqual([{ a: 1 }]);
    expect(withData.loading).toBe(false);

    const real = () => Promise.resolve([]);
    const loading: any = getWidgetType('bar')!.create(context({ loading: true, fetchChartData: real }));
    expect(loading.fetchChartData).toBe(real);
    expect(loading.loading).toBe(true);
  });

  it('creates analysis widgets, passing the color theme only to those that use it', () => {
    const plain: any = getWidgetType('shapiroWilkTest')!.create(context({ widget: { id: 'a', type: 'shapiroWilkTest', config: {} } }));
    expect(plain.tagName.toLowerCase()).toBe('shapiro-wilk-test-widget');
    expect(plain.colorTheme).toBeUndefined();
    const themed: any = getWidgetType('correlationAnalysis')!.create(context({ widget: { id: 'c', type: 'correlationAnalysis' }, colorTheme: 'rainbow' }));
    expect(themed.tagName.toLowerCase()).toBe('correlation-analysis-widget');
    expect(themed.colorTheme).toBe('rainbow');
    expect((getWidgetType('OneWayANOVA')!.create(context({ widget: { id: 'o', type: 'OneWayANOVA' } })) as any).tagName.toLowerCase()).toBe('one-way-anova-widget');
  });

  it('creates a text widget with a default empty text', () => {
    const el: any = getWidgetType('text')!.create(context({ widget: { id: 't', type: 'text', title: 'Hello' } }));
    expect(el.tagName.toLowerCase()).toBe('text-widget');
    expect(el.widgetTitle).toBe('Hello');
    expect(el.config).toEqual({ text: '' });
  });
});

describe('custom widget types', () => {
  afterEach(() => unregisterWidgetType('gauge'));

  it('registers a factory function and calls it with the context', () => {
    registerWidgetType('gauge', ctx => {
      const el: any = document.createElement('div');
      el.seenId = ctx.widget.id;
      el.seenSources = ctx.dataSources.length;
      return el;
    });
    const registration = getWidgetType('gauge')!;
    expect(registration.fetchesData).toBeUndefined();
    const el: any = registration.create(context({ widget: { id: 'g1', type: 'gauge' }, dataSources: [{ id: 's', name: 'S', type: 't', fields: [] }] }));
    expect(el.seenId).toBe('g1');
    expect(el.seenSources).toBe(1);
  });

  it('accepts a full registration, can replace a built-in, and can be unregistered', () => {
    registerWidgetType('gauge', { create: () => document.createElement('div'), fetchesData: true });
    expect(getWidgetType('gauge')!.fetchesData).toBe(true);
    const original = getWidgetType('text')!;
    registerWidgetType('text', () => document.createElement('p'));
    expect(getWidgetType('text')).not.toBe(original);
    registerWidgetType('text', original);
    unregisterWidgetType('gauge');
    expect(getWidgetType('gauge')).toBeUndefined();
    expect(getRegisteredWidgetTypes()).not.toContain('gauge');
  });
});
