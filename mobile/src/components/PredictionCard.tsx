import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Prediction } from '../types';
import { theme } from '../constants/theme';
import { isSoccerLeague } from '../constants/leagues';
import {
  impliedDrawProbability,
  impliedDrawForSoccer,
  normalizeThreeWay,
} from '../utils/predictionDisplay';
import { demoModelDisclaimer, isDemoModelPrediction } from '../utils/predictionTrust';

/** BetQL-style pick strength 1–5 from confidence (high→5, medium→3, low→1). */
export function confidenceToPickStrength(confidenceLevel: string | undefined): number {
  switch (confidenceLevel?.toLowerCase()) {
    case 'high':
      return 5;
    case 'medium':
      return 3;
    case 'low':
      return 1;
    default:
      return 2;
  }
}

interface PredictionCardProps {
  prediction: Prediction;
  onPress?: () => void;
  homeTeamName?: string;
  awayTeamName?: string;
  /** Backend league id (e.g. premier_league) — soccer uses projected-goals label + one decimal. */
  league?: string;
  /** Tighter margins when nested inside game detail tap area */
  embedded?: boolean;
  /** Hide confidence % , pick strength stars, projections & model quality until Premium / rewarded unlock */
  advancedInsightsLocked?: boolean;
}

function confidenceBadgeStyle(level: string) {
  switch (level?.toLowerCase()) {
    case 'high':
      return { bg: theme.colors.confidenceHigh, fg: theme.colors.background };
    case 'medium':
      return { bg: theme.colors.confidenceMedium, fg: theme.colors.background };
    case 'low':
      return { bg: theme.colors.confidenceLow, fg: theme.colors.background };
    default:
      return { bg: theme.colors.textMuted, fg: theme.colors.background };
  }
}

