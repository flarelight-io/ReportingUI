import { Component, Prop, h, State, Element } from '@stencil/core';

/** Card size (px) at and above which padding and text are at full size; smaller cards scale down to MIN_SCALE. */
const FULL_HEIGHT = 140;
const FULL_WIDTH = 220;
const MIN_SCALE = 0.4;

export interface WidgetData {
  id: string;
  type: string;
  title: string;
  x: number;       // X position in grid
  y: number;       // Y position in grid
  w: number;       // Width in grid units (1-12)
  h: number;       // Height in grid units
  config?: Record<string, unknown>;    // Widget-specific configuration
  hideTitle?: boolean;
}

@Component({
  tag: 'base-widget',
  styleUrl: 'base-widget.scss',
  shadow: true
})
export class BaseWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() width?: number;  // Width in grid units
  @Prop() height?: number; // Height in grid units
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() hideTitle: boolean = false;
  
  @State() isHovered: boolean = false;
  /** 1 for a normal card, down to MIN_SCALE for a small one. Padding and text sizes follow it (--fl-widget-scale). */
  @State() scale: number = 1;

  private card?: HTMLElement;
  private resizeObserver?: ResizeObserver;

  private measure = () => {
    if (!this.card) return;
    const box = this.card.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const raw = Math.min(box.height / FULL_HEIGHT, box.width / FULL_WIDTH);
    const next = Math.round(Math.min(1, Math.max(MIN_SCALE, raw)) * 20) / 20;
    if (next !== this.scale) this.scale = next;
  };

  componentDidLoad() {
    this.measure();
    if (typeof ResizeObserver !== 'undefined' && this.card) {
      this.resizeObserver = new ResizeObserver(this.measure);
      this.resizeObserver.observe(this.card);
    }
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
  }

  // Event handlers for hover state
  private handleMouseEnter = () => {
    this.isHovered = true;
  }

  private handleMouseLeave = () => {
    this.isHovered = false;
  }

  render() {
    const shouldShowTitleBar = !this.isInEditor && !this.hideTitle;
    const displayTitle = this.widgetTitle || '';

    return (
      <div class="widget-card" part="card" ref={el => (this.card = el)} style={{ '--fl-widget-scale': String(this.scale) }}
        onMouseEnter={this.handleMouseEnter} 
        onMouseLeave={this.handleMouseLeave}
      >
        {shouldShowTitleBar && (
          <div class="widget-header" part="header">
            <div class="title-container">
              <h3 class="widget-title" part="title">{displayTitle}</h3>
            </div>
          </div>
        )}
        <div class={`widget-body ${shouldShowTitleBar ? 'with-title' : 'no-title'}`} part="body">
          <slot></slot>
        </div>
      </div>
    );
  }
} 