import { AggregationSpec, ChartField } from '../api/types/common';

/** The only reserved aggregation: no aggregation (raw rows). Everything else is up to the backend. */
export const NO_AGGREGATION = 'none';

/**
 * Request properties for one value field's aggregation. `spec` is the field's entry in `aggregations` if there is
 * one, otherwise the widget-level `aggregation`.
 *
 * - a string is sent as `aggregation` as-is (any name your backend supports);
 * - `{ type, ...options }` sends `aggregation: type` plus the options as extra properties on the field, for
 *   parameterized aggregations such as `{ type: 'percentile', p: 0.95 }`;
 * - `'none'`, empty or missing sends no aggregation.
 */
export function resolveAggregation(
  defaultSpec: AggregationSpec | undefined,
  perField: Record<string, AggregationSpec> | undefined,
  fieldName: string
): Partial<ChartField> {
  const spec = perField && Object.prototype.hasOwnProperty.call(perField, fieldName) ? perField[fieldName] : defaultSpec;
  if (spec === undefined || spec === null) return {};
  if (typeof spec === 'string') {
    return spec === '' || spec === NO_AGGREGATION ? {} : { aggregation: spec };
  }
  if (typeof spec === 'object' && typeof spec.type === 'string' && spec.type !== '' && spec.type !== NO_AGGREGATION) {
    const { type, ...options } = spec;
    return { ...options, aggregation: type };
  }
  return {};
}
