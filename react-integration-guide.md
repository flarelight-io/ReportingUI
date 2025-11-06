# Integrating Flarelight Reporting into React Applications

This guide provides detailed instructions for integrating the Flarelight Reporting library into a React application.

## Prerequisites

- React project (created with Create React App, Next.js, or similar)
- Access to your organization's Azure DevOps Artifacts feed

## Installation

### 1. Configure your project to use Azure Artifacts

Create a `.npmrc` file in the root of your React project:

```
registry=https://registry.npmjs.org/
@your-organization:registry=https://pkgs.dev.azure.com/your-organization/_packaging/your-feed-name/npm/registry/
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
npm install @your-organization/flarelight-reporting --save
```

## Integration into React

### 1. Import the Theme CSS

First, you need to import the theme CSS file that contains all the styling variables. Add this import to your application's entry file (usually `src/index.js` or `src/index.tsx`):

```jsx
// Import the Flarelight Reporting theme CSS
import '@your-organization/flarelight-reporting/dist/flarelight-reporting/flarelight-reporting.css';
```

### 2. Register StencilJS Components

In your application's entry file (usually `src/index.js` or `src/index.tsx`), add the following:

```jsx
// Import React-related imports
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Import and define the custom elements from Flarelight Reporting
import { defineCustomElements } from '@your-organization/flarelight-reporting/loader';

// Register the Flarelight Reporting custom elements
defineCustomElements();

// Regular React rendering
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 3. Create TypeScript Declarations (if using TypeScript)

Create a file called `custom-elements.d.ts` in your `src` directory:

```typescript
// This file ensures TypeScript recognizes the custom elements
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
  }
}
```

### 4. Create a Report Component

Create a new React component to use the Flarelight Reporting library:

```jsx
import React, { useState, useEffect } from 'react';
import './ReportPage.css';

// Import types if using TypeScript
// import { ReportConfiguration } from '@your-organization/flarelight-reporting';

function ReportPage() {
  // Sample report configuration - in a real app, you might fetch this from an API
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

  // Function to fetch chart data
  const fetchChartData = async (request) => {
    console.log('Chart data request:', request);
    
    // In a real app, you would make an API call
    // For this example, we return mock data based on the source ID
    switch (request.sourceId) {
      case 'sales-data':
        return [
          { region: 'North', sales: 1250 },
          { region: 'South', sales: 1450 },
          { region: 'East', sales: 950 },
          { region: 'West', sales: 1650 }
        ];
      
      case 'trend-data':
        return [
          { month: 'Jan', sales: 1000 },
          { month: 'Feb', sales: 1200 },
          { month: 'Mar', sales: 900 },
          { month: 'Apr', sales: 1500 },
          { month: 'May', sales: 1800 },
          { month: 'Jun', sales: 2000 }
        ];
      
      default:
        return [];
    }
  };

  return (
    <div className="report-page">
      <header>
        <h1>Company Performance Dashboard</h1>
      </header>
      
      <div className="report-container">
        <report-viewer
          reportId="performance-dashboard"
          configuration={reportConfig}
          fetchChartData={fetchChartData}
          showPlaceholder={true}
        ></report-viewer>
      </div>
    </div>
  );
}

export default ReportPage;
```

### 5. Add CSS for the Report Container

Create a CSS file for your Report component (e.g., `ReportPage.css`):

```css
.report-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

