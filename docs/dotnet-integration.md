# .NET Integration Guide

This guide covers generating PDFs from Flarelight Reporting components in a .NET backend using PuppeteerSharp.

## Key technique: widgets as images

The most important step for reliable PDF output is **screenshotting each widget into a PNG and replacing its DOM node with an `<img>` before printing**. Chart canvases inside Shadow DOM cannot be reliably controlled by CSS `break-inside: avoid`, so replacing them with static images lets Chromium's print engine handle page breaks correctly without splitting charts in half.

## Dependencies

```bash
dotnet add package PuppeteerSharp
dotnet add package Serilog           # or swap for your preferred logger
```

Build the esbuild bundle from the library and copy it to your project's static assets:

```bash
npm run bundle:esbuild
# Outputs: flarelight-reporting-esbuild.js
```

## HTML template

The HTML passed to PuppeteerSharp must include the bundle and wire up `fetchChartData`:

```html
<!DOCTYPE html>
<html>
<head><title>Report</title></head>
<body>
  <report-viewer id="viewer"
                 report-id="my-report"
                 is-viewer="true"
                 configuration='CONFIGURATION_JSON'>
  </report-viewer>

  <script src="file:///absolute/path/to/flarelight-reporting-esbuild.js"></script>
  <script>
    window.fetchChartData = async (config) => await window.getChartData(config);
    customElements.whenDefined('report-viewer').then(() => {
      document.getElementById('viewer').fetchChartData = window.fetchChartData;
    });
  </script>
</body>
</html>
```

## ReportGenerator implementation

