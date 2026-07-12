/**
 * Relative luminance / contrast helpers for theme AA checks (audit #16).
 */
function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) throw new Error(`expected #RRGGBB, got ${hex}`);
  const r = srgbChannel(parseInt(h.slice(0, 2), 16));
  const g = srgbChannel(parseInt(h.slice(2, 4), 16));
  const b = srgbChannel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
