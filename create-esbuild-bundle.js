const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

/**
 * Creates a single JavaScript bundle using esbuild that includes the Stencil runtime
 */
async function createEsbuildBundle() {
  console.log('Creating single JavaScript bundle with esbuild...');
  
  try {
    // Create a simple entry file that just imports the loader
    const entryContent = `
// Fix for PuppeteerSharp - ensure document.baseURI is valid
if (typeof document !== 'undefined' && (!document.baseURI || document.baseURI === 'about:blank')) {
  // Set a proper base URI for PuppeteerSharp context
  Object.defineProperty(document, 'baseURI', {
    value: 'file:///',
    writable: false,
    configurable: false
  });
}

// Import the defineCustomElements function from the loader
import { defineCustomElements } from './loader/index.js';

// Track initialization state
let componentsInitialized = false;
let initializationPromise = null;

// Function to initialize components
function initializeComponents() {
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = defineCustomElements(window).then(() => {
    componentsInitialized = true;
    console.log('Flarelight Reporting Components initialized');
    
    // Dispatch a custom event to notify that components are ready
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flarelight-components-ready'));
    }
    
    // Handle any existing custom elements that were created before registration
    if (typeof document !== 'undefined') {
      // Force upgrade of existing custom elements
      const customElements = document.querySelectorAll('report-viewer, kpi-visualization, bar-chart-visualization, pie-chart-visualization, line-chart-visualization');
      customElements.forEach(element => {
        // Trigger a re-render by temporarily removing and re-adding
        if (element.parentNode && element.tagName.includes('-')) {
          const nextSibling = element.nextSibling;
          const parent = element.parentNode;
          parent.removeChild(element);
          if (nextSibling) {
            parent.insertBefore(element, nextSibling);
          } else {
            parent.appendChild(element);
          }
        }
      });
    }
    
    return true;
  }).catch(error => {
    console.error('Failed to initialize Flarelight Reporting Components:', error);
    throw error;
  });
  
  return initializationPromise;
}

// Global helper functions
window.FlarelightReporting = {
  // Check if components are ready
  get isReady() {
    return componentsInitialized;
  },
  
  // Get the initialization promise
  async whenReady() {
    if (componentsInitialized) {
      return Promise.resolve();
    }
    return initializationPromise || initializeComponents();
  },
  
  // Helper to create components programmatically - now async
  async createElement(tagName, props = {}, children = []) {
    await this.whenReady();
    
    const element = document.createElement(tagName);
    
    // Set properties directly on the element
    Object.keys(props).forEach(key => {
      if (key === 'config' || key === 'data') {
        // Set config and data as properties, not attributes
        element[key] = props[key];
      } else if (typeof props[key] === 'object') {
        element.setAttribute(key, JSON.stringify(props[key]));
      } else {
        element.setAttribute(key, props[key]);
      }
    });
    
    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    
    return element;
  },
  
  // Helper to render a report using the report viewer
  async renderReport(container, config) {
    await this.whenReady();
    
    const reportViewer = await this.createElement('report-viewer', {
      'report-id': config.reportId || 'default',
      'is-viewer': 'true',
      'configuration': config.configuration || {}
    });
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.appendChild(reportViewer);
    }
    return reportViewer;
  },
  
  // Helper to create individual widgets with proper data structure
  async createWidget(type, config = {}, rawData = []) {
    const tagName = type.includes('-') ? type : type + '-visualization';
    return await this.createElement(tagName, {
      config: config,
      data: {
        rawData: rawData,
        loading: false
      }
    });
  },
  
  // Helper to create KPI widget
  async createKPI(config = {}, value, previousValue, trend) {
    return await this.createElement('kpi-visualization', {
      config: config,
      data: {
        rawData: [{ value, previousValue, trend }],
        loading: false
      }
    });
  },
  
  // Helper to create chart widgets
  async createChart(type, config = {}, data = []) {
    const tagName = type + '-chart-visualization';
    return await this.createElement(tagName, {
      config: { ...config, visualizationType: type },
      data: {
        rawData: data,
        loading: false
      }
    });
  },
  
  // Force initialization - useful for static HTML
  async initialize() {
    return initializeComponents();
  }
};

// Auto-initialize components immediately when the script loads
initializeComponents();

console.log('Flarelight Reporting Components bundle loaded with esbuild');
`;

    // Write the temporary entry file
    const tempEntryFile = 'temp-bundle-entry.js';
    fs.writeFileSync(tempEntryFile, entryContent);

    // Bundle with esbuild
    const result = await esbuild.build({
      entryPoints: [tempEntryFile],
      bundle: true,
      format: 'iife',
      outfile: 'flarelight-reporting-esbuild.js',
      platform: 'browser',
      target: 'es2017',
      minify: false,
      sourcemap: false,
      globalName: 'FlarelightReportingBundle',
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      external: [], // Bundle everything
      loader: {
        '.scss': 'css',
        '.css': 'css'
      },
      resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
      metafile: true
    });

    // Clean up temp file
    fs.unlinkSync(tempEntryFile);

    const outputFile = 'flarelight-reporting-esbuild.js';
    const fileSize = fs.statSync(outputFile).size;
    
    console.log(`✓ esbuild bundle created: ${outputFile}`);
    console.log(`✓ File size: ${(fileSize / 1024).toFixed(2)} KB`);
    
    // Write metafile for analysis
    fs.writeFileSync('bundle-meta.json', JSON.stringify(result.metafile, null, 2));
    console.log('✓ Bundle analysis saved to: bundle-meta.json');
    
    // Create demo HTML
    const demoHtml = createEsbuildDemoHtml(outputFile);
    fs.writeFileSync('demo-esbuild.html', demoHtml);
    console.log('✓ Demo HTML created: demo-esbuild.html');
    
    return outputFile;
    
  } catch (error) {
    console.error('Error creating esbuild bundle:', error);
    throw error;
  }
}

