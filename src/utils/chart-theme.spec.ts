import { ChartThemeUtils, readCssList, parseColor, interpolateColor } from './chart-theme';

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

  it('resolves light/dark from the nearest data-theme ancestor', () => {
    const outer = document.createElement('div');
    outer.setAttribute('data-theme', 'dark');
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const leaf = document.createElement('span');
    inner.appendChild(leaf);
    expect(ChartThemeUtils.resolveMode(leaf)).toBe('dark');
    inner.setAttribute('data-theme', 'light');
    expect(ChartThemeUtils.resolveMode(leaf)).toBe('light');
    expect(ChartThemeUtils.getTheme('brand', leaf).mode).toBe('light');
    expect(ChartThemeUtils.getTheme('brand', outer).mode).toBe('dark');
  });
});

describe('CSS variable helpers', () => {
  const style = (values: Record<string, string>) => ({ getPropertyValue: (name: string) => values[name] || '' });

  it('reads consecutive numbered variables and stops at the first gap', () => {
    const s = style({ '--x-1': ' #111 ', '--x-2': '#222', '--x-4': '#444' });
    expect(readCssList(s, '--x-')).toEqual(['#111', '#222']);
    expect(readCssList(style({}), '--x-')).toEqual([]);
  });

  it('parses hex and rgb colors', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#336699')).toEqual([51, 102, 153]);
    expect(parseColor('#33669980')).toEqual([51, 102, 153]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
    expect(parseColor('rgba(10 20 30 / 0.5)')).toEqual([10, 20, 30]);
    expect(parseColor('hotpink')).toBeNull();
  });

  it('blends across stops and clamps', () => {
    expect(interpolateColor(['#000000', '#ffffff'], 0)).toBe('rgb(0, 0, 0)');
    expect(interpolateColor(['#000000', '#ffffff'], 1)).toBe('rgb(255, 255, 255)');
    expect(interpolateColor(['#000000', '#ffffff'], 0.5)).toBe('rgb(128, 128, 128)');
    expect(interpolateColor(['#000000', '#ff0000', '#ffffff'], 0.5)).toBe('rgb(255, 0, 0)');
    expect(interpolateColor(['#000000', '#ffffff'], 9)).toBe('rgb(255, 255, 255)');
    expect(interpolateColor(['red', 'blue'], 0.9)).toBe('blue');
  });
});
