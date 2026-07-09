/**
 * Compact shareable pick card preview (P4-003) shown before sharing.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { formatLeagueLabel } from '../utils/leagueDisplay';
import { confidenceToPickStrength } from './PredictionCard';
import { PredictionDisclaimer } from './PredictionDisclaimer';
import type { Prediction } from '../types';

export interface SharePickCardData {
  homeName: string;
  awayName: string;
  league?: string;
  confidence?: string | null;
  favoredTeam?: string | null;
  pickProbabilityPct?: number | null;
  referralCode?: string | null;
  rollingAccuracyPct?: number | null;
}

interface SharePickCardProps {
  card: SharePickCardData;
  /** Hide pick edge / favored team when free-tier insights are locked */
  pickDetailsLocked?: boolean;
}

function confidenceLabel(level: string | undefined | null): string {
  switch (level?.toLowerCase()) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    default:
      return 'Pick preview';
  }
}

export const SharePickCard: React.FC<SharePickCardProps> = ({ card, pickDetailsLocked = false }) => {
  const stars = card.confidence ? confidenceToPickStrength(card.confidence) : 0;
  const showPickLine =
    !pickDetailsLocked && card.favoredTeam && card.pickProbabilityPct != null;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Share pick preview">
      <View style={styles.header}>
        <Text style={styles.brand}>octobetiQ</Text>
        {card.league ? (
          <Text style={styles.league} numberOfLines={1}>
            {formatLeagueLabel(card.league)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.matchup} numberOfLines={2}>
        {card.homeName} vs {card.awayName}
      </Text>
      {card.rollingAccuracyPct != null ? (
        <Text style={styles.accuracyLine}>
          My model accuracy this month: {card.rollingAccuracyPct.toFixed(1)}%
        </Text>
      ) : null}
      {showPickLine ? (
        <Text style={styles.pickLine}>
          Pick: {card.favoredTeam} ({card.pickProbabilityPct}%)
        </Text>
      ) : null}
      {card.confidence && !pickDetailsLocked ? (
        <View style={styles.confRow}>
          <View style={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < stars ? 'star' : 'star-outline'}
                size={14}
                color={i < stars ? theme.colors.accent : theme.colors.textMuted}
              />
            ))}
          </View>
          <Text style={styles.confLabel}>{confidenceLabel(card.confidence)}</Text>
        </View>
      ) : (
        <Text style={styles.muted}>Share matchup — sign in to include pick details</Text>
      )}
      <Text style={styles.referralHint}>
        {card.referralCode
          ? 'Your referral link is included when you share'
          : 'Friends can open your link to get picks in the app'}
      </Text>
      <PredictionDisclaimer league={card.league} compact style={styles.disclaimer} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  league: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    maxWidth: '55%',
  },
  matchup: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  pickLine: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 8,
  },
  accuracyLine: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  confLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  muted: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  referralHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  disclaimer: {
    marginTop: theme.spacing.sm,
  },
});

export function buildSharePickCardData(args: {
  homeName: string;
  awayName: string;
  league?: string;
  prediction?: Prediction | null;
  userId?: string | null;
  pickDetailsLocked?: boolean;
}): SharePickCardData {
  const { homeName, awayName, league, prediction, userId, pickDetailsLocked = false } = args;
  const confidence = pickDetailsLocked ? undefined : prediction?.confidence_level;
  let favoredTeam: string | null = null;
  let pickProbabilityPct: number | null = null;
  if (!pickDetailsLocked && prediction) {
    const homeP = prediction.home_win_probability;
    const awayP = prediction.away_win_probability;
    if (homeP >= awayP) {
      favoredTeam = homeName;
      pickProbabilityPct = Math.round(homeP * 100);
    } else {
      favoredTeam = awayName;
      pickProbabilityPct = Math.round(awayP * 100);
    }
  }
  return {
    homeName,
    awayName,
    league,
    confidence,
    favoredTeam,
    pickProbabilityPct,
    referralCode: userId ?? null,
  };
}
