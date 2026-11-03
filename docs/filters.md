# Filters

Filters narrow the data a report fetches. A filter is applied to a source, travels with every `fetchChartData`
request for widgets on that source, and is yours to define: the library does not restrict operations or values.

## The filter shape

```ts
interface Filter {
  sourceId: string;      // required: which source it applies to
  field: string;         // required: the field name
  operation?: string;    // free-form, defaults to 'eq'
  value?: any;           // any JSON: scalar, array, { from, to }, ...; optional for valueless operations
  id?: string;           // tells apart several filters on one field
  [key: string]: any;    // any extra properties are kept and forwarded
}
```

Only `sourceId` and `field` are required. Operations the library names (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`,
`is`, `isnot`, `in`, `notin`, `between`, `notbetween`, `isnull`, `isnotnull`) autocomplete in TypeScript, but any string
your backend understands is accepted.

```ts
{ sourceId: 'sales', field: 'region', value: 'EMEA' }                                          // equals
{ sourceId: 'sales', field: 'date', operation: 'between', value: { from: '2025-01-01', to: '2025-03-31' } }
{ sourceId: 'sales', field: 'status', operation: 'in', value: ['open', 'won'] }
{ sourceId: 'sales', field: 'owner', operation: 'isnull' }                                      // no value
{ sourceId: 'sales', field: 'date', id: 'from', operation: 'gte', value: '2025-01-01' }         // two filters,
{ sourceId: 'sales', field: 'date', id: 'to',   operation: 'lte', value: '2025-03-31' }         // one field
{ sourceId: 'sales', field: 'name', operation: 'fuzzy-match', value: 'acme', threshold: 0.8 }   // your own
```

## What the backend receives

`fetchChartData(request)` gets `request.filters` for the widget's source. Each filter is passed through as
`{ ...extraProperties, fieldName, operation, value }`, with `operation` defaulting to `'eq'`; `sourceId` and `id` are
client-side and are not sent.

```json
{ "fieldName": "date", "operation": "between", "value": { "from": "2025-01-01", "to": "2025-03-31" } }
```

Filters from the built-in widgets (clicking a chart element, filter widgets) are plain `eq`/`in` filters. Filter
widgets only reflect filters they understand (`eq`/`in`); your custom filters are applied to the data but never
misread as a selection.

## Managed and unmanaged

`report-viewer` can keep the filters itself or let your app own them.

**Unmanaged** (default, `activeFilters` not set): the viewer keeps the filters, applies them when the user clicks, and
emits `filtersChange` so you can observe them. Use `defaultFilters` to start with some, and the methods below to
change them from code.

```js
viewer.defaultFilters = [{ sourceId: 'sales', field: 'region', value: 'EMEA' }];
viewer.addEventListener('filtersChange', e => save(e.detail));    // e.detail is the full filter list
await viewer.setFilters([...]);   await viewer.clearFilters();   const now = await viewer.getFilters();
```

**Managed** (`activeFilters` set, even to `[]`): the viewer never changes the filters. A click only emits
`filtersChange` with the proposed list; the filters change when you set `activeFilters`. Use this to keep filters in
your own state, URL or store, to validate or transform them, or to share them between viewers.

```jsx
const [filters, setFilters] = useState([]);
<report-viewer
  activeFilters={filters}
  onFiltersChange={e => setFilters(e.detail)}   // or reject / adjust it first
/>
```

Notes:
- Setting `activeFilters` to an equal list (a new array with the same content) does nothing; there is no refetch.
- `filtersChange` fires only when the list actually changes.
- Filters are identified by source + field + optional `id`. An event with a matching identity replaces that filter;
  `remove: true` (or, for plain filters without an `operation`, a `null` value) removes it; `sourceId: '*', field: '*'`
  with a null value clears everything. `setFilters`/`clearFilters` in managed mode only emit `filtersChange`.
- Filter events are scoped to the viewer they come from, so several viewers on one page don't affect each other.