header {
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.report-container {
  flex: 1;
  min-height: 600px;
  padding: 1rem;
  box-sizing: border-box;
}

/* The Flarelight Reporting components use Shadow DOM, so you can't style them directly */
/* You can use CSS variables to customize them if the library supports it */
report-viewer {
  width: 100%;
  height: 100%;
  display: block;
  --fl-primary-color: #1976d2;
  --fl-secondary-color: #f57c00;
  --fl-background-color: #ffffff;
}
```

### 6. Add the Report Component to your App

Update your `App.js` or `App.tsx` to include the Report component:

```jsx
import React from 'react';
import './App.css';
import ReportPage from './ReportPage';

function App() {
  return (
    <div className="App">
      <ReportPage />
    </div>
  );
}

export default App;
```

## Using ChartDataRequestBuilder in React

The `ChartDataRequestBuilder` utility class helps you build `ChartDataRequest` objects consistently, ensuring they match the backend C# model. This is especially useful when you need to fetch data for widgets directly in your React code.

### Import the Utility

```tsx
import { ChartDataRequestBuilder, ChartDataRequest } from '@your-organization/flarelight-reporting';
import type { DataSource, Filter } from '@your-organization/flarelight-reporting';
```

### Example: Building Requests for Data Widgets

```tsx
import React, { useState, useEffect } from 'react';
import { ChartDataRequestBuilder, ChartDataRequest } from '@your-organization/flarelight-reporting';
import type { DataSource, Filter } from '@your-organization/flarelight-reporting';

const MyReportComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const reportId = 'my-report-id';
  const source: DataSource = {
    id: 'data-source-id',
    name: 'Sales Data',
    type: 'DataImport',
    fields: []
  };
  const activeFilters: Filter[] = [];
  
  useEffect(() => {
    const fetchData = async () => {
      // Build a request for a bar chart
      const request = ChartDataRequestBuilder.buildForDataWidget(
        reportId,
        source,
        'widget-1',
        'bar',
        {
          valueField: 'sales',
          groupByField: 'region',
          aggregation: 'sum'
        },
        activeFilters,
        true // isViewer
      );
      
      // Fetch the data
      const response = await fetch('/api/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      const result = await response.json();
      setData(result);
      setLoading(false);
    };
    
    fetchData();
  }, []);
  
  return <div>{/* Render your data */}</div>;
};
```

### Example: Building Requests for Analysis Widgets

```tsx
import React, { useState, useEffect } from 'react';
import { ChartDataRequestBuilder } from '@your-organization/flarelight-reporting';

const AnalysisWidgetComponent = () => {
  const [data, setData] = useState([]);
  
  const reportId = 'my-report-id';
  const analysisId = 'analysis-result-id';
  
  useEffect(() => {
    const fetchAnalysisData = async () => {
      // Build a request for a correlation analysis widget
      const request = ChartDataRequestBuilder.buildForAnalysisWidget(
        reportId,
        analysisId,
        'correlation-widget-1',
        'correlationAnalysis',
        true // isViewer
      );
      
      // Fetch the data
      const response = await fetch('/api/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      const result = await response.json();
      setData(result);
    };
    
    fetchAnalysisData();
  }, []);
  
  return <div>{/* Render your analysis data */}</div>;
};
```

### Example: Using with Custom fetchChartData Function

You can also use the builder in your `fetchChartData` function to ensure consistency:

```tsx
import { ChartDataRequestBuilder } from '@your-organization/flarelight-reporting';
import type { ChartDataRequest, DataSource, Filter } from '@your-organization/flarelight-reporting';

const ReportPage = () => {
  const sources: DataSource[] = [
    {
      id: 'sales-data',
      name: 'Sales Data',
      type: 'DataImport',
      fields: []
    }
  ];
  
  const activeFilters: Filter[] = [];
  
  const fetchChartData = async (request: ChartDataRequest) => {
    // The request is already built by the widget using ChartDataRequestBuilder
    // You can use it directly or rebuild it if needed
    
    const response = await fetch('/api/chart-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch chart data');
    }
    
    return await response.json();
  };
  
  return (
    <report-viewer
      reportId="my-report"
      configuration={config}
      fetchChartData={fetchChartData}
    />
  );
};
```

### Available Methods

- `ChartDataRequestBuilder.buildForDataWidget()` - Builds requests for standard data widgets (tables, charts, KPIs, etc.)
- `ChartDataRequestBuilder.buildForAnalysisWidget()` - Builds requests for analysis widgets (descriptive, correlation, hypothesis tests, etc.)
- `ChartDataRequestBuilder.build()` - Generic builder for custom cases

All methods ensure the request structure matches the backend C# `ChartDataRequest` model.
```

## Advanced Usage

### Dynamic Configuration

In a real application, you might want to load the report configuration dynamically:

```jsx
import React, { useState, useEffect } from 'react';
import './ReportPage.css';

function ReportPage() {
  const [reportConfig, setReportConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the report configuration from your API
    async function fetchReportConfig() {
      try {
        setLoading(true);
        const response = await fetch('/api/reports/dashboard-config');
        const data = await response.json();
        setReportConfig(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load report configuration');
        setLoading(false);
        console.error('Error loading report configuration:', err);
      }
    }

    fetchReportConfig();
  }, []);

  // Function to fetch chart data from your API
  // You can use ChartDataRequestBuilder to build requests consistently
  const fetchChartData = async (request) => {
    try {
      const response = await fetch('/api/data/chart-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="report-page">
      <header>
        <h1>Company Performance Dashboard</h1>
      </header>
      
      <div className="report-container">
        {reportConfig && (
          <report-viewer
            reportId="performance-dashboard"
            configuration={reportConfig}
            fetchChartData={fetchChartData}
            showPlaceholder={true}
          ></report-viewer>
        )}
      </div>
    </div>
  );
}

export default ReportPage;
```

## Troubleshooting

### Components Not Rendering

If the components aren't rendering, ensure that:

1. You've properly called `defineCustomElements()` in your app's entry point
2. You've imported the theme CSS file (`@your-organization/flarelight-reporting/dist/flarelight-reporting/flarelight-reporting.css`)
3. You're not encountering any JavaScript errors in the console
4. Your Azure Artifacts authentication is working correctly
5. You've properly configured your .npmrc file

### Missing Styling

If the components are rendering but appear unstyled or with incorrect colors:

1. Ensure you've imported the theme CSS file in your app's entry point
2. Check that the CSS file path is correct and the file exists in your node_modules
3. Verify that your bundler (Webpack, Vite, etc.) is processing the CSS import correctly

### TypeScript Errors

If you're getting TypeScript errors about unknown elements:

1. Ensure you've created the `custom-elements.d.ts` file as described above
2. Make sure it's in a location where TypeScript can find it
3. Try restarting your development server

## Additional Resources

- [StencilJS Documentation](https://stenciljs.com/docs/overview)
- [Using Web Components in React](https://stenciljs.com/docs/react)
- [Azure Artifacts Documentation](https://docs.microsoft.com/en-us/azure/devops/artifacts/) 