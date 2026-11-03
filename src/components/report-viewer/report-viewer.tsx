import { Component, Prop, h, State, Watch, Element, Listen, Event, EventEmitter, Method } from '@stencil/core';
import { DataSource, Filter, ChartDataRequest } from '../../api/types/common';
import { WidgetData } from '../widgets/base-widget';
import { ColorTheme, ChartThemeUtils } from '../../utils/chart-theme';
import { ChartDataRequestBuilder } from '../../utils/chart-data-request-builder';
import { filtersCacheKey, filterIdentity, stableStringify } from '../../utils/filters';
import { resolveRect } from '../../utils/layout';

interface WidgetDataCache {
  [widgetId: string]: any;
}

@Component({
  tag: 'report-viewer',
  styleUrl: 'report-viewer.scss',
  shadow: false
})
export class ReportViewer {
  @Element() el!: HTMLElement;
  
  @Prop() reportId: string;
  @Prop() configuration: any;
  @Prop() showPlaceholder: boolean = true;
  @Prop() isViewer: boolean = false;
  @Prop() isFullscreen: boolean = false;
  @Prop() fetchChartData: Function;
  @Prop() heightMode: 'auto' | 'fixed' = 'auto';
  /**
   * Row height in pixels (heightMode="auto" only). Takes precedence over `rowAspectRatio`
   * and over `rowHeight` in the report configuration.
   */
  @Prop() rowHeight?: number;
  /**
   * Column width divided by row height (heightMode="auto" only): 1 gives square rows (the default),
   * 2 gives rows half as tall as a column is wide. Ignored when `rowHeight` is set.
   */
  @Prop() rowAspectRatio?: number;
  /**
   * Gap between widgets in pixels (0 or more). Defaults to 15. Takes precedence over `gap` in the
   * report configuration and over the `--fl-grid-gap` CSS variable.
   */
  @Prop() gap?: number;
  /**
   * Number of grid columns (default 12). `x` and `w` of widgets are counted in these columns; widgets wider than
   * the grid are clamped. Also available as `columns` in the report configuration; the property wins.
   */
  @Prop() columns?: number;
  /**
   * Data sources for the report. Takes precedence over `configuration.sources`, so apps can supply sources
   * (and their fields) at render time instead of embedding them in the saved report.
   */
  @Prop() sources?: DataSource[];
  /**
   * Light or dark appearance for this report. `auto` (default) follows the page: a `data-theme` attribute or
   * `dark`/`light` class on <html>, otherwise the system preference. `light`/`dark` forces it for this viewer
   * only, so apps can drive it from their own toggle.
   */
  @Prop() theme: 'light' | 'dark' | 'auto' = 'auto';
  /**
   * Filters applied to the report. Providing this property (even `[]`) makes the filters **managed**: the viewer
   * never changes them itself. When the user clicks a chart element it emits `filtersChange` with the proposed
   * list, and the app decides by setting this property again. Leave it undefined for **unmanaged** use, where the
   * viewer keeps the filters itself (and still emits `filtersChange` so the app can observe them).
   */
  @Prop() activeFilters?: Filter[];
  /** Filters to start with in unmanaged mode. Read once on load; ignored when `activeFilters` is provided. */
  @Prop() defaultFilters?: Filter[];
  /**
   * The full filter list after a user interaction. In unmanaged mode the viewer has already applied it; in managed
   * mode it is a request: set `activeFilters` to apply it.
   */
  @Event() filtersChange: EventEmitter<Filter[]>;
  
  @State() widgets: WidgetData[] = [];
  @State() dataSources: DataSource[] = [];
  @State() internalFilters: Filter[] = [];
  @State() widgetData: WidgetDataCache = {};
  @State() colorTheme: ColorTheme = "brand";
  // Row sizing read from the report configuration (props take precedence)
  @State() configRowHeight?: number;
  @State() configRowAspectRatio?: number;
  @State() configGap?: number;
  @State() configColumns?: number;
  private configSources: DataSource[] = [];
  
  private gridContainer?: HTMLElement;
  private dataFetchPromises: { [widgetId: string]: Promise<any> } = {};
  private isMounted: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private configurationPollingInterval?: number;
  private lastConfiguration?: any;
  private lastDataConfigKey?: string;
  private handleResize = () => {
    if (this.isMounted && this.gridContainer) {
      this.setEqualGridDimensions();
    }
  };
  
  private dispatchColorThemeToCorrelationWidgets(colorTheme: ColorTheme) {
    // Find all correlation analysis widgets and dispatch color theme change events
    const correlationWidgets = this.el.querySelectorAll('correlation-analysis-widget');
    correlationWidgets.forEach(widget => {
      const colorThemeEvent = new CustomEvent('colorThemeChange', {
        detail: { colorTheme },
        bubbles: false
      });
      widget.dispatchEvent(colorThemeEvent);
    });
    
    // Also dispatch to box-whisker normality plot widgets
    const boxWhiskerWidgets = this.el.querySelectorAll('box-whisker-normality-plot-widget');
    boxWhiskerWidgets.forEach(widget => {
      const colorThemeEvent = new CustomEvent('colorThemeChange', {
        detail: { colorTheme },
        bubbles: false
      });
      widget.dispatchEvent(colorThemeEvent);
    });
  }
  
