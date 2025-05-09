# Integrating Flarelight Reporting into Plain JavaScript Applications

This guide provides detailed instructions for integrating the Flarelight Reporting library into a normal JavaScript application (non-React).

## Prerequisites

- Basic JavaScript web application
- Access to your organization's Azure DevOps Artifacts feed

## Installation

### 1. Configure your project to use Azure Artifacts

Create a `.npmrc` file in the root of your project:

```
registry=https://registry.npmjs.org/
@pegasus:registry=https://pkgs.dev.azure.com/goranstj/_packaging/pegasus/npm/registry/
always-auth=true
```

### 2. Authenticate with Azure Artifacts

Run the following command to authenticate with Azure Artifacts:

```bash
npx vsts-npm-auth -config .npmrc
```

This will add the necessary credentials to your .npmrc file.

### 3. Install the package

```bash
npm install @pegasus/reporting --save
```

## Integration into plain JavaScript

### 1. Include the script in your HTML

You can include the Flarelight Reporting library in your HTML file using one of these methods:

**Method 1: Using script tag with unpkg**

```html
<!-- In your HTML file -->
<script type="module">
  import { defineCustomElements } from 'https://unpkg.com/@pegasus/reporting/loader/index.js';
  defineCustomElements();
</script>
```

**Method 2: Using npm and a bundler**

If you're using a bundler like Webpack, you can import it in your JavaScript file:

```javascript
// In your main JavaScript file
import { defineCustomElements } from '@pegasus/reporting/loader';
defineCustomElements();
```

**Method 3: Using script tag in HTML with local files**

```html
<!-- In your HTML file -->
<script type="module" src="node_modules/@pegasus/reporting/dist/flarelight-reporting/flarelight-reporting.esm.js"></script>
```

