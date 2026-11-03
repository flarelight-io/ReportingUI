import { Component, Prop, h, Host, State, Watch, Element } from '@stencil/core';

export interface SourceInfoWidgetConfig {
  hideTitle?: boolean;
}

@Component({
  tag: 'source-info-widget',
  styleUrl: 'source-info-widget.scss',
  shadow: true
})
export class SourceInfoWidget {
  @Element() el!: HTMLElement;
  
  @Prop() widgetId: string;
  @Prop() widgetTitle: string;
  @Prop() reportId?: string;
  @Prop() width?: number;
  @Prop() height?: number;
  @Prop() readOnly: boolean = false;
  @Prop() isInEditor: boolean = false;
  @Prop() isViewer?: boolean;
  @Prop() fetchChartData?: (config: any) => Promise<any>;
  @Prop() data?: any;
  @Prop() config: SourceInfoWidgetConfig = {};
  
  @State() loading: boolean = false;
  @State() sourceInfoData: any[] = [];
  
  componentWillLoad() {
    // If we already have data from props, use it
    if (this.data) {
      this.sourceInfoData = this.data;
      this.loading = false;
    } else {
      this.loading = false;
    }
    
    // Listen for data updates
    this.el.addEventListener('dataUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.sourceInfoData = event.detail;
        this.loading = false;
      }
    });
    
    // Listen for config updates
    this.el.addEventListener('configUpdate', (event: CustomEvent) => {
      if (event.detail) {
        this.config = {
          ...this.config,
          ...event.detail
        };
      }
    });
  }
  
  @Watch('config')
  configChanged(newConfig: SourceInfoWidgetConfig) {
    this.config = newConfig;
  }
  
  @Watch('data')
  dataChanged(newData: any) {
    if (newData) {
      this.sourceInfoData = newData;
      this.loading = false;
    }
  }
  
  disconnectedCallback() {
    // Clean up event listeners
    this.el.removeEventListener('dataUpdate', null);
    this.el.removeEventListener('configUpdate', null);
  }
  
  render() {
    if (this.loading) {
      return (
        <Host>
          <base-widget exportparts="card,header,title,body"
            widgetId={this.widgetId}
            widgetTitle={this.widgetTitle || "Source Information"}
            width={this.width}
            height={this.height}
            readOnly={this.readOnly}
            isInEditor={this.isInEditor}
            hideTitle={this.config.hideTitle || false}
          >
            <div class="loading-spinner">Loading...</div>
          </base-widget>
        </Host>
      );
    }

    // Render a DataWidget with table visualization for all sources
    return (
      <Host>
        <data-widget
          widgetId={this.widgetId}
          widgetTitle={this.widgetTitle || "Source Information"}
          reportId={this.reportId}
          width={this.width}
          height={this.height}
          readOnly={this.readOnly}
          isViewer={this.isViewer}
          isInEditor={this.isInEditor}
          fetchChartData={this.fetchChartData}
          data={this.sourceInfoData}
          availableSources={[{
            id: '00000000-0000-0000-0000-000000000000',
            name: "All Sources",
            alias: "Sources",
            type: 'Sources'
          }]}
          config={{
            sourceId: '00000000-0000-0000-0000-000000000000',
            visualizationType: 'table',
            columns: [
              { field: 'Name', header: 'Name' },
              { field: 'SourceType', header: 'Source Type' },
              { field: 'CreatedDate', header: 'Created Date' }
            ],
            hideTitle: this.config.hideTitle
          }}
          activeFilters={[]}
        ></data-widget>
      </Host>
    );
  }
} 