```csharp
using PuppeteerSharp;
using PuppeteerSharp.Media;
using System.Text.Json;
using System.Text.Json.Serialization;
using Serilog;

public class ContentDimensions
{
    public double Width { get; set; } = 0;
    public double Height { get; set; } = 0;
    public double Scale { get; set; } = 1.0;
    public double PageWidth { get; set; } = 718; // A4 width minus margins
    public double PageHeight { get; set; } = 1047;
}

public class ReportGenerator
{
    private readonly IReportManager _reportManager;

    public ReportGenerator(IReportManager reportManager)
    {
        _reportManager = reportManager;
    }

    public async Task<byte[]> GenerateReportPdf(string resolvedHtml, Guid reportId, string username)
    {
        Log.Information("Starting PDF generation for report {ReportId}", reportId);

        // Download Chromium if not already present
        try { await new BrowserFetcher(SupportedBrowser.Chromium).DownloadAsync(); }
        catch (Exception ex) { Log.Warning(ex, "Error downloading Chromium"); }

        using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = true,
            Browser = SupportedBrowser.Chromium,
            Args = new[]
            {
                "--disable-web-security",
                "--allow-file-access-from-files",
                "--disable-features=VizDisplayCompositor",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            }
        });

        using var page = await browser.NewPageAsync();

        page.Console += (_, e) => Log.Information("Browser [{Type}]: {Text}", e.Message.Type, e.Message.Text);
        page.PageError += (_, e) => Log.Error("Browser error: {Message}", e.Message);

        // Wire up the data bridge: the page calls window.getChartData(), which
        // is handled here by your server-side data access logic.
        var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        jsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

        await page.ExposeFunctionAsync("getChartData", async (object config) =>
        {
            var parsed = JsonSerializer.Deserialize<ChartDataRequest>(config.ToString()!, jsonOptions)!;
            parsed.ReportId = reportId;
            parsed.IsViewer = true;
            return _reportManager.GetChartData(parsed);
        });

        // Load the HTML and wait for all network activity to settle
        await page.SetContentAsync(resolvedHtml, new NavigationOptions
        {
            WaitUntil = new[] { WaitUntilNavigation.Networkidle0 },
            Timeout = 30000
        });

        // Wait for the report-viewer element to appear
        await page.WaitForSelectorAsync("report-viewer", new WaitForSelectorOptions { Timeout = 10000 });

        // Give charts time to finish rendering
        await Task.Delay(5000);

        // ── Scale calculation ──────────────────────────────────────────────────
        // Only scale down based on width (never height) to prevent squashing.
        var dimensionsJson = await page.EvaluateExpressionAsync<string>(@"(() => {
            const viewer = document.querySelector('report-viewer');
            if (!viewer) return JSON.stringify({ width: 0, height: 0, scale: 1, pageWidth: 718 });
            const rect = viewer.getBoundingClientRect();
            const pageWidth = 794 - 76; // A4 minus 2 × 1 cm margin at 96 DPI
            const scale = rect.width > pageWidth ? pageWidth / rect.width : 1;
            console.log('Viewer:', rect.width, 'x', rect.height, '→ scale', scale);
            return JSON.stringify({ width: rect.width, height: rect.height, scale, pageWidth });
        })()");

        var dims = JsonSerializer.Deserialize<ContentDimensions>(dimensionsJson, jsonOptions) ?? new ContentDimensions();
        var scale = (decimal)dims.Scale;
        Log.Information("Width scale: {Scale} (content {W}×{H}, page width {PW})", scale, dims.Width, dims.Height, dims.PageWidth);

        // ── Widget → image replacement ─────────────────────────────────────────
        // Chart canvases live inside Shadow DOM and resist CSS break-inside rules.
        // Screenshot every .widget-item and replace its content with a plain <img>
        // so Chromium's print engine can safely avoid breaking them across pages.
        var rectsJson = await page.EvaluateExpressionAsync<string>(@"(() => {
            const scrollX = window.pageXOffset, scrollY = window.pageYOffset;
            const items = [];
            document.querySelectorAll('.widget-item').forEach((el, i) => {
                el.setAttribute('data-widget-idx', String(i));
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0)
                    items.push({ idx: i, x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height });
            });
            return JSON.stringify(items);
        })()");

        // Use 2× device scale factor for retina-quality widget screenshots
        var vp = page.Viewport;
        await page.SetViewportAsync(new ViewPortOptions
        {
            Width = vp?.Width ?? 1280,
            Height = vp?.Height ?? 1024,
            DeviceScaleFactor = 2
        });

        using var rectsDoc = JsonDocument.Parse(rectsJson ?? "[]");
        int replaced = 0;
        foreach (var rect in rectsDoc.RootElement.EnumerateArray())
        {
            int idx = -1;
            try
            {
                idx = rect.GetProperty("idx").GetInt32();
                var png = await page.ScreenshotDataAsync(new ScreenshotOptions
                {
                    Type = ScreenshotType.Png,
                    Clip = new Clip
                    {
                        X = (decimal)rect.GetProperty("x").GetDouble(),
                        Y = (decimal)rect.GetProperty("y").GetDouble(),
                        Width = (decimal)rect.GetProperty("w").GetDouble(),
                        Height = (decimal)rect.GetProperty("h").GetDouble()
                    }
                });

                var dataUrl = $"data:image/png;base64,{Convert.ToBase64String(png)}";

                // Replace widget content with the screenshot image
                await page.EvaluateFunctionAsync(@"(idx, src) => {
                    const item = document.querySelector(`[data-widget-idx='${idx}']`);
                    if (!item) return;
                    while (item.firstChild) item.removeChild(item.firstChild);
                    const div = document.createElement('div');
                    div.style.cssText = 'break-inside:avoid;page-break-inside:avoid;display:block;width:100%;';
                    const img = document.createElement('img');
                    img.src = src;
                    img.style.cssText = 'display:block;width:100%;height:auto;';
                    div.appendChild(img);
                    item.appendChild(div);
                }", idx, dataUrl);

                replaced++;
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Failed to screenshot widget {Idx}", idx);
            }
        }
        Log.Information("Replaced {Count} widget(s) with static screenshots", replaced);

        // ── Print CSS ──────────────────────────────────────────────────────────
        var scaleStr = scale.ToString("F3", System.Globalization.CultureInfo.InvariantCulture);
        var widthStr = (100 / scale).ToString("F3", System.Globalization.CultureInfo.InvariantCulture);
        var scaleCss = scale < 1.0m
            ? $"transform:scale({scaleStr});transform-origin:top left;width:{widthStr}%;"
            : "";

        await page.AddStyleTagAsync(new AddTagOptions
        {
            Content = $@"
                html, body, report-viewer {{
                    background-color: white !important;
                    background: white !important;
                }}
                @media print {{
                    @page {{ size: A4; margin: 1cm; }}
                    html, body {{ margin:0; padding:0; height:auto; overflow:visible; }}
                    report-viewer {{ display:block; {scaleCss} }}

                    /* Widget images must not split across pages */
                    div > img {{
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }}

                    /* Non-chart widgets */
                    base-widget, .widget-card {{
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 1rem;
                    }}
                    .widget-body,
                    .text-widget-container,
                    .data-widget-container,
                    .hypothesis-test-widget-container,
                    .wilcoxon-test-widget-container,
                    .welch-anova-widget-container,
                    .one-way-anova-widget-container,
                    .mann-whitney-widget-container,
                    .kruskal-wallis-widget-container,
                    .shapiro-wilk-widget-container,
                    .kolmogorov-smirnov-widget-container,
                    .anderson-darling-widget-container,
                    .descriptive-analysis-widget-container,
                    .correlation-analysis-widget-container {{
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }}

                    /* Tables: allow breaking, but keep header rows with the table */
                    table-visualization, .data-widget-container table {{
                        break-inside: auto !important;
                    }}
                    table-visualization thead,
                    .data-widget-container table thead {{
                        break-after: avoid !important;
                        display: table-header-group !important;
                    }}
                }}
            "
        });

        // ── Generate PDF ───────────────────────────────────────────────────────
        var pdf = await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            PrintBackground = true,
            PreferCSSPageSize = true,
            Scale = 1.0m,
            MarginOptions = new MarginOptions
            {
                Top = "1cm", Right = "1cm", Bottom = "1cm", Left = "1cm"
            }
        });

        Log.Information("PDF generated: {Size} bytes", pdf.Length);
        return pdf;
    }
}
```

