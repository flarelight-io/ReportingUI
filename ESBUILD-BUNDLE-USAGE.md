# Flarelight Reporting - esbuild Bundle with Stencil Runtime

## 🚀 Complete Solution with Stencil Runtime

You now have a **complete JavaScript bundle** (`flarelight-reporting-esbuild.js`) that includes the full Stencil runtime and all your components. This bundle was created using esbuild and contains everything needed to run your Stencil components in any HTML page.

**File size:** 391.44 KB

## ✅ What's Included

- ✅ Complete Stencil runtime
- ✅ All visualization components
- ✅ Automatic custom element registration
- ✅ Global helper functions
- ✅ No external dependencies required
- ✅ **PuppeteerSharp compatibility fix**

## 🎯 Usage

### 1. Include the Bundle
```html
<script src="flarelight-reporting-esbuild.js"></script>
```

### 2. Use Components Directly in HTML with JavaScript
```html
<kpi-visualization id="my-kpi"></kpi-visualization>

<script>
// Set properties via JavaScript (recommended)
const kpi = document.getElementById('my-kpi');
kpi.config = {
    title: "Revenue",
    format: "currency"
};
kpi.data = {
    rawData: [{ value: 125000, previousValue: 120000, trend: "up" }],
    loading: false
};
</script>
```

## 🤖 PuppeteerSharp Integration

This bundle is **specifically optimized for PuppeteerSharp** and includes a fix for the common `Invalid URL` error that occurs in headless browser contexts.

### PuppeteerSharp Usage Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Report</title>
</head>
<body>
    <report-viewer id="viewer"
                         report-id="viewer"
                         is-viewer="true"
                         configuration='{"layouts": {...}, "sources": [...], "widgets": [...]}'>
    </report-viewer>

    <script src="flarelight-reporting-esbuild.js"></script>
    <script>
        // Your PuppeteerSharp bridge function
        window.fetchChartData = async function (config) {
            return await window.getChartData(config); // bridged from PuppeteerSharp
        };

        customElements.whenDefined('report-viewer').then(() => {
            const viewer = document.getElementById('viewer');
            viewer.fetchChartData = window.fetchChartData;
        });
    </script>
</body>
</html>
```

### C# PuppeteerSharp Example

```csharp
using PuppeteerSharp;

// Load your HTML with the bundle
await page.SetContentAsync(htmlContent);

// Inject your data bridge
await page.ExposeFunctionAsync("getChartData", new Func<object, Task<object>>(async (config) => {
    // Your data fetching logic here
    return await FetchDataFromDatabase(config);
}));

// Wait for components to render
await page.WaitForSelectorAsync("report-viewer");
await page.WaitForTimeoutAsync(2000); // Allow time for data loading

// Generate PDF
var pdfBytes = await page.PdfAsync(new PdfOptions
{
    Format = PaperFormat.A4,
    PrintBackground = true
});
```

## 🔧 Technical Details - PuppeteerSharp Fix

The bundle includes an automatic fix for the common PuppeteerSharp error:
```
TypeError: Failed to construct 'URL': Invalid URL at bootstrapLazy
```

This happens because PuppeteerSharp's `document.baseURI` is often `null` or `about:blank`. The bundle automatically detects this and sets a proper base URI (`file:///`) to prevent the error.

### 3. Create Components with JavaScript
```javascript
// Using the helper functions
const kpi = FlarelightReporting.createKPI(
    { title: 'Revenue', format: 'currency' },
    125000,  // value
    120000,  // previousValue
    'up'     // trend
);
document.body.appendChild(kpi);

// Using the chart helper
const barChart = FlarelightReporting.createChart('bar', 
    { title: 'Sales by Region' },
    [
        { category: 'North', value: 12000 },
        { category: 'South', value: 19000 },
        { category: 'East', value: 3000 },
        { category: 'West', value: 5000 }
    ]
);
document.body.appendChild(barChart);

// Using the generic widget helper
const pieChart = FlarelightReporting.createWidget('pie-chart', 
    { title: 'Market Share', visualizationType: 'pie' },
    [
        { category: 'Product A', value: 30 },
        { category: 'Product B', value: 45 },
        { category: 'Product C', value: 25 }
    ]
);
document.body.appendChild(pieChart);
```

### 4. Data Structure

