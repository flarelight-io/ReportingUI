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

  private onConfigureWidget = () => {
    // Dispatch custom event for configuration
    this.el.dispatchEvent(new CustomEvent('configure', {
      detail: { id: this.widgetId },
      bubbles: true,
      composed: true
    }));
  }

  private onRemoveWidget = () => {
    // Dispatch custom event for removal
    this.el.dispatchEvent(new CustomEvent('remove', {
      detail: { id: this.widgetId },
      bubbles: true,
      composed: true
    }));
  }

  // Event handlers for hover state
  private handleMouseEnter = () => {
    this.isHovered = true;
  }

  private handleMouseLeave = () => {
    this.isHovered = false;
  }

  render() {
    const shouldShowTitleBar = this.isInEditor || !this.hideTitle;

    return (
      <div class="widget-card" 
        onMouseEnter={this.handleMouseEnter} 
        onMouseLeave={this.handleMouseLeave}
      >
        {shouldShowTitleBar && (
          <div class="widget-header">
            <div class="title-container">
              <h3 class="widget-title">{this.widgetTitle}</h3>
              {this.isInEditor && this.hideTitle && (
                <span class="hidden-badge">Hidden</span>
              )}
            </div>
            {this.isInEditor && !this.readOnly && this.isHovered && (
              <div class="widget-actions">
                <button class="action-button" onClick={this.onConfigureWidget}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button class="action-button" onClick={this.onRemoveWidget}>
                  <span class="menu-dots">⋮</span>
                </button>
              </div>
            )}
          </div>
        )}
        <div class={`widget-body ${shouldShowTitleBar ? 'with-title' : 'no-title'}`}>
          <slot></slot>
        </div>
      </div>
    );
  }
} 