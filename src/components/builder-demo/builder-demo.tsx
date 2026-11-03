import { Component, Element, State, h } from '@stencil/core';

interface Preset {
  label: string;
  type: string;
  title: string;
  config: Record<string, any>;
  size?: { w: number; h: number };
}

const PRESETS: Preset[] = [
  { label: 'Text', type: 'text', title: 'Notes', config: { text: 'Double-click to edit this text.', fontSize: 'medium', textAlign: 'left', enableFormatting: true } },
  { label: 'KPI', type: 'data', title: 'KPI', size: { w: 3, h: 3 }, config: { sourceId: 'sample-kpi', visualizationType: 'kpi', valueField: 'value', kpiFormatType: 'number' } },
  { label: 'Pie', type: 'data', title: 'Pie Chart', size: { w: 4, h: 4 }, config: { sourceId: 'sample-categorical', visualizationType: 'pie', groupByField: 'category', valueField: 'value', showLegend: true } },
  { label: 'Bar', type: 'data', title: 'Bar Chart', size: { w: 4, h: 4 }, config: { sourceId: 'sample-categorical', visualizationType: 'bar', groupByField: 'category', valueField: 'value', showLabels: true } },
  { label: 'Line', type: 'data', title: 'Line Chart', size: { w: 6, h: 4 }, config: { sourceId: 'sample-time-series', visualizationType: 'line', groupByField: 'date', valueField: 'value', showGrid: true } }
];

interface Dialog {
  mode: 'add' | 'edit';
  widget: Record<string, any>;
  resolve: (widget: Record<string, any> | null) => void;
}

/**
 * Demo page for `<report-builder>`: the sample report from the viewer demo, an app-built toolbar around the builder's
 * methods, a `configureWidget` hook with a small dialog of its own, and a live view of what the builder emits.
 */
@Component({
  tag: 'builder-demo',
  styleUrl: 'builder-demo.scss',
  shadow: false
})
export class BuilderDemo {
  @Element() el!: HTMLElement;

  @State() ready = false;
  @State() report: any;
  @State() selection: string[] = [];
  @State() canUndo = false;
  @State() canRedo = false;
  @State() readOnly = false;
  @State() compact: 'vertical' | 'none' = 'vertical';
  @State() preview: 'outline' | 'live' = 'outline';
  @State() theme: 'light' | 'dark' = 'light';
  @State() showJson = false;
  @State() log: string[] = [];
  @State() dialog?: Dialog;
  @State() dialogError = '';

  private builder?: HTMLReportBuilderElement;
  private initial: any;
  private fetchChartData!: (request: any) => Promise<any>;
  private titleInput?: HTMLInputElement;
  private configInput?: HTMLTextAreaElement;

  async componentWillLoad() {
    // The sample report and its data function live in <report-demo>; run one without UI to borrow them
    const host = document.createElement('report-demo');
    host.setAttribute('headless', '');
    (host as any).headless = true;
    document.body.appendChild(host);
    await (host as any).componentOnReady();
    const kit = await (host as any).getDemoKit();
    host.remove();
    this.initial = kit.configuration;
    this.report = kit.configuration;
    this.fetchChartData = kit.fetchChartData;
    this.ready = true;
  }

  private note(message: string) {
    this.log = [`${new Date().toLocaleTimeString()}  ${message}`, ...this.log].slice(0, 12);
  }

  // --- builder hooks ---------------------------------------------------------------------------------------------

  private onChange = (event: CustomEvent) => {
    this.report = event.detail;
    this.note(`configurationChange (${event.detail.widgets.length} widgets)`);
  };

  private configureWidget = (request: { mode: 'add' | 'edit'; widget: Record<string, any> }) =>
    new Promise<Record<string, any> | null>(resolve => {
      this.dialogError = '';
      this.dialog = { mode: request.mode, widget: request.widget, resolve };
    });

  private closeDialog(result: Record<string, any> | null) {
    const dialog = this.dialog;
    this.dialog = undefined;
    if (dialog) dialog.resolve(result);
  }

  private submitDialog = (event: Event) => {
    event.preventDefault();
    const dialog = this.dialog;
    if (!dialog) return;
    let config: any;
    try {
      config = JSON.parse((this.configInput as HTMLTextAreaElement).value);
    } catch (error) {
      this.dialogError = 'The configuration is not valid JSON.';
      return;
    }
    this.closeDialog({ ...dialog.widget, title: (this.titleInput as HTMLInputElement).value, config });
  };

  // --- toolbar ---------------------------------------------------------------------------------------------------

  private async add(preset: Preset) {
    const used = new Set((this.report.widgets || []).map((w: any) => String(w.id)));
    let n = 1;
    while (used.has(`${preset.label.toLowerCase()}-${n}`)) n++;
    const id = await this.builder?.addWidget(preset.type, { id: `${preset.label.toLowerCase()}-${n}`, title: preset.title, config: preset.config, ...(preset.size || {}) });
    this.note(id ? `added ${id}` : 'add cancelled');
  }

