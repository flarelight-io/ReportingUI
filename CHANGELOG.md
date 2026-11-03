# Changelog

All notable changes to `@flarelight-io/reporting`. The project follows [semantic versioning](https://semver.org/) while
it is in 0.x: new features bump the minor version.

## 0.34.0

### Added

- **Report builder.** `<report-builder>` lets users select, move, resize, add, duplicate and delete widgets on the report
  grid. It is controlled: it emits the full next configuration as `configurationChange` and your app applies it.
  Methods `addWidget`, `removeWidgets`, `updateWidget`, `duplicate`, `copy`, `paste`, `configure`, `select`, `undo`, `redo`;
  events `configurationChange`, `widgetSelect`, `widgetAction`, `historyChange`; undo/redo history, keyboard control
  (Tab, arrows, Shift+arrows, Delete, Ctrl/Cmd+Z/Y/D/C/V/A), screen reader announcements, `readOnly`, `compact`
  (`vertical` or free placement), `widgetCatalog` (default, minimum and maximum sizes per type) and an outline preview
  while dragging. Both configuration formats (`widgets` with `x/y/w/h`, and `layouts`) are edited in place.
  See [docs/report-builder.md](docs/report-builder.md).
- **Configuration UI for widgets.** A `configureWidget` hook lets apps open their own UI when a widget is added or edited;
  without one, the builder shows a built-in form (a drawer, or a modal with `configurePanel="modal"`) generated from the
  widget type's config schema, with source and field pickers (using `displayName`), aggregation suggestions and a raw JSON
  editor. Own widget types get a form through `widgetCatalog[].configSchema`. `<widget-config-form>` is usable on its own.
- **Configurable grid columns.** `columns` on `<report-viewer>` (and in the configuration), default 12.
- **`sources` property on `<report-viewer>`**, so apps supply data sources at render time instead of saving them in the report.
- **Widget registry.** `registerWidgetType` / `unregisterWidgetType` / `getWidgetType` / `getRegisteredWidgetTypes` add or
  replace widget types ([docs/custom-widgets.md](docs/custom-widgets.md)).
- Exported helpers: the layout engine (`moveItem`, `resizeItem`, `setItemRect`, `addItem`, `removeItems`, `normalizeLayout`,
  `compactVertical`, `collides`, `findFreePosition`, `resolveRect`), report configuration helpers (`getLayoutItems`,
  `applyLayoutItems`, `addWidgetToConfig`, `removeWidgetsFromConfig`, `replaceWidgetInConfig`, `updateWidgetInConfig`,
  `nextWidgetId`) and `resolveWidgetType`.
- A dedicated builder demo page (`/builder.html` in `npm start`).
- `npm run generate:config-schemas` regenerates the built-in config schemas used by the configuration form from `schema.json`.

### Changed

- The viewer renders its grid incrementally: widgets are keyed, so a configuration change updates, adds or removes only the
  widgets that changed instead of rebuilding the grid, and a change to one widget refetches only that widget's data.
  Moving or resizing widgets refetches nothing.
- Widget padding, header and text sizes now shrink with the widget (down to 40%) so small widgets, such as one-row text
  widgets, keep their content visible. `--fl-widget-body-padding`, `--fl-widget-header-padding` and `--fl-widget-title-size`
  still set fixed values. `--fl-widget-scale` is available inside widgets ([docs/theming.md](docs/theming.md)).
- `schema.json` no longer caps `x` and `w` at 12.

## 0.33.0

### Added

- **Styling:** widget, chart and layout styles are overridable through CSS variables and shadow parts; chart color themes
  are extensible and read the `--fl-chart-series-*` and heatmap variables ([docs/theming.md](docs/theming.md)).
- **Layout:** `rowHeight` / `rowAspectRatio` (rows no longer have to be square), `gap`, and a `theme` property
  (`light`, `dark`, `auto`) so apps can drive dark mode from their own toggle.
- **Filters:** `activeFilters` / `defaultFilters` with managed and unmanaged modes, and an open filter model (any operation,
  such as `between` for date ranges) ([docs/filters.md](docs/filters.md)).
- **Aggregations:** any aggregation your backend supports, with parameters and per-field overrides
  ([docs/aggregations.md](docs/aggregations.md)).
- **Charts:** stacked and clustered bar charts, pivoting a field into the series ([docs/series.md](docs/series.md)),
  top-N with an "Other" bucket, a pinned or percent value axis, nicer axis ticks ([docs/chart-options.md](docs/chart-options.md)),
  and field `displayName` used for legends and labels.
- **Bundlers:** a static ESM entry (`@flarelight-io/reporting/components`) and an import-injected loader that Vite, webpack
  and Next.js can follow ([docs/bundlers.md](docs/bundlers.md)).

### Fixed

- Charts scaling out of bounds and tiny text; tooltips cut off or placed below the chart; the KPI trend chip getting too
  small; the KPI trend with a zero baseline (the trend is now hidden); heatmap numbers appearing inconsistently; charts
  fetching their data twice after the report prefetch.
