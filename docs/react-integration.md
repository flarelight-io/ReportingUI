# React Integration Guide

## Installation

```bash
npm install @flarelight-io/reporting
```

## Setup

### 1. Register the custom elements

In your application entry file (`src/index.tsx`):

```tsx
import { defineCustomElements } from '@flarelight-io/reporting/loader';
import '@flarelight-io/reporting/dist/flarelight-reporting/flarelight-reporting.css';

defineCustomElements();
```

### 2. TypeScript declarations

Create `src/custom-elements.d.ts` so TypeScript recognises the web component tags in JSX. The file also re-exports the types you'll use most:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  declare namespace JSX {
    interface IntrinsicElements {
      // Main container
      'report-viewer': any;

      // Widget components
      'base-widget': any;
      'text-widget': any;
      'source-info-widget': any;
      'data-widget': any;
      'descriptive-analysis-widget': any;
      'correlation-analysis-widget': any;
      'one-sample-hypothesis-test-widget': any;
      'independent-two-sample-hypothesis-test-widget': any;
      'welch-two-sample-hypothesis-test-widget': any;
      'paired-two-sample-hypothesis-test-widget': any;
      'one-way-anova-widget': any;
      'welch-anova-widget': any;
      'one-sample-wilcoxon-signed-rank-widget': any;
      'paired-two-sample-wilcoxon-signed-rank-widget': any;
      'mann-whitney-u-test-widget': any;
      'kruskal-wallis-test-widget': any;
      'shapiro-wilk-test-widget': any;
      'kolmogorov-smirnov-normality-test-widget': any;
      'anderson-darling-normality-test-widget': any;
      'box-whisker-normality-plot-widget': any;

      // Visualization components
      'bar-chart-visualization': any;
      'line-chart-visualization': any;
      'pie-chart-visualization': any;
      'scatter-chart-visualization': any;
      'heatmap-visualization': any;
      'histogram-chart-visualization': any;
      'sunburst-chart-visualization': any;
      'bubble-chart-visualization': any;
      'table-visualization': any;
      'kpi-visualization': any;
      'stacked-bar-chart-visualization': any;
      'clustered-bar-chart-visualization': any;
      'lollipop-chart-visualization': any;
      'box-whisker-chart-visualization': any;
    }
  }
}

export {
  WidgetData,
  type DataSource,
  type Filter,
} from '@flarelight-io/reporting';
```

---

## Approach A: `<report-viewer>` (simple)

Use the `<report-viewer>` web component when you want the library to manage layout, grid, and data fetching orchestration. Pass `configuration` and `fetchChartData` as JSX props — Stencil handles the rest.

```tsx
import React from 'react';
import { ChartDataRequest } from '@flarelight-io/reporting';