function confidenceLabel(level: string): string {
  switch (level?.toLowerCase()) {
    case 'high':
      return 'High Confidence';
    case 'medium':
      return 'Medium Confidence';
    case 'low':
      return 'Low Confidence';
    default:
      return 'Confidence';
  }
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onPress,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  league,
  embedded = false,
  advancedInsightsLocked = false,
}) => {
  const { home_win_probability, away_win_probability, confidence_level } = prediction;
  const pickStrength = confidenceToPickStrength(confidence_level);
  const soccer = isSoccerLeague(league);
  const rawDraw = soccer
    ? impliedDrawForSoccer(home_win_probability, away_win_probability)
    : impliedDrawProbability(home_win_probability, away_win_probability);
  const { home, away, draw } = normalizeThreeWay(
    home_win_probability,
    away_win_probability,
    rawDraw
  );
  const badge = confidenceBadgeStyle(confidence_level);

  const mostLikelyLabel = (() => {
    const h = home_win_probability;
    const a = away_win_probability;
    const d = rawDraw;
    if (soccer || d >= 0.005) {
      const { home: nh, away: na, draw: nd } = normalizeThreeWay(h, a, d);
      if (nh >= na && nh >= nd) return `${homeTeamName} win`;
      if (na >= nh && na >= nd) return `${awayTeamName} win`;
      return 'Draw';
    }
    return h >= a ? `${homeTeamName} win` : `${awayTeamName} win`;
  })();
  // One decimal: soccer reads as expected-goals style; other sports keep the same precision.
  const expectedLine =
    prediction.expected_home_score != null && prediction.expected_away_score != null
      ? `${prediction.expected_home_score.toFixed(1)} – ${prediction.expected_away_score.toFixed(1)}`
      : null;
  const expectedScoreLabel = soccer ? 'Projected goals' : 'Expected score';
  const qualityLabel = prediction.data_quality_label
    ? `Data quality: ${prediction.data_quality_label.toUpperCase()}`
    : null;
  const showDemoNote = isDemoModelPrediction(prediction, league);

  const content = (
    <>
      {showDemoNote ? (
        <Text style={styles.demoNote}>{demoModelDisclaimer(league)}</Text>
      ) : null}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.title}>Prediction</Text>
          {soccer ? <Text style={styles.oneX2Hint}>1X2 — model probabilities (home · draw · away)</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.confidenceBadge,
              advancedInsightsLocked
                ? { backgroundColor: theme.colors.borderSubtle }
                : { backgroundColor: badge.bg },
            ]}
          >
            <Text
              style={[
                styles.confidenceText,
                advancedInsightsLocked
                  ? { color: theme.colors.textMuted }
                  : { color: badge.fg },
              ]}
            >
              {advancedInsightsLocked ? 'Unlock for confidence' : confidenceLabel(confidence_level)}
            </Text>
          </View>
          {!advancedInsightsLocked ? (
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= pickStrength ? 'star' : 'star-outline'}
                  size={14}
                  color={i <= pickStrength ? theme.colors.accent : theme.colors.textMuted}
                  style={styles.star}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.probabilityContainer}>
        <View style={styles.probabilityItem}>
          <Text style={styles.teamLabel}>{homeTeamName}</Text>
          <View style={styles.probabilityBar}>
            <View
              style={[
                styles.probabilityFill,
                {
                  width: `${home * 100}%`,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.probabilityText}>
            {advancedInsightsLocked ? '—' : `${(home * 100).toFixed(1)}%`}
          </Text>
        </View>

        {soccer || rawDraw >= 0.005 ? (
          <View style={styles.probabilityItem}>
            <Text style={styles.teamLabel}>{soccer ? 'Draw (X)' : 'Draw'}</Text>
            <View style={styles.probabilityBar}>
              <View
                style={[
                  styles.probabilityFill,
                  {
                    width: `${draw * 100}%`,
                    backgroundColor: theme.colors.drawNeutral,
                  },
                ]}
              />
            </View>
            <Text style={styles.probabilityText}>
              {advancedInsightsLocked ? '—' : `${(draw * 100).toFixed(1)}%`}
            </Text>
          </View>
        ) : null}

        <View style={styles.probabilityItem}>
          <Text style={styles.teamLabel}>{awayTeamName}</Text>
          <View style={styles.probabilityBar}>
            <View
              style={[
                styles.probabilityFill,
                {
                  width: `${away * 100}%`,
                  backgroundColor: theme.colors.secondary,
                },
              ]}
            />
          </View>
          <Text style={styles.probabilityText}>
            {advancedInsightsLocked ? '—' : `${(away * 100).toFixed(1)}%`}
          </Text>
        </View>
      </View>

      {expectedLine && !advancedInsightsLocked ? (
        <View style={styles.scorePrediction}>
          <Text style={styles.scoreLabel}>{expectedScoreLabel}</Text>
          <Text style={styles.scoreText}>{expectedLine}</Text>
        </View>
      ) : null}

      <View style={styles.mostLikelyRow}>
        <Text style={styles.mostLikelyLabel}>Most likely result</Text>
        <Text style={styles.mostLikelyValue}>{mostLikelyLabel}</Text>
      </View>
      {qualityLabel && !advancedInsightsLocked ? (
        <Text style={styles.qualityMeta}>{qualityLabel}</Text>
      ) : null}
    </>
  );

  const cardStyle = [styles.card, embedded && styles.cardEmbedded];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  cardEmbedded: {
    marginHorizontal: 0,
  },
  demoNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
    fontStyle: 'italic',
  },
  cardPressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  oneX2Hint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    maxWidth: 220,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginLeft: 1,
  },
  confidenceBadge: {
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  probabilityContainer: {
    marginBottom: theme.spacing.sm + 4,
  },
  probabilityItem: {
    marginBottom: theme.spacing.sm + 4,
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  probabilityBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  probabilityFill: {
    height: '100%',
    borderRadius: theme.radii.xs,
  },
  probabilityText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scorePrediction: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  mostLikelyRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  mostLikelyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  mostLikelyValue: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  qualityMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
