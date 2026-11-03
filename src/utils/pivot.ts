export interface PivotedSeries {
  /** Category labels in order of first appearance. */
  categories: string[];
  /** Distinct series values in order of first appearance. */
  series: string[];
  /** Summed value for a category/series pair; 0 when the pair has no row. */
  value(category: string, series: string): number;
}

const label = (raw: unknown): string => (raw === null || raw === undefined ? 'Unknown' : String(raw));

/**
 * Turns long rows ({ category, series, value }) into categories x series, so a dimension becomes the series of
 * a stacked/clustered chart instead of each series being a fixed field. Rows sharing a category/series pair are
 * summed; missing pairs read as 0; null category/series values are grouped as "Unknown".
 */
export function pivotSeries(rows: any[], categoryField: string, seriesField: string, valueField: string): PivotedSeries {
  const categories: string[] = [];
  const series: string[] = [];
  const seenCategories = new Set<string>();
  const seenSeries = new Set<string>();
  const totals = new Map<string, Map<string, number>>();

  (rows || []).forEach(row => {
    if (!row) return;
    const category = label(row[categoryField]);
    const seriesName = label(row[seriesField]);
    if (!seenCategories.has(category)) { seenCategories.add(category); categories.push(category); }
    if (!seenSeries.has(seriesName)) { seenSeries.add(seriesName); series.push(seriesName); }
    const n = Number(row[valueField] || 0);
    const bySeries = totals.get(category) || new Map<string, number>();
    bySeries.set(seriesName, (bySeries.get(seriesName) || 0) + (isFinite(n) ? n : 0));
    totals.set(category, bySeries);
  });

  return {
    categories,
    series,
    value: (category, seriesName) => (totals.get(category) && totals.get(category).get(seriesName)) || 0
  };
}
