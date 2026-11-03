import { pivotSeries } from './pivot';
import { ChartDataRequestBuilder } from './chart-data-request-builder';

describe('pivotSeries', () => {
  const rows = [
    { region: 'EMEA', product: 'A', amount: 10 },
    { region: 'EMEA', product: 'B', amount: 5 },
    { region: 'APAC', product: 'A', amount: 7 },
    { region: 'EMEA', product: 'A', amount: 2 },
    { region: null, product: null, amount: '3' }
  ];

  it('turns a dimension into series, in order of first appearance', () => {
    const p = pivotSeries(rows, 'region', 'product', 'amount');
    expect(p.categories).toEqual(['EMEA', 'APAC', 'Unknown']);
    expect(p.series).toEqual(['A', 'B', 'Unknown']);
  });

  it('sums repeated pairs and reads missing pairs as 0', () => {
    const p = pivotSeries(rows, 'region', 'product', 'amount');
    expect(p.value('EMEA', 'A')).toBe(12);
    expect(p.value('EMEA', 'B')).toBe(5);
    expect(p.value('APAC', 'B')).toBe(0);
    expect(p.value('Unknown', 'Unknown')).toBe(3);
  });

  it('handles empty input and non-numeric values', () => {
    expect(pivotSeries([], 'a', 'b', 'v').categories).toEqual([]);
    const p = pivotSeries([{ a: 'x', b: 'y', v: 'n/a' }], 'a', 'b', 'v');
    expect(p.value('x', 'y')).toBe(0);
  });
});

describe('request for a pivoted series', () => {
  const source: any = { id: 's', name: 'S', type: 'table', fields: [] };
  const build = (type: string, config: any) =>
    ChartDataRequestBuilder.buildForDataWidget('r', source, 'w', type, { sourceId: 's', ...config }, [], true) as any;

  it('asks for one value field grouped by category and series, with its aggregation', () => {
    const request = build('stacked-bar', { groupByField: 'region', seriesField: 'product', valueField: 'amount', aggregation: 'sum', fields: ['ignored'] });
    expect(request.valueFields).toEqual([{ fieldName: 'amount', aggregation: 'sum' }]);
    expect(request.groupByFields).toEqual([{ fieldName: 'region' }, { fieldName: 'product' }]);
  });

  it('is unchanged without seriesField and for charts that do not take one', () => {
    const fixed = build('clustered-bar', { groupByField: 'region', fields: ['a', 'b'] });
    expect(fixed.valueFields.map((f: any) => f.fieldName)).toEqual(['a', 'b']);
    expect(fixed.groupByFields).toEqual([{ fieldName: 'region' }]);
    const bar = build('bar', { groupByField: 'region', seriesField: 'product', valueField: 'amount' });
    expect(bar.groupByFields).toEqual([{ fieldName: 'region' }]);
  });
});
