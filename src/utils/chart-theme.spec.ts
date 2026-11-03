import { ChartThemeUtils } from './chart-theme';

describe('ChartThemeUtils color theme registry', () => {
  afterEach(() => {
    ChartThemeUtils.unregisterColorTheme('corp');
    ChartThemeUtils.setThemeOverrides({});
  });

  it('resolves a registered theme and falls back to light for dark', () => {
    ChartThemeUtils.registerColorTheme('corp', { light: ['#111111', '#222222', '#333333', '#444444', '#555555'] });
    const theme = ChartThemeUtils.getTheme('corp');
    expect(theme.series[0]).toBe('#111111');
    expect(theme.distinct).toHaveLength(5);
    expect(ChartThemeUtils.getColorThemeNames()).toContain('corp');
  });

  it('uses explicit distinct colors and rejects empty palettes', () => {
    const distinct = ['#a00000', '#b00000', '#c00000', '#d00000', '#e00000'];
    ChartThemeUtils.registerColorTheme('corp', { light: ['#111111'], distinct: { light: distinct } });
    expect(ChartThemeUtils.getTheme('corp').distinct).toEqual(distinct);
    expect(() => ChartThemeUtils.registerColorTheme('bad', { light: [] })).toThrow();
  });

  it('unknown themes fall back to brand and overrides merge over the theme', () => {
    expect(ChartThemeUtils.getTheme('nope').series[0]).toBe(ChartThemeUtils.getTheme('brand').series[0]);
    const mode = ChartThemeUtils.getTheme('brand').mode;
    ChartThemeUtils.setThemeOverrides({ [mode]: { fontFamily: 'Comic Sans MS' } });
    expect(ChartThemeUtils.getTheme('brand').fontFamily).toBe('Comic Sans MS');
  });
});
