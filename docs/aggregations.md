# Aggregations

Aggregation happens in your backend: the library sends the aggregation you configure with each `fetchChartData`
request and renders whatever comes back. It does not restrict the list, so you can use anything your backend supports.

## Configuring

On any data widget (charts, tables, KPIs):

```jsonc
{ "type": "bar", "config": { "sourceId": "sales", "groupByField": "region", "valueField": "amount",
    "aggregation": "median" } }
```

- **`aggregation`** applies to every value field of the widget. It is a free-form string: `sum`, `avg`, `min`, `max`,
  `count`, `countDistinct`, `stdDev`, `stdDevPop` autocomplete in TypeScript, but `median`, `p95`, `first`, `my-custom`,
  or anything else is passed through as-is.
- **`"none"`** (or empty / not set) means no aggregation: raw rows. It is the only reserved word.
- **Parameterized aggregations:** use an object. `type` becomes the aggregation name and the other properties are sent
  as extra properties on the value field.

  ```jsonc
  "aggregation": { "type": "percentile", "p": 0.95 }
  // request.valueFields -> [{ "fieldName": "latency", "aggregation": "percentile", "p": 0.95 }]
  ```
- **`aggregations`** overrides `aggregation` per field, by field name. Useful for multi-series charts and tables
  where fields need different aggregations. An entry can be a name, a `{ type, ...options }` object, or `"none"`.

  ```jsonc
  { "visualizationType": "clustered-bar", "groupByField": "region",
    "fields": ["revenue", "margin", "latency"],
    "aggregation": "sum",
    "aggregations": { "margin": "avg", "latency": { "type": "percentile", "p": 0.95 } } }
  ```

## What the backend receives

```ts
request.valueFields: Array<{ fieldName: string; aggregation?: string; [option: string]: any }>
```

Fields with no aggregation have no `aggregation` property.

Your `fetchChartData` is responsible for understanding the names you configure; unknown names are not validated by the
library. The JSON schema accepts any string (or object) for `aggregation` and `aggregations`, so editors and tooling
built on it won't reject custom values.
