import { StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

export const gameDetailStyles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  bannerDock: {
    backgroundColor: theme.colors.backgroundElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderSubtle,
  },
  resultsSponsor: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  resultsSponsorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  league: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.accentDim,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  statusBadgeLive: {
    backgroundColor: theme.colors.secondaryDim,
    borderColor: theme.colors.secondary,
  },
  statusBadgeFinished: {
    backgroundColor: theme.colors.borderSubtle,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  statusBadgeTextLive: {
    color: theme.colors.secondary,
  },
  statusBadgeTextFinished: {
    color: theme.colors.textMuted,
  },
  teamsSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundElevated,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  teamColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  vsDivider: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  teamRole: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  teamLogo: {
    width: 80,
    height: 80,
    marginBottom: theme.spacing.sm,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  vs: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  favButtonGreen: {
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  favButtonGreenDisabled: {
    backgroundColor: theme.colors.borderSubtle,
  },
  favButtonGreenText: {
    fontSize: 13,
    color: theme.colors.background,
    fontWeight: '700',
  },
  predictionSection: {
    marginBottom: theme.spacing.md,
  },
  predictionPlaceholder: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  predictionTapArea: {
    marginHorizontal: theme.spacing.md,
  },
  whyButton: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  whyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  whyButtonSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  shareButton: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  infoSection: {
    backgroundColor: theme.colors.backgroundElevated,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  playerPropsLoader: {
    marginVertical: theme.spacing.sm,
  },
  playerPropsError: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginVertical: theme.spacing.sm,
  },
  mutedText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  propRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  propPlayer: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  propMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  propPredicted: {
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 2,
  },
  upgradeButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.background,
  },
  liveUpdateRow: {
    marginTop: theme.spacing.sm,
  },
  liveScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  liveProbs: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});