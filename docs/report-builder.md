# Report builder

`<report-builder>` is an editing layer on top of `<report-viewer>`. Users can select, move, resize and delete widgets on the grid, and your app can add widgets and change them through methods. It renders with the regular viewer, so what is edited is what the viewer shows.

The builder is **controlled**: it never changes the configuration itself. It emits the full next configuration and your app applies it (and saves it).

```js
const builder = document.querySelector('report-builder');
builder.configuration = report;
builder.fetchChartData = fetchChartData;
builder.sources = sources; // from your app; never written into the saved report

builder.addEventListener('configurationChange', e => {
  report = e.detail;          // save it...
  builder.configuration = report; // ...and apply it
});
```

If the app doesn't apply a change, the builder falls back to the configuration it was given (so a rejected change reverts).

## Props

| Prop | Description |
| --- | --- |
| `configuration` | The report configuration (object or JSON string). Both formats work: `widgets` with `x/y/w/h`, or `layouts` plus definitions. |
| `sources` | Data sources available to the report. |
| `widgetCatalog` | `WidgetTypeDefinition[]`: default/min/max sizes, label and initial config per widget type. Unlisted types use built-in defaults. |
| `fetchChartData` | The same data function the viewer takes. |
| `configureWidget` | Your hook for configuring widgets, see below. |
| `configureOnAdd` | Whether `addWidget` calls the hook first (default `true`). |
| `readOnly` | Turns editing off; the report just renders. |
| `compact` | `vertical` (default): colliding widgets are pushed down and gaps close. `none`: widgets stay where they're put; moves that would overlap are rejected. |
| `interactionPreview` | `outline` (default) hides a widget's content while it is dragged or resized and keeps its frame and title; `live` keeps the content. |
| `columns`, `rowHeight`, `rowAspectRatio`, `gap`, `theme` | Presentation, as on the viewer. `columns` defaults to the configuration's `columns`, then 12. |

## Events

- `configurationChange` – `detail` is the full next configuration.
- `widgetAction` – `detail` is `{ id, action: 'configure' }`: the user double-clicked a widget, pressed Enter on it or used its settings button.
- `widgetSelect` – `detail.ids` is the new selection.

## Methods

- `addWidget(type, { id?, title?, x?, y?, w?, h?, config? })` – adds at the first free spot (or at `x`/`y`), selects it, resolves with the id (or `null`).
- `removeWidgets(ids)` – removes widgets and closes the gaps. Widgets with `locked: true` are kept.
- `updateWidget(id, patch)` – merges a patch (title, config, position...). Position changes go through the layout engine so others make room. Use this to apply your own configuration UI.
- `configure(id)` – same as the user asking to configure the widget; resolves with whether a change was applied.
- `select(ids)` / `getSelection()`.

## Configuring widgets with your own UI

The builder has no configuration form. Give it a hook and open whatever you like (a modal, a side panel, a backend round trip):

```js
builder.configureWidget = async ({ mode, widget, definition, sources }) => {
  const result = await openMyDialog(widget, sources); // mode is 'add' or 'edit'
  return result ? { ...widget, config: result } : null; // null cancels
};
```

The widget you resolve with replaces the old one as a whole, so you can set any keys your backend supports. Its position stays where the layout has it. Cancelling an add adds nothing; cancelling an edit changes nothing. A hook that throws counts as a cancel.

If promises are awkward in your framework, skip the hook: listen to `widgetAction` and call `updateWidget(id, patch)` when your UI is done. `addWidget(type, { config })` then adds directly.

## Interaction

Drag a widget to move it; select it to get eight resize handles. Double-click, `Enter` or the settings button on a selected widget starts configuring it. Shift/Ctrl/Cmd-click adds to the selection, `Delete` removes the selection, `Escape` cancels a drag or clears the selection. Widgets with `locked: true` can't be moved, resized or deleted.

## Styling

The frames and handles are plain elements: `.builder-frame`, `.builder-frame.selected`, `.builder-handle` (also exposed as `part="frame"`, `"frame-selected"`, `"handle"`). They use `--fl-chart-primary` for color.

## Helpers

The layout engine and the config helpers are exported for apps that need them (`moveItem`, `setItemRect`, `getLayoutItems`, `applyLayoutItems`, `addWidgetToConfig`, `updateWidgetInConfig`, `resolveWidgetType`...).

See [design/report-builder.md](design/report-builder.md) for the plan and what comes next (configuration hooks, undo/redo, a default configuration panel).
