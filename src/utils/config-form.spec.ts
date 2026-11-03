import { buildFields, configSchemaFor, humanize, setConfigValue } from './config-form';

describe('humanize', () => {
  it('turns keys into labels', () => {
    expect(humanize('groupByField')).toBe('Group by field');
    expect(humanize('kpi_prefix')).toBe('Kpi prefix');
  });
});

describe('configSchemaFor', () => {
  it('has the built-in schemas and prefers the catalog', () => {
    expect(configSchemaFor('text')?.properties.text).toBeDefined();
    expect(configSchemaFor('data')?.properties.visualizationType).toBeDefined();
    expect(configSchemaFor('myWidget')).toBeUndefined();
    const own = { properties: { a: { type: 'string' } } };
    expect(configSchemaFor('text', [{ type: 'text', configSchema: own }])).toBe(own);
  });
});

describe('buildFields', () => {
  const data = configSchemaFor('data');
  const keys = (fields: any[], group: string) => fields.filter(f => f.group === group).map(f => f.key);

  it('maps schema properties to field kinds', () => {
    const fields = buildFields(data, { visualizationType: 'bar' });
    const kind = (key: string) => fields.find(f => f.key === key)?.kind;
    expect(kind('sourceId')).toBe('source');
    expect(kind('groupByField')).toBe('field');
    expect(kind('visualizationType')).toBe('select');
    expect(kind('showGrid')).toBe('boolean');
    expect(kind('axisMax')).toBe('number');
    expect(kind('aggregation')).toBe('aggregation');
    expect(kind('fields')).toBe('fieldList');
    expect(kind('columns')).toBe('json');
    expect(fields.find(f => f.key === 'sourceName')).toBeUndefined();
  });

  it('puts the options of the chosen visualization first and keeps the rest under "more"', () => {
    const bar = buildFields(data, { visualizationType: 'bar' });
    expect(keys(bar, 'main')).toEqual(expect.arrayContaining(['sourceId', 'visualizationType', 'groupByField', 'valueField', 'axisMax']));
    expect(keys(bar, 'main')).not.toContain('kpiPrefix');
    expect(keys(bar, 'more')).toContain('kpiPrefix');
    const kpi = buildFields(data, { visualizationType: 'kpi' });
    expect(keys(kpi, 'main')).toContain('kpiPrefix');
    expect(keys(kpi, 'main')).not.toContain('groupByField');
    expect(bar.length).toBe(kpi.length);
  });

  it('shows every property of schemas without a visualization type', () => {
    const fields = buildFields(configSchemaFor('text'), {});
    expect(fields.every(f => f.group === 'main')).toBe(true);
    expect(fields.find(f => f.key === 'text')?.kind).toBe('textarea');
  });
});

describe('setConfigValue', () => {
  it('sets, parses and removes values without touching the input', () => {
    const config = { a: 1, keep: true };
    expect(setConfigValue(config, { key: 'a', kind: 'number' }, '2')).toEqual({ a: 2, keep: true });
    expect(setConfigValue(config, { key: 'a', kind: 'number' }, '')).toEqual({ keep: true });
    expect(setConfigValue(config, { key: 'a', kind: 'number' }, 'x')).toBeUndefined();
    expect(setConfigValue(config, { key: 'b', kind: 'boolean' }, true)).toEqual({ a: 1, keep: true, b: true });
    expect(setConfigValue(config, { key: 'f', kind: 'fieldList' }, 'x, y ,')).toEqual({ a: 1, keep: true, f: ['x', 'y'] });
    expect(setConfigValue(config, { key: 'c', kind: 'json' }, '[{"field":"a"}]')).toEqual({ a: 1, keep: true, c: [{ field: 'a' }] });
    expect(setConfigValue(config, { key: 'c', kind: 'json' }, '[')).toBeUndefined();
    expect(setConfigValue(config, { key: 'g', kind: 'aggregation' }, 'median')).toEqual({ a: 1, keep: true, g: 'median' });
    expect(setConfigValue(config, { key: 'g', kind: 'aggregation' }, '{"type":"percentile","p":0.95}')).toEqual({ a: 1, keep: true, g: { type: 'percentile', p: 0.95 } });
    expect(config).toEqual({ a: 1, keep: true });
  });
});