All visualization components expect data in this format:
```javascript
{
    rawData: [
        // Array of data objects
        { category: 'A', value: 100 },
        { category: 'B', value: 200 }
    ],
    loading: false,  // boolean
    error?: "Error message"  // optional error string
}
```

## 📦 Available Components

- `kpi-visualization` - KPI widgets
- `bar-chart-visualization` - Bar charts
- `line-chart-visualization` - Line charts
- `pie-chart-visualization` - Pie charts
- `table-visualization` - Data tables
- `report-viewer` - Complete report viewer
- `text-widget` - Text widgets
- `data-widget` - Data widgets
- `source-info-widget` - Source information widgets
- `base-widget` - Base widget component
- `report-demo` - Demo component
- `box-whisker-chart-visualization` - Box and whisker charts
- `bubble-chart-visualization` - Bubble charts
- `clustered-bar-chart-visualization` - Clustered bar charts
- `heatmap-visualization` - Heatmaps
- `histogram-chart-visualization` - Histograms
- `lollipop-chart-visualization` - Lollipop charts
- `scatter-chart-visualization` - Scatter plots
- `stacked-bar-chart-visualization` - Stacked bar charts
- `sunburst-chart-visualization` - Sunburst charts
- `correlation-analysis-widget` - Correlation analysis
- `descriptive-analysis-widget` - Descriptive statistics

## 🌐 Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ **PuppeteerSharp headless Chrome**
- ✅ Automatic custom element registration
- ✅ Complete Stencil runtime included
- ✅ No build process required
- ✅ No external dependencies

## 🎮 Demo Files

- `demo-esbuild.html` - Interactive demo for browsers
- `puppeteer-test.html` - PuppeteerSharp test file
- `test-bundle.html` - Simple component test

## 📋 Copy & Paste Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Report</title>
</head>
<body>
    <h1>My Dashboard</h1>
    
    <kpi-visualization id="revenue-kpi"></kpi-visualization>
    <bar-chart-visualization id="sales-chart"></bar-chart-visualization>
    
    <script src="flarelight-reporting-esbuild.js"></script>
    <script>
        // Wait for components to load
        setTimeout(() => {
            // Initialize KPI
            const kpi = document.getElementById('revenue-kpi');
            kpi.config = { title: "Revenue", format: "currency" };
            kpi.data = {
                rawData: [{ value: 125000 }],
                loading: false
            };
            
            // Initialize Bar Chart
            const chart = document.getElementById('sales-chart');
            chart.config = { title: "Sales", visualizationType: "bar" };
            chart.data = {
                rawData: [
                    { category: "Jan", value: 100 },
                    { category: "Feb", value: 200 }
                ],
                loading: false
            };
        }, 1000);
    </script>
</body>
</html>
```

## 🔧 Technical Details

- **Bundler**: esbuild
- **Format**: IIFE (Immediately Invoked Function Expression)
- **Target**: ES2017
- **Platform**: Browser
- **Runtime**: Complete Stencil runtime included
- **Registration**: Automatic custom element registration
- **PuppeteerSharp**: Compatible with baseURI fix

## 🆚 Comparison with Previous Bundle

| Feature | Previous Bundle | esbuild Bundle |
|---------|----------------|----------------|
| Stencil Runtime | ❌ Missing | ✅ Complete |
| File Size | 453 KB | 391 KB |
| Dependencies | Manual registration | Auto registration |
| Reliability | Limited | Full functionality |
| Data Structure | Incorrect | ✅ Correct |
| PuppeteerSharp | ❌ URL Error | ✅ Compatible |

## 🎉 Perfect for .NET Backend

This bundle is ideal for your .NET backend PDF generation use case:

1. **Single file** - Easy to include in static HTML
2. **Complete runtime** - All Stencil functionality works
3. **Auto registration** - Components work immediately
4. **Smaller size** - More efficient than the previous approach
5. **Correct data structure** - Components render properly
6. **PuppeteerSharp ready** - No URL construction errors

## 🚨 Important Notes

- Always set `config` and `data` as **properties** (not attributes) via JavaScript
- The `data` prop must include `rawData` array and `loading` boolean
- Wait for components to be defined before setting properties (use setTimeout or DOMContentLoaded)
- Use the provided helper functions for easier component creation
- **PuppeteerSharp users**: The bundle automatically handles baseURI issues

That's it! 🎉 Your Stencil components with complete runtime are now ready to use in any static HTML page, including PuppeteerSharp contexts. 