  private reset(empty: boolean) {
    this.report = empty ? { ...this.initial, widgets: [] } : this.initial;
    this.selection = [];
    this.note(empty ? 'started an empty report' : 'reset the sample report');
  }

  render() {
    if (!this.ready) return <div class="bd-loading">Loading the sample report…</div>;
    const hasSelection = this.selection.length > 0;
    const dark = this.theme === 'dark';

    return (
      <div class={{ 'bd-page': true, 'bd-dark': dark }}>
        <header class="bd-header">
          <div>
            <h1>Report builder demo</h1>
            <p>Drag to move, use the handles to resize, double-click to configure. Everything below the canvas is the app's own code.</p>
          </div>
          <a class="bd-link" href="/">Viewer demo →</a>
        </header>

        <div class="bd-toolbar" role="toolbar" aria-label="Report builder toolbar">
          <div class="bd-group">
            <span class="bd-label">Add</span>
            {PRESETS.map(preset => (
              <button type="button" disabled={this.readOnly} onClick={() => this.add(preset)}>{preset.label}</button>
            ))}
          </div>
          <div class="bd-group">
            <button type="button" disabled={!this.canUndo} onClick={() => this.builder?.undo()}>Undo</button>
            <button type="button" disabled={!this.canRedo} onClick={() => this.builder?.redo()}>Redo</button>
            <button type="button" disabled={!hasSelection} onClick={() => this.builder?.duplicate(this.selection)}>Duplicate</button>
            <button type="button" disabled={!hasSelection} onClick={() => this.builder?.removeWidgets(this.selection)}>Delete</button>
          </div>
          <div class="bd-group">
            <label><input type="checkbox" checked={this.readOnly} onChange={(e: any) => (this.readOnly = e.target.checked)} /> Read only</label>
            <label><input type="checkbox" checked={this.compact === 'none'} onChange={(e: any) => (this.compact = e.target.checked ? 'none' : 'vertical')} /> Free placement</label>
            <label><input type="checkbox" checked={this.preview === 'live'} onChange={(e: any) => (this.preview = e.target.checked ? 'live' : 'outline')} /> Live content while dragging</label>
            <label><input type="checkbox" checked={dark} onChange={(e: any) => (this.theme = e.target.checked ? 'dark' : 'light')} /> Dark</label>
          </div>
          <div class="bd-group">
            <button type="button" onClick={() => this.reset(false)}>Reset sample</button>
            <button type="button" onClick={() => this.reset(true)}>Start empty</button>
            <button type="button" onClick={() => (this.showJson = !this.showJson)}>{this.showJson ? 'Hide' : 'Show'} output</button>
          </div>
        </div>

        <div class="bd-body">
          <div class="bd-canvas">
            <report-builder
              ref={el => (this.builder = el as HTMLReportBuilderElement)}
              configuration={this.report}
              fetchChartData={this.fetchChartData}
              configureWidget={this.configureWidget}
              readOnly={this.readOnly}
              compact={this.compact}
              interactionPreview={this.preview}
              theme={this.theme}
              reportId="builder-demo"
              onConfigurationChange={this.onChange}
              onWidgetSelect={(e: CustomEvent) => (this.selection = e.detail.ids)}
              onHistoryChange={(e: CustomEvent) => { this.canUndo = e.detail.canUndo; this.canRedo = e.detail.canRedo; }}
              onWidgetAction={(e: CustomEvent) => this.note(`widgetAction ${e.detail.action} ${e.detail.id}`)}
            ></report-builder>
          </div>

          {this.showJson && (
            <aside class="bd-side">
              <h2>Events</h2>
              <ul class="bd-log">{this.log.map(line => <li>{line}</li>)}</ul>
              <h2>Selected widget</h2>
              <pre>{JSON.stringify((this.report.widgets || []).filter((w: any) => this.selection.includes(String(w.id))), null, 2) || '[]'}</pre>
            </aside>
          )}
        </div>

        {this.dialog && (
          <div class="bd-backdrop" onClick={() => this.closeDialog(null)}>
            <form class="bd-dialog" role="dialog" aria-modal="true" aria-label="Configure widget" onClick={(e: Event) => e.stopPropagation()} onSubmit={this.submitDialog}
              onKeyDown={(e: KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Escape') this.closeDialog(null); }}>
              <h2>{this.dialog.mode === 'add' ? 'Add widget' : 'Configure widget'}</h2>
              <label>Title
                <input type="text" value={this.dialog.widget.title || ''} ref={el => (this.titleInput = el)} />
              </label>
              <label>Configuration (JSON)
                <textarea rows={10} spellcheck={false} ref={el => (this.configInput = el)}>{JSON.stringify(this.dialog.widget.config || {}, null, 2)}</textarea>
              </label>
              {this.dialogError && <p class="bd-error">{this.dialogError}</p>}
              <div class="bd-actions">
                <button type="button" onClick={() => this.closeDialog(null)}>Cancel</button>
                <button type="submit" class="bd-primary">{this.dialog.mode === 'add' ? 'Add' : 'Apply'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }
}