function createEsbuildDemoHtml(bundleFile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flarelight Reporting - esbuild Bundle Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .widget {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        }
        .controls {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 5px;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        .code-example {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            overflow-x: auto;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .status.loading {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .status.ready {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .report-viewer-demo {
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            background: #f8f9ff;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Flarelight Reporting - esbuild Bundle Demo</h1>
        <p><strong>Perfect!</strong> This bundle was created with esbuild and includes the complete Stencil runtime.</p>
        
        <div id="status" class="status loading">
            ⏳ Loading components...
        </div>
        
        <div class="controls">
            <h3>Dynamic Component Creation</h3>
            <button id="add-kpi" disabled onclick="addKPI()">Add KPI Widget</button>
            <button id="add-bar-chart" disabled onclick="addBarChart()">Add Bar Chart</button>
            <button id="add-pie-chart" disabled onclick="addPieChart()">Add Pie Chart</button>
            <button id="add-line-chart" disabled onclick="addLineChart()">Add Line Chart</button>
            <button id="clear-widgets" disabled onclick="clearWidgets()">Clear All</button>
            <br><br>
            <button id="demo-report-viewer" disabled onclick="demoReportViewer()">🎯 Demo Report Viewer</button>
        </div>
        
        <div class="widget">
            <h3>📋 Usage - Copy & Paste Ready!</h3>
            <p>To use this bundle in any HTML page, just include:</p>
            <div class="code-example">
&lt;script src="${bundleFile}"&gt;&lt;/script&gt;<br><br>
&lt;!-- Wait for components to be ready, then create them --&gt;<br>
&lt;script&gt;<br>
window.addEventListener('flarelight-components-ready', async () => {<br>
&nbsp;&nbsp;const kpi = await window.FlarelightReporting.createElement('kpi-visualization', {<br>
&nbsp;&nbsp;&nbsp;&nbsp;config: {"title": "Revenue", "format": "currency"},<br>
&nbsp;&nbsp;&nbsp;&nbsp;data: {"rawData": [{"value": 125000}], "loading": false}<br>
&nbsp;&nbsp;});<br>
&nbsp;&nbsp;document.body.appendChild(kpi);<br>
});<br>
&lt;/script&gt;
            </div>
        </div>
        
        <div class="report-viewer-demo">
            <h3>📊 Report Viewer Demo</h3>
            <p>This demonstrates the <code>report-viewer</code> component with a sample configuration:</p>
            <div id="report-viewer-container"></div>
        </div>
        
        <div class="widget">
            <h3>📊 Static KPI Component</h3>
            <div id="static-kpi-container"></div>
        </div>
        
        <div class="widget">
            <h3>📈 Static Bar Chart Component</h3>
            <div id="static-bar-chart-container"></div>
        </div>
        
        <div class="widget">
            <h3>🥧 Static Pie Chart Component</h3>
            <div id="static-pie-chart-container"></div>
        </div>
        
        <div id="dynamic-widgets">
            <h3>⚡ Dynamically Added Widgets</h3>
        </div>
    </div>

    <!-- Include the esbuild bundle -->
    <script src="${bundleFile}"></script>
    
    <script>
        let componentsReady = false;
        
        // Listen for components ready event
        window.addEventListener('flarelight-components-ready', async () => {
            console.log('🎉 Components are ready!');
            componentsReady = true;
            
            // Update status
            const status = document.getElementById('status');
            status.className = 'status ready';
            status.innerHTML = '✅ Components loaded and ready!';
            
            // Enable buttons
            document.querySelectorAll('button').forEach(btn => btn.disabled = false);
            
            // Initialize static components
            await initializeStaticComponents();
            
            // Initialize report viewer demo
            await initializeReportViewer();
        });
        
        // Fallback timeout in case event doesn't fire
        setTimeout(async () => {
            if (!componentsReady) {
                console.log('⏱️ Timeout reached, checking if components are ready...');
                await window.FlarelightReporting.whenReady();
                window.dispatchEvent(new CustomEvent('flarelight-components-ready'));
            }
        }, 2000);
        
        async function initializeStaticComponents() {
            try {
                // Create static KPI
                const staticKpi = await window.FlarelightReporting.createElement('kpi-visualization', {
                    config: {
                        title: "Revenue",
                        kpiFormatType: "currency"
                    },
                    data: {
                        rawData: [{ value: 125000, previousValue: 120000, trend: "up" }],
                        loading: false
                    }
                });
                document.getElementById('static-kpi-container').appendChild(staticKpi);
                
                // Create static bar chart
                const staticBarChart = await window.FlarelightReporting.createElement('bar-chart-visualization', {
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
                document.getElementById('static-bar-chart-container').appendChild(staticBarChart);
                
                // Create static pie chart
                const staticPieChart = await window.FlarelightReporting.createElement('pie-chart-visualization', {
                    config: {
                        title: "Market Share",
                        visualizationType: "pie",
                        groupByField: "category",
                        valueField: "value"
                    },
                    data: {
                        rawData: [
                            { category: "Product A", value: 30 },
                            { category: "Product B", value: 45 },
                            { category: "Product C", value: 25 }
                        ],
                        loading: false
                    }
                });
                document.getElementById('static-pie-chart-container').appendChild(staticPieChart);
                
                console.log('✅ Static components initialized successfully');
            } catch (error) {
                console.error('❌ Error initializing static components:', error);
            }
        }
        
        async function initializeReportViewer() {
            try {
                const sampleConfiguration = {
                    layouts: [{
                        id: "main",
                        name: "Dashboard",
                        widgets: [
                            {
                                id: "kpi1",
                                type: "kpi-visualization",
                                title: "Total Revenue",
                                width: 6,
                                height: 3,
                                config: {
                                    kpiFormatType: "currency",
                                    sourceId: "sample"
                                }
                            },
                            {
                                id: "chart1", 
                                type: "bar-chart-visualization",
                                title: "Sales by Category",
                                width: 6,
                                height: 6,
                                config: {
                                    visualizationType: "bar",
                                    groupByField: "category",
                                    valueField: "amount",
                                    sourceId: "sample"
                                }
                            }
                        ]
                    }],
                    dataSources: [{
                        id: "sample",
                        name: "Sample Data",
                        type: "static",
                        data: [
                            { category: "Electronics", amount: 25000 },
                            { category: "Clothing", amount: 18000 },
                            { category: "Books", amount: 8000 },
                            { category: "Home", amount: 15000 }
                        ]
                    }]
                };
                
                const reportViewer = await window.FlarelightReporting.renderReport(
                    '#report-viewer-container',
                    {
                        reportId: 'demo-report',
                        configuration: sampleConfiguration
                    }
                );
                
                console.log('✅ Report viewer initialized successfully');
            } catch (error) {
                console.error('❌ Error initializing report viewer:', error);
            }
        }
        
        // Dynamic widget creation functions - now async
        async function addKPI() {
            try {
                const container = document.getElementById('dynamic-widgets');
                const widget = await window.FlarelightReporting.createElement('kpi-visualization', {
                    config: {
                        title: 'Dynamic KPI ' + Date.now(),
                        kpiFormatType: 'number'
                    },
                    data: {
                        rawData: [{
                            value: Math.floor(Math.random() * 1000),
                            trend: Math.random() > 0.5 ? 'up' : 'down'
                        }],
                        loading: false
                    }
                });
                
                const wrapper = document.createElement('div');
                wrapper.className = 'widget';
                wrapper.innerHTML = '<h4>🎯 Dynamic KPI</h4>';
                wrapper.appendChild(widget);
                container.appendChild(wrapper);
            } catch (error) {
                console.error('Error adding KPI:', error);
            }
        }
        
        async function addBarChart() {
            try {
                const container = document.getElementById('dynamic-widgets');
                const widget = await window.FlarelightReporting.createElement('bar-chart-visualization', {
                    config: {
                        title: 'Dynamic Chart ' + Date.now(),
                        visualizationType: 'bar',
                        groupByField: 'category',
                        valueField: 'value'
                    },
                    data: {
                        rawData: [
                            { category: 'A', value: Math.floor(Math.random() * 100) },
                            { category: 'B', value: Math.floor(Math.random() * 100) },
                            { category: 'C', value: Math.floor(Math.random() * 100) },
                            { category: 'D', value: Math.floor(Math.random() * 100) }
                        ],
                        loading: false
                    }
                });
                
                const wrapper = document.createElement('div');
                wrapper.className = 'widget';
                wrapper.innerHTML = '<h4>📊 Dynamic Bar Chart</h4>';
                wrapper.appendChild(widget);
                container.appendChild(wrapper);
            } catch (error) {
                console.error('Error adding bar chart:', error);
            }
        }
        
        async function addPieChart() {
            try {
                const container = document.getElementById('dynamic-widgets');
                const widget = await window.FlarelightReporting.createElement('pie-chart-visualization', {
                    config: {
                        title: 'Dynamic Pie Chart ' + Date.now(),
                        visualizationType: 'pie',
                        groupByField: 'category',
                        valueField: 'value'
                    },
                    data: {
                        rawData: [
                            { category: 'Red', value: Math.floor(Math.random() * 100) },
                            { category: 'Blue', value: Math.floor(Math.random() * 100) },
                            { category: 'Yellow', value: Math.floor(Math.random() * 100) },
                            { category: 'Green', value: Math.floor(Math.random() * 100) }
                        ],
                        loading: false
                    }
                });
                
                const wrapper = document.createElement('div');
                wrapper.className = 'widget';
                wrapper.innerHTML = '<h4>🥧 Dynamic Pie Chart</h4>';
                wrapper.appendChild(widget);
                container.appendChild(wrapper);
            } catch (error) {
                console.error('Error adding pie chart:', error);
            }
        }
        
        async function addLineChart() {
            try {
                const container = document.getElementById('dynamic-widgets');
                const widget = await window.FlarelightReporting.createElement('line-chart-visualization', {
                    config: {
                        title: 'Dynamic Line Chart ' + Date.now(),
                        visualizationType: 'line',
                        groupByField: 'month',
                        valueField: 'sales'
                    },
                    data: {
                        rawData: [
                            { month: 'Jan', sales: Math.floor(Math.random() * 100) },
                            { month: 'Feb', sales: Math.floor(Math.random() * 100) },
                            { month: 'Mar', sales: Math.floor(Math.random() * 100) },
                            { month: 'Apr', sales: Math.floor(Math.random() * 100) },
                            { month: 'May', sales: Math.floor(Math.random() * 100) }
                        ],
                        loading: false
                    }
                });
                
                const wrapper = document.createElement('div');
                wrapper.className = 'widget';
                wrapper.innerHTML = '<h4>📈 Dynamic Line Chart</h4>';
                wrapper.appendChild(widget);
                container.appendChild(wrapper);
            } catch (error) {
                console.error('Error adding line chart:', error);
            }
        }
        
        async function demoReportViewer() {
            try {
                const container = document.getElementById('dynamic-widgets');
                
                const sampleConfig = {
                    layouts: [{
                        id: "dynamic",
                        name: "Dynamic Report",
                        widgets: [
                            {
                                id: "dynamic_kpi",
                                type: "kpi-visualization", 
                                title: "Dynamic KPI",
                                width: 12,
                                height: 3,
                                config: {
                                    kpiFormatType: "number",
                                    sourceId: "dynamic"
                                }
                            },
                            {
                                id: "dynamic_chart",
                                type: "pie-chart-visualization",
                                title: "Dynamic Distribution", 
                                width: 12,
                                height: 6,
                                config: {
                                    visualizationType: "pie",
                                    groupByField: "type",
                                    valueField: "count",
                                    sourceId: "dynamic"
                                }
                            }
                        ]
                    }],
                    dataSources: [{
                        id: "dynamic",
                        name: "Dynamic Data",
                        type: "static",
                        data: [
                            { type: "Type A", count: Math.floor(Math.random() * 50) },
                            { type: "Type B", count: Math.floor(Math.random() * 50) },
                            { type: "Type C", count: Math.floor(Math.random() * 50) }
                        ]
                    }]
                };
                
                const wrapper = document.createElement('div');
                wrapper.className = 'widget report-viewer-demo';
                wrapper.innerHTML = '<h4>📊 Dynamic Report Viewer</h4>';
                
                const reportContainer = document.createElement('div');
                wrapper.appendChild(reportContainer);
                
                await window.FlarelightReporting.renderReport(reportContainer, {
                    reportId: 'dynamic-report-' + Date.now(),
                    configuration: sampleConfig
                });
                
                container.appendChild(wrapper);
            } catch (error) {
                console.error('Error creating report viewer:', error);
            }
        }
        
        function clearWidgets() {
            const container = document.getElementById('dynamic-widgets');
            const widgets = container.querySelectorAll('.widget');
            widgets.forEach(widget => widget.remove());
        }
    </script>
</body>
</html>`;
}

// Run if called directly
if (require.main === module) {
  createEsbuildBundle().catch(console.error);
}

module.exports = { createEsbuildBundle }; 