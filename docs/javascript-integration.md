# Plain JavaScript Integration Guide

## Loading the Library

### Via ES module (recommended)

```javascript
(async () => {
  const module = await import('./flarelight-reporting/dist/esm/loader.js');
  if (module.defineCustomElements) {
    await module.defineCustomElements();
  }
})();
```

### Via CDN (unpkg)

```html
<script type="module">
  const { defineCustomElements } = await import('https://unpkg.com/@flarelight-io/reporting/dist/esm/loader.js');
  await defineCustomElements();
</script>
```

### Via npm + bundler

```javascript
import { defineCustomElements } from '@flarelight-io/reporting/loader';
defineCustomElements();
```

## HTML Structure

```html
<link rel="stylesheet" href="./flarelight-reporting/dist/flarelight-reporting/flarelight-reporting.css">

<div id="report-container">
  <report-viewer
    id="my-report"
    report-id="my-dashboard"
    show-placeholder="true"
    height-mode="fixed">
  </report-viewer>
</div>
```

**`height-mode` values:**
- `"fixed"` — report fits within the container's height (no scroll)
- `"auto"` — report expands to content height (scrollable container)

## Configuring the Report Viewer

Always set `configuration`, `fetchChartData`, and `isViewer` as **JavaScript properties**, not HTML attributes. Complex objects cannot be serialized through attributes.

```javascript
const reportViewer = document.getElementById('my-report');

// Set the report ID and viewer flag
reportViewer.setAttribute('report-id', reportId);
reportViewer.isViewer = true;

// Set the report layout/widget configuration
reportViewer.configuration = reportDetails.configuration;

// Wire up the data-fetching function
reportViewer.fetchChartData = async (request) => {
  return await fetchChartData(request);
};
```

## Fetching Chart Data

The `fetchChartData` callback receives a `ChartDataRequest` object and must return the data array for that request. Session storage caching avoids redundant API calls on re-renders and filter changes.

```javascript
async function fetchChartData(request) {
  // Build a deterministic cache key from report + widget + active filters
  const reportId   = 'my-report';
  const widgetId   = request.widgetId || request.sourceId || 'unknown';
  const filterHash = request.filters
    ? JSON.stringify(request.filters).replace(/[^a-zA-Z0-9]/g, '_')
    : 'nofilters';
  const cacheKey   = `flarelight-chart-data-${reportId}-${widgetId}-${filterHash}`;

  // Return cached result if available
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from your API
  const response = await fetch('/api/chart-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const result = await response.json();

  // Cache for this session
  sessionStorage.setItem(cacheKey, JSON.stringify(result.data));

  return result.data;
}
```

## Clearing the Cache

Clear session storage entries when loading a new report or when data may have changed:

```javascript
function clearChartDataCache() {
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('flarelight-chart-data-')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
}
```

## Resetting the Component

When switching reports, clear the viewer's state before setting new configuration to avoid showing stale data:

```javascript
function resetReportViewer(reportViewer) {
  reportViewer.configuration = null;
  reportViewer.removeAttribute('data-configuration');
  reportViewer.removeAttribute('report-id');
  reportViewer.isViewer = false;
  reportViewer.fetchChartData = null;

  // Force a reflow so the component re-initialises cleanly
  setTimeout(() => {
    reportViewer.style.display = 'none';
    reportViewer.offsetHeight; // trigger reflow
    reportViewer.style.display = '';
  }, 10);
}
```

## Filters

### Clearing all filters programmatically

Dispatch a wildcard `filter-change` event to instruct the report viewer to reset all active filters:

```javascript
function clearAllFilters() {
  window.dispatchEvent(new CustomEvent('filter-change', {
    detail: { sourceId: '*', field: '*', value: null }
  }));
}
```

### Applying a specific filter

```javascript
function applyFilter(sourceId, field, value) {
  window.dispatchEvent(new CustomEvent('filter-change', {
    detail: { sourceId, field, value }
  }));
}

// Example: filter a chart to show only the "North" region
applyFilter('sales-data', 'region', 'North');

// Remove a specific filter (set value to null)
applyFilter('sales-data', 'region', null);
```

### Detecting filter changes

```javascript
window.addEventListener('filter-change', (event) => {
  const { sourceId, field, value } = event.detail;

  if (sourceId === '*' && field === '*' && value === null) {
    // All filters cleared
  } else if (value === null) {
    // Specific filter removed
  } else {
    // Filter applied: sourceId/field = value
  }
});
```

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Report Viewer</title>
  <link rel="stylesheet"
    href="./flarelight-reporting/dist/flarelight-reporting/flarelight-reporting.css">
  <style>
    #report-container { width: 100%; height: 600px; position: relative; }
    report-viewer { height: 100%; }
  </style>