  @Watch('configuration')
  onConfigurationChange(newValue: any) {
    let parsedConfig = newValue;
    
    // Handle string configuration (from setAttribute)
    if (typeof newValue === 'string') {
      try {
        parsedConfig = JSON.parse(newValue);
      } catch (e) {
        console.error('Failed to parse configuration string:', e);
        return;
      }
    }
    
    if (parsedConfig) {
      this.lastConfiguration = newValue;
      this.applyConfiguration(parsedConfig);
    }
  }
  
  @Watch('fetchChartData')
  onFetchChartDataChange(newValue: Function) {
    // If we now have fetchChartData and widgets, re-process them
    if (newValue && this.widgets && this.widgets.length > 0) {
      // Reset widget data cache and prefetch data
      this.widgetData = {};
      this.dataFetchPromises = {};
      
      // Pre-fetch data and re-render
      this.prefetchWidgetData().then(() => {
        if (this.gridContainer) {
          this.renderWidgets();
          // Ensure grid dimensions are correct after rendering
          this.setEqualGridDimensions();
        }
      });
    }
  }
  
  /** True when the app owns the filters through the `activeFilters` property. */
  private get isFiltersManaged(): boolean {
    return Array.isArray(this.activeFilters);
  }

  /** The filters in effect: the property when managed, otherwise the viewer's own state. */
  private get currentFilters(): Filter[] {
    return this.isFiltersManaged ? this.activeFilters : this.internalFilters;
  }

  private appliedFiltersKey = 'nofilters';

  /** Order-independent identity of a filter list (objects, arrays and extra properties included). */
  private filtersKey(filters: Filter[]): string {
    return filtersCacheKey(filters || []);
  }

  @Watch('activeFilters')
  onActiveFiltersChange() {
    // Managed mode: the app changed the filters. Skip no-op updates (e.g. a re-created identical array).
    const key = this.filtersKey(this.currentFilters);
    if (key === this.appliedFiltersKey) return;
    this.appliedFiltersKey = key;
    if (this.isMounted) this.refreshForFilters(this.currentFilters.length === 0);
  }

  /** The filters currently in effect (managed or not). */
  @Method()
  async getFilters(): Promise<Filter[]> {
    return this.currentFilters.map(f => ({ ...f }));
  }

  /** Replaces all filters. In managed mode this only emits `filtersChange`; the app applies it via `activeFilters`. */
  @Method()
  async setFilters(filters: Filter[]): Promise<void> {
    // Only sourceId and field are required: operation, value and extra properties belong to the app. A null value
    // only means "no filter" when no operation is given (operations such as isnull legitimately have none).
    this.commitFilters((filters || []).filter(f =>
      f && f.sourceId && f.field && (f.operation || (f.value !== null && f.value !== undefined))
    ));
  }

  /** Removes all filters (same managed/unmanaged rules as `setFilters`). */
  @Method()
  async clearFilters(): Promise<void> {
    this.commitFilters([]);
  }

  /**
   * Single exit for every filter change. Unmanaged: apply and refresh. Managed: only emit; the app applies it by
   * setting `activeFilters`. `filtersChange` is emitted in both modes.
   */
  private commitFilters(next: Filter[]) {
    // Nothing changed (e.g. a rebuilt widget re-reporting its selection): no event, no refetch
    if (this.filtersKey(next) === this.filtersKey(this.currentFilters)) return;
    this.filtersChange.emit(next.map(f => ({ ...f })));
    if (this.isFiltersManaged) return;
    this.internalFilters = next;
    this.appliedFiltersKey = this.filtersKey(next);
    this.refreshForFilters(next.length === 0);
  }

  /** Drops cached data and re-renders every widget for the new filters, then notifies widgets. */
  private refreshForFilters(cleared: boolean) {
    this.widgetData = {};
    this.dataFetchPromises = {};
    const finish = () => {
      if (!this.gridContainer) return;
      this.gridContainer.innerHTML = '';
      this.renderWidgets();
      const event = cleared
        ? new CustomEvent('filters-cleared', { bubbles: true })
        : new CustomEvent('filters-applied', { bubbles: true, detail: { filters: this.currentFilters } });
      this.el.dispatchEvent(event);
    };
    if (this.widgets.length > 0 && this.fetchChartData) {
      this.prefetchWidgetData().then(finish);
    } else {
      finish();
    }
  }

  @Watch('theme')
  onThemeModeChange() {
    this.applyThemeMode();
  }

  private themeAttributeSet = false;

  /** Scopes light/dark to this viewer via data-theme (CSS variables) and re-renders the charts. */
  private applyThemeMode() {
    if (this.theme === 'light' || this.theme === 'dark') {
      this.el.setAttribute('data-theme', this.theme);
      this.themeAttributeSet = true;
    } else if (this.themeAttributeSet) {
      // Only remove what this component set; an app-provided data-theme stays
      this.el.removeAttribute('data-theme');
      this.themeAttributeSet = false;
    }
    ChartThemeUtils.refreshTheme();
  }

  @Watch('columns')
  onColumnsChange() {
    if (!this.isMounted || !this.gridContainer) return;
    this.setEqualGridDimensions();
    // Widget positions are clamped to the number of columns, so place them again
    this.renderWidgets();
  }

  @Watch('sources')
  onSourcesChange() {
    this.applySources();
    if (!this.isMounted) return;
    // Source lookups decide what is fetched, so refresh the data and re-render
    this.widgetData = {};
    this.dataFetchPromises = {};
    this.prefetchAndRender();
  }

