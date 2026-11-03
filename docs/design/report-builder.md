# Report builder: design

Status: approved; decisions recorded below. Implementation starts with Phase 0.

## Goal

Let apps embed a report editor next to the viewer: add widgets, move and resize them on the grid, delete and
reorder them, and configure each widget, **without the library deciding what can be configured**. Apps supply the
data sources and, where their backend supports options we don't know about, their own configuration UI.

The builder reads and writes the same report configuration JSON the viewer already renders, so a saved report opens
in `<report-viewer>` unchanged.

## Principles

1. **Headless first, batteries later.** The first releases give apps the canvas and the hooks; ready-made config
   screens come after, and are optional.
2. **Controlled, like filters.** The app owns the configuration (`configuration` in, `configurationChange` out). The
   builder never persists anything and never mutates what you pass in. This mirrors the managed `activeFilters` model.
3. **No assumptions about the backend.** Widget types, sources, fields, operations and aggregations are all
   open-ended (as in [filters.md](../filters.md) and [aggregations.md](../aggregations.md)).
4. **Every phase ships value on its own** and doesn't need the later ones to be useful.
5. **The viewer stays small.** Builder code is a separate component; viewer-only apps don't pay for it in behavior,
   and the shared pieces (layout math, widget registry) are small and tree-shakeable.

## Non-goals (for now)

