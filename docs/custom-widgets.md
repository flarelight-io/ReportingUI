# Custom widget types

Every widget type in a report (`bar`, `kpi`, `text`, ...) is looked up in a registry when the viewer renders it. You can
add your own types, or replace a built-in one, and then use them in a report configuration like any other:

```jsonc
{ "id": "w1", "type": "gauge", "title": "CPU", "x": 0, "y": 0, "w": 3, "h": 3, "config": { "sourceId": "metrics", "max": 100 } }
```

## Registering a type

```ts
import { registerWidgetType } from '@flarelight-io/reporting';

registerWidgetType('gauge', ({ widget, data, loading }) => {
  const element = document.createElement('my-gauge');
  element.title = widget.title;
  element.config = widget.config;
  element.value = data;            // rows the viewer already fetched, or null
  element.loading = loading;
  return element;
});
```

The factory runs once for each widget the viewer renders and returns the element to place on the grid. It receives:

| Property | Meaning |
| -------- | ------- |
| `widget` | The widget as in the configuration (`id`, `type`, `title`, `config`, `x/y/w/h`, ...). |
| `reportId`, `isViewer` | As given to `<report-viewer>`. |
| `colorTheme` | The report's chart palette name. |
| `dataSources` | The report's sources (the `sources` property or `configuration.sources`). |
| `activeFilters` | The filters in effect. |
| `data` | Data the viewer already fetched for this widget (see `fetchesData`), or `null`. |
| `loading` | `true` while that data is still being fetched. |
| `fetchChartData` | Your data function, for widgets that fetch for themselves. |

To have the viewer fetch data for your widget before rendering it (through `fetchChartData`, using `config.sourceId`),
register it with the full form:

```ts
registerWidgetType('gauge', { create: factory, fetchesData: true });
```

`unregisterWidgetType`, `getWidgetType` and `getRegisteredWidgetTypes` are also exported. An unknown type renders a
placeholder instead of breaking the report. Register types before the viewer renders (at app start).

## In the report builder

To let users add and edit your type in `<report-builder>`, describe it in the builder's `widgetCatalog`: its label, default and minimum sizes, an initial config and a `configSchema` that the built-in configuration form is generated from. See [report-builder.md](report-builder.md#configuring-widgets).

```js
builder.widgetCatalog = [{ type: 'gauge', label: 'Gauge', defaultSize: { w: 3, h: 3 }, minSize: { w: 2, h: 2 },
  configSchema: { properties: { sourceId: { type: 'string' }, valueField: { type: 'string' }, max: { type: 'number' } } } }];
```
