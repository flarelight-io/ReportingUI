const { renderToString } = require('./dist/hydrate');
const fs = require('fs').promises;
const path = require('path');

/**
 * Render Stencil components to HTML string
 * @param {string} componentHtml - HTML containing Stencil components
 * @param {object} options - Rendering options
 * @returns {Promise<object>} Rendering result
 */
async function renderReport(componentHtml, options = {}) {
  try {
    const defaultOptions = {
      prettyHtml: false,
      removeScripts: true,
      removeUnusedStyles: true,
      timeout: 30000,
      fullDocument: true,
      clientHydrateAnnotations: false,
      constrainTimeouts: true,
      removeHtmlComments: true,
      ...options
    };

    const results = await renderToString(componentHtml, defaultOptions);
    
    return {
      success: true,
      html: results.html,
      components: results.components,
      diagnostics: results.diagnostics,
      hydratedCount: results.hydratedCount,
      buildId: results.buildId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Generate complete HTML document with Stencil components
 * @param {object} reportConfig - Report configuration
 * @returns {string} Complete HTML document
 */
function generateReportHtml(reportConfig) {
  const { reportId, configuration, widgets = [], title = 'Report' } = reportConfig;
  
  let widgetsHtml = '';
  
  // Generate individual widgets if specified
  if (widgets.length > 0) {
    widgetsHtml = widgets.map(widget => {
      switch (widget.type) {
        case 'kpi':
          return `<kpi-visualization 
            config='${JSON.stringify(widget.config || {})}'
            data='${JSON.stringify(widget.data || {})}'>
          </kpi-visualization>`;
          
        case 'bar-chart':
          return `<bar-chart-visualization 
            config='${JSON.stringify(widget.config || {})}'
            data='${JSON.stringify(widget.data || {})}'>
          </bar-chart-visualization>`;
          
        case 'line-chart':
          return `<line-chart-visualization 
            config='${JSON.stringify(widget.config || {})}'
            data='${JSON.stringify(widget.data || {})}'>
          </line-chart-visualization>`;
          
        case 'pie-chart':
          return `<pie-chart-visualization 
            config='${JSON.stringify(widget.config || {})}'
            data='${JSON.stringify(widget.data || {})}'>
          </pie-chart-visualization>`;
          
        case 'table':
          return `<table-visualization 
            config='${JSON.stringify(widget.config || {})}'
            data='${JSON.stringify(widget.data || {})}'>
          </table-visualization>`;
          
        case 'text':
          return `<text-widget 
            widget-id="${widget.id || ''}"
            widget-title="${widget.title || ''}"
            config='${JSON.stringify(widget.config || {})}'>
          </text-widget>`;
          
        default:
          return `<!-- Unknown widget type: ${widget.type} -->`;
      }
    }).join('\n    ');
  }
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: white;
        }
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .widget-container {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        @media print {
            body { margin: 0; }
            .report-container { max-width: none; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        ${reportId ? `
        <flare-report-viewer 
            report-id="${reportId}"
            is-viewer="true"
            ${configuration ? `configuration='${JSON.stringify(configuration)}'` : ''}>
        </flare-report-viewer>
        ` : ''}
        
        ${widgetsHtml ? `
        <div class="widgets-section">
            ${widgetsHtml}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

/**
 * Command line interface for rendering reports
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node render-service.js <input-file> <output-file>');
    process.exit(1);
  }
  
  const [inputFile, outputFile] = args;
  
  try {
    // Read input data
    const inputData = JSON.parse(await fs.readFile(inputFile, 'utf8'));
    const { html, reportConfig, options } = inputData;
    
    let htmlToRender;
    
    if (html) {
      // Direct HTML provided
      htmlToRender = html;
    } else if (reportConfig) {
      // Generate HTML from report configuration
      htmlToRender = generateReportHtml(reportConfig);
    } else {
      throw new Error('Either html or reportConfig must be provided');
    }
    
    // Render the HTML
    const result = await renderReport(htmlToRender, options);
    
    // Write result to output file
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('Rendering completed successfully');
      process.exit(0);
    } else {
      console.error('Rendering failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Write error result to output file
    const errorResult = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    try {
      await fs.writeFile(outputFile, JSON.stringify(errorResult, null, 2));
    } catch (writeError) {
      console.error('Failed to write error result:', writeError.message);
    }
    
    process.exit(1);
  }
}

// Export functions for programmatic use
module.exports = { 
  renderReport, 
  generateReportHtml 
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
} 