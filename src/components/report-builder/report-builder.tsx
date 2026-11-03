import { Component, Element, Event, EventEmitter, Method, Prop, State, Watch, h } from '@stencil/core';
import { DataSource } from '../../api/types/common';
import { LayoutItem, addItem, moveItem, removeItems, sameLayout, setItemRect } from '../../utils/layout';
import {
  addWidgetToConfig, applyLayoutItems, getLayoutItems, nextWidgetId, removeWidgetsFromConfig, updateWidgetInConfig
} from '../../utils/report-layout';
import { parseConfigObject } from '../../utils/config-keys';
import { WidgetTypeDefinition, resolveWidgetType } from '../../utils/widget-catalog';

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
  @State() metrics?: GridMetrics;

  /** The full next configuration, whenever the user changes the layout or the app calls a method. */
  @Event() configurationChange: EventEmitter<any>;
  /** The selection changed. */
  @Event() widgetSelect: EventEmitter<{ ids: string[] }>;

  private rootEl?: HTMLElement;
  private interaction?: Interaction;
  private resizeObserver?: ResizeObserver;
  private observedGrid?: Element;
  private revertTimer?: number;
  private measureFrame?: number;

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

  private emitChange(next: any) {
    this.configurationChange.emit(next);
  }

  @Watch('configuration')
  onConfigurationChange() {
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
    const w = options.w || definition.defaultSize.w;
    const h = options.h || definition.defaultSize.h;
    const items = this.itemsFor(config);
    if (items.some(i => i.id === id)) return null;

    const explicit = options.x !== undefined && options.y !== undefined;
    const added = addItem(
      items,
      { id, w, h, ...(explicit ? { x: options.x, y: options.y } : {}), minW: definition.minSize && definition.minSize.w, minH: definition.minSize && definition.minSize.h, maxW: definition.maxSize && definition.maxSize.w, maxH: definition.maxSize && definition.maxSize.h },
      this.layoutOptions
    );
    const placed = added.find(i => i.id === id);
    if (!placed) return null;

    const initial = definition.defaultConfig ? definition.defaultConfig({ sources: this.sources || config.sources || [] }) : {};
    const widget = { id, type, title: options.title !== undefined ? options.title : definition.label, config: { ...initial, ...(options.config || {}) } };
    let next = addWidgetToConfig(config, widget, { x: placed.x, y: placed.y, w: placed.w, h: placed.h });
    next = applyLayoutItems(next, added, this.columnCount);
    this.emitChange(next);
    this.setSelection([id]);
    return id;
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
    if (event.key === 'Escape') {
      if (this.interaction) this.finishInteraction(false);
      else this.setSelection([]);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && this.selection.length && !this.interaction) {
      event.preventDefault();
      this.removeWidgets([...this.selection]);
    }
  };

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
      <div class="builder-root" ref={el => (this.rootEl = el)} tabindex={this.readOnly ? -1 : 0} onKeyDown={this.onKeyDown}>
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
                >
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
