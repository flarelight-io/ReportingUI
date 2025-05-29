const { renderReport, generateReportHtml } = require('./render-service');
const fs = require('fs').promises;

async function testRendering() {
  console.log('Testing Stencil component rendering...\n');
  
  // Test 1: Simple component rendering
  console.log('Test 1: Simple KPI component');
  const simpleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Test Report</title>
    </head>
    <body>
        <kpi-visualization 
            config='{"title": "Test KPI", "value": 42, "unit": "%"}'
            data='{"value": 42}'>
        </kpi-visualization>
    </body>
    </html>
  `;
  
  try {
    const result1 = await renderReport(simpleHtml);
    console.log('✓ Simple rendering:', result1.success ? 'SUCCESS' : 'FAILED');
    if (!result1.success) {
      console.log('Error:', result1.error);
    } else {
      console.log('Components rendered:', result1.components?.length || 0);
      console.log('Hydrated count:', result1.hydratedCount);
    }
  } catch (error) {
    console.log('✗ Simple rendering FAILED:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Report configuration
  console.log('Test 2: Report configuration');
  const reportConfig = {
    reportId: 'test-report-001',
    title: 'Sample Report',
    configuration: {
      theme: 'default',
      layout: 'grid'
    },
    widgets: [
      {
        type: 'kpi',
        id: 'kpi-1',
        title: 'Revenue',
        config: { 
          title: 'Total Revenue',
          format: 'currency'
        },
        data: { 
          value: 125000,
          previousValue: 120000,
          trend: 'up'
        }
      },
      {
        type: 'bar-chart',
        id: 'chart-1',
        title: 'Sales by Region',
        config: {
          title: 'Sales by Region',
          xAxis: 'region',
          yAxis: 'sales'
        },
        data: {
          labels: ['North', 'South', 'East', 'West'],
          datasets: [{
            label: 'Sales',
            data: [12000, 19000, 3000, 5000]
          }]
        }
      },
      {
        type: 'text',
        id: 'text-1',
        title: 'Summary',
        config: {
          content: 'This report shows the quarterly performance metrics.'
        }
      }
    ]
  };
  
  try {
    const generatedHtml = generateReportHtml(reportConfig);
    console.log('✓ HTML generation: SUCCESS');
    
    const result2 = await renderReport(generatedHtml);
    console.log('✓ Report rendering:', result2.success ? 'SUCCESS' : 'FAILED');
    
    if (!result2.success) {
      console.log('Error:', result2.error);
    } else {
      console.log('Components rendered:', result2.components?.length || 0);
      console.log('Hydrated count:', result2.hydratedCount);
      
      // Save the rendered HTML for inspection
      await fs.writeFile('test-output.html', result2.html);
      console.log('✓ Rendered HTML saved to test-output.html');
    }
  } catch (error) {
    console.log('✗ Report rendering FAILED:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Error handling
  console.log('Test 3: Error handling');
  const invalidHtml = `
    <!DOCTYPE html>
    <html>
    <body>
        <invalid-component></invalid-component>
    </body>
    </html>
  `;
  
  try {
    const result3 = await renderReport(invalidHtml);
    console.log('✓ Error handling:', result3.success ? 'UNEXPECTED SUCCESS' : 'HANDLED CORRECTLY');
    if (!result3.success) {
      console.log('Expected error:', result3.error);
    }
  } catch (error) {
    console.log('✗ Error handling FAILED:', error.message);
  }
  
  console.log('\nTesting completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRendering().catch(console.error);
}

module.exports = { testRendering }; 