</head>
<body>

  <select id="report-select">
    <option value="">-- Select a report --</option>
  </select>
  <button id="load-btn" disabled>Load</button>
  <button id="clear-filters-btn" style="display:none">Clear Filters</button>

  <div id="report-container">
    <report-viewer id="viewer" show-placeholder="true" height-mode="fixed"></report-viewer>
  </div>

  <script type="module">
    // Load the library
    const { defineCustomElements } = await import('./flarelight-reporting/dist/esm/loader.js');
    await defineCustomElements();

    const AUTH_TOKEN = 'your-bearer-token';
    const API_BASE   = 'https://your-api.example.com';

    const viewer     = document.getElementById('viewer');
    const select     = document.getElementById('report-select');
    const loadBtn    = document.getElementById('load-btn');
    const clearBtn   = document.getElementById('clear-filters-btn');

    let activeFilters = new Set();

    // ── Populate report list ─────────────────────────────────────────────────
    const reportsRes = await fetch(`${API_BASE}/reports`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    const reports = await reportsRes.json();
    reports.forEach(r => {
      select.insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.name}</option>`);
    });

    select.addEventListener('change', () => {
      loadBtn.disabled = !select.value;
    });

    // ── Load report ──────────────────────────────────────────────────────────
    loadBtn.addEventListener('click', async () => {
      const reportId = select.value;
      if (!reportId) return;

      // Clear stale state
      clearChartDataCache();
      resetViewer();
      activeFilters.clear();
      clearBtn.style.display = 'none';

      // Fetch configuration
      const res = await fetch(`${API_BASE}/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
      });
      const report = await res.json();

      // Configure the report viewer
      viewer.setAttribute('report-id', reportId);
      viewer.isViewer = true;
      viewer.configuration = report.configuration;
      viewer.fetchChartData = (request) => fetchChartData(reportId, request);
    });

    // ── Fetch + cache chart data ─────────────────────────────────────────────
    async function fetchChartData(reportId, request) {
      const widgetId   = request.widgetId || request.sourceId || 'unknown';
      const filterHash = request.filters
        ? JSON.stringify(request.filters).replace(/[^a-zA-Z0-9]/g, '_')
        : 'nofilters';
      const cacheKey   = `flarelight-chart-data-${reportId}-${widgetId}-${filterHash}`;

      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);

      const response = await fetch(`${API_BASE}/chart-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(result.data));
      return result.data;
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    window.addEventListener('filter-change', (event) => {
      const { sourceId, field, value } = event.detail;
      if (sourceId === '*') {
        activeFilters.clear();
      } else if (value === null) {
        activeFilters.delete(JSON.stringify({ sourceId, field }));
      } else {
        activeFilters.add(JSON.stringify({ sourceId, field, value }));
      }
      clearBtn.style.display = activeFilters.size > 0 ? '' : 'none';
    });

    clearBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('filter-change', {
        detail: { sourceId: '*', field: '*', value: null }
      }));
    });

    // ── Helpers ──────────────────────────────────────────────────────────────
    function clearChartDataCache() {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('flarelight-chart-data-')) sessionStorage.removeItem(key);
      }
    }

    function resetViewer() {
      viewer.configuration = null;
      viewer.removeAttribute('report-id');
      viewer.isViewer = false;
      viewer.fetchChartData = null;
      setTimeout(() => {
        viewer.style.display = 'none';
        viewer.offsetHeight;
        viewer.style.display = '';
      }, 10);
    }
  </script>
</body>
</html>
```

## Browser Support

StencilJS Web Components are supported by all modern browsers (Chrome, Firefox, Safari, Edge).

## Report builder

To let users edit the report, use `<report-builder>` instead of `<report-viewer>`. It takes the same `configuration` and `fetchChartData`, and emits the next configuration for you to apply and save:

```javascript
const builder = document.querySelector('report-builder');
builder.configuration = report;
builder.sources = sources;
builder.fetchChartData = fetchChartData;
builder.addEventListener('configurationChange', e => {
  report = e.detail;
  builder.configuration = report; // apply (and save) it
});
```

See [report-builder.md](report-builder.md) for methods, keyboard shortcuts and the configuration form.
