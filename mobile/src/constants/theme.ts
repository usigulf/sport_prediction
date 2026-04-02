/**
 * Dark sports-tech theme
 * Mobile-first: 375–414px, full vertical scroll.
 * Base #0A1428, accent #00FF9F (wins/confidence), secondary #FF3366 (alerts/loss).
 */
export const theme = {
  colors: {
    background: '#0A1428',
    backgroundElevated: '#12233D',
    backgroundCard: '#152642',
    accent: '#00FF9F',       // neon green – wins, confidence, primary CTA
    accentDim: 'rgba(0, 255, 159, 0.2)',
    secondary: '#FF3366',    // red/pink – alerts, loss, live
    secondaryDim: 'rgba(255, 51, 102, 0.2)',
    text: '#FFFFFF',
    textSecondary: '#B0BEC5',
    textMuted: '#78909C',
    border: 'rgba(255, 255, 255, 0.12)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    confidenceHigh: '#00E676',
    confidenceMedium: '#FFB74D',
    confidenceLow: '#FF5252',
    drawNeutral: '#90A4AE',
  },
  radii: {
    xs: 4,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  minTouchSize: 56,
} as const;

export type Theme = typeof theme;
