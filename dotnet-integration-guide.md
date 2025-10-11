# .NET Backend Integration Guide for Flarelight Reporting Components

This guide explains how to use the generated Stencil bundles in your .NET backend application to generate PDF reports using the Flarelight Reporting components.

## Available Bundles

After running `npm run build`, the following bundles are generated:

### 1. Hydrate Script (Recommended for .NET Backend)
- **Location**: `dist/hydrate/`
- **Files**: 
  - `index.js` (CommonJS)
  - `index.mjs` (ES Modules)
  - `index.d.ts` (TypeScript definitions)
- **Use Case**: Server-side rendering for PDF generation

### 2. Distribution Bundles
- **ESM**: `dist/esm/` - Modern JavaScript modules
- **CommonJS**: `dist/cjs/` - Node.js compatible
- **Custom Elements**: `dist/components/` - Standalone custom elements

### 3. Loader
- **Location**: `loader/`
- **Use Case**: Dynamic loading of components

## Integration Approaches

### Approach 1: Node.js Process with Hydrate Script (Recommended)

This approach uses Node.js to render components server-side and returns HTML that can be converted to PDF.

#### Step 1: Create Node.js Rendering Service

Create a file `render-service.js`:

```javascript
const { renderToString } = require('./dist/hydrate');

async function renderReport(componentHtml, options = {}) {
  try {
    const defaultOptions = {
      prettyHtml: false,
      removeScripts: true,
      removeUnusedStyles: true,
      timeout: 30000,
      fullDocument: true,
      ...options
    };

    const results = await renderToString(componentHtml, defaultOptions);
    
    return {
      success: true,
      html: results.html,
      components: results.components,
      diagnostics: results.diagnostics
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Example usage
async function generateReportHtml() {
  const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
      </style>
    </head>
    <body>
      <report-viewer 
        report-id="sample-report"
        is-viewer="true">
      </report-viewer>
      
      <kpi-visualization></kpi-visualization>
      
      <bar-chart-visualization></bar-chart-visualization>
    </body>
    </html>
  `;

  const result = await renderReport(reportHtml);
  console.log(result);
}

module.exports = { renderReport };
```

#### Step 2: C# Service to Call Node.js

```csharp
using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class StencilRenderingService
{
    private readonly string _nodeScriptPath;
    
    public StencilRenderingService(string nodeScriptPath)
    {
        _nodeScriptPath = nodeScriptPath;
    }
    
    public async Task<RenderResult> RenderReportAsync(string componentHtml, object options = null)
    {
        var tempInputFile = Path.GetTempFileName();
        var tempOutputFile = Path.GetTempFileName();
        
        try
        {
            // Write input data to temp file
            var inputData = new
            {
                html = componentHtml,
                options = options ?? new { }
            };
            
            await File.WriteAllTextAsync(tempInputFile, JsonConvert.SerializeObject(inputData));
            
            // Execute Node.js script
            var processInfo = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"{_nodeScriptPath} {tempInputFile} {tempOutputFile}",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            
            using var process = Process.Start(processInfo);
            await process.WaitForExitAsync();
            
            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                throw new Exception($"Node.js rendering failed: {error}");
            }
            
            // Read result
            var resultJson = await File.ReadAllTextAsync(tempOutputFile);
            return JsonConvert.DeserializeObject<RenderResult>(resultJson);
        }
        finally
        {
            // Cleanup temp files
            if (File.Exists(tempInputFile)) File.Delete(tempInputFile);
            if (File.Exists(tempOutputFile)) File.Delete(tempOutputFile);
        }
    }
}

public class RenderResult
{
    public bool Success { get; set; }
    public string Html { get; set; }
    public string Error { get; set; }
    public object[] Components { get; set; }
    public object[] Diagnostics { get; set; }
}
```

### Approach 2: Puppeteer with Browser Bundle

This approach uses Puppeteer to load the components in a headless browser.

#### Step 1: Create Puppeteer Service

Create `puppeteer-service.js`:

```javascript
const puppeteer = require('puppeteer');
const path = require('path');

