import { Component, Prop, h, Host } from '@stencil/core';
import { DataSource } from '../../api/types/common';

export interface SourceInfoWidgetConfig {
  sourceId?: string;
  hideTitle?: boolean;
  showFieldList?: boolean;
}

@Component({
  tag: 'source-info-widget',
  styleUrl: 'source-info-widget.scss',
  shadow: true
})
export class SourceInfoWidget {
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = true;
  @Prop() config: SourceInfoWidgetConfig = { 
    sourceId: '',
    hideTitle: false,
    showFieldList: true 
  };
  @Prop() availableSources: DataSource[] = [];

  render() {
    // Find the selected source from available sources
    const selectedSource = this.availableSources.find(source => source.id === this.config.sourceId);

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
          <div class="source-info-widget">
            {selectedSource ? (
              <div class="source-content">
                <h3 class="source-name">{selectedSource.name}</h3>
                
                {selectedSource.description && (
                  <p class="source-description">{selectedSource.description}</p>
                )}
                
                {this.config.showFieldList && selectedSource.fields && selectedSource.fields.length > 0 && (
                  <div class="fields-container">
                    <h4 class="fields-title">Fields:</h4>
                    <ul class="fields-list">
                      {selectedSource.fields.map(field => (
                        <li class="field-item" key={field.name}>
                          <span class="field-name">{field.displayName || field.name}</span>
                          {field.description && (
                            <span class="field-description">{field.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div class="empty-state">
                <p>No data source selected</p>
              </div>
            )}
          </div>
        </base-widget>
      </Host>
    );
  }
} 