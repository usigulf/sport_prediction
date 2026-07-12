import { theme } from './theme';
import { contrastRatio } from '../utils/colorContrast';

const AA = 4.5;

describe('theme contrast (WCAG AA)', () => {
  const backgrounds = [theme.colors.background, theme.colors.backgroundCard] as const;

  it.each([
    ['text', theme.colors.text],
    ['textSecondary', theme.colors.textSecondary],
    ['textMuted', theme.colors.textMuted],
    ['accent', theme.colors.accent],
  ] as const)('%s meets AA on navy backgrounds', (_name, fg) => {
    for (const bg of backgrounds) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('exposes Dynamic Type multiplier', () => {
    expect(theme.maxFontSizeMultiplier).toBeGreaterThan(1);
    expect(theme.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  });
});
