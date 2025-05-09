import { Component, Prop, h, Host } from '@stencil/core';

export interface TextWidgetConfig {
  text: string;
  fontSize?: 'small' | 'medium' | 'large';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  hideTitle?: boolean;
  // Enhanced format options
  enableFormatting?: boolean;
  titleText?: string;
  titleSize?: 'h1' | 'h2' | 'h3';
  showDivider?: boolean;
  dividerStyle?: 'solid' | 'dashed' | 'dotted';
}

@Component({
  tag: 'text-widget',
  styleUrl: 'text-widget.scss',
  shadow: true
})
export class TextWidget {
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = true;
  @Prop() config: TextWidgetConfig = { 
    text: 'Text content goes here', 
    fontSize: 'medium', 
    textAlign: 'left',
    verticalAlign: 'top',
    enableFormatting: false,
    titleText: '',
    titleSize: 'h2',
    showDivider: false,
    dividerStyle: 'solid'
  };

  // Helper function to process simple markdown-like formatting
  private formatText(text: string): string {
    if (!text) return '';
    
    // Process bold text: **bold**
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Process italic text: *italic*
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Process links: [text](url)
    formattedText = formattedText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-link" target="_blank">$1</a>');
    
    return formattedText;
  }

  private getFontSize(): string {
    switch (this.config.fontSize) {
      case 'small': return 'text-small';
      case 'large': return 'text-large';
      default: return 'text-medium';
    }
  }

  private getTextAlign(): string {
    switch (this.config.textAlign) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  }
  
  private getVerticalAlign(): string {
    switch (this.config.verticalAlign) {
      case 'middle': return 'vertical-middle';
      case 'bottom': return 'vertical-bottom';
      default: return 'vertical-top';
    }
  }
  
  private getTitleSize(): string {
    switch (this.config.titleSize) {
      case 'h1': return 'title-large';
      case 'h3': return 'title-small';
      default: return 'title-medium';
    }
  }
  
  private getDividerStyle(): string {
    switch (this.config.dividerStyle) {
      case 'dashed': return 'divider-dashed';
      case 'dotted': return 'divider-dotted';
      default: return 'divider-solid';
    }
  }

  // Format for normal text mode (no title/description separation)
  private renderSimpleText() {
    const formattedContent = this.config.enableFormatting 
      ? this.formatText(this.config.text)
      : this.config.text;

    return (
      <div class={`text-content ${this.getFontSize()}`}
          innerHTML={formattedContent}></div>
    );
  }
  
  // Format for title + description mode
  private renderTitleWithContent() {
    const formattedContent = this.config.enableFormatting 
      ? this.formatText(this.config.text)
      : this.config.text;

    return (
      <div class="title-content-layout">
        {this.config.titleText && (
          <div class={`content-title ${this.getTitleSize()} ${this.getTextAlign()}`}>
            {this.config.titleText}
          </div>
        )}
        
        {this.config.showDivider && this.config.titleText && (
          <div class={`content-divider ${this.getDividerStyle()}`}></div>
        )}
        
        <div class={`text-content ${this.getFontSize()}`}
            innerHTML={formattedContent}></div>
      </div>
    );
  }

  render() {
    return (
      <Host>
        <base-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isInEditor={this.isInEditor}
          hideTitle={this.config.hideTitle}
        >
          <div class={`text-widget-container ${this.getTextAlign()} ${this.getVerticalAlign()}`}>
            {this.config.titleText ? this.renderTitleWithContent() : this.renderSimpleText()}
          </div>
        </base-widget>
      </Host>
    );
  }
} 