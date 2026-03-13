/**
 * Compact card for "Best Picks for You" horizontal carousel.
 * Shows: sport icon, matchup teaser, confidence stars, win % bar snippet.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { confidenceToPickStrength } from './PredictionCard';

const getSportIcon = (leagueId: string): keyof typeof Ionicons.glyphMap => {
  switch (leagueId) {
    case 'nfl': return 'football';
    case 'nba': return 'basketball';
    case 'mlb': return 'baseball';
    case 'nhl': return 'snow';
    case 'soccer':
    case 'premier_league':
    case 'champions_league':
      return 'football';
    case 'boxing':
    case 'mma':
      return 'fitness';
    case 'tennis':
    case 'golf':
      return 'trophy';
    default:
      return 'football-outline';
  }
};

export interface BestPickItem {
  id: string;
  league: string;
  home_team?: { name: string } | null;
  away_team?: { name: string } | null;
  prediction?: {
    home_win_probability: number;
    away_win_probability: number;
    confidence_level?: string;
  } | null;
}

interface BestPickMiniCardProps {
  pick: BestPickItem;
  onPress: () => void;
}

const CARD_WIDTH = 148;
const CARD_MARGIN = 10;

export const CARD_WIDTH_WITH_MARGIN = CARD_WIDTH + CARD_MARGIN;

export const BestPickMiniCard: React.FC<BestPickMiniCardProps> = ({ pick, onPress }) => {
  const home = pick.home_team?.name || 'Home';
  const away = pick.away_team?.name || 'Away';
  const matchup = `${home} vs ${away}`;
  const pred = pick.prediction;
  const stars = pred ? confidenceToPickStrength(pred.confidence_level) : 0;
  const probHome = pred ? pred.home_win_probability : 0;
  const probAway = pred ? pred.away_win_probability : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.sportIconWrap}>
          <Ionicons name={getSportIcon(pick.league)} size={18} color={theme.colors.accent} />
        </View>
        <Text style={styles.league} numberOfLines={1}>{pick.league.toUpperCase()}</Text>
      </View>
      <Text style={styles.matchup} numberOfLines={2}>{matchup}</Text>
      {pred && (
        <>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= stars ? 'star' : 'star-outline'}
                size={10}
                color={i <= stars ? theme.colors.accent : theme.colors.textMuted}
              />
            ))}
          </View>
          <View style={styles.barRow}>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(probHome * 100)}%`, backgroundColor: theme.colors.accent },
                ]}
              />
            </View>
            <Text style={styles.pct}>{Math.round(probHome * 100)}%</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    padding: theme.spacing.sm + 2,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sportIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  league: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    flex: 1,
  },
  matchup: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
    minWidth: 28,
  },
});
