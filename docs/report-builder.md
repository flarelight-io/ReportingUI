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
| `configureOnAdd` | Whether `addWidget` opens the configuration UI first (default `true`). |
| `configurePanel` | The built-in form: `panel` (default, a drawer on the right), `modal`, or `none`. |
| `configLabels` | Texts of the built-in form, for translation. |
| `readOnly` | Turns editing off; the report just renders. |
| `compact` | `vertical` (default): colliding widgets are pushed down and gaps close. `none`: widgets stay where they're put; moves that would overlap are rejected. |
| `interactionPreview` | `outline` (default) hides a widget's content while it is dragged or resized and keeps its frame and title; `live` keeps the content. |
| `columns`, `rowHeight`, `rowAspectRatio`, `gap`, `theme` | Presentation, as on the viewer. `columns` defaults to the configuration's `columns`, then 12. |

## Events

- `configurationChange` – `detail` is the full next configuration.
- `widgetAction` – `detail` is `{ id, action: 'configure' }`: the user double-clicked a widget, pressed Enter on it or used its settings button.
- `historyChange` – `detail` is `{ canUndo, canRedo }`, for enabling your own undo/redo buttons.
- `widgetSelect` – `detail.ids` is the new selection.

## Methods

- `addWidget(type, { id?, title?, x?, y?, w?, h?, config? })` – adds at the first free spot (or at `x`/`y`), selects it, resolves with the id (or `null`).
- `removeWidgets(ids)` – removes widgets and closes the gaps. Widgets with `locked: true` are kept.
- `updateWidget(id, patch)` – merges a patch (title, config, position...). Position changes go through the layout engine so others make room. Use this to apply your own configuration UI.
- `configure(id)` – same as the user asking to configure the widget; resolves with whether a change was applied.
- `undo()` / `redo()` – step through the changes the builder made (up to 100). Resolve with whether anything changed. The history ends when the app sets a configuration the builder didn't propose.
- `duplicate(ids)` – adds copies (same settings and size, new ids) and selects them.
- `copy(ids)` / `paste()` – a clipboard private to the builder.
- `select(ids)` / `getSelection()`.

## Configuring widgets

With no setup the builder opens its **built-in form** when a widget is added (`mode: 'add'`) and when one is edited. The form is generated from the widget type's config schema (the built-in ones come from `schema.json`):

- a title, the data source (from your `sources` prop) and field pickers that list the source's fields by `displayName`;
- the options that matter for the chosen visualization first, everything else under "More options";
- aggregation is free text with suggestions (any name your backend supports), and anything the schema doesn't describe can be set in the raw JSON editor, so no key is out of reach;
- Apply (or Add) emits the change, Cancel and Escape do nothing (a cancelled add adds nothing).

Describe your own widget types to get a form for them too, through the catalog:

```js
builder.widgetCatalog = [{ type: 'gauge', label: 'Gauge', configSchema: { properties: {
  sourceId: { type: 'string' }, valueField: { type: 'string' },
  max: { type: 'number', description: 'Top of the scale' }, unit: { type: 'string', enum: ['%', 'ms'] }
} } }];
```

Properties named `…Field` get field pickers, `sourceId` a source picker, enums selects, booleans checkboxes, numbers number inputs; arrays and objects are edited as JSON. After changing `schema.json`, run `npm run generate:config-schemas` to refresh the built-in schemas.

The form is also a component of its own, `<widget-config-form>` (props `widget`, `schema`, `sources`, `mode`, `labels`; events `configApply`, `configCancel`).

## Configuring widgets with your own UI

To replace the form, give the builder a hook and open whatever you like (a modal, a side panel, a backend round trip):

```js
builder.configureWidget = async ({ mode, widget, definition, sources }) => {
  const result = await openMyDialog(widget, sources); // mode is 'add' or 'edit'
  return result ? { ...widget, config: result } : null; // null cancels
};
```

Resolve with `undefined` to let the built-in form handle this one (so you can override single types and keep the form for the rest). The widget you resolve with replaces the old one as a whole, so you can set any keys your backend supports. Its position stays where the layout has it. Cancelling an add adds nothing; cancelling an edit changes nothing. A hook that throws counts as a cancel.

If promises are awkward in your framework, set `configurePanel="none"`, listen to `widgetAction` and call `updateWidget(id, patch)` when your UI is done; `addWidget(type, { config })` then adds directly.

## Interaction

Drag a widget to move it; select it to get eight resize handles. Double-click, `Enter` or the settings button on a selected widget starts configuring it. Shift/Ctrl/Cmd-click adds to the selection, `Delete` removes the selection, `Escape` cancels a drag or clears the selection. Widgets with `locked: true` can't be moved, resized or deleted.

## Keyboard

| Keys | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Select the next / previous widget (focus leaves the builder after the last one) |
| Arrow keys | Move the selected widget one cell |
| `Shift` + arrow keys | Resize it one cell |
| `Enter` | Configure |
| `Delete` | Remove the selection |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` | Undo, redo |
| `Ctrl/Cmd+D`, `+C`, `+V`, `+A` | Duplicate, copy, paste, select all |
| `Escape` | Cancel a drag, or clear the selection |

Moves, resizes, adds and removals are announced through a polite live region.

## Styling

The builder is light DOM, so its elements are styled with ordinary selectors: `.builder-frame`, `.builder-frame.selected`, `.builder-handle`, `.builder-settings` (the settings button) and `.builder-panel` (the configuration drawer or modal). They use `--fl-chart-primary` for color; the form uses the card, border, text and background variables. To hide the settings button, use `report-builder .builder-settings { display: none }`.

## Helpers

The layout engine and the config helpers are exported for apps that need them (`moveItem`, `setItemRect`, `getLayoutItems`, `applyLayoutItems`, `addWidgetToConfig`, `updateWidgetInConfig`, `resolveWidgetType`...).

See [design/report-builder.md](design/report-builder.md) for the plan and what comes next (configuration hooks, undo/redo, a default configuration panel).

## Demo

`npm start` serves two demo pages: the viewer at `/` and the builder at `/builder.html` (`src/components/builder-demo/`). The builder demo is a worked example of an app around the builder: a toolbar built on `addWidget`, `undo`, `duplicate` and `removeWidgets`, a `configureWidget` hook with its own dialog, and a view of the events the builder emits.
