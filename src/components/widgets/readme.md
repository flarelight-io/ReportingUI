# text-widget



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute          | Description | Type                                       | Default     |
| ---------------- | ------------------ | ----------- | ------------------------------------------ | ----------- |
| `config`         | `config`           |             | `WelchTwoSampleHypothesisTestWidgetConfig` | `{}`        |
| `data`           | `data`             |             | `any[]`                                    | `[]`        |
| `fetchChartData` | `fetch-chart-data` |             | `Function`                                 | `undefined` |
| `height`         | `height`           |             | `number`                                   | `undefined` |
| `isInEditor`     | `is-in-editor`     |             | `boolean`                                  | `false`     |
| `isViewer`       | `is-viewer`        |             | `boolean`                                  | `false`     |
| `readOnly`       | `read-only`        |             | `boolean`                                  | `false`     |
| `reportId`       | `report-id`        |             | `string`                                   | `undefined` |
| `widgetId`       | `widget-id`        |             | `string`                                   | `undefined` |
| `widgetTitle`    | `widget-title`     |             | `string`                                   | `undefined` |
| `width`          | `width`            |             | `number`                                   | `undefined` |


## Dependencies

### Used by

 - [report-viewer](../report-viewer)

### Depends on

- [base-widget](.)

### Graph
```mermaid
graph TD;
  welch-two-sample-hypothesis-test-widget --> base-widget
  report-viewer --> welch-two-sample-hypothesis-test-widget
  style welch-two-sample-hypothesis-test-widget fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