function Dashboard() {
  const configuration = {
    widgets: [
      {
        id: 'sales-chart',
        type: 'data',
        title: 'Sales by Region',
        x: 0, y: 0, w: 6, h: 4,
        config: {
          sourceId: 'sales-data',
          visualizationType: 'bar',
          groupByField: 'region',
          valueField: 'revenue'
        }
      }
    ],
    sources: [
      {
        id: 'sales-data',
        name: 'Sales Data',
        type: 'json',
        fields: [
          { name: 'region', displayName: 'Region', type: 'string' },
          { name: 'revenue', displayName: 'Revenue', type: 'number' }
        ]
      }
    ]
  };

  const fetchChartData = async (request: ChartDataRequest) => {
    const res = await fetch('/api/chart-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    const result = await res.json();
    return result.data;
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <report-viewer
        reportId="sales-dashboard"
        configuration={configuration}
        fetchChartData={fetchChartData}
        showPlaceholder={true}
      />
    </div>
  );
}
```

---

## Report builder

`<report-builder>` is a controlled editing layer over the viewer: keep the report in state and apply what it emits. Events are DOM `CustomEvent`s, so subscribe with a ref:

```tsx
function Editor({ initial, sources, fetchChartData }) {
  const [report, setReport] = React.useState(initial);
  const ref = React.useRef<HTMLReportBuilderElement>(null);

  React.useEffect(() => {
    const el = ref.current!;
    const onChange = (e: Event) => setReport((e as CustomEvent).detail); // also the place to save
    el.addEventListener('configurationChange', onChange);
    return () => el.removeEventListener('configurationChange', onChange);
  }, []);

  return (
    <>
      <button onClick={() => ref.current!.addWidget('data', { config: { visualizationType: 'bar' } })}>Add bar chart</button>
      <report-builder ref={ref} configuration={report} sources={sources} fetchChartData={fetchChartData} reportId="editor" />
    </>
  );
}
```

Without a `configureWidget` prop the builder shows its own configuration form; pass a function to open your own dialog instead. See [report-builder.md](report-builder.md).

## Approach B: Individual widgets with custom layout (advanced)

Use individual widget components when you need to build your own layout engine (e.g. with `react-grid-layout`), or when you're building a report editor alongside a viewer.

This approach gives you full control over layout, filter state, and re-renders.

### Dependencies

```bash
npm install react-grid-layout
npm install --save-dev @types/react-grid-layout
```

### Widget common props

Every widget accepts this core set of props:

| Prop | Type | Description |
|------|------|-------------|
| `widgetTitle` | `string` | Widget header text |
| `width` | `number` | Width in grid columns |
| `height` | `number` | Height in grid rows |
| `config` | `object` | Widget-specific configuration |
| `fetchChartData` | `function` | Data-fetching callback |
| `readOnly` | `boolean` | Disable edit interactions |
| `isInEditor` | `boolean` | Set `false` in viewer contexts |
| `isViewer` | `boolean` | Set `true` in viewer contexts |
| `hideTitle` | `boolean` | Hide the widget title bar |
| `refreshCounter` | `number` | Increment to force a re-render |
| `reportId` | `string` | ID of the parent report |
| `availableSources` | `DataSource[]` | Data sources for the report |
| `activeFilters` | `Filter[]` | Currently active filters |

### Rendering a widget by type

```tsx
import { WidgetData } from '@/custom-elements';
import { ChartDataRequest } from '@flarelight-io/reporting';

function renderWidget(
  widget: WidgetData,
  sources: any[],
  reportId: string,
  activeFilters: Filter[],
  fetchChartData: (req: ChartDataRequest) => Promise<any[]>,
  refreshCounter: number
) {
  const commonProps = {
    widgetTitle: widget.title,
    width: widget.w,
    height: widget.h,
    readOnly: true,
    isInEditor: false,
    isViewer: true,
    hideTitle: widget.hideTitle,
    refreshCounter,
    config: widget.config as any,
    fetchChartData: async (req: ChartDataRequest) => fetchChartData(req),
  };

  switch (widget.type) {
    case 'text':
      return <text-widget {...commonProps} />;

    case 'data':
      return (
        <data-widget
          {...commonProps}
          reportId={reportId}
          widgetId={widget.id}
          availableSources={sources}
          activeFilters={activeFilters}
        />
      );

    case 'sourceInfo':
      return (
        <source-info-widget
          {...commonProps}
          reportId={reportId}
          availableSources={sources}
        />
      );

    case 'descriptiveAnalysis':
      return <descriptive-analysis-widget {...commonProps} reportId={reportId} />;

    case 'correlationAnalysis':
      return (
        <correlation-analysis-widget
          {...commonProps}
          analysisId={(widget.config as any)?.analysisId || ''}
        />
      );

    case 'oneSampleHypothesisTest':
      return <one-sample-hypothesis-test-widget {...commonProps} />;

    case 'independentTwoSampleHypothesisTest':
      return <independent-two-sample-hypothesis-test-widget {...commonProps} />;

    case 'welchTwoSampleHypothesisTest':
      return <welch-two-sample-hypothesis-test-widget {...commonProps} />;

    case 'pairedTwoSampleHypothesisTest':
      return <paired-two-sample-hypothesis-test-widget {...commonProps} />;

    case 'oneWayANOVA':
      return <one-way-anova-widget {...commonProps} />;

    case 'welchANOVA':
      return <welch-anova-widget {...commonProps} />;

    case 'oneSampleWilcoxonSignedRank':
      return <one-sample-wilcoxon-signed-rank-widget {...commonProps} />;

    case 'pairedTwoSampleWilcoxonSignedRank':
      return <paired-two-sample-wilcoxon-signed-rank-widget {...commonProps} />;

    case 'mannWhitneyUTest':
      return <mann-whitney-u-test-widget {...commonProps} />;

    case 'kruskalWallisTest':
      return <kruskal-wallis-test-widget {...commonProps} />;

    case 'shapiroWilkTest':
      return <shapiro-wilk-test-widget {...commonProps} />;

    case 'kolmogorovSmirnovNormalityTest':
      return <kolmogorov-smirnov-normality-test-widget {...commonProps} />;

    case 'andersonDarlingNormalityTest':
      return <anderson-darling-normality-test-widget {...commonProps} />;

    case 'boxWhiskerNormalityPlot':
      return (
        <box-whisker-normality-plot-widget
          {...commonProps}
          reportId={reportId}
          isInEditor={false}
        />
      );

    default:
      return (
        <base-widget {...commonProps}>
          <div>Unknown widget type: {widget.type}</div>
        </base-widget>
      );
  }
}
```

### Filter management

Filters are managed as React state and passed down to each widget as `activeFilters`. Widgets emit a `filterChange` event when the user interacts with a chart; listen for it on the widget's DOM ref.

```tsx
interface Filter {
  sourceId: string;
  field: string;
  value: any;
}

// In your component:
const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
const [refreshCounter, setRefreshCounter] = useState(0);

const handleFilterChange = (sourceId: string, field: string, value: any) => {
  setActiveFilters(prev => {
    let next: Filter[];
    if (value === null) {
      next = prev.filter(f => !(f.sourceId === sourceId && f.field === field));
    } else {
      const idx = prev.findIndex(f => f.sourceId === sourceId && f.field === field);
      next = [...prev];
      if (idx >= 0) next[idx] = { sourceId, field, value };
      else next.push({ sourceId, field, value });
    }
    return next;
  });
  setRefreshCounter(c => c + 1);
};

const clearAllFilters = () => {
  setActiveFilters([]);
  setRefreshCounter(c => c + 1);
};
```

Attach event listeners to widget refs so filter clicks inside widgets bubble up:

```tsx
const widgetRefs = useRef(new Map<string, React.RefObject<HTMLElement>>());

const getRef = (id: string) => {
  if (!widgetRefs.current.has(id)) {
    widgetRefs.current.set(id, React.createRef<HTMLElement>());
  }
  return widgetRefs.current.get(id)!;
};

useEffect(() => {
  const handler = (event: Event) => {
    const { sourceId, field, value } = (event as CustomEvent).detail;
    handleFilterChange(sourceId, field, value);
  };

  // Listen on document for global filter-change events
  document.addEventListener('filter-change', handler);

  // Also listen on individual widget refs for filterChange events
  widgets.forEach(w => {
    const el = widgetRefs.current.get(w.id)?.current;
    el?.addEventListener('filterChange', handler);
  });

  return () => {
    document.removeEventListener('filter-change', handler);
    widgets.forEach(w => {
      const el = widgetRefs.current.get(w.id)?.current;
      el?.removeEventListener('filterChange', handler);
    });
  };
}, [widgets]);
```

### `react-grid-layout` integration

Row height is calculated from the screen aspect ratio so grid cells maintain correct proportions on any screen size:

```tsx
import { Responsive as ResponsiveGrid, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(ResponsiveGrid);

function useRowHeight(widgets: WidgetData[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(60);

  const recalculate = (cols = 12) => {
    requestAnimationFrame(() => {
      const el = containerRef.current?.parentElement ?? containerRef.current;
      const width = el?.clientWidth ?? 0;
      if (width <= 0) return;

      const margin = 16;
      const available = width - margin * (cols - 1);
      const isLandscape = window.innerWidth > window.innerHeight;

      const next = isLandscape
        ? Math.max(Math.floor((available * window.innerHeight) / (cols * window.innerWidth)), 40)
        : Math.max(Math.floor(available / cols), 40);

      setRowHeight(next);
    });
  };

  useEffect(() => {
    const el = containerRef.current?.parentElement ?? containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(entries => {
      recalculate();
    });
    ro.observe(el);
    const t = setTimeout(() => recalculate(), 100);
    window.addEventListener('resize', () => recalculate());

    return () => {
      ro.disconnect();
      clearTimeout(t);
      window.removeEventListener('resize', () => recalculate());
    };
  }, [widgets]);

  return { containerRef, rowHeight };
}
```

Putting it together in a viewer component:

```tsx
const ReportViewer: React.FC<{
  configuration: any;
  reportId: string;
  fetchChartData: (req: ChartDataRequest) => Promise<any[]>;
}> = ({ configuration, reportId, fetchChartData }) => {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [layouts, setLayouts] = useState({});
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { containerRef, rowHeight } = useRowHeight(widgets);
  const widgetRefs = useRef(new Map<string, React.RefObject<HTMLElement>>());

  const getRef = (id: string) => {
    if (!widgetRefs.current.has(id)) {
      widgetRefs.current.set(id, React.createRef<HTMLElement>());
    }
    return widgetRefs.current.get(id)!;
  };

  useEffect(() => {
    if (!configuration?.widgets) return;
    setWidgets(configuration.widgets);

    const grid = {} as any;
    ['lg', 'md', 'sm', 'xs'].forEach(bp => {
      grid[bp] = configuration.widgets.map((w: WidgetData) => ({
        i: w.id, x: w.x ?? 0, y: w.y ?? 0, w: w.w ?? 6, h: w.h ?? 4,
        minW: 1, maxW: 12, minH: 1
      }));
    });
    setLayouts(grid);
    widgetRefs.current.clear();
  }, [configuration]);

  // Filter event listener (see filter management section above)
  // ...

  const sources = configuration?.sources ?? [];

  return (
    <div ref={containerRef}>
      {activeFilters.length > 0 && (
        <button onClick={() => { setActiveFilters([]); setRefreshCounter(c => c + 1); }}>
          Clear filters
        </button>
      )}

      <ResponsiveGridLayout
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
        rowHeight={rowHeight}
        margin={[16, 16]}
        isDraggable={false}
        isResizable={false}
        compactType="vertical"
        key={`grid-${refreshCounter}`}
      >
        {widgets.map(widget => (
          <div key={widget.id} id={`widget-${widget.id}`}>
            {renderWidget(
              widget,
              sources,
              reportId,
              activeFilters,
              fetchChartData,
              refreshCounter
            )}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};
```

### Exporting a widget as PNG

The library ships with `html-to-image`. Use it to export individual widget elements:

```tsx
import { toPng } from 'html-to-image';

const exportWidgetAsPng = async (element: HTMLElement, fileName: string) => {
  const dataUrl = await toPng(element, {
    quality: 1.0,
    backgroundColor: 'white',
    canvasWidth: element.offsetWidth * 2,
    canvasHeight: element.offsetHeight * 2,
    pixelRatio: 2
  });

  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = dataUrl;
  link.click();
};

// Usage: wrap any widget in a div with an id, then:
const el = document.getElementById('widget-my-chart')
            ?.querySelector('.widget-content') as HTMLElement;
if (el) exportWidgetAsPng(el, 'my-chart');
```

---

## Troubleshooting

**Components not rendering**
- Confirm `defineCustomElements()` is called at app startup before rendering any widgets.
- Confirm the theme CSS is imported.

**TypeScript errors on custom element tags**
- Ensure `custom-elements.d.ts` uses the `declare global { declare namespace JSX { ... } }` pattern shown above (not a bare `namespace JSX` — that only works in certain tsconfig setups).

**Filters not updating charts**
- Ensure `activeFilters` is passed as a prop to `<data-widget>`.
- Increment `refreshCounter` whenever filters change to force React to re-render the grid.
- If widgets have stale data, also attach `filterChange` listeners directly to widget DOM refs as shown in the filter management section.

**Grid cells have wrong proportions**
- The row height calculation uses `window.innerWidth / window.innerHeight` (screen aspect ratio), not the container ratio. This is intentional — it gives consistent cell proportions regardless of sidebar/panel widths.