async function renderReportWithPuppeteer(reportConfig, options = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // Load the HTML with Stencil components
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Report</title>
        <script type="module" src="file://${path.resolve('./dist/esm/flarelight-reporting.js')}"></script>
        <link rel="stylesheet" href="file://${path.resolve('./dist/flarelight-reporting/flarelight-reporting.css')}">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
        </style>
      </head>
      <body>
        ${generateReportHtml(reportConfig)}
      </body>
      </html>
    `;
    
    await page.setContent(html);
    
    // Wait for components to load and render
    await page.waitForSelector('report-viewer', { timeout: 30000 });
    
    // Wait for any async operations to complete
    await page.waitForTimeout(2000);
    
    // Get the rendered HTML
    const renderedHtml = await page.content();
    
    return {
      success: true,
      html: renderedHtml
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

function generateReportHtml(config) {
  return `
    <report-viewer 
      report-id="${config.reportId}"
      is-viewer="true"
      configuration='${JSON.stringify(config.configuration)}'>
    </report-viewer>
  `;
}

module.exports = { renderReportWithPuppeteer };
```

### Approach 3: Direct HTML Generation with Static Assets

For simpler use cases, you can generate HTML directly and include the static assets.

```csharp
public class StaticHtmlReportGenerator
{
    private readonly string _assetsPath;
    
    public StaticHtmlReportGenerator(string assetsPath)
    {
        _assetsPath = assetsPath;
    }
    
    public string GenerateReportHtml(ReportConfiguration config)
    {
        var cssPath = Path.Combine(_assetsPath, "dist/flarelight-reporting/flarelight-reporting.css");
        var jsPath = Path.Combine(_assetsPath, "dist/esm/flarelight-reporting.js");
        
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <title>Report</title>
    <link rel=""stylesheet"" href=""file://{cssPath}"">
    <script type=""module"" src=""file://{jsPath}""></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
    </style>
</head>
<body>
    <report-viewer 
        report-id=""{config.ReportId}""
        is-viewer=""true""
        configuration='{JsonConvert.SerializeObject(config.Configuration)}'>
    </report-viewer>
</body>
</html>";
    }
}
```

## PDF Generation

### Using PuppeteerSharp (Recommended)

```csharp
using PuppeteerSharp;

public class PdfGenerationService
{
    public async Task<byte[]> GeneratePdfFromHtmlAsync(string html)
    {
        await new BrowserFetcher().DownloadAsync();
        
        using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = true,
            Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
        });
        
        using var page = await browser.NewPageAsync();
        await page.SetContentAsync(html);
        
        // Wait for components to render
        await page.WaitForSelectorAsync("report-viewer");
        await page.WaitForTimeoutAsync(2000);
        
        var pdfBytes = await page.PdfAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            PrintBackground = true,
            MarginOptions = new MarginOptions
            {
                Top = "20px",
                Right = "20px",
                Bottom = "20px",
                Left = "20px"
            }
        });
        
        return pdfBytes;
    }
}
```

## Complete Example: Report Controller

```csharp
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly StencilRenderingService _renderingService;
    private readonly PdfGenerationService _pdfService;
    
    public ReportsController(
        StencilRenderingService renderingService,
        PdfGenerationService pdfService)
    {
        _renderingService = renderingService;
        _pdfService = pdfService;
    }
    
    [HttpPost("generate-pdf")]
    public async Task<IActionResult> GeneratePdf([FromBody] ReportRequest request)
    {
        try
        {
            // Generate HTML using Stencil components
            var componentHtml = GenerateComponentHtml(request);
            var renderResult = await _renderingService.RenderReportAsync(componentHtml);
            
            if (!renderResult.Success)
            {
                return BadRequest($"Rendering failed: {renderResult.Error}");
            }
            
            // Generate PDF from rendered HTML
            var pdfBytes = await _pdfService.GeneratePdfFromHtmlAsync(renderResult.Html);
            
            return File(pdfBytes, "application/pdf", $"report-{request.ReportId}.pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error generating PDF: {ex.Message}");
        }
    }
    
    private string GenerateComponentHtml(ReportRequest request)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <title>Report {request.ReportId}</title>
</head>
<body>
    <report-viewer 
        report-id=""{request.ReportId}""
        is-viewer=""true""
        configuration='{JsonConvert.SerializeObject(request.Configuration)}'>
    </report-viewer>
</body>
</html>";
    }
}

public class ReportRequest
{
    public string ReportId { get; set; }
    public object Configuration { get; set; }
}
```

## Setup Instructions

1. **Install Node.js dependencies** (if using Node.js approach):
   ```bash
   npm install puppeteer
   ```

2. **Install .NET packages**:
   ```bash
   dotnet add package PuppeteerSharp
   dotnet add package Newtonsoft.Json
   ```

3. **Copy Stencil bundles** to your .NET application's assets folder

4. **Configure services** in `Startup.cs` or `Program.cs`:
   ```csharp
   services.AddSingleton<StencilRenderingService>(provider => 
       new StencilRenderingService("path/to/render-service.js"));
   services.AddSingleton<PdfGenerationService>();
   ```

## Best Practices

1. **Caching**: Cache rendered HTML for identical report configurations
2. **Error Handling**: Implement proper error handling and logging
3. **Performance**: Use connection pooling for database operations
4. **Security**: Validate and sanitize all input data
5. **Monitoring**: Add performance monitoring for PDF generation times

## Troubleshooting

- **Components not rendering**: Ensure all required assets are accessible
- **Timeout errors**: Increase timeout values for complex reports
- **Memory issues**: Implement proper disposal of browser instances
- **CSS not loading**: Verify file paths and permissions 