- Saving, loading, versioning or sharing reports (the app's job).
- Multi-user / collaborative editing (the change log in Phase 5 makes it possible later).
- Editing the data sources themselves (the app passes sources in; see "Data sources").
- A WYSIWYG for chart internals (colors per series, annotations).

## Where we are today (relevant facts)

- The viewer lays widgets out on a fixed 12-column CSS grid (`columns` becomes configurable in Phase 0); position and size are `x, y, w, h` on each widget. Row height
  and gap are configurable (`rowHeight`, `rowAspectRatio`, `gap`).
- The configuration has `sources`, `widgets`, optionally `layouts` (lg/md/sm/xs). The viewer reads the `lg` layout.
- Widgets already take `isInEditor` (the title bar hides in that mode) and `readOnly`.
- `renderWidgets()` clears the grid and rebuilds every widget on each change; widget elements come from one long
  `switch` in `createWidgetElement` (about 35 cases). Both are fine for viewing and wrong for editing.
- `gridstack` is a dependency but unused in `src`.
- `src/schema.json` describes every widget config (about 3,400 lines) and is the natural source for generated forms.
- There are no e2e tests yet (puppeteer is installed).

## Architecture

```
            ┌──────────────────────── <report-builder> ────────────────────────┐
 app ──────▶│ configuration, sources, widgetCatalog, fetchChartData, readOnly   │
            │                                                                    │
            │   canvas (renders widgets via the shared registry)                 │
            │   └─ edit overlay: selection frames, drag/resize handles, ghost    │
            │                                                                    │
            │   layout engine (pure functions) ── history (undo/redo)            │
            └───────┬────────────────────────────────────────────────┬───────────┘
   configurationChange / widgetSelect                      configureWidget(...) hook
                    ▼                                                  ▼
                   app  ◀─────────────── its own modal / panel / backend ─────────┘
```

### Pieces

| Piece | What it is | Used by |
| ----- | ---------- | ------- |
| **Widget registry** | Maps a widget `type` to how it is created and updated (tag name, how config/data map to props). Replaces the big `switch`. Apps can register their own types. | viewer, builder |
| **Layout engine** | Pure functions over `{ id, x, y, w, h }[]`: place, move, resize, collide, compact, clamp to 12 columns. No DOM. | builder (viewer unchanged) |
| **Keyed grid renderer** | Keeps a `Map<id, element>`; on change it updates props or position of only the widgets that changed, creates new ones, removes gone ones. | viewer, builder |
| **`<report-builder>`** | The component: owns selection, interaction, history and the edit overlay; renders the canvas with the shared renderer. | apps |
| **Config hook** | How a widget's configuration is edited: an app callback (Phase 2), later a built-in panel (Phase 4). | builder |

The overlay sits above the rendered widgets and takes the pointer events while editing (widgets get
`pointer-events: none`), so charts and filters don't react to clicks and drags in edit mode.

### Layout model

- A configurable number of columns (`columns`, default 12), `x`/`w` in columns, `y`/`h` in rows. Row height and gap
  come from the same `rowHeight` / `rowAspectRatio` / `gap` properties, so the builder canvas matches the viewer
  exactly. `columns` is added to the viewer in Phase 0 (property and configuration key, like `rowHeight`), so apps
  can pick a grid that suits them (6, 12, 24, ...). Widgets wider than the grid are clamped.
- Default collision behavior: **push down and compact upward** (what people expect from dashboards). Option
  `compact: 'vertical' | 'none'`; with `'none'`, moves that would overlap are rejected.
- Per-type constraints from the catalog: `minSize`, `maxSize`, `defaultSize`. A widget can also be `locked`
  (cannot be moved, resized or deleted by the user).
- Pointer interaction uses pointer events, with a live ghost placeholder and snap to the grid. Keyboard
  interaction is added in Phase 3.
- We write our own small layout engine instead of adopting `gridstack`: the viewer's grid is CSS grid, the math
  is small, and pure functions are easy to unit test. (Open question 1.)

## Public API (sketch)

### Props

```ts
interface ReportBuilderProps {
  /** The report. Controlled: change it in response to `configurationChange`. */
  configuration: ReportConfiguration;
  /** Sources available when adding and configuring widgets. */
  sources?: DataSource[];
  /** What users can add, and how. Defaults to every built-in widget type. */
  widgetCatalog?: WidgetTypeDefinition[];
  /** Same function the viewer takes, so widgets show real data while editing. */
  fetchChartData?: Function;
  /** Called to configure a widget (see "Configuration hook"). Without it, widgets are only moved/resized/removed. */
  configureWidget?: ConfigureWidget;
  readOnly?: boolean;
  compact?: 'vertical' | 'none';
  // plus the viewer's presentation props: theme, colorTheme, rowHeight, rowAspectRatio, gap, heightMode
}
```

### Widget catalog

```ts
interface WidgetTypeDefinition {
  type: string;                       // 'bar', 'kpi', or an app-defined type
  label: string;
  category?: string;                  // for grouping in an app's palette
  icon?: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  /** Starting config for a new widget of this type. */
  defaultConfig?: (ctx: { sources: DataSource[] }) => Record<string, any>;
  /** Return messages when the widget isn't valid (e.g. no source chosen). Shown on the widget; never blocks saving. */
  validate?: (widget: WidgetData) => string[];
}
```

Because the builder is headless in early phases, **the app builds the palette** from the catalog and calls
`addWidget('bar')`. The catalog also tells the builder sizes and defaults.

### Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `configurationChange` | `ReportConfiguration` | The user changed the layout or a widget (the full next configuration; apps set the prop to accept it). |
| `widgetSelect` | `{ ids: string[] }` | Selection changed. |
| `widgetAction` | `{ id, action: 'configure' \| 'duplicate' \| 'delete' }` | A toolbar button was used (Phase 3+); lets apps intercept deletes (confirmations). |

### Methods

```ts
addWidget(type: string, options?: { x?: number; y?: number; config?: object }): Promise<string | null>; // returns the new id
updateWidget(id: string, patch: Partial<WidgetData>): Promise<void>;     // e.g. the app's own modal applying a result
removeWidgets(ids: string[]): Promise<void>;
select(ids: string[]): Promise<void>;
undo(): Promise<void>;  redo(): Promise<void>;                            // Phase 3
```

Like `setFilters` in managed mode, these emit `configurationChange` with the proposed result; the app applies it.

### Configuration hook

The central extensibility point: **how a widget gets configured is entirely the app's choice.**

```ts
type ConfigureWidget = (request: {
  mode: 'add' | 'edit';
  widget: WidgetData;                 // current state; for 'add', the new widget with defaults
  definition: WidgetTypeDefinition;
  sources: DataSource[];
}) => Promise<WidgetData | null>;     // the new widget, or null to cancel
```

- The builder calls it when a widget is added (`mode: 'add'`, optional) or the user double-clicks it / uses its
  settings button / presses Enter (`'edit'`). The app opens whatever UI it wants (a modal, a side panel, a backend
  round trip), then resolves with the updated widget or `null`.
- An equivalent `widgetAction: 'configure'` event plus `updateWidget()` covers frameworks where returning a promise is
  awkward.
- The widget is replaced as a whole (`{ ...widget, config }`), so apps can change anything the backend supports,
  including config keys the library has never heard of; the builder only requires `id`, `type`, and `x/y/w/h`.
- Cancelling an `'add'` removes the placeholder; cancelling an `'edit'` changes nothing.

### Data sources

- **Sources come from the app.** `sources` is a prop on the builder: the sources the user can choose from when
  adding and configuring widgets. The app can swap it at any time (for example after loading sources from its
  backend), and the configuration hook receives the current list.
- **The builder does not write sources into the saved report.** A widget only stores a `sourceId`; the source
  definitions (and their fields) are supplied at render time. To make that work for the viewer too, Phase 0 adds a
  `sources` prop to `<report-viewer>` that takes precedence over `configuration.sources` (the configuration keeps
  working as before for apps that embed sources in the report).
- Field pickers (Phase 4) use `sources[].fields`, including `displayName`.

### Compatibility

- Output format follows the input: a configuration with `widgets` carrying `x/y/w/h` is written back that way; one
  using `layouts` keeps `layouts` (the `lg` layout is edited until Phase 5 adds breakpoints). Unknown top-level keys
  are preserved.
- The viewer ignores anything it doesn't know, so reports edited in the builder render in the viewer unchanged.

## Phases

Each phase is shippable and listed with what a consumer gets from it. Estimates are rough, for one developer who
knows the codebase, and include tests and docs.

### Phase 0: Groundwork (about 1 week)

- Make the grid width configurable: **`columns`** on the viewer (default 12) as a property and configuration key.
- Add a **`sources`** property to the viewer (precedence over `configuration.sources`).
- Extract the **widget registry** from `createWidgetElement`; built-in types register themselves.
- Add the **keyed grid renderer** so changes update only the affected widgets.
- Add the **layout engine** (pure functions) with thorough unit tests.
- No behavior change for viewer users.

Value now: apps can **register their own widget types in the viewer** (`registerWidgetType`), choose their own grid
width, supply sources without embedding them in the report, and re-renders are cheaper (filter changes no longer
recreate unaffected widgets). Phases 1-3 depend on this.

Done when: viewer output is unchanged (demo and existing tests), the registry covers all built-in types, layout
engine has tests for move/resize/collision/compact edge cases.

### Phase 1: Editable canvas, controlled (about 1-2 weeks)

- `<report-builder>` with `configuration` in, `configurationChange` out.
- Drag to move, drag handles to resize, snap to grid, ghost placeholder, collision handling.
- Selection (click, shift-click, click empty space to clear), `widgetSelect`.
- Delete selected (Delete key and `removeWidgets`), `addWidget(type)` with catalog sizes, `readOnly`.
- Charts show real data while editing via `fetchChartData`.

Value now: apps can build their own toolbar and palette around a working layout editor, using
`addWidget`/`removeWidgets`, and edit config elsewhere with `updateWidget`. This already replaces hand-editing
JSON.

Done when: an app can drag, resize, add and delete widgets and persist the emitted JSON; the saved JSON renders
identically in `<report-viewer>`; pointer interaction e2e tests pass.

### Phase 2: Configuration hooks (about 1 week)

- `configureWidget` hook, `widgetAction` event, `updateWidget`, double-click and a settings affordance on the
  selected widget.
- `widgetCatalog` (sizes, default config, `validate`) and the `sources` prop passed through to the hook.
- Validation messages shown on the widget frame.

Value now: **complete builder for apps with their own forms**, which is the case where the backend supports options
we can't know about. No default config UI is needed.

Done when: a demo app opens its own modal from the hook, applies a config including custom keys, and cancel paths
behave (add is rolled back, edit is a no-op).

### Phase 3: Editing ergonomics (about 1-2 weeks)

- Undo/redo (history of configurations), duplicate, copy/paste, `locked` widgets.
- Keyboard: arrow keys to move, shift+arrows to resize, Tab to move between widgets, Enter to configure, Delete.
- Accessible names and live-region announcements for moves/resizes.
- Min/max sizes enforced, nudging and alignment guides.

Value now: the editor feels finished for power users and passes basic accessibility checks.

### Phase 4: Default configuration panel (about 2-3 weeks)

- A **schema-driven form** generated from `schema.json` for each built-in widget type, with source and field pickers
  using `sources` and `displayName`, aggregation/filter-operation inputs that accept free text plus suggestions.
- Used only when no `configureWidget` hook is supplied, or when the hook returns `undefined` to say "use the default".
- Per-type overrides: apps can replace the form for a single type and keep the defaults for the rest.
- Theming and labels (i18n) via props.

Value now: apps that don't want to build forms get a working builder out of the box.

### Phase 5: Advanced (as needed)

- Responsive breakpoints (edit `layouts.lg/md/sm/xs`), with a breakpoint switcher.
- Templates and presets, multi-select moves, sections/grouping.
- A change log (operations) alongside the configuration, as a basis for collaborative editing.
- A "preview as viewer" mode and thumbnails.

## Testing

- **Unit:** layout engine (the highest-risk logic), registry, catalog/validation helpers, configuration round trips
  (input format is preserved, unknown keys survive).
- **e2e (puppeteer):** drag/resize/add/delete flows, keyboard flows, hook cancel/apply, saved JSON renders the same
  in the viewer.
- **Visual check in the demo app:** a builder page next to the viewer, in light and dark themes.

## Packaging

- `report-builder` is its own component and its own module in `dist/components` (importable as
  `@flarelight-io/reporting/components/report-builder`); `defineCustomElements()` registers it with the rest.
- No new runtime dependency (own layout engine). `gridstack` is unused today and can be removed.
- Types for the catalog, hook and events are exported from the package root.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Refactoring the viewer's widget creation regresses rendering | Do it first (Phase 0) behind unchanged output; snapshot the demo and compare. |
| Drag/resize feel (jitter, collisions) is hard to get right | Keep layout math pure and tested; build interaction in small steps; spike Phase 1 early. |
| Generated forms (Phase 4) never match what apps need | Phase 2 hooks make them optional; default forms only cover built-in types. |
| Round-tripping configuration loses data | Preserve unknown keys and the input format; test round trips. |
| Scope creep toward a full dashboard product | Non-goals above; each phase has a "done when". |

## Interaction preview (outline and title while dragging or resizing)

While a widget is being dragged or resized the builder shows only its outline and title, and the content comes back
on release. Content re-rendering on every frame of a resize is the main remaining cost (data is no longer refetched
and widgets are no longer recreated, see Phase 0 results), and an outline is also a clearer drop target.

- **Default, no widget changes needed:** the builder sets a CSS custom property on the widget's grid cell while it is
  interacting (`--fl-widget-body-display: none`) and an attribute (`data-interacting`). The frame's body uses the
  variable (`display: var(--fl-widget-body-display, block)`), so built-in widgets hide their content and keep title
  and border automatically. Custom properties inherit through shadow DOM, so this reaches nested widgets.
  A hidden body has no size, so charts stop re-rendering during the interaction and render once on release.
- **Custom widgets can opt in:** they can read the same variable or the `data-interacting` attribute to show their own
  placeholder (a map or iframe can pause itself, for instance). The registry context passes `interacting` too.
- **Configurable:** a builder prop, `interactionPreview: 'outline' | 'live'`, default `'outline'`; `'live'` keeps
  content visible while moving (cheap for drags, since the whole cell just moves) for apps that prefer it.
- **Scope:** both drag and resize hide content by default for consistency. If drags feel better with live content,
  make `'live'` the default for drags only. Decide when Phase 1 interaction is built.

## Decisions

1. **Layout engine:** our own small, pure-function engine; no `gridstack`.
2. **Palette and toolbar:** Phases 1-2 ship no palette or toolbar UI; apps build their own from the catalog and
   the `addWidget` / `removeWidgets` methods. A minimal default can come with Phase 4.
3. **Sources:** they come from the app (prop); the builder never writes them into the saved report (see
   "Data sources").
4. **Format:** same as today. Reports are saved as `widgets` with `x/y/w/h` (or `layouts` when the input used it).
   The grid width becomes configurable (`columns`, default 12) instead of being fixed.
5. **Edit mode:** a separate `<report-builder>` component, not a mode of `<report-viewer>`.
6. **On add:** adding a widget calls the configuration hook right away (`mode: 'add'`), controllable by a prop. The
   default UI for that hook in Phase 4 (modal or right side panel) is still to be decided, but apps can always
   replace it with their own through `configureWidget`.

## Open questions

- Default configuration UI in Phase 4: modal or right side panel (or both, selectable)? Decide when Phase 4 starts;
  Phase 2 does not depend on it.

## Order of work

Start with Phase 0, in small commits that keep the viewer's output unchanged: `columns` and `sources` on the viewer,
then the layout engine with tests, then the widget registry, then the keyed renderer. Re-check the demo after each.

## Implementation status

Branch: `feat/report-builder` (not pushed yet). Last updated at the end of the first implementation session.

### Phase 0: groundwork

| Item | Status | Where |
| ---- | ------ | ----- |
| Configurable grid `columns` (property + config key, default 12; schema no longer caps x/w at 12) | Done | `report-viewer.tsx`, `schema.json`, `docs/theming.md` |
| `sources` property on the viewer (overrides `configuration.sources`) | Done | `report-viewer.tsx`, `docs/development.md` |
| Layout engine: move, resize, add, remove, compact, normalize, locked items, `compact: none`, plus `resolveRect` (the viewer's placement rule, now shared) | Done, 22 tests | `src/utils/layout.ts`, `layout.spec.ts` |
| Widget registry replacing the viewer's ~1000-line `createWidgetElement` switch; `registerWidgetType` etc. exported | Done, tests, output verified identical | `src/utils/widget-registry.ts`, `docs/custom-widgets.md` |
| Keyed incremental grid renderer | Done | `report-viewer.tsx` `renderWidgets()` |
| Per-widget data invalidation on configuration change | Done, 7 tests | `report-viewer.tsx` `applyConfiguration()`, `src/utils/config-keys.ts` |

**Phase 0 is complete.** Commits on the branch: design doc, `columns` + `sources`, layout engine, widget registry,
keyed renderer + per-widget invalidation. All 95 unit tests pass and the build is clean.

How the registry refactor was verified (reuse this for the renderer): fingerprint every rendered widget in the demo
(`.widget-item` position, child tag, `widgetId`, `widgetTitle`, `reportId`, `readOnly`, `isInEditor`, `isViewer`,
`colorTheme`, `config` JSON, data length, fetch function presence, attributes, style), hash it, switch to the old code
(stash only `report-viewer.tsx`, force `npx stencil build --docs`, confirm the served bundle lacks the new marker),
and compare. The hashes were identical for all 50 widgets. Note the dev server does not always rebuild after a stash,
so force a build and check the loaded bundle.

### Phase 0 results (measured in the demo, 50 widgets)

| Change to the configuration | Fetches | Elements recreated | DOM changes |
| --------------------------- | ------- | ------------------ | ----------- |
| Move or resize widgets (x/y/w/h only) | 0 | 0 | 0 |
| Change `columns` | 0 | 0 | 0 |
| Retitle one widget | 0 | 1 | 0 |
| Change one data widget's config | 1 | 1 | 0 |
| Remove one widget | 0 | 0 | 1 (the removal) |
| Add one widget | 1 | 0 | 1 |
| Reorder two widgets | 0 | 0 | 4 (the two moved nodes) |
| Change a source (global) | all | all | 0 |

The initial render is unchanged (fingerprint hash identical to the pre-refactor code). Things learned on the way:
removing a widget while it was still in the DOM made every later widget look out of place and get reconnected
(re-running `connectedCallback`, which refetches for some widgets), so stale nodes are now dropped before ordering;
sources and filters are compared by content in the signature so an app that passes a fresh but equal configuration
doesn't rebuild everything. Known leftover: a `colorTheme` change still recreates every widget (the theme is part of
every signature); it could be passed to widgets in place if that ever matters.

### Phase 1: editable canvas (done)

`<report-builder>` is implemented (`src/components/report-builder/`, user docs in `docs/report-builder.md`): controlled
`configuration` / `configurationChange`, an overlay with selection frames and eight resize handles over the unmodified
viewer, move and resize through `moveItem` / `setItemRect` with a live preview configuration that is committed on
release, Delete, Escape (cancel / clear selection) and Shift/Ctrl-click multi-select, `addWidget` / `removeWidgets` /
`updateWidget` / `select` methods, `widgetSelect`, `widgetCatalog` for sizes and defaults, `readOnly`, `compact`
and the interaction preview (`outline` hides the body of the widget being dragged via `--fl-widget-body-display`).

Verified in the browser on the 50-widget demo with synthetic pointer events: frames coincide with the rendered widgets,
move (0 to 6 columns) and southeast resize commit one `configurationChange` each and push neighbours down, Escape
cancels without an event, Delete and `addWidget` update the configuration, and the body is hidden only while
interacting. 108 unit tests pass.

Lessons: the viewer owns each cell's inline style, so the outline flag is a `data-interacting` attribute plus a
stylesheet rule, not an inline variable; the viewer builds its grid after the builder renders, so the builder observes
its own root to measure once the grid exists.

Not done in Phase 1: puppeteer e2e tests (the repo has none yet), touch-specific tuning, keyboard moves, a visible
placeholder for the drop target, the `layouts` format in the browser (only covered by unit tests).

### Phase 2: configuration hooks (done)

`configureWidget` prop (add and edit modes, async, null cancels, throwing counts as cancel), `configureOnAdd`, `configure(id)`
method, `widgetAction` event, double-click / Enter / settings button, `replaceWidgetInConfig` (whole-widget replacement,
position preserved). Verified in the browser: add applies custom keys, cancelled add adds nothing, cancelled edit is a
no-op, dblclick, Enter and the button all call the hook. 110 unit tests pass.

Not done from the Phase 2 list: `validate` in the catalog and validation messages on the frame (defer until a real need
shows up; apps can validate inside their own UI).

### Phase 3 (next)

Undo/redo, keyboard moves, duplicate, copy/paste, drop placeholder.
