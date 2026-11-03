import { resolveAggregation } from './aggregation';
import { ChartDataRequestBuilder } from './chart-data-request-builder';

describe('resolveAggregation', () => {
  it('passes any aggregation name through, not just the known ones', () => {
    expect(resolveAggregation('median', undefined, 'x')).toEqual({ aggregation: 'median' });
    expect(resolveAggregation('p95', undefined, 'x')).toEqual({ aggregation: 'p95' });
    expect(resolveAggregation('sum', undefined, 'x')).toEqual({ aggregation: 'sum' });
  });

  it('treats none, empty and missing as no aggregation', () => {
    expect(resolveAggregation('none', undefined, 'x')).toEqual({});
    expect(resolveAggregation('', undefined, 'x')).toEqual({});
    expect(resolveAggregation(undefined, undefined, 'x')).toEqual({});
  });

  it('sends the options of a { type, ...options } aggregation as extra properties', () => {
    expect(resolveAggregation({ type: 'percentile', p: 0.95, interpolate: true }, undefined, 'x'))
      .toEqual({ aggregation: 'percentile', p: 0.95, interpolate: true });
    expect(resolveAggregation({ type: 'none' }, undefined, 'x')).toEqual({});
  });

  it('lets per-field entries override the default, including turning it off', () => {
    const perField = { margin: 'avg', raw: 'none', latency: { type: 'percentile', p: 0.99 } };
    expect(resolveAggregation('sum', perField, 'revenue')).toEqual({ aggregation: 'sum' });
    expect(resolveAggregation('sum', perField, 'margin')).toEqual({ aggregation: 'avg' });
    expect(resolveAggregation('sum', perField, 'raw')).toEqual({});
    expect(resolveAggregation('sum', perField, 'latency')).toEqual({ aggregation: 'percentile', p: 0.99 });
  });
});

describe('ChartDataRequestBuilder aggregations', () => {
  const source: any = { id: 's', name: 'S', type: 'table', fields: [] };
  const build = (type: string, config: any) =>
    ChartDataRequestBuilder.buildForDataWidget('r', source, 'w', type, { sourceId: 's', ...config }, [], true) as any;

  it('sends a custom aggregation on a single-value chart', () => {
    const request = build('bar', { groupByField: 'region', valueField: 'amount', aggregation: 'median' });
    expect(request.valueFields).toEqual([{ fieldName: 'amount', aggregation: 'median' }]);
  });

  it('applies per-field aggregations on multi-series charts', () => {
    const request = build('stacked-bar', {
      groupByField: 'region', fields: ['revenue', 'margin', 'latency'],
      aggregation: 'sum', aggregations: { margin: 'avg', latency: { type: 'percentile', p: 0.95 } }
    });
    expect(request.valueFields).toEqual([
      { fieldName: 'revenue', aggregation: 'sum' },
      { fieldName: 'margin', aggregation: 'avg' },
      { fieldName: 'latency', aggregation: 'percentile', p: 0.95 }
    ]);
  });

  it('sends no aggregation for none', () => {
    const request = build('table', { columns: [{ field: 'a' }], aggregation: 'none' });
    expect(request.valueFields).toEqual([{ fieldName: 'a' }]);
  });
});
