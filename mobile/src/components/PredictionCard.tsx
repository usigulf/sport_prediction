import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Prediction } from '../types';
import { theme } from '../constants/theme';

/** BetQL-style pick strength 1–5 from confidence (high→5, medium→3, low→1). */
export function confidenceToPickStrength(confidenceLevel: string | undefined): number {
  switch (confidenceLevel?.toLowerCase()) {
    case 'high': return 5;
    case 'medium': return 3;
    case 'low': return 1;
    default: return 2;
  }
}

interface PredictionCardProps {
  prediction: Prediction;
  onPress?: () => void;
  /** If true, show compact star row only (e.g. in feed). Default false = full card. */
  compact?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onPress,
  compact = false,
}) => {
  const { home_win_probability, away_win_probability, confidence_level } = prediction;
  const pickStrength = confidenceToPickStrength(confidence_level);

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return theme.colors.accent;
      case 'medium':
        return theme.colors.textSecondary;
      case 'low':
        return theme.colors.secondary;
      default:
        return theme.colors.textMuted;
    }
  };

  const getConfidenceLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Unknown';
    }
  };

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Prediction</Text>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: getConfidenceColor(confidence_level) },
            ]}
          >
            <Text style={styles.confidenceText}>
              {getConfidenceLabel(confidence_level)}
            </Text>
          </View>
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
        </View>
      </View>

      <View style={styles.probabilityContainer}>
        <View style={styles.probabilityItem}>
          <Text style={styles.teamLabel}>Home Team</Text>
          <View style={styles.probabilityBar}>
            <View
              style={[
                styles.probabilityFill,
                {
                  width: `${home_win_probability * 100}%`,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.probabilityText}>
            {(home_win_probability * 100).toFixed(1)}%
          </Text>
        </View>

        <View style={styles.probabilityItem}>
          <Text style={styles.teamLabel}>Away Team</Text>
          <View style={styles.probabilityBar}>
            <View
              style={[
                styles.probabilityFill,
                {
                  width: `${away_win_probability * 100}%`,
                  backgroundColor: theme.colors.secondary,
                },
              ]}
            />
          </View>
          <Text style={styles.probabilityText}>
            {(away_win_probability * 100).toFixed(1)}%
          </Text>
        </View>
      </View>

      {prediction.expected_home_score && prediction.expected_away_score && (
        <View style={styles.scorePrediction}>
          <Text style={styles.scoreLabel}>Expected Score:</Text>
          <Text style={styles.scoreText}>
            {prediction.expected_home_score.toFixed(1)} -{' '}
            {prediction.expected_away_score.toFixed(1)}
          </Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.card}>{content}</View>;
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
  cardPressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
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
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  probabilityContainer: {
    marginBottom: theme.spacing.sm + 4,
  },
  probabilityItem: {
    marginBottom: theme.spacing.sm + 4,
  },
  teamLabel: {
    fontSize: 14,
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
});
