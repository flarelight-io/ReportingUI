# Chart options: top-N and the value axis

## Top-N with an "Other" bucket

On `bar`, `hbar`, `lollipop`, `lollipop-h`, `pie` and `donut` widgets:

```jsonc
{ "visualizationType": "pie", "groupByField": "product", "valueField": "revenue", "aggregation": "sum",
  "topN": 5, "otherLabel": "Everything else" }
```

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `topN` | unset | Keep the N largest categories and combine the rest. Unset, or N at least the number of categories, leaves the data untouched. |
| `otherLabel` | `"Other"` | Label of the combined entry. |
| `showOther` | `true` | `false` drops the remaining categories instead of combining them. |

- Categories are ranked by value, descending, so with `topN` set the chart is shown largest-first. "Other" is always last.
- **Other is the sum of the remaining values.** That is right for additive aggregations (`sum`, `count`). For `avg`, `min`,
  `max` or similar, a summed "Other" isn't meaningful; use `showOther: false` or do the grouping in your backend.
- If only one category would be left over it is shown as itself: an "Other" made of one item would only hide its name.
- "Other" has a neutral color (`--fl-chart-axis-color`) and clicking it does not create a filter, since it isn't a real
  category.
- This works on the rows `fetchChartData` returns, so the backend must return all categories (not already its own top N)
  for "Other" to have something to combine.

## Value axis

For `bar`, `hbar`, `lollipop`, `lollipop-h`, `stacked-*`, `clustered-*` and `line` widgets:

| Option | Meaning |
| ------ | ------- |
| `percentAxis` | Values are percentages: the axis is pinned to 0-100 and ticks are labeled `0, 25%, 50%, ...`. |
| `axisMax` | Pin the top of the axis (for example `100`) so it doesn't round up past it. Data above it is clipped to the plot. |
| `axisMin` | Pin the bottom of the axis. |

`axisMin`/`axisMax` override the ends set by `percentAxis`. A pinned end is always a tick, and the step is chosen so the
ticks land evenly on it (0-100 gives 0, 25, 50, 75, 100).

Without these options the axis is rounded up to a nice number, so data topping out at 101 shows an axis to 120.

### Tick behavior (all value axes)

- Ticks are round numbers (1, 2, 2.5 or 5 times a power of ten).
- The number of ticks follows the room: a small cell gets fewer ticks so labels never collide.
- Labels share one unit and exactly the decimals the step needs: `0, 0.5M, 1.0M, 1.5M` or `0, 0.25, 0.50, 0.75, 1.00`,
  never a mix of precisions.
