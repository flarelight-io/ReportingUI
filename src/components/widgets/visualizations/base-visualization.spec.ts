import { buildFieldLabels, fieldLabel, VisualizationData } from './base-visualization';

describe('field display names', () => {
  const data = (fieldLabels?: Record<string, string>): VisualizationData => ({ rawData: [], loading: false, fieldLabels });

  it('builds labels only for fields with a distinct, non-empty display name', () => {
    expect(buildFieldLabels([
      { name: 'rev', displayName: 'Revenue (USD)' },
      { name: 'same', displayName: 'same' },
      { name: 'blank', displayName: '  ' },
      { name: 'none' }
    ])).toEqual({ rev: 'Revenue (USD)' });
    expect(buildFieldLabels(undefined)).toEqual({});
  });

  it('falls back to the raw name when there is no display name', () => {
    expect(fieldLabel(data({ rev: 'Revenue (USD)' }), 'rev')).toBe('Revenue (USD)');
    expect(fieldLabel(data({ rev: 'Revenue (USD)' }), 'cost')).toBe('cost');
    expect(fieldLabel(data(), 'cost')).toBe('cost');
    expect(fieldLabel(undefined, 'cost')).toBe('cost');
  });

  it('matches field names case-insensitively when the backend returns different casing', () => {
    expect(fieldLabel(data({ revenue: 'Revenue (USD)' }), 'Revenue')).toBe('Revenue (USD)');
  });
});
