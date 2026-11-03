import { Component, Element, Event, EventEmitter, Method, Prop, State, Watch, h } from '@stencil/core';
import { DataSource } from '../../api/types/common';
import { LayoutItem, addItem, moveItem, removeItems, sameLayout, setItemRect } from '../../utils/layout';
import {
  addWidgetToConfig, applyLayoutItems, getLayoutItems, nextWidgetId, removeWidgetsFromConfig, replaceWidgetInConfig, ReportWidgetDef, updateWidgetInConfig
} from '../../utils/report-layout';
import { parseConfigObject } from '../../utils/config-keys';
import { WidgetTypeDefinition, resolveWidgetType } from '../../utils/widget-catalog';
import { ConfigFormLabels, configSchemaFor } from '../../utils/config-form';

const HISTORY_LIMIT = 100;

type Edge = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const EDGES: Edge[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

interface GridMetrics {
  /** Offset of the grid inside the builder, and its size, in px. */
  left: number;
  top: number;
  width: number;
  height: number;
  columnWidth: number;
  rowHeight: number;
  gap: number;
  columns: number;
}

interface Interaction {
  mode: 'move' | 'resize';
  id: string;
  edge?: Edge;
  pointerId: number;
  startX: number;
  startY: number;
  startItems: LayoutItem[];
  baseConfig: any;
}

/**
 * Edit layer for a report: select, move, resize, add and delete widgets on the grid. The configuration is
 * controlled: it is passed in, and every user change is emitted as `configurationChange` with the full next
 * configuration for the app to apply (and save). Widgets render with the regular `<report-viewer>`, so what you
 * edit is what the viewer shows. The builder has no toolbar or palette: apps build their own around `addWidget`,
 * `removeWidgets`, `updateWidget` and `select`.
 */
@Component({
  tag: 'report-builder',
  styleUrl: 'report-builder.scss',
  shadow: false
})
export class ReportBuilder {
  @Element() el!: HTMLElement;

  /** The report configuration. Controlled: apply `configurationChange` by setting this again. */
  @Prop() configuration: any;
  /** Sources available in the report (overrides `configuration.sources`). */
  @Prop() sources?: DataSource[];
  /** Describes the widget types users can add: sizes, limits, default config. Types not listed use built-in defaults. */
  @Prop() widgetCatalog?: WidgetTypeDefinition[];
  /** Same data function the viewer takes, so widgets show real data while editing. */
  @Prop() fetchChartData: Function;
  @Prop() reportId?: string;
  /** Turns the editing layer off: the report just renders. */
  @Prop() readOnly: boolean = false;
  /**
   * `vertical` (default): colliding widgets are pushed down and gaps close upwards. `none`: widgets stay where they
   * are put and moves that would overlap are rejected.
   */
  @Prop() compact: 'vertical' | 'none' = 'vertical';
  /**
   * What a widget shows while it is dragged or resized: `outline` (default) hides its content and keeps the frame and
   * title, which is cheaper and a clearer drop target; `live` keeps the content visible.
   */
  @Prop() interactionPreview: 'outline' | 'live' = 'outline';
  /**
   * Called to configure a widget: when one is added (`mode: 'add'`) and when the user double-clicks it, presses Enter
   * or uses its settings button (`'edit'`). Open whatever UI you like, then resolve with the new widget definition
   * (any keys the backend supports), or `null` to cancel: a cancelled add adds nothing, a cancelled edit changes nothing.
   */
  @Prop() configureWidget?: (request: {
    mode: 'add' | 'edit';
    widget: Record<string, any>;
    definition: { type: string; label: string; defaultSize: { w: number; h: number }; minSize?: { w: number; h: number }; maxSize?: { w: number; h: number } };
    sources: DataSource[];
  }) => Promise<Record<string, any> | null> | Record<string, any> | null;
  /**
   * The built-in configuration form, used when there is no `configureWidget` hook (or the hook resolves with
   * `undefined`, which means "use the default for this one"): `panel` (default) is a drawer on the right, `modal` a
   * centered dialog, `none` turns the default off so widgets are only configured through the hook or `updateWidget`.
   */
  @Prop() configurePanel: 'panel' | 'modal' | 'none' = 'panel';
  /** Texts of the built-in form (translations); anything left out stays English. */
  @Prop() configLabels?: Partial<ConfigFormLabels>;
  /** Whether `addWidget` calls `configureWidget` before adding. */
  @Prop() configureOnAdd: boolean = true;
  /** Presentation, passed to the viewer (see `<report-viewer>`). */
  @Prop() columns?: number;
  @Prop() rowHeight?: number;
  @Prop() rowAspectRatio?: number;
  @Prop() gap?: number;
  @Prop() theme: 'light' | 'dark' | 'auto' = 'auto';

  /** Ids of the selected widgets. */
  @State() selection: string[] = [];
  /** The layout while a widget is being dragged or resized (applied for real on release). */
  @State() preview?: any;
  @State() interactingId?: string;
  /** The built-in form, while it is open. */
  @State() panel?: { mode: 'add' | 'edit'; widget: Record<string, any>; definition: ReturnType<typeof resolveWidgetType>; resolve: (widget: Record<string, any> | null) => void };
  @State() metrics?: GridMetrics;
  @State() history?: { canUndo: boolean; canRedo: boolean };
  @State() announcement = '';

  /** The full next configuration, whenever the user changes the layout or the app calls a method. */
  @Event() configurationChange: EventEmitter<any>;
  /** The selection changed. */
  @Event() widgetSelect: EventEmitter<{ ids: string[] }>;
  /** The user asked to configure a widget (double-click, Enter, settings button) or `configure()` was called. */
  /** Undo/redo availability changed. */
  @Event() historyChange: EventEmitter<{ canUndo: boolean; canRedo: boolean }>;
  @Event() widgetAction: EventEmitter<{ id: string; action: 'configure' }>;

  private rootEl?: HTMLElement;
  private interaction?: Interaction;
  private resizeObserver?: ResizeObserver;
  private observedGrid?: Element;
  private revertTimer?: number;
  private measureFrame?: number;
  private past: any[] = [];
  private future: any[] = [];
  /** Serialized form of the configuration we expect the app to hold (what we last emitted or were given). */
  private knownKey?: string;
  private clipboard: any[] = [];

  // --- configuration ---------------------------------------------------------------------------------------------

  /** The configuration as an object: the live preview while interacting, otherwise the property. */
  private get config(): any {
    return this.preview || parseConfigObject(this.configuration) || { widgets: [] };
  }

  private get columnCount(): number {
    const n = this.columns !== undefined ? Number(this.columns) : Number(this.config.columns);
    return isFinite(n) && n >= 1 ? Math.floor(n) : 12;
  }

  private get layoutOptions() {
    return { columns: this.columnCount, compact: this.compact };
  }

  /** Layout items with size limits (from the catalog) and locked flags (from the widget). */
  private itemsFor(config: any): LayoutItem[] {
    const defs: any[] = Array.isArray(config.widgets) ? config.widgets : [];
    return getLayoutItems(config, this.columnCount).map(item => {
      const def = defs.find(d => String(d.id) === item.id);
      const type = def ? resolveWidgetType(def.type, this.widgetCatalog) : undefined;
      return {
        ...item,
        locked: !!(def && def.locked),
        minW: type && type.minSize ? type.minSize.w : undefined,
        minH: type && type.minSize ? type.minSize.h : undefined,
        maxW: type && type.maxSize ? type.maxSize.w : undefined,
        maxH: type && type.maxSize ? type.maxSize.h : undefined
      };
    });
  }

  private emitChange(next: any, record = true) {
    const current = parseConfigObject(this.configuration);
    if (record && current) {
      this.past.push(current);
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
    }
    this.knownKey = JSON.stringify(next);
    this.configurationChange.emit(next);
    this.notifyHistory();
  }

  // --- history ---------------------------------------------------------------------------------------------------

  private notifyHistory() {
    const state = { canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
    if (!this.history || this.history.canUndo !== state.canUndo || this.history.canRedo !== state.canRedo) {
      this.history = state;
      this.historyChange.emit(state);
    }
  }

  /** Steps back to the configuration before the last change the builder made. Resolves with whether it did. */
  @Method()
  async undo(): Promise<boolean> {
    const previous = this.past.pop();
    if (!previous) return false;
    const current = parseConfigObject(this.configuration);
    if (current) this.future.push(current);
    this.emitChange(previous, false);
    this.announce('Undone');
    return true;
  }

  /** Re-applies a change that was undone. Resolves with whether it did. */
  @Method()
  async redo(): Promise<boolean> {
    const next = this.future.pop();
    if (!next) return false;
    const current = parseConfigObject(this.configuration);
    if (current) this.past.push(current);
    this.emitChange(next, false);
    this.announce('Redone');
    return true;
  }

  /** Screen reader message, spoken through a polite live region. */
  private announce(message: string) {
    this.announcement = message;
  }

  private titleOf(id: string): string {
    const def = (Array.isArray(this.config.widgets) ? this.config.widgets : []).find((d: any) => String(d.id) === id);
    return (def && def.title) || id;
  }

  @Watch('configuration')
  onConfigurationChange() {
    // A configuration the builder didn't propose (the app loaded another report, edited it itself) ends the history:
    // going back would silently discard that change
    const key = JSON.stringify(parseConfigObject(this.configuration));
    if (key !== this.knownKey) {
      this.past = [];
      this.future = [];
      this.notifyHistory();
    }
    this.knownKey = key;
    // The app applied (or replaced) the configuration: the preview is no longer needed
    if (this.revertTimer) { clearTimeout(this.revertTimer); this.revertTimer = undefined; }
    if (!this.interaction) this.preview = undefined;
    this.pruneSelection();
  }

  private pruneSelection() {
    const ids = new Set(this.itemsFor(parseConfigObject(this.configuration) || { widgets: [] }).map(i => i.id));
    const kept = this.selection.filter(id => ids.has(id));
    if (kept.length !== this.selection.length) this.setSelection(kept);
  }

  private setSelection(ids: string[]) {
    if (ids.length === this.selection.length && ids.every((id, i) => id === this.selection[i])) return;
    this.selection = ids;
    this.widgetSelect.emit({ ids });
  }

  // --- public methods --------------------------------------------------------------------------------------------

  /**
   * Adds a widget of the given type (at the first free spot, or at `x`/`y`) and selects it. Resolves with its id, or
   * null when it couldn't be placed (for example `compact: 'none'` and no room at the requested position).
   */
  @Method()
  async addWidget(
    type: string,
    options: { id?: string; title?: string; x?: number; y?: number; w?: number; h?: number; config?: Record<string, any> } = {}
  ): Promise<string | null> {
    const config = parseConfigObject(this.configuration) || { widgets: [] };
    const definition = resolveWidgetType(type, this.widgetCatalog);
    const id = options.id || nextWidgetId(config, type);
    if (this.itemsFor(config).some(i => i.id === id)) return null;

    const initial = definition.defaultConfig ? definition.defaultConfig({ sources: this.currentSources(config) }) : {};
    let widget: Record<string, any> = { id, type, title: options.title !== undefined ? options.title : definition.label, config: { ...initial, ...(options.config || {}) } };

    if (this.hasConfigUi && this.configureOnAdd) {
      // Let the app configure the draft first; nothing is added if it cancels
      const draft = this.placeNewWidget(config, widget, options, definition);
      if (!draft) return null;
      const result = await this.runConfigureHook('add', { ...widget, ...draft.rect }, definition);
      if (!result) return null;
      widget = { ...result, id, type: result.type || type };
    }

    // Place against the latest configuration: it may have changed while the app's UI was open
    const latest = parseConfigObject(this.configuration) || { widgets: [] };
    if (this.itemsFor(latest).some(i => i.id === id)) return null;
    const placed = this.placeNewWidget(latest, widget, options, definition);
    if (!placed) return null;
    this.emitChange(placed.config);
    this.setSelection([id]);
    return id;
  }

  private currentSources(config: any): DataSource[] {
    return this.sources || config.sources || [];
  }

  /** The configuration with the widget added at a free spot (or the requested one), or null if it doesn't fit. */
  private placeNewWidget(config: any, widget: Record<string, any>, options: { x?: number; y?: number; w?: number; h?: number }, definition: ReturnType<typeof resolveWidgetType>) {
    const id = String(widget.id);
    const explicit = options.x !== undefined && options.y !== undefined;
    const added = addItem(
      this.itemsFor(config),
      {
        id,
        w: options.w || definition.defaultSize.w,
        h: options.h || definition.defaultSize.h,
        ...(explicit ? { x: options.x, y: options.y } : {}),
        minW: definition.minSize && definition.minSize.w, minH: definition.minSize && definition.minSize.h,
        maxW: definition.maxSize && definition.maxSize.w, maxH: definition.maxSize && definition.maxSize.h
      },
      this.layoutOptions
    );
    const item = added.find(i => i.id === id);
    if (!item) return null;
    const rect = { x: item.x, y: item.y, w: item.w, h: item.h };
    const { x, y, w, h, ...rest } = widget;
    let next = addWidgetToConfig(config, rest as any, rect);
    next = applyLayoutItems(next, added, this.columnCount);
    return { config: next, rect };
  }

  private get hasConfigUi(): boolean {
    return !!this.configureWidget || this.configurePanel !== 'none';
  }

  /**
   * Asks the app's hook, then falls back to the built-in form when there is no hook or it resolved with `undefined`.
   * A hook that throws counts as a cancel (and is reported to the console).
   */
  private async runConfigureHook(mode: 'add' | 'edit', widget: Record<string, any>, definition: ReturnType<typeof resolveWidgetType>): Promise<Record<string, any> | null> {
    let result: any;
    if (this.configureWidget) {
      try {
        result = await this.configureWidget({ mode, widget, definition, sources: this.currentSources(this.config) });
      } catch (error) {
        console.error('[report-builder] configureWidget failed', error);
        return null;
      }
    }
    if (result === undefined && this.configurePanel !== 'none') return this.openPanel(mode, widget, definition);
    return result && typeof result === 'object' ? result : null;
  }

  private openPanel(mode: 'add' | 'edit', widget: Record<string, any>, definition: ReturnType<typeof resolveWidgetType>) {
    // Only one form at a time: a new request cancels the open one
    if (this.panel) this.closePanel(null);
    return new Promise<Record<string, any> | null>(resolve => {
      this.panel = { mode, widget, definition, resolve };
    });
  }

  private closePanel(result: Record<string, any> | null) {
    const panel = this.panel;
    this.panel = undefined;
    if (panel) panel.resolve(result);
    if (this.rootEl) this.rootEl.focus();
  }

  /**
   * Starting configuring a widget: emits `widgetAction` (`configure`) and, when a `configureWidget` hook is set, calls it
   * and applies the widget it resolves with. Resolves with whether a change was applied. Without a hook, apps listen
   * for `widgetAction` and call `updateWidget`.
   */
  @Method()
  async configure(id: string): Promise<boolean> {
    const config = parseConfigObject(this.configuration) || { widgets: [] };
    const defs: any[] = Array.isArray(config.widgets) ? config.widgets : [];
    const def = defs.find(d => String(d.id) === id);
    if (!def || this.readOnly) return false;
    this.widgetAction.emit({ id, action: 'configure' });
    if (!this.hasConfigUi) return false;
    const item = this.itemsFor(config).find(i => i.id === id);
    const result = await this.runConfigureHook('edit', { ...def, ...(item ? { x: item.x, y: item.y, w: item.w, h: item.h } : {}) }, resolveWidgetType(def.type, this.widgetCatalog));
    if (!result) return false;
    const latest = parseConfigObject(this.configuration) || { widgets: [] };
    const next = replaceWidgetInConfig(latest, id, { ...result, id } as ReportWidgetDef);
    if (next === latest) return false;
    this.emitChange(next);
    return true;
  }

  /** Removes widgets and closes the gaps they leave (unless `compact` is `none`). */
  @Method()
  async removeWidgets(ids: string[]): Promise<void> {
    const config = parseConfigObject(this.configuration) || { widgets: [] };
    const removable = new Set(this.itemsFor(config).filter(i => !i.locked).map(i => i.id));
    const gone = ids.filter(id => removable.has(id));
    if (gone.length === 0) return;
    const remaining = removeItems(this.itemsFor(config), gone, this.layoutOptions);
    let next = removeWidgetsFromConfig(config, gone);
    next = applyLayoutItems(next, remaining, this.columnCount);
    this.emitChange(next);
    this.setSelection(this.selection.filter(id => !gone.includes(id)));
  }

  /**
   * Merges a patch into a widget (title, config, position, anything). This is how an app applies its own
   * configuration UI. A position change is run through the layout engine so other widgets make room.
   */
  @Method()
  async updateWidget(id: string, patch: Record<string, any>): Promise<void> {
    const config = parseConfigObject(this.configuration) || { widgets: [] };
    const { x, y, w, h, ...rest } = patch;
    let next = Object.keys(rest).length ? updateWidgetInConfig(config, id, rest) : config;
    if ([x, y, w, h].some(v => v !== undefined)) {
      const items = this.itemsFor(next);
      const current = items.find(i => i.id === id);
      if (!current) return;
      const moved = setItemRect(items, id, { x: x !== undefined ? x : current.x, y: y !== undefined ? y : current.y, w: w !== undefined ? w : current.w, h: h !== undefined ? h : current.h }, this.layoutOptions);
      next = applyLayoutItems(next, moved, this.columnCount);
    }
    if (next !== config) this.emitChange(next);
  }

  /** Adds copies of widgets (new ids, same settings and size) at free spots and selects them. */
  private insertCopies(entries: { def: Record<string, any>; w: number; h: number }[]): string[] {
    let config = parseConfigObject(this.configuration) || { widgets: [] };
    const created: string[] = [];
    for (const { def, w, h } of entries) {
      const { x, y, w: _w, h: _h, locked, ...rest } = def;
      const copy = JSON.parse(JSON.stringify(rest));
      copy.id = nextWidgetId(config, String(def.id));
      const placed = this.placeNewWidget(config, copy, { w, h }, resolveWidgetType(def.type, this.widgetCatalog));
      if (!placed) continue;
      config = placed.config;
      created.push(copy.id);
    }
    if (created.length) {
      this.emitChange(config);
      this.setSelection(created);
    }
    return created;
  }

  private entriesFor(ids: string[]) {
    const config = this.config;
    const defs: any[] = Array.isArray(config.widgets) ? config.widgets : [];
    const items = this.itemsFor(config);
    return ids.map(id => {
      const def = defs.find(d => String(d.id) === id);
      const item = items.find(i => i.id === id);
      return def && item ? { def, w: item.w, h: item.h } : undefined;
    }).filter(Boolean) as { def: Record<string, any>; w: number; h: number }[];
  }

  /** Duplicates widgets (settings and size included) and selects the copies. Resolves with their ids. */
  @Method()
  async duplicate(ids: string[]): Promise<string[]> {
    const created = this.insertCopies(this.entriesFor(ids));
    if (created.length) this.announce(created.length === 1 ? `Duplicated ${this.titleOf(ids[0])}` : `Duplicated ${created.length} widgets`);
    return created;
  }

  /** Remembers widgets for `paste()` (also Ctrl/Cmd+C). The clipboard belongs to the builder, not the system. */
  @Method()
  async copy(ids: string[]): Promise<void> {
    this.clipboard = this.entriesFor(ids).map(e => ({ ...e, def: JSON.parse(JSON.stringify(e.def)) }));
    if (this.clipboard.length) this.announce(`Copied ${this.clipboard.length} widget${this.clipboard.length === 1 ? '' : 's'}`);
  }

  /** Adds copies of what `copy()` remembered. Resolves with the new ids. */
  @Method()
  async paste(): Promise<string[]> {
    const created = this.insertCopies(this.clipboard);
    if (created.length) this.announce(`Pasted ${created.length} widget${created.length === 1 ? '' : 's'}`);
    return created;
  }

  /** Selects widgets by id (an empty list clears the selection). */
  @Method()
  async select(ids: string[]): Promise<void> {
    const existing = new Set(this.itemsFor(this.config).map(i => i.id));
    this.setSelection((ids || []).filter(id => existing.has(id)));
  }

  /** The ids of the selected widgets. */
  @Method()
  async getSelection(): Promise<string[]> {
    return [...this.selection];
  }

  // --- measuring the viewer's grid -------------------------------------------------------------------------------

  private get grid(): HTMLElement | null {
    return this.el.querySelector('.widget-grid');
  }

  private measure = () => {
    this.measureFrame = undefined;
    const grid = this.grid;
    const root = this.rootEl;
    if (!grid || !root) return;
    if (this.observedGrid !== grid) {
      this.resizeObserver?.disconnect();
      this.resizeObserver?.observe(grid);
      this.resizeObserver?.observe(root);
      this.observedGrid = grid;
    }
    const g = grid.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const style = getComputedStyle(grid);
    const gap = parseFloat(style.columnGap) || 0;
    const columns = this.columnCount;
    const next: GridMetrics = {
      left: Math.round((g.left - r.left) * 2) / 2,
      top: Math.round((g.top - r.top) * 2) / 2,
      width: Math.round(g.width * 2) / 2,
      height: Math.round(grid.offsetHeight * 2) / 2,
      columnWidth: Math.round(((grid.clientWidth - gap * (columns - 1)) / columns) * 100) / 100,
      rowHeight: Math.round((parseFloat(style.gridAutoRows) || 0) * 100) / 100,
      gap,
      columns
    };
    const m = this.metrics;
    if (!m || (Object.keys(next) as (keyof GridMetrics)[]).some(k => m[k] !== next[k])) this.metrics = next;
  };

  private scheduleMeasure() {
    if (this.measureFrame === undefined) this.measureFrame = requestAnimationFrame(this.measure);
  }

  componentWillLoad() {
    this.knownKey = JSON.stringify(parseConfigObject(this.configuration));
  }

  componentDidLoad() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
      // The viewer builds its grid after we render; the root grows when it does, which triggers a measure
      if (this.rootEl) this.resizeObserver.observe(this.rootEl);
    }
    this.scheduleMeasure();
  }

  componentDidRender() {
    this.scheduleMeasure();
    this.syncInteractingWidget();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.panel) this.closePanel(null);
    if (this.measureFrame !== undefined) cancelAnimationFrame(this.measureFrame);
    if (this.revertTimer) clearTimeout(this.revertTimer);
  }

  /** Marks the widget being dragged/resized so its frame hides the content (see `interactionPreview`). */
  private syncInteractingWidget() {
    this.el.querySelectorAll('.widget-item[data-interacting]').forEach(node => node.removeAttribute('data-interacting'));
    if (!this.interactingId) return;
    const cell = Array.from(this.el.querySelectorAll('.widget-item')).find(n => n.getAttribute('data-id') === this.interactingId);
    // The stylesheet hides the body (the viewer owns the cell's inline style, so the variable can't live there)
    if (cell) cell.setAttribute('data-interacting', this.interactionPreview);
  }

  // --- pointer interaction ---------------------------------------------------------------------------------------

  private beginInteraction(event: PointerEvent, mode: 'move' | 'resize', id: string, edge?: Edge) {
    if (event.button !== 0 || this.readOnly) return;
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    try { target.setPointerCapture(event.pointerId); } catch { /* not all environments support capture */ }
    this.rootEl?.focus();
    const config = parseConfigObject(this.configuration) || { widgets: [] };
    const startItems = this.itemsFor(config);
    const item = startItems.find(i => i.id === id);
    if (!item || item.locked) return;
    if (mode === 'move') {
      // Shift/ctrl toggles the selection; otherwise grabbing a widget selects it alone
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        this.setSelection(this.selection.includes(id) ? this.selection.filter(s => s !== id) : [...this.selection, id]);
      } else if (!this.selection.includes(id)) {
        this.setSelection([id]);
      }
    }
    this.interaction = { mode, id, edge, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startItems, baseConfig: config };
    this.interactingId = id;
  }

  private onPointerMove = (event: PointerEvent) => {
    const it = this.interaction;
    const m = this.metrics;
    if (!it || event.pointerId !== it.pointerId || !m) return;
    const cellW = m.columnWidth + m.gap;
    const cellH = m.rowHeight + m.gap;
    if (cellW <= 0 || cellH <= 0) return;
    const dx = Math.round((event.clientX - it.startX) / cellW);
    const dy = Math.round((event.clientY - it.startY) / cellH);
    const start = it.startItems.find(i => i.id === it.id) as LayoutItem;

    let next: LayoutItem[];
    if (it.mode === 'move') {
      next = moveItem(it.startItems, it.id, start.x + dx, start.y + dy, this.layoutOptions);
    } else {
      const edge = it.edge as Edge;
      let { x, y, w, h } = start;
      if (edge.includes('e')) w = start.w + dx;
      if (edge.includes('s')) h = start.h + dy;
      if (edge.includes('w')) { x = Math.min(start.x + dx, start.x + start.w - 1); w = start.w + (start.x - x); }
      if (edge.includes('n')) { y = Math.min(start.y + dy, start.y + start.h - 1); h = start.h + (start.y - y); }
      next = setItemRect(it.startItems, it.id, { x, y, w, h }, this.layoutOptions);
    }

    const base = it.baseConfig;
    const preview = sameLayout(next, it.startItems) ? undefined : applyLayoutItems(base, next, this.columnCount);
    if (preview !== this.preview) this.preview = preview;
  };

  private finishInteraction(commit: boolean) {
    const it = this.interaction;
    if (!it) return;
    const preview = this.preview;
    this.interaction = undefined;
    this.interactingId = undefined;
    if (commit && preview && preview !== it.baseConfig) {
      this.emitChange(preview);
      const done = this.itemsFor(preview).find(i => i.id === it.id);
      if (done) this.announce(it.mode === 'move' ? `${this.titleOf(it.id)} moved to column ${done.x + 1}, row ${done.y + 1}` : `${this.titleOf(it.id)} resized to ${done.w} by ${done.h}`);
      // Keep showing the result until the app applies it; if it never does, fall back to the real configuration
      this.revertTimer = window.setTimeout(() => { this.preview = undefined; this.revertTimer = undefined; }, 80);
    } else {
      this.preview = undefined;
    }
  }

  private onPointerUp = (event: PointerEvent) => {
    if (this.interaction && event.pointerId === this.interaction.pointerId) this.finishInteraction(true);
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (this.interaction && event.pointerId === this.interaction.pointerId) this.finishInteraction(false);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (this.readOnly) return;
    // Keys on the settings button belong to the button
    const target = event.target as HTMLElement;
    if (target && target.closest && target.closest('button, input, textarea, select, .builder-panel')) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key;
    if (this.interaction) {
      if (key === 'Escape') this.finishInteraction(false);
      return;
    }
    if (mod && (key === 'z' || key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) this.redo(); else this.undo();
    } else if (mod && (key === 'y' || key === 'Y')) {
      event.preventDefault();
      this.redo();
    } else if (mod && (key === 'd' || key === 'D') && this.selection.length) {
      event.preventDefault();
      this.duplicate([...this.selection]);
    } else if (mod && (key === 'c' || key === 'C') && this.selection.length) {
      event.preventDefault();
      this.copy([...this.selection]);
    } else if (mod && (key === 'v' || key === 'V') && this.clipboard.length) {
      event.preventDefault();
      this.paste();
    } else if (mod && (key === 'a' || key === 'A')) {
      event.preventDefault();
      this.setSelection(this.itemsFor(this.config).map(i => i.id));
    } else if (key === 'Escape') {
      this.setSelection([]);
    } else if (key === 'Enter' && this.selection.length === 1) {
      event.preventDefault();
      this.configure(this.selection[0]);
    } else if ((key === 'Delete' || key === 'Backspace') && this.selection.length) {
      event.preventDefault();
      const ids = [...this.selection];
      const label = ids.length === 1 ? this.titleOf(ids[0]) : `${ids.length} widgets`;
      this.removeWidgets(ids);
      this.announce(`Removed ${label}`);
    } else if (key.startsWith('Arrow') && !mod && this.selection.length === 1) {
      event.preventDefault();
      this.nudge(this.selection[0], key, event.shiftKey);
    } else if (key === 'Tab' && !mod) {
      this.moveFocus(event);
    }
  };

  /** Arrow keys move the selected widget a cell; with Shift they resize it. */
  private nudge(id: string, key: string, resize: boolean) {
    const items = this.itemsFor(this.config);
    const item = items.find(i => i.id === id);
    if (!item || item.locked) return;
    const dx = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
    const dy = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    const next = resize
      ? setItemRect(items, id, { x: item.x, y: item.y, w: item.w + dx, h: item.h + dy }, this.layoutOptions)
      : moveItem(items, id, item.x + dx, item.y + dy, this.layoutOptions);
    if (sameLayout(next, items)) return;
    this.emitChange(applyLayoutItems(parseConfigObject(this.configuration) || { widgets: [] }, next, this.columnCount));
    const after = next.find(i => i.id === id) as LayoutItem;
    this.announce(resize ? `${this.titleOf(id)} resized to ${after.w} by ${after.h}` : `${this.titleOf(id)} moved to column ${after.x + 1}, row ${after.y + 1}`);
  }

  /** Tab walks through the widgets before it lets focus leave the builder. */
  private moveFocus(event: KeyboardEvent) {
    const ids = this.itemsFor(this.config).map(i => i.id);
    if (!ids.length) return;
    const current = this.selection.length === 1 ? ids.indexOf(this.selection[0]) : -1;
    const target = event.shiftKey ? (current < 0 ? ids.length - 1 : current - 1) : current + 1;
    if (target < 0 || target >= ids.length) {
      if (this.selection.length) this.setSelection([]);
      return;
    }
    event.preventDefault();
    this.setSelection([ids[target]]);
    this.announce(`${this.titleOf(ids[target])} selected`);
  }

  private onBackgroundPointerDown = (event: PointerEvent) => {
    if (event.target === event.currentTarget && !event.shiftKey) {
      this.setSelection([]);
      this.rootEl?.focus();
    }
  };

  // --- render ----------------------------------------------------------------------------------------------------

  private frameStyle(item: LayoutItem, m: GridMetrics) {
    const cellW = m.columnWidth + m.gap;
    const cellH = m.rowHeight + m.gap;
    return {
      left: `${item.x * cellW}px`,
      top: `${item.y * cellH}px`,
      width: `${item.w * m.columnWidth + (item.w - 1) * m.gap}px`,
      height: `${item.h * m.rowHeight + (item.h - 1) * m.gap}px`
    };
  }

  render() {
    const config = this.config;
    const m = this.metrics;
    const items = this.readOnly ? [] : this.itemsFor(config);
    const defs: any[] = Array.isArray(config.widgets) ? config.widgets : [];
    const single = this.selection.length === 1 ? this.selection[0] : undefined;

    return (
      <div class="builder-root" ref={el => (this.rootEl = el)} tabindex={this.readOnly ? -1 : 0} onKeyDown={this.onKeyDown} role="group" aria-label="Report builder">
        <div class="builder-live" aria-live="polite" role="status">{this.announcement}</div>
        <report-viewer
          configuration={config}
          sources={this.sources}
          fetchChartData={this.fetchChartData}
          reportId={this.reportId}
          columns={this.columns}
          rowHeight={this.rowHeight}
          rowAspectRatio={this.rowAspectRatio}
          gap={this.gap}
          theme={this.theme}
          heightMode="auto"
        ></report-viewer>
        {this.panel && (
          <div class={`builder-panel builder-panel-${this.configurePanel === 'modal' ? 'modal' : 'drawer'}`} part="panel" onPointerDown={(e: PointerEvent) => e.stopPropagation()}
            onClick={(e: MouseEvent) => { if (e.target === e.currentTarget && this.configurePanel === 'modal') this.closePanel(null); }}>
            <div class="builder-panel-card" role="dialog" aria-modal={this.configurePanel === 'modal' ? 'true' : undefined}>
              <widget-config-form
                key={this.panel.widget.id}
                widget={this.panel.widget}
                mode={this.panel.mode}
                typeLabel={this.panel.widget.type === 'data' && this.panel.widget.config && this.panel.widget.config.visualizationType ? this.panel.widget.config.visualizationType : this.panel.definition.label}
                schema={configSchemaFor(String(this.panel.widget.type), this.widgetCatalog)}
                sources={this.currentSources(this.config)}
                labels={this.configLabels}
                onConfigApply={(e: CustomEvent) => this.closePanel(e.detail)}
                onConfigCancel={() => this.closePanel(null)}
              ></widget-config-form>
            </div>
          </div>
        )}
        {!this.readOnly && m && m.rowHeight > 0 && (
          <div
            class="builder-overlay"
            part="overlay"
            style={{ left: `${m.left}px`, top: `${m.top}px`, width: `${m.width}px`, height: `${m.height}px` }}
            onPointerDown={this.onBackgroundPointerDown}
          >
            {items.map(item => {
              const def = defs.find(d => String(d.id) === item.id);
              const selected = this.selection.includes(item.id);
              return (
                <div
                  key={item.id}
                  class={{ 'builder-frame': true, 'selected': selected, 'interacting': this.interactingId === item.id, 'locked': !!item.locked }}
                  part={selected ? 'frame frame-selected' : 'frame'}
                  data-widget-id={item.id}
                  data-widget-type={def ? def.type : undefined}
                  style={this.frameStyle(item, m)}
                  onPointerDown={(e: PointerEvent) => this.beginInteraction(e, 'move', item.id)}
                  onPointerMove={this.onPointerMove}
                  onPointerUp={this.onPointerUp}
                  onPointerCancel={this.onPointerCancel}
                  onDblClick={() => this.configure(item.id)}
                >
                  {single === item.id && (
                    <button
                      type="button"
                      class="builder-settings"
                      part="settings-button"
                      title="Configure"
                      aria-label="Configure widget"
                      onPointerDown={(e: PointerEvent) => e.stopPropagation()}
                      onClick={() => this.configure(item.id)}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </button>
                  )}
                  {single === item.id && !item.locked && EDGES.map(edge => (
                    <div
                      key={edge}
                      class={`builder-handle handle-${edge}`}
                      part="handle"
                      data-edge={edge}
                      onPointerDown={(e: PointerEvent) => this.beginInteraction(e, 'resize', item.id, edge)}
                      onPointerMove={this.onPointerMove}
                      onPointerUp={this.onPointerUp}
                      onPointerCancel={this.onPointerCancel}
                    ></div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