  /** The sources in effect: the `sources` property when provided, otherwise the ones from the configuration. */
  private applySources() {
    this.dataSources = Array.isArray(this.sources) ? this.sources : this.configSources;
  }

  /** Number of grid columns in effect: property, then configuration, then 12. */
  private get effectiveColumns(): number {
    return this.positiveInteger(this.columns) ?? this.configColumns ?? 12;
  }

  private positiveInteger(value: unknown): number | undefined {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return typeof n === 'number' && isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
  }

  @Watch('rowHeight')
  @Watch('rowAspectRatio')
  @Watch('gap')
  onRowSizeChange() {
    if (this.isMounted && this.gridContainer) {
      this.setEqualGridDimensions();
    }
  }

  @Watch('heightMode')
  onHeightModeChange() {
    // Recalculate grid dimensions when height mode changes
    if (this.isMounted && this.gridContainer) {
      this.setEqualGridDimensions();
    }
  }
  
  componentWillLoad() {
    if (!this.isFiltersManaged && this.defaultFilters && this.defaultFilters.length > 0) {
      this.internalFilters = this.defaultFilters.map(f => ({ ...f }));
    }
    this.appliedFiltersKey = this.filtersKey(this.currentFilters);
  }

  connectedCallback() {
    this.applyThemeMode();
    if (this.configuration) {
      let parsedConfig = this.configuration;
      if (typeof this.configuration === 'string') {
        try {
          parsedConfig = JSON.parse(this.configuration);
        } catch (e) {
          console.error('Failed to parse configuration string in connectedCallback:', e);
          return;
        }
      }
      
      this.parseConfiguration(parsedConfig);
    }
  }
  
  componentDidLoad() {
    this.isMounted = true;
    
    // Get the grid container element
    this.gridContainer = this.el.querySelector('.widget-grid');
    
    // Listen for color theme changes
    this.el.addEventListener('colorThemeChange', (event: CustomEvent) => {
      if (event.detail && event.detail.colorTheme) {
        this.colorTheme = event.detail.colorTheme;
        
        // Update the configuration object to reflect the new color theme
        if (this.configuration) {
          let parsedConfig = this.configuration;
          if (typeof this.configuration === 'string') {
            try {
              parsedConfig = JSON.parse(this.configuration);
            } catch (e) {
              console.error('Failed to parse configuration string in colorThemeChange:', e);
              return;
            }
          }
          
          // Update the color theme in the configuration
          parsedConfig.colorTheme = event.detail.colorTheme;
          
          // Update the configuration prop (this will trigger the @Watch)
          this.configuration = parsedConfig;
        } else {
          // If no configuration exists, just re-render with the new theme
          this.renderWidgets();
        }
        
        // Also dispatch color theme change events to all existing correlation widgets
        this.dispatchColorThemeToCorrelationWidgets(event.detail.colorTheme);
      }
    });
    
    // Check for configuration again in case it was set after connected but before didLoad
    if (this.configuration && this.widgets.length === 0) {
      let parsedConfig = this.configuration;
      if (typeof this.configuration === 'string') {
        try {
          parsedConfig = JSON.parse(this.configuration);
        } catch (e) {
          console.error('Failed to parse configuration string in componentDidLoad:', e);
        }
      }
      
      if (parsedConfig) {
        this.parseConfiguration(parsedConfig);
      }
    }
    
    if (this.gridContainer) {
      // Set equal row height to column width
      this.setEqualGridDimensions();
      
      // Wait for the (single) prefetch to finish so widgets render with data instead of fetching themselves
      this.prefetchAndRender();
      
      // Add resize observer to update grid dimensions when window resizes
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(this.gridContainer);
      } else {
        // Fallback for browsers without ResizeObserver
        window.addEventListener('resize', this.handleResize);
      }
    } else {
      console.error('Could not find grid container element');
    }
    
