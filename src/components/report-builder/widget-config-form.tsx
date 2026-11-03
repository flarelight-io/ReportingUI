import { Component, Element, Event, EventEmitter, Prop, State, h } from '@stencil/core';
import { DataSource } from '../../api/types/common';
import {
  AGGREGATION_SUGGESTIONS, ConfigFormLabels, DEFAULT_CONFIG_FORM_LABELS, FormField, buildFields, setConfigValue
} from '../../utils/config-form';

/**
 * The report builder's default configuration form for one widget: a title, and the fields of the widget type's config
 * schema (see `utils/config-form`). Used by `<report-builder>` when the app gives no `configureWidget` hook (or the hook
 * returns `undefined`), and usable on its own: it emits `configApply` with the edited widget or `configCancel`.
 */
@Component({
  tag: 'widget-config-form',
  styleUrl: 'widget-config-form.scss',
  shadow: false
})
export class WidgetConfigForm {
  @Element() el!: HTMLElement;

  /** The widget being edited (a new one with defaults when adding). */
  @Prop() widget!: Record<string, any>;
  /** The widget type's config schema. */
  @Prop() schema?: Record<string, any>;
  /** Name of the widget type, for the heading. */
  @Prop() typeLabel: string = '';
  @Prop() mode: 'add' | 'edit' = 'edit';
  @Prop() sources: DataSource[] = [];
  @Prop() labels?: Partial<ConfigFormLabels>;

  @Event() configApply: EventEmitter<Record<string, any>>;
  @Event() configCancel: EventEmitter<void>;

  @State() title = '';
  @State() config: Record<string, any> = {};
  @State() errors: Record<string, string> = {};
  @State() rawText = '';
  @State() rawError = '';
  @State() showMore = false;

  private firstInput?: HTMLElement;

  private get text(): ConfigFormLabels {
    return { ...DEFAULT_CONFIG_FORM_LABELS, ...(this.labels || {}) };
  }

  componentWillLoad() {
    this.title = this.widget.title || '';
    this.config = { ...(this.widget.config || {}) };
    this.rawText = JSON.stringify(this.config, null, 2);
  }

  componentDidLoad() {
    if (this.firstInput) this.firstInput.focus();
  }

  private get fields(): FormField[] {
    return buildFields(this.schema, this.config);
  }

  private get sourceFields(): { name: string; label: string }[] {
    const source = this.sources.find(s => s.id === this.config.sourceId);
    return ((source && source.fields) || []).map((f: any) => ({ name: f.name, label: f.displayName || f.name }));
  }

  private update(field: FormField, raw: any) {
    const next = setConfigValue(this.config, field, raw);
    if (!next) {
      this.errors = { ...this.errors, [field.key]: field.kind === 'number' ? 'Enter a number.' : this.text.invalidJson };
      return;
    }
    const errors = { ...this.errors };
    delete errors[field.key];
    this.errors = errors;
    this.setConfig(next);
  }

  private setConfig(next: Record<string, any>) {
    this.config = next;
    this.rawText = JSON.stringify(next, null, 2);
    this.rawError = '';
  }

  private onSource(field: FormField, id: string) {
    const source = this.sources.find(s => s.id === id);
    const next = setConfigValue(this.config, field, id) as Record<string, any>;
    if (source && (source as any).name) next.sourceName = (source as any).name; else delete next.sourceName;
    this.setConfig(next);
  }