## How it works

1. **`ExposeFunctionAsync("getChartData", ...)`** — Bridges `window.getChartData()` calls from the page JavaScript to your server-side data access layer. The HTML template routes `fetchChartData` through this bridge.

2. **`SetContentAsync` with `Networkidle0`** — Waits for the page to finish loading and all async requests to settle before proceeding.

3. **5-second `Task.Delay`** — Gives Chart.js time to finish drawing canvases after data loads. Tune this up for complex reports with many widgets.

4. **Width-only scaling** — If the report content is wider than an A4 page, a CSS `transform: scale()` is applied to shrink it to fit horizontally. Height is never scaled to avoid squashing.

5. **Widget screenshot replacement (the key step)** — Every `.widget-item` is screenshotted at 2× resolution and its DOM content is replaced with a plain `<img>`. This works around the limitation that chart canvases inside Shadow DOM cannot be controlled by `break-inside: avoid`. With static images, Chromium's print engine handles page breaks correctly.

6. **`PreferCSSPageSize: true`, `Scale: 1.0m`** — The PDF uses the CSS `@page` size and the scaling from step 4 (via CSS transform), not Puppeteer's own scale parameter.

## DI registration

```csharp
// Program.cs
builder.Services.AddScoped<IReportGenerator, ReportGenerator>();
```

## Controller example

```csharp
[HttpPost("{reportId}/pdf")]
public async Task<IActionResult> GeneratePdf(string reportId, [FromBody] string resolvedHtml)
{
    var pdf = await _reportGenerator.GenerateReportPdf(resolvedHtml, Guid.Parse(reportId), User.Identity!.Name!);
    return File(pdf, "application/pdf", $"{reportId}.pdf");
}
```

## Troubleshooting

**Charts not rendering / blank widgets**
- Increase `Task.Delay` — complex reports with many data requests may need 8–10 seconds.
- Check browser console output (forwarded to Serilog) for chart data errors.
- Verify the `getChartData` bridge is registered before `SetContentAsync` is called.

**PDF cuts widgets in half**
- Confirm `.widget-item` elements exist in the DOM (the viewer renders one per widget in its grid).
- Check the `replaced` log count — if it's 0, the widget screenshot step is not finding elements.

**`file://` path errors on Windows**
- Use `new Uri(path).AbsoluteUri` to convert a Windows path to a proper `file:///C:/...` URL for the bundle `<script src>`.

**Chromium download fails in CI/container**
- Pre-install Chromium in the container image and set `ExecutablePath` in `LaunchOptions` to skip the download.