    // Configuration handled above is the baseline; polling only reacts to later changes
    this.lastConfiguration = this.configuration;
    this.lastDataConfigKey = this.dataConfigKey(this.configuration);
    // Add a polling mechanism to check for configuration changes
    this.startConfigurationPolling();
  }
  
  disconnectedCallback() {
    this.isMounted = false;
    
    // Clean up configuration polling
    if (this.configurationPollingInterval) {
      clearInterval(this.configurationPollingInterval);
      this.configurationPollingInterval = undefined;
    }
    
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Clean up resize event listener
    window.removeEventListener('resize', this.handleResize);
  }
  
  private parseConfiguration(config: any) {
    // Parse color theme first
    this.configRowHeight = this.positiveNumber(config.rowHeight);
    this.configRowAspectRatio = this.positiveNumber(config.rowAspectRatio);
    this.configGap = this.nonNegativeNumber(config.gap);
    this.configColumns = this.positiveInteger(config.columns);

    if (config.colorTheme && typeof config.colorTheme === 'string') {
      this.colorTheme = config.colorTheme as ColorTheme;
    } else {
      // Default to brand theme if not specified
      this.colorTheme = "brand";
    }
    
    // Parse data sources
    if (config.sources && Array.isArray(config.sources)) {
      this.configSources = config.sources;
    } else {
      if (!Array.isArray(this.sources)) console.warn('No data sources found in configuration');
      this.configSources = [];
    }
    this.applySources();

    // Handle both legacy format (direct widgets) and new format (layouts + widgets)
    let widgets: WidgetData[] = [];
    
    if (config.layouts && config.widgets) {
      // New format: merge layout positioning with widget definitions
      const layoutWidgets = this.extractWidgetsFromLayouts(config.layouts);
      const widgetDefinitions = config.widgets;
      
      // Merge layout positioning with widget definitions
      widgets = layoutWidgets.map(layoutWidget => {
        const widgetDef = widgetDefinitions.find((w: any) => w.id === layoutWidget.id);
        if (widgetDef) {
          return {
            ...layoutWidget, // Layout positioning (x, y, w, h) first
            ...widgetDef,    // Widget definition (type, config, title) overrides placeholder values
            // Keep layout positioning if not specified in widget definition
            x: widgetDef.x !== undefined ? widgetDef.x : layoutWidget.x,
            y: widgetDef.y !== undefined ? widgetDef.y : layoutWidget.y,
            w: widgetDef.w !== undefined ? widgetDef.w : layoutWidget.w,
            h: widgetDef.h !== undefined ? widgetDef.h : layoutWidget.h
          };
        } else {
          console.warn(`Widget definition not found for layout widget ${layoutWidget.id}`);
          return layoutWidget;
        }
      });
    } else if (config.widgets && Array.isArray(config.widgets)) {
      // Legacy format: widgets contain both positioning and definitions
      widgets = config.widgets;
    } else {
      console.warn('No widgets found in configuration');
      widgets = [];
    }
    
    this.widgets = widgets;

    // Pre-fetch data for all widgets
    if (this.widgets.length > 0 && this.fetchChartData) {
      this.prefetchWidgetData();
    }
  }
  
  private extractWidgetsFromLayouts(layouts: any): WidgetData[] {
    // For PDF generation and server-side rendering, prefer 'lg' layout
    // as it's typically the desktop/full-width layout
    let selectedLayout: any[] = [];
    
    // Priority order: lg -> md -> sm -> xs
    if (layouts.lg) {
      selectedLayout = layouts.lg;
    } else if (layouts.md) {
      selectedLayout = layouts.md;
    } else if (layouts.sm) {
      selectedLayout = layouts.sm;
    } else if (layouts.xs) {
      selectedLayout = layouts.xs;
    } else {
      console.warn('No valid layout found in layouts object');
      return [];
    }
    
    // Convert layout items to widget data format
    return selectedLayout.map((item: any) => ({
      id: item.i, // Layout uses 'i' for id
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      // These will be merged with actual widget definitions later
      type: 'placeholder',
      title: '',
      config: {}
    }));
  }
  
  /** Identifies the parts of a configuration that determine fetched data (everything except presentation such as colorTheme). */
  private dataConfigKey(config: any): string | undefined {
    try {
      const parsed = typeof config === 'string' ? JSON.parse(config) : config;
      if (!parsed) return undefined;
      const { colorTheme, ...rest } = parsed;
      return JSON.stringify(rest);
    } catch {
      return undefined;
    }
  }

  /**
   * Applies a changed configuration. The data cache is only invalidated when something that affects the
   * fetched data changed; presentation-only changes (such as the color theme) re-render with the cached data.
   */
  private applyConfiguration(parsedConfig: any) {
    const key = this.dataConfigKey(parsedConfig);
    if (key === undefined || key !== this.lastDataConfigKey || this.widgets.length === 0) {
      this.widgetData = {};
      this.dataFetchPromises = {};
    }
    this.lastDataConfigKey = key;
    this.parseConfiguration(parsedConfig);
    // Rerender once data is in (parseConfiguration started or reused the prefetch)
    this.prefetchAndRender();
  }

  /**
   * Waits for the prefetch (starting it if needed) and then renders once, so widgets are created
   * with their data and never need to fetch it themselves. Without a fetch function it renders at once.
   */
  private async prefetchAndRender() {
    if (this.widgets.length > 0 && this.fetchChartData) {
      await this.prefetchWidgetData();
    }
    if (!this.gridContainer) return;
    this.renderWidgets();
    // Container size can change once content is rendered
    this.setEqualGridDimensions();
  }

  private async prefetchWidgetData() {
    // Create fetch promises for each widget that needs data
    this.widgets.forEach(widget => {
      if (this.needsFetchChartData(widget.type)) {
        const sourceId = widget.config?.sourceId;
        if (!sourceId) return;
        
        const source = this.dataSources.find(s => s.id === sourceId);
        if (!source) return;
        
        // Reuse an in-flight (or finished) request; callers invalidate by resetting dataFetchPromises
        if (this.dataFetchPromises[widget.id]) return;
        this.dataFetchPromises[widget.id] = this.fetchDataForWidget(widget, source);
      }
    });
    
    // Wait for all fetch promises to resolve
    await Promise.all(Object.values(this.dataFetchPromises));
  }
  
  private async fetchDataForWidget(widget: WidgetData, source: DataSource): Promise<any> {
    if (!this.fetchChartData) {
      console.error("fetchChartData function not available");
      return null;
    }
    
    if (!this.reportId) {
      console.error("reportId is required for fetching data");
      return null;
    }
    
    try {
      const sourceId = (widget.config?.analysisId || widget.config?.sourceId) as string;
      
      // Get relevant filters for this source
      const sourceFilters = this.currentFilters.filter(f => f.sourceId === sourceId);
      
      // Create cache key based on source and filters
      const filterKey = filtersCacheKey(sourceFilters);
      
      const cacheKey = `${sourceId}:${filterKey}`;
      
      // Check if we already have this data in the cache
      if (this.widgetData[widget.id] && !this.currentFilters.some(f => f.sourceId === sourceId)) {
        return this.widgetData[widget.id];
      }
      
      // Determine visualization type
      const visualizationType = widget.type === 'data'
        ? (widget.config?.visualizationType as string || 'table')
        : widget.type;
      
      // Check if this is an analysis widget
      const isAnalysisWidget = this.needsFetchChartData(widget.type) && 
        (widget.type !== 'data' && widget.type !== 'table' && widget.type !== 'kpi' &&
         widget.type !== 'bar' && widget.type !== 'pie' && widget.type !== 'donut' &&
         widget.type !== 'line' && widget.type !== 'hbar' && widget.type !== 'scatter' &&
         widget.type !== 'sunburst' && widget.type !== 'heatmap' && widget.type !== 'bubble' &&
         widget.type !== 'histogram' && widget.type !== 'stacked-bar' && widget.type !== 'stacked-hbar' &&
         widget.type !== 'clustered-bar' && widget.type !== 'clustered-hbar' &&
         widget.type !== 'lollipop' && widget.type !== 'lollipop-h');
      
      let chartDataRequest: ChartDataRequest;
      
      if (isAnalysisWidget && widget.config?.analysisId) {
        // Use analysis widget builder
        chartDataRequest = ChartDataRequestBuilder.buildForAnalysisWidget(
          this.reportId,
          widget.config.analysisId as string,
          widget.id,
          visualizationType,
          this.isViewer
        );
      } else {
        // Use data widget builder
        chartDataRequest = ChartDataRequestBuilder.buildForDataWidget(
          this.reportId,
          source,
          widget.id,
          visualizationType,
          widget.config || {},
          this.currentFilters,
          this.isViewer
        );
      }
      
      // Add cache key to request as extra property outside the typed object
      const requestWithCache = {
        ...chartDataRequest,
        _cacheKey: cacheKey
      };
      
      // Fetch the data
      const response = await this.fetchChartData(requestWithCache);
      
      // Store in widget data cache
      this.widgetData = {
        ...this.widgetData,
        [widget.id]: response || []
      };
      
      return response;
    } catch (error) {
      console.error(`Error fetching data for widget ${widget.id}:`, error);
      return null;
    }
  }
  
  private needsFetchChartData(widgetType: string): boolean {
    return ['data', 'table', 'kpi', 'bar', 'pie', 'donut', 'line', 'hbar', 
            'scatter', 'sunburst', 'heatmap', 'bubble', 'histogram',
            'stacked-bar', 'stacked-hbar', 'clustered-bar', 'clustered-hbar', 'lollipop', 'lollipop-h',
            'descriptiveAnalysis', 'correlationAnalysis', 'oneSampleHypothesisTest', 'oneSampleWilcoxonSignedRank', 'pairedTwoSampleWilcoxonSignedRank', 'independentTwoSampleHypothesisTest', 'pairedTwoSampleHypothesisTest', 'welchTwoSampleHypothesisTest', 'WelchANOVA', 'OneWayANOVA', 'oneWayANOVA', 'mannWhitneyUTest', 'kruskalWallisTest', 'shapiroWilkTest', 'kolmogorovSmirnovNormalityTest', 'andersonDarlingNormalityTest'].includes(widgetType);
  }
  
  private renderWidgets() {
    if (!this.gridContainer) {
      console.error('Grid container not found, cannot render widgets');
      return;
    }
    
    // Clear existing content
    this.gridContainer.innerHTML = '';
    
    // No widgets? Show placeholder if needed
    if (!this.widgets || this.widgets.length === 0) {
      if (this.showPlaceholder) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'empty-report';
        emptyElement.innerHTML = '<p>No widgets in this report</p>';
        this.gridContainer.appendChild(emptyElement);
      }
      return;
    }
    
    // Create all widget elements
    this.widgets.forEach((widget) => {
      // Create the widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'widget-item';
      widgetContainer.setAttribute('data-id', widget.id);
      
      // Position the widget using grid properties
      // Set both size (span) and position (start)
      // Using zero-based coordinates (add 1 when applying to grid since CSS grid is 1-based)
      // Defaults and clamping to the grid live in resolveRect so the report builder places widgets identically
      const { x, y, w, h } = resolveRect(widget, this.effectiveColumns);
      
      // Set both size (span) and position (start)
      // Add 1 to x and y because CSS grid is 1-based, but our coordinates are 0-based
      const gridColumn = `${x + 1} / span ${w}`;
      const gridRow = `${y + 1} / span ${h}`;
      
      widgetContainer.style.gridColumn = gridColumn;
      widgetContainer.style.gridRow = gridRow;
      
      // Create the widget element
      const widgetElement = this.createWidgetElement(widget);
      
      // Append the widget to the container
      widgetContainer.appendChild(widgetElement);
      
      // Add to grid
      this.gridContainer.appendChild(widgetContainer);
    });
  }
  
  private createWidgetElement(widget: WidgetData): HTMLElement {
    // Get cached data for this widget
    const widgetDataCache = this.widgetData[widget.id] || null;
    const dataIsLoading = this.dataFetchPromises[widget.id] && !widgetDataCache;
    
    let element: HTMLElement;
    
    switch (widget.type) {
      case 'text':
        // Create text widget
        element = document.createElement('text-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        
        const textConfig = widget.config || { text: '' };
        if (!textConfig.text) textConfig.text = '';
        
        // Set the config as both attribute and direct property
        (element as any).config = textConfig;
        
        // Dispatch a config update event
        setTimeout(() => {
          if (element.isConnected) {
            const configEvent = new CustomEvent('configUpdate', {
              detail: textConfig,
              bubbles: false
            });
            element.dispatchEvent(configEvent);
          }
        }, 100);
        break;
        
      case 'sourceInfo':
        // Create source info widget
        element = document.createElement('source-info-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const sourceInfoConfig = widget.config || {};
        (element as any).config = sourceInfoConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Set data directly
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: sourceInfoConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'descriptiveAnalysis':
        // Create descriptive analysis widget
        element = document.createElement('descriptive-analysis-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const descriptiveConfig = widget.config || {};
        (element as any).config = descriptiveConfig;
        
        // Directly pass pre-fetched data to the component through a custom property
        if (widgetDataCache) {
          // Set data directly
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: descriptiveConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'correlationAnalysis':
        // Create correlation analysis widget  
        element = document.createElement('correlation-analysis-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        (element as any).colorTheme = this.colorTheme; // Pass color theme!
        
        // Set config as direct property
        const correlationConfig = widget.config || {};
        (element as any).config = correlationConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Set data directly
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: correlationConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
              
              // Color theme change event
              const colorThemeEvent = new CustomEvent('colorThemeChange', {
                detail: { colorTheme: this.colorTheme },
                bubbles: false
              });
              element.dispatchEvent(colorThemeEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'oneSampleHypothesisTest':
        // Create one-sample hypothesis test widget  
        element = document.createElement('one-sample-hypothesis-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const hypothesisConfig = widget.config || {};
        (element as any).config = hypothesisConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: hypothesisConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'oneSampleWilcoxonSignedRank':
        // Create one-sample Wilcoxon signed rank test widget  
        element = document.createElement('one-sample-wilcoxon-signed-rank-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const wilcoxonConfig = widget.config || {};
        (element as any).config = wilcoxonConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: wilcoxonConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'pairedTwoSampleWilcoxonSignedRank':
        // Create paired two-sample Wilcoxon signed rank test widget  
        element = document.createElement('paired-two-sample-wilcoxon-signed-rank-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const pairedWilcoxonConfig = widget.config || {};
        (element as any).config = pairedWilcoxonConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: pairedWilcoxonConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'independentTwoSampleHypothesisTest':
        // Create independent two-sample hypothesis test widget  
        element = document.createElement('independent-two-sample-hypothesis-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const independentTwoSampleConfig = widget.config || {};
        (element as any).config = independentTwoSampleConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: independentTwoSampleConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'pairedTwoSampleHypothesisTest':
        // Create paired two-sample hypothesis test widget  
        element = document.createElement('paired-two-sample-hypothesis-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const pairedTwoSampleConfig = widget.config || {};
        (element as any).config = pairedTwoSampleConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: pairedTwoSampleConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'welchTwoSampleHypothesisTest':
        // Create Welch's two-sample hypothesis test widget  
        element = document.createElement('welch-two-sample-hypothesis-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const welchTwoSampleConfig = widget.config || {};
        (element as any).config = welchTwoSampleConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: welchTwoSampleConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'OneWayANOVA':
      case 'oneWayANOVA':
        // Create one-way ANOVA widget  
        element = document.createElement('one-way-anova-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const oneWayAnovaConfig = widget.config || {};
        (element as any).config = oneWayAnovaConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: oneWayAnovaConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'WelchANOVA':
        // Create Welch ANOVA widget  
        element = document.createElement('welch-anova-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const welchAnovaConfig = widget.config || {};
        (element as any).config = welchAnovaConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: welchAnovaConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'mannWhitneyUTest':
        // Create Mann-Whitney U test widget  
        element = document.createElement('mann-whitney-u-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const mannWhitneyConfig = widget.config || {};
        (element as any).config = mannWhitneyConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: mannWhitneyConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'kruskalWallisTest':
        // Create Kruskal-Wallis test widget  
        element = document.createElement('kruskal-wallis-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const kruskalWallisConfig = widget.config || {};
        (element as any).config = kruskalWallisConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: kruskalWallisConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'shapiroWilkTest':
        // Create Shapiro-Wilk test widget  
        element = document.createElement('shapiro-wilk-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const shapiroWilkConfig = widget.config || {};
        (element as any).config = shapiroWilkConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: shapiroWilkConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'kolmogorovSmirnovNormalityTest':
        // Create Kolmogorov-Smirnov normality test widget  
        element = document.createElement('kolmogorov-smirnov-normality-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const kolmogorovSmirnovConfig = widget.config || {};
        (element as any).config = kolmogorovSmirnovConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: kolmogorovSmirnovConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'andersonDarlingNormalityTest':
        // Create Anderson-Darling normality test widget  
        element = document.createElement('anderson-darling-normality-test-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        
        // Set config as direct property
        const andersonDarlingConfig = widget.config || {};
        (element as any).config = andersonDarlingConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: andersonDarlingConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'boxWhiskerNormalityPlot':
        // Create box-whisker normality plot widget  
        element = document.createElement('box-whisker-normality-plot-widget') as unknown as HTMLElement;
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        (element as any).colorTheme = this.colorTheme; // Pass color theme!
        
        // Set config as direct property
        const boxWhiskerNormalityPlotConfig = widget.config || {};
        (element as any).config = boxWhiskerNormalityPlotConfig;
        
        // Directly pass pre-fetched data to the component
        if (widgetDataCache) {
          // Pass the data as an array (following the same pattern as other widgets)
          (element as any).data = widgetDataCache;
          
          // We also need to pass a dummy fetchChartData function
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
          
          // Dispatch custom events for data update
          setTimeout(() => {
            if (element.isConnected) {
              // Data update event
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: boxWhiskerNormalityPlotConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
              
              // Color theme change event
              const colorThemeEvent = new CustomEvent('colorThemeChange', {
                detail: { colorTheme: this.colorTheme },
                bubbles: false
              });
              element.dispatchEvent(colorThemeEvent);
            }
          }, 100);
        } else if (this.fetchChartData) {
          // If data is still loading, set loading state
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
        }
        break;
        
      case 'data':
      case 'table':
      case 'kpi':
      case 'bar':
      case 'pie':
      case 'donut':
      case 'line':
      case 'hbar':
      case 'scatter':
      case 'sunburst':
      case 'heatmap':
      case 'bubble':
      case 'histogram':
      case 'stacked-bar':
      case 'stacked-hbar':
      case 'clustered-bar':
      case 'clustered-hbar':
      case 'lollipop':
      case 'lollipop-h':
        // Create data widget with specific visualization type
        element = document.createElement('data-widget') as unknown as HTMLElement;
        element.setAttribute('widgetId', widget.id);
        
        // Set properties directly
        (element as any).widgetId = widget.id;
        (element as any).widgetTitle = widget.title || '';
        (element as any).reportId = this.reportId || '';
        (element as any).readOnly = true;
        (element as any).isInEditor = false;
        (element as any).isViewer = this.isViewer;
        (element as any).colorTheme = this.colorTheme;
        
        // Use the widget type as visualization type if it's not a generic data widget
        const visualizationType = widget.type === 'data'
          ? (widget.config?.visualizationType || 'table')
          : widget.type;
          
        const dataConfig = { 
          ...(widget.config || {}),
          visualizationType: visualizationType
        };
        
        // Set properties directly
        (element as any).config = dataConfig;
        (element as any).availableSources = this.dataSources || [];
        (element as any).activeFilters = this.currentFilters;
        
        // Directly pass the data
        if (widgetDataCache) {
          // Set data directly
          (element as any).data = widgetDataCache;
          
          // Dispatch a custom event to ensure the component picks up the data
          setTimeout(() => {
            if (element.isConnected) {
              const dataEvent = new CustomEvent('dataUpdate', {
                detail: widgetDataCache,
                bubbles: false
              });
              element.dispatchEvent(dataEvent);
              
              // Also dispatch a config update event
              const configEvent = new CustomEvent('configUpdate', {
                detail: dataConfig,
                bubbles: false
              });
              element.dispatchEvent(configEvent);
            }
          }, 100);
          
          // Also set loading state property 
          (element as any).loading = false;
          
          // And pass a mock fetchChartData that returns the cached data
          (element as any).fetchChartData = () => Promise.resolve(widgetDataCache);
        } else if (this.fetchChartData) {
          // If no cached data but we have the fetch function
          (element as any).loading = dataIsLoading;
          // Pass real function for future updates
          (element as any).fetchChartData = this.fetchChartData;
          // Also set the config directly
          (element as any).config = dataConfig;
        }
        break;
        
      default:
        // Create a placeholder div for unknown widget types
        element = document.createElement('div');
        element.className = 'placeholder-widget';
        element.innerHTML = `
          <h3>${widget.title || 'Unknown Widget'}</h3>
          <p>Widget type: ${widget.type}</p>
        `;
        break;
    }
    
    // Set common styles
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.display = 'block';
    
    // Set height mode context for the widget
    element.setAttribute('height-mode', this.heightMode);
    
    return element;
  }
  
  // Handle filter changes  
  // Only filter changes from this viewer's own widgets (or dispatched on it) count; other viewers on the page are ignored
  @Listen('filter-change')
  handleFilterChangeEvent(event: CustomEvent) {
    const { sourceId, field, value, ...extra } = event.detail || {};
    this.handleFilterChange(sourceId, field, value, extra);
  }
  
  // Track recent filter changes to ignore exact duplicates (a widget can report the same click twice)
  private lastFilterChangeKey = '';
  private lastFilterTimestamp = 0;

  /**
   * Applies one filter change. `extra` may carry `operation`, `id` and any custom properties, which are stored on
   * the filter. A filter is removed with `remove: true`, or (for plain filters without an operation) with a null value.
   * Filters are identified by source + field + optional `id`, so several filters can share a field.
   */
  handleFilterChange = (sourceId: string, field: string, value: any, extra: Record<string, any> = {}) => {
    // Ignore exact repeats within 300ms; different filters in quick succession (e.g. a date range) all count
    const now = Date.now();
    const changeKey = stableStringify([sourceId, field, value, extra]);
    if (changeKey === this.lastFilterChangeKey && now - this.lastFilterTimestamp < 300) {
      return;
    }
    this.lastFilterChangeKey = changeKey;
    this.lastFilterTimestamp = now;

    // Wildcard clears everything
    if (sourceId === '*' && field === '*' && (value === null || value === undefined)) {
      this.commitFilters([]);
      return;
    }

    const { remove, ...custom } = extra || {};
    const target = { sourceId, field, id: custom.id };
    const identity = filterIdentity(target);
    const next = this.currentFilters.filter(f => filterIdentity(f) !== identity);
    const removing = remove === true || (!custom.operation && (value === null || value === undefined));

    if (!removing) {
      next.push({ ...custom, sourceId, field, value } as Filter);
    }

    // Keep the position of an updated filter stable
    const existingIndex = this.currentFilters.findIndex(f => filterIdentity(f) === identity);
    if (!removing && existingIndex >= 0) {
      next.splice(next.length - 1, 1);
      next.splice(existingIndex, 0, { ...custom, sourceId, field, value } as Filter);
    }

    this.commitFilters(next);
  }
  
  private setEqualGridDimensions() {
    if (!this.gridContainer) return;
    
    // Column count (default 12); an inline template overrides the stylesheet's default
    this.gridContainer.style.gridTemplateColumns = `repeat(${this.effectiveColumns}, 1fr)`;

    // Get the width of the grid
    const gridWidth = this.gridContainer.offsetWidth;
    
    // If grid width is 0 or very small, try again after a short delay
    if (gridWidth < 100) {
      setTimeout(() => {
        this.setEqualGridDimensions();
      }, 100);
      return;
    }
    
    // Calculate column width (account for gap)
    const numColumns = this.effectiveColumns;
    // An explicit gap (prop or configuration) wins; otherwise the CSS (--fl-grid-gap, default 15px) applies.
    // The row-height math below reads the effective gap back from the computed style so both stay in sync.
    const explicitGap = this.nonNegativeNumber(this.gap) ?? this.configGap;
    this.gridContainer.style.gap = explicitGap !== undefined ? `${explicitGap}px` : '';
    const cssGap = parseFloat(getComputedStyle(this.gridContainer).columnGap);
    const gapSize = isNaN(cssGap) ? 15 : cssGap;
    const totalGapWidth = gapSize * (numColumns - 1);
    const columnWidth = (gridWidth - totalGapWidth) / numColumns;
    
    if (this.heightMode === 'fixed') {
      // In fixed mode, constrain the grid to the container height
      const containerHeight = this.el.offsetHeight; // Get the actual container height
      
      if (containerHeight > 0) {
        // Set the grid to the container height - this will make it rectangular
        this.gridContainer.style.height = `${containerHeight}px`;
        
        // Find the maximum row position to determine how many rows we need
        const maxRow = Math.max(...this.widgets.map(widget => (widget.y || 0) + (widget.h || 4)));
        const numRows = maxRow;
        
        if (numRows > 0) {
          // Calculate row height to distribute evenly across the container height
          const totalGapHeight = gapSize * (numRows - 1);
          const availableHeight = containerHeight - totalGapHeight;
          const rowHeight = availableHeight / numRows;
          
          this.gridContainer.style.gridAutoRows = `${rowHeight}px`;
        } else {
          // Fallback to small height if no widgets
          this.gridContainer.style.gridAutoRows = '20px';
        }
      } else {
        // Fallback to small height if height is not available yet
        this.gridContainer.style.gridAutoRows = '20px';
      }
    } else {
      this.gridContainer.style.gridAutoRows = `${this.resolveRowHeight(columnWidth)}px`;
      this.gridContainer.style.height = 'auto';
    }
  }

  private nonNegativeNumber(value: unknown): number | undefined {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return typeof n === 'number' && isFinite(n) && n >= 0 ? n : undefined;
  }

  private positiveNumber(value: unknown): number | undefined {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return typeof n === 'number' && isFinite(n) && n > 0 ? n : undefined;
  }

  /**
   * Row height for heightMode="auto": an explicit pixel height wins, then an aspect ratio
   * (column width / row height), otherwise rows are square (the original behavior).
   */
  private resolveRowHeight(columnWidth: number): number {
    const explicit = this.positiveNumber(this.rowHeight) ?? this.configRowHeight;
    if (explicit !== undefined) return explicit;
    const ratio = this.positiveNumber(this.rowAspectRatio) ?? this.configRowAspectRatio ?? 1;
    return columnWidth / ratio;
  }
  
  private startConfigurationPolling() {
    // Check for configuration changes every 500ms
    this.configurationPollingInterval = window.setInterval(() => {
      if (this.configuration && this.configuration !== this.lastConfiguration) {
        this.lastConfiguration = this.configuration;
        
        let parsedConfig = this.configuration;
        if (typeof this.configuration === 'string') {
          try {
            parsedConfig = JSON.parse(this.configuration);
          } catch (e) {
            console.error('Failed to parse configuration string in polling:', e);
            return;
          }
        }
        
        this.applyConfiguration(parsedConfig);
      }
    }, 500);
    
    // Stop polling after 10 seconds
    setTimeout(() => {
      if (this.configurationPollingInterval) {
        clearInterval(this.configurationPollingInterval);
        this.configurationPollingInterval = undefined;
      }
    }, 10000);
  }
  
  render() {
    return (
      <div class={`report-container height-mode-${this.heightMode}`}>
        <div class="widget-grid"></div>
      </div>
    );
  }
} 