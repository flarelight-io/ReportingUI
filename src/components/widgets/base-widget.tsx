import { Component, Prop, h, State, Element } from '@stencil/core';

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
  @Prop() isInEditor: boolean = true;
  @Prop() hideTitle: boolean = false;
  
  @State() isHovered: boolean = false;

  // Event handlers for hover state
  private handleMouseEnter = () => {
    this.isHovered = true;
  }

  private handleMouseLeave = () => {
    this.isHovered = false;
  }

  render() {
    const shouldShowTitleBar = !this.isInEditor && !this.hideTitle;

    return (
      <div class="widget-card" 
        onMouseEnter={this.handleMouseEnter} 
        onMouseLeave={this.handleMouseLeave}
      >
        {shouldShowTitleBar && (
          <div class="widget-header">
            <div class="title-container">
              <h3 class="widget-title">{this.widgetTitle}</h3>
            </div>
          </div>
        )}
        <div class={`widget-body ${shouldShowTitleBar ? 'with-title' : 'no-title'}`}>
          <slot></slot>
        </div>
      </div>
    );
  }
} 