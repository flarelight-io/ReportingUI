# Pivoting a dimension into series

Stacked and clustered bar charts (including the horizontal variants) normally take a fixed list of value fields, one
series per field. With **`seriesField`** the series come from the data instead: one series per distinct value of a
dimension.

```jsonc
// fixed series: each field is a series
{ "visualizationType": "stacked-bar", "groupByField": "region", "fields": ["hardware", "software", "services"] }

// pivoted series: each distinct value of "product" is a series
{ "visualizationType": "stacked-bar", "groupByField": "region",
  "seriesField": "product", "valueField": "amount", "aggregation": "sum" }
```

## What happens

1. The widget asks the backend for **one value field grouped by two dimensions**:

   ```ts
   request.valueFields   = [{ fieldName: 'amount', aggregation: 'sum' }]
   request.groupByFields = [{ fieldName: 'region' }, { fieldName: 'product' }]
   ```

   so `fetchChartData` returns long rows, one per category/series pair:

   ```json
   [{ "region": "EMEA", "product": "Hardware", "amount": 17 },
    { "region": "EMEA", "product": "Software", "amount": 24 }, ...]
   ```
2. The chart pivots them into categories (`groupByField`) by series (`seriesField`).
   - Series appear in order of first appearance in the rows, so sort in your backend (`sortField`) to control order.
   - Rows repeating a category/series pair are summed; pairs with no row read as 0.
   - Null category or series values are grouped as "Unknown".
3. The legend and tooltips show the series values as they are in the data.

## Notes

- `seriesField` needs `groupByField` and `valueField`. When set, `fields` is ignored. `aggregation` (and per-field
  `aggregations`, keyed by the value field) apply as usual; see [aggregations.md](aggregations.md).
- Charts without a `seriesField` behave exactly as before, including field display names in legends.
- Clicking a segment filters by the category (`groupByField`), as it does today.
- A very large number of distinct series values makes an unreadable chart; limit them in your query or filters.
- Supported on `stacked-bar`, `stacked-hbar`, `clustered-bar` and `clustered-hbar`. Other chart types ignore the
  property.