  private onRaw(text: string) {
    this.rawText = text;
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      this.config = parsed;
      this.rawError = '';
    } catch {
      this.rawError = this.text.invalidJson;
    }
  }

  private submit = (event: Event) => {
    event.preventDefault();
    if (this.rawError || Object.keys(this.errors).length) return;
    this.configApply.emit({ ...this.widget, title: this.title, config: this.config });
  };

  private onKeyDown = (event: KeyboardEvent) => {
    // The builder around this form binds Delete, arrows and more: keys typed into the form stay in the form
    event.stopPropagation();
    if (event.key === 'Escape') this.configCancel.emit();
  };

  private renderControl(field: FormField, index: number) {
    const id = `wcf-${this.widget.id}-${field.key}`;
    const value = this.config[field.key];
    const ref = index === 0 ? (el: HTMLElement) => (this.firstInput = el) : undefined;
    const names = this.sourceFields;
    switch (field.kind) {
      case 'boolean':
        return <input id={id} ref={ref} type="checkbox" checked={value === undefined ? !!field.default : !!value} onChange={(e: any) => this.update(field, e.target.checked)} />;
      case 'select':
        return (
          <select id={id} ref={ref} onChange={(e: any) => this.update(field, e.target.value)}>
            <option value="" selected={value === undefined}>{field.default !== undefined ? `${field.default} (default)` : this.text.none}</option>
            {(field.options || []).map(option => <option value={option} selected={value === option}>{option}</option>)}
          </select>
        );
      case 'source':
        return (
          <select id={id} ref={ref} onChange={(e: any) => this.onSource(field, e.target.value)}>
            <option value="" selected={value === undefined}>{this.sources.length ? this.text.none : this.text.noSources}</option>
            {this.sources.map(s => <option value={s.id} selected={value === s.id}>{(s as any).name || s.id}</option>)}
            {value !== undefined && !this.sources.some(s => s.id === value) && <option value={value} selected>{String(value)}</option>}
          </select>
        );
      case 'field':
        // A list when the source's fields are known, free text (the backend may know more) when they aren't
        return names.length ? (
          <select id={id} ref={ref} onChange={(e: any) => this.update(field, e.target.value)}>
            <option value="" selected={value === undefined}>{this.text.none}</option>
            {names.map(n => <option value={n.name} selected={value === n.name}>{n.label}</option>)}
            {value !== undefined && !names.some(n => n.name === value) && <option value={value} selected>{String(value)}</option>}
          </select>
        ) : (
          <input id={id} ref={ref} type="text" value={value || ''} onInput={(e: any) => this.update(field, e.target.value)} />
        );
      case 'fieldList':
        return (
          <input id={id} ref={ref} type="text" value={Array.isArray(value) ? value.join(', ') : ''} placeholder={names.map(n => n.name).join(', ')}
            onChange={(e: any) => this.update(field, e.target.value)} />
        );
      case 'aggregation':
        return (
          <span>
            <input id={id} ref={ref} type="text" list={`${id}-list`} value={typeof value === 'object' && value ? JSON.stringify(value) : value || ''}
              onChange={(e: any) => this.update(field, e.target.value)} />
            <datalist id={`${id}-list`}>{AGGREGATION_SUGGESTIONS.map(a => <option value={a}></option>)}</datalist>
          </span>
        );
      case 'number':
        return <input id={id} ref={ref} type="number" min={field.min} max={field.max} value={value === undefined ? '' : String(value)} placeholder={field.default !== undefined ? String(field.default) : ''}
          onChange={(e: any) => this.update(field, e.target.value)} />;
      case 'textarea':
        return <textarea id={id} ref={ref} rows={4} onInput={(e: any) => this.update(field, e.target.value)}>{value || ''}</textarea>;
      case 'json':
        return <textarea id={id} ref={ref} rows={4} spellcheck={false} class="wcf-code" onChange={(e: any) => this.update(field, e.target.value)}>{value === undefined ? '' : JSON.stringify(value, null, 2)}</textarea>;
      default:
        return <input id={id} ref={ref} type="text" value={value === undefined ? '' : String(value)} placeholder={field.default !== undefined ? String(field.default) : ''}
          onInput={(e: any) => this.update(field, e.target.value)} />;
    }
  }

  private renderField(field: FormField, index: number) {
    const id = `wcf-${this.widget.id}-${field.key}`;
    const checkbox = field.kind === 'boolean';
    return (
      <div class={{ 'wcf-field': true, 'wcf-inline': checkbox }} key={field.key}>
        <label htmlFor={id}>{field.kind === 'source' ? this.text.source : field.label}</label>
        {this.renderControl(field, index)}
        {field.description && <p class="wcf-help">{field.description}</p>}
        {this.errors[field.key] && <p class="wcf-error">{this.errors[field.key]}</p>}
      </div>
    );
  }

  render() {
    const text = this.text;
    const fields = this.fields;
    const main = fields.filter(f => f.group === 'main');
    const more = fields.filter(f => f.group === 'more');
    const heading = (this.mode === 'add' ? text.addTitle : text.configureTitle).replace('{type}', this.typeLabel || this.widget.type);

    return (
      <form class="wcf" onSubmit={this.submit} onKeyDown={this.onKeyDown} aria-label={heading}>
        <h2 class="wcf-heading">{heading}</h2>
        <div class="wcf-body">
          <div class="wcf-field">
            <label htmlFor={`wcf-${this.widget.id}-title`}>{text.title}</label>
            <input id={`wcf-${this.widget.id}-title`} type="text" value={this.title} onInput={(e: any) => (this.title = e.target.value)} />
          </div>
          {main.map((field, i) => this.renderField(field, i))}
          <details class="wcf-more" open={this.showMore} onToggle={(e: any) => (this.showMore = e.target.open)}>
            <summary>{text.moreOptions}</summary>
            {this.showMore && more.map((field, i) => this.renderField(field, i + 1))}
            {this.showMore && (
              <div class="wcf-field">
                <label htmlFor={`wcf-${this.widget.id}-raw`}>{text.rawConfig}</label>
                <textarea id={`wcf-${this.widget.id}-raw`} class="wcf-code" rows={8} spellcheck={false} value={this.rawText} onInput={(e: any) => this.onRaw(e.target.value)}></textarea>
                {this.rawError && <p class="wcf-error">{this.rawError}</p>}
              </div>
            )}
          </details>
        </div>
        <div class="wcf-actions">
          <button type="button" onClick={() => this.configCancel.emit()}>{text.cancel}</button>
          <button type="submit" class="wcf-primary">{this.mode === 'add' ? text.add : text.apply}</button>
        </div>
      </form>
    );
  }
}
