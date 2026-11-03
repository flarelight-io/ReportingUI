import { filterIdentity, filtersCacheKey, stableStringify, toChartFilter } from './filters';
import { ChartDataRequestBuilder } from './chart-data-request-builder';
import { Filter } from '../api/types/common';

describe('stableStringify', () => {
  it('is independent of object key order and handles dates and undefined', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(stableStringify({ d: new Date('2025-01-02T00:00:00Z') })).toContain('2025-01-02');
    expect(stableStringify([undefined])).toBe('[null]');
  });
});

describe('filtersCacheKey', () => {
  it('distinguishes object values (no "[object Object]" collisions)', () => {
    const a: Filter[] = [{ sourceId: 's', field: 'date', operation: 'between', value: { from: '2025-01-01', to: '2025-01-31' } }];
    const b: Filter[] = [{ sourceId: 's', field: 'date', operation: 'between', value: { from: '2025-02-01', to: '2025-02-28' } }];
    expect(filtersCacheKey(a)).not.toBe(filtersCacheKey(b));
  });

  it('ignores filter order and returns a fixed key for none', () => {
    const x: Filter = { sourceId: 's', field: 'a', value: 1 };
    const y: Filter = { sourceId: 's', field: 'b', value: 2 };
    expect(filtersCacheKey([x, y])).toBe(filtersCacheKey([y, x]));
    expect(filtersCacheKey([])).toBe('nofilters');
  });

  it('treats the operation as part of the key', () => {
    expect(filtersCacheKey([{ sourceId: 's', field: 'a', value: 1 }]))
      .not.toBe(filtersCacheKey([{ sourceId: 's', field: 'a', operation: 'gt', value: 1 }]));
  });
});

describe('filterIdentity', () => {
  it('uses the optional id so several filters can share a field', () => {
    expect(filterIdentity({ sourceId: 's', field: 'date', id: 'from' })).not.toBe(filterIdentity({ sourceId: 's', field: 'date', id: 'to' }));
    expect(filterIdentity({ sourceId: 's', field: 'date' })).toBe(filterIdentity({ sourceId: 's', field: 'date' }));
  });
});

describe('toChartFilter', () => {
  it('defaults to eq and passes value and custom properties through, without client bookkeeping', () => {
    expect(toChartFilter({ sourceId: 's', field: 'region', value: 'EMEA' }))
      .toEqual({ fieldName: 'region', operation: 'eq', value: 'EMEA' });
    expect(toChartFilter({ sourceId: 's', field: 'date', id: 'r', operation: 'between', value: { from: 1, to: 2 }, timezone: 'UTC', inclusive: true }))
      .toEqual({ fieldName: 'date', operation: 'between', value: { from: 1, to: 2 }, timezone: 'UTC', inclusive: true });
  });

  it('accepts operations the library does not know and valueless operations', () => {
    expect(toChartFilter({ sourceId: 's', field: 'x', operation: 'my-custom-op', value: [1, 2] }).operation).toBe('my-custom-op');
    const none = toChartFilter({ sourceId: 's', field: 'owner', operation: 'isnull' });
    expect(none.operation).toBe('isnull');
    expect(none.value).toBeUndefined();
  });
});

describe('ChartDataRequestBuilder filters', () => {
  it('sends custom filters to the backend request unchanged', () => {
    const source: any = { id: 'sales', name: 'Sales', type: 'table', fields: [] };
    const filters: Filter[] = [
      { sourceId: 'sales', field: 'date', operation: 'between', value: { from: '2025-01-01', to: '2025-03-31' }, timezone: 'UTC' },
      { sourceId: 'other', field: 'ignored', value: 1 }
    ];
    const request: any = ChartDataRequestBuilder.buildForDataWidget('r1', source, 'w1', 'bar', { sourceId: 'sales', valueField: 'amount', groupByField: 'region' }, filters, true);
    expect(request.filters).toEqual([
      { fieldName: 'date', operation: 'between', value: { from: '2025-01-01', to: '2025-03-31' }, timezone: 'UTC' }
    ]);
  });
});