### 2. Create HTML structure for your report

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flarelight Reporting Demo</title>
  <style>
    .report-container {
      width: 100%;
      height: 80vh;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Flarelight Reporting Demo</h1>
  
  <div class="report-container">
    <!-- This is where the report will be rendered -->
    <flare-report-viewer
      id="my-report"
      report-id="performance-dashboard"
      show-placeholder="true">
    </flare-report-viewer>
  </div>

  <script type="module">
    import { defineCustomElements } from '@pegasus/reporting/loader';
    defineCustomElements();
    
    // Your initialization code will go here
  </script>
</body>
</html>
```

### 3. Configure and initialize the report

```javascript
// Sample JavaScript code to initialize the report
document.addEventListener('DOMContentLoaded', () => {
  // Get a reference to the report viewer element
  const reportViewer = document.getElementById('my-report');
  
  // Define your report configuration
  const reportConfig = {
    widgets: [
      {
        id: 'title-widget',
        type: 'text',
        title: 'Dashboard Overview',
        x: 0,
        y: 0,
        w: 12,
        h: 1,
        config: {
          text: 'Key Performance Indicators',
          fontSize: 'large',
          textAlign: 'center',
          enableFormatting: true
        }
      },
      {
        id: 'sales-by-region',
        type: 'bar',
        title: 'Sales by Region',
        x: 0,
        y: 1,
        w: 6,
        h: 4,
        config: {
          sourceId: 'sales-data',
          groupByField: 'region',
          valueField: 'sales',
          showGrid: true,
          showLegend: true
        }
      },
      {
        id: 'sales-trend',
        type: 'line',
        title: 'Sales Trend',
        x: 6,
        y: 1,
        w: 6,
        h: 4,
        config: {
          sourceId: 'trend-data',
          groupByField: 'month',
          valueField: 'sales',
          showGrid: true,
          showLegend: true
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
          { name: 'sales', displayName: 'Sales Amount', type: 'number' }
        ]
      },
      {
        id: 'trend-data',
        name: 'Trend Data',
        type: 'json',
        fields: [
          { name: 'month', displayName: 'Month', type: 'string' },
          { name: 'sales', displayName: 'Sales', type: 'number' }
        ]
      }
    ]
  };
  
  // Set the configuration
  reportViewer.configuration = reportConfig;
  
  // Implement the data fetching function
  reportViewer.fetchChartData = async (request) => {
    console.log('Chart data request:', request);
    
    // In a real app, you would make an API call
    // For this example, we return mock data based on the source ID
    if (request.sourceId === 'sales-data') {
      return [
        { region: 'North', sales: 1250 },
        { region: 'South', sales: 1450 },
        { region: 'East', sales: 950 },
        { region: 'West', sales: 1650 }
      ];
    } 
    else if (request.sourceId === 'trend-data') {
      return [
        { month: 'Jan', sales: 1000 },
        { month: 'Feb', sales: 1200 },
        { month: 'Mar', sales: 900 },
        { month: 'Apr', sales: 1500 },
        { month: 'May', sales: 1800 },
        { month: 'Jun', sales: 2000 }
      ];
    } 
    else {
      return [];
    }
  };
});
```

## Advanced Usage

### Handling Widget Events

You can listen to events emitted by the report viewer and its widgets:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Listen for filter change events
  window.addEventListener('filter-change', (event) => {
    const { sourceId, field, value } = event.detail;
    console.log(`Filter changed: source=${sourceId}, field=${field}, value=${value}`);
    // Handle the filter change if needed
  });
  
  // Listen for widget click events
  window.addEventListener('widget-click', (event) => {
    const { widgetId, data } = event.detail;
    console.log(`Widget clicked: id=${widgetId}`, data);
    // Handle the widget click
  });
});
```

### Programmatically Setting Filters

You can programmatically set filters on your report:

```javascript
function applyFilter(sourceId, field, value) {
  // Create and dispatch a custom event
  const filterEvent = new CustomEvent('filter-change', {
    detail: { sourceId, field, value }
  });
  window.dispatchEvent(filterEvent);
}

// Example usage
document.getElementById('region-filter').addEventListener('change', (e) => {
  const region = e.target.value;
  applyFilter('sales-data', 'region', region === 'all' ? null : region);
});
```

### Creating a Complete Example

Here's a complete example that you can use as a starting point:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flarelight Reporting Demo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .report-container {
      width: 100%;
      height: 600px;
      margin: 20px 0;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .controls {
      margin-bottom: 20px;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
    
    select, button {
      padding: 8px 12px;
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <h1>Sales Performance Dashboard</h1>
  
  <div class="controls">
    <label for="region-filter">Filter by Region:</label>
    <select id="region-filter">
      <option value="all">All Regions</option>
      <option value="North">North</option>
      <option value="South">South</option>
      <option value="East">East</option>
      <option value="West">West</option>
    </select>
    
    <button id="refresh-btn">Refresh Data</button>
  </div>
  
  <div class="report-container">
    <flare-report-viewer
      id="my-report"
      report-id="sales-dashboard"
      show-placeholder="true">
    </flare-report-viewer>
  </div>

  <script type="module">
    import { defineCustomElements } from '@pegasus/reporting/loader';
    defineCustomElements();
    
    document.addEventListener('DOMContentLoaded', () => {
      initializeReport();
      setupEventListeners();
    });
    
    function initializeReport() {
      const reportViewer = document.getElementById('my-report');
      
      const reportConfig = {
        widgets: [
          {
            id: 'title-widget',
            type: 'text',
            title: 'Sales Dashboard',
            x: 0,
            y: 0,
            w: 12,
            h: 1,
            config: {
              text: 'Sales Performance Overview',
              fontSize: 'large',
              textAlign: 'center',
              enableFormatting: true
            }
          },
          {
            id: 'sales-by-region',
            type: 'bar',
            title: 'Sales by Region',
            x: 0,
            y: 1,
            w: 6,
            h: 4,
            config: {
              sourceId: 'sales-data',
              groupByField: 'region',
              valueField: 'sales',
              showGrid: true,
              showLegend: true
            }
          },
          {
            id: 'sales-trend',
            type: 'line',
            title: 'Monthly Sales Trend',
            x: 6,
            y: 1,
            w: 6,
            h: 4,
            config: {
              sourceId: 'trend-data',
              groupByField: 'month',
              valueField: 'sales',
              showGrid: true,
              showLegend: true
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
              { name: 'sales', displayName: 'Sales Amount', type: 'number' }
            ]
          },
          {
            id: 'trend-data',
            name: 'Trend Data',
            type: 'json',
            fields: [
              { name: 'month', displayName: 'Month', type: 'string' },
              { name: 'sales', displayName: 'Sales', type: 'number' }
            ]
          }
        ]
      };
      
      // Set the configuration
      reportViewer.configuration = reportConfig;
      
      // Implement the data fetching function
      reportViewer.fetchChartData = async (request) => {
        console.log('Chart data request:', request);
        
        if (request.sourceId === 'sales-data') {
          // Apply any active filters
          let data = [
            { region: 'North', sales: 1250 },
            { region: 'South', sales: 1450 },
            { region: 'East', sales: 950 },
            { region: 'West', sales: 1650 }
          ];
          
          // Filter the data if there are any filters in the request
          if (request.filters && request.filters.length > 0) {
            data = data.filter(item => {
              return request.filters.every(filter => {
                if (filter.field === 'region' && filter.value) {
                  return item.region === filter.value;
                }
                return true;
              });
            });
          }
          
          return data;
        } 
        else if (request.sourceId === 'trend-data') {
          return [
            { month: 'Jan', sales: 1000 },
            { month: 'Feb', sales: 1200 },
            { month: 'Mar', sales: 900 },
            { month: 'Apr', sales: 1500 },
            { month: 'May', sales: 1800 },
            { month: 'Jun', sales: 2000 }
          ];
        } 
        else {
          return [];
        }
      };
    }
    
    function setupEventListeners() {
      // Set up filter change handler
      document.getElementById('region-filter').addEventListener('change', (e) => {
        const region = e.target.value;
        applyFilter('sales-data', 'region', region === 'all' ? null : region);
      });
      
      // Set up refresh button handler
      document.getElementById('refresh-btn').addEventListener('click', () => {
        // Simply re-render the report (simulating a data refresh)
        const reportViewer = document.getElementById('my-report');
        reportViewer.configuration = { ...reportViewer.configuration };
      });
      
      // Listen for widget events
      window.addEventListener('widget-click', (event) => {
        console.log('Widget clicked:', event.detail);
      });
    }
    
    function applyFilter(sourceId, field, value) {
      // Create and dispatch a custom event
      const filterEvent = new CustomEvent('filter-change', {
        detail: { sourceId, field, value }
      });
      window.dispatchEvent(filterEvent);
    }
  </script>
</body>
</html>
```

## Available Widget Types

The Flarelight Reporting library supports various widget types:

1. **Text Widget**: Simple text display with formatting options
2. **Data Widget**: Advanced data visualization with multiple visualization types:
   - Table
   - Bar Chart
   - Line Chart
   - Pie Chart
   - KPI (Key Performance Indicator)
   - Heatmap
   - Histogram
   - Scatter Plot
   - Bubble Chart
   - Sunburst Chart

## Configuration Reference

### Report Configuration

```javascript
{
  widgets: Array<WidgetConfig>,
  sources: Array<DataSource>
}
```

### Widget Configuration

```javascript
{
  id: string,         // Unique identifier for the widget
  type: string,       // Widget type (text, bar, line, pie, etc.)
  title: string,      // Widget title
  x: number,          // Grid position X
  y: number,          // Grid position Y
  w: number,          // Width in grid units
  h: number,          // Height in grid units
  config: {           // Widget-specific configuration
    // Varies by widget type
  }
}
```

### Data Source Configuration

```javascript
{
  id: string,         // Unique identifier for the data source
  name: string,       // Display name
  type: string,       // Source type (usually 'json')
  fields: [           // Field definitions
    {
      name: string,             // Field identifier
      displayName: string,      // Display name
      type: string              // Data type (string, number, date, boolean)
    }
  ]
}
```

## Browser Support

The library is built using StencilJS and Web Components, which are supported by all modern browsers. For older browsers, polyfills may be required. 