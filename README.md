[![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)](https://stenciljs.com)

# Flarelight Reporting

A StencilJS-based reporting component library for creating interactive data visualization dashboards and reports.

## Installation

### 1. Configure npm to use Azure Artifacts

Create or update your `.npmrc` file with the following:

```
registry=https://registry.npmjs.org/
@your-organization:registry=https://pkgs.dev.azure.com/your-organization/_packaging/your-feed-name/npm/registry/
always-auth=true
```

### 2. Install the package

```bash
npm install @your-organization/flarelight-reporting --save
```

## Usage in React Applications

This is a StencilJS component library published as Web Components that can be used in React applications.

### Setup

In your React application, add the following to integrate the Flarelight Reporting components:

```jsx
// In your index.js or App.js
import { defineCustomElements } from '@your-organization/flarelight-reporting/loader';

// Register the custom elements
defineCustomElements();
```

### Using Components

Once registered, you can use the custom elements directly in your React components:

```jsx
import React from 'react';

function Dashboard() {
  // Demo report configuration
  const reportConfig = {
    widgets: [
      {
        id: 'chart1',
        type: 'bar',
        title: 'Sales by Region',
        x: 0,
        y: 0,
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
      // Add more widgets as needed
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
      }
    ]
  };

  // Function to fetch chart data
  const fetchChartData = async (request) => {
    // In a real app, you would fetch from your API
    // For this example, return mock data
    return [
      { region: 'North', sales: 1250 },
      { region: 'South', sales: 1450 },
      { region: 'East', sales: 950 },
      { region: 'West', sales: 1650 }
    ];
  };

  return (
    <div className="dashboard">
      <h1>Sales Dashboard</h1>
      <div className="report-container">
        <report-viewer
          reportId="sales-dashboard"
          configuration={reportConfig}
          fetchChartData={fetchChartData}
        ></report-viewer>
      </div>
    </div>
  );
}

export default Dashboard;
```

### Available Components

The library includes the following components:

- `<report-viewer>` - Main report container
- `<base-widget>` - Base widget component
- `<text-widget>` - Text display widget
- `<source-info-widget>` - Data source information widget
- `<data-widget>` - Data visualization widget
- `<descriptive-analysis-widget>` - Statistical analysis widget
- `<correlation-analysis-widget>` - Correlation matrix widget

Plus multiple visualization components:
- Bar charts
- Line charts 
- Pie/Donut charts
- Scatter plots
- Heatmaps
- Sunburst charts
- And more...

## Creating a Bundle for Report Generator Apps

If you need a single JavaScript file that you can drop into your report generator application, you can create a bundled version using esbuild.

### Step 1: Build the Stencil Components

First, ensure your Stencil components are built:

```bash
npm run build
```

### Step 2: Create the Bundle

Run the esbuild bundling script:

```bash
npm run bundle:esbuild
```

This will create a single file called `flarelight-reporting-esbuild.js` that includes:
- Complete Stencil runtime
- All visualization components
- Automatic custom element registration
- Global helper functions
- PuppeteerSharp compatibility fixes

### Step 3: Use the Bundle

The generated bundle can be included in any HTML page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Report</title>
</head>
<body>
    <h1>Sales Dashboard</h1>
    
    <!-- Include the bundle -->
    <script src="flarelight-reporting-esbuild.js"></script>
    
    <!-- Create components programmatically -->
    <div id="kpi-container"></div>
    <div id="chart-container"></div>
    
    <script>
        // Wait for components to be ready
        window.addEventListener('flarelight-components-ready', async () => {
            // Create a KPI widget
            const kpi = await window.FlarelightReporting.createElement('kpi-visualization', {
                config: {
                    title: "Revenue",
                    kpiFormatType: "currency"
                },
                data: {
                    rawData: [{ value: 125000, previousValue: 120000, trend: "up" }],
                    loading: false
                }
            });
            document.getElementById('kpi-container').appendChild(kpi);
            
            // Create a bar chart
            const barChart = await window.FlarelightReporting.createElement('bar-chart-visualization', {
                config: {
                    title: "Sales by Region",
                    visualizationType: "bar",
                    groupByField: "region",
                    valueField: "sales"
                },
                data: {
                    rawData: [
                        { region: "North", sales: 12000 },
                        { region: "South", sales: 19000 },
                        { region: "East", sales: 3000 },
                        { region: "West", sales: 5000 }
                    ],
                    loading: false
                }
            });
            document.getElementById('chart-container').appendChild(barChart);
        });
    </script>
</body>
</html>
```

### Bundle Features

- **File Size**: ~391 KB (includes complete runtime)
- **Format**: IIFE (Immediately Invoked Function Expression)
- **Target**: ES2017 (compatible with modern browsers)
- **Dependencies**: None (everything bundled)
- **PuppeteerSharp**: Compatible with automatic baseURI fixes

### Available Helper Functions

The bundle provides these global helper functions:

```javascript
// Check if components are ready
window.FlarelightReporting.isReady

// Wait for components to be ready
await window.FlarelightReporting.whenReady()

// Create any component
await window.FlarelightReporting.createElement('kpi-visualization', config, data)

// Create KPI specifically
await window.FlarelightReporting.createKPI(config, value, previousValue, trend)

// Create charts
await window.FlarelightReporting.createChart('bar', config, data)

// Render complete reports
await window.FlarelightReporting.renderReport(container, reportConfig)
```

### Demo Files

After running the bundle command, you'll also get:
- `demo-esbuild.html` - Interactive demo showing all components
- `bundle-meta.json` - Bundle analysis and dependency information

## Contributing

Please refer to the internal development guidelines for contribution information.

## License

MIT