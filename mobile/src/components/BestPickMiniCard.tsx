/**
 * Compact card for "Best Picks for You" horizontal carousel.
 * Shows: sport icon, matchup teaser, confidence stars, win % bar snippet.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { TeamCrestImage } from './TeamCrestImage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { leagueBadgeSource } from '../constants/sportLogos';
import { teamLogoUriCandidates } from '../utils/teamLogoUrl';
import { confidenceToPickStrength } from './PredictionCard';
import { formatLeagueLabel } from '../utils/leagueDisplay';

export interface BestPickItem {
  id: string;
  league: string;
  home_team?: { name: string; logo_url?: string | null; abbreviation?: string | null } | null;
  away_team?: { name: string; logo_url?: string | null; abbreviation?: string | null } | null;
  prediction?: {
    home_win_probability: number;
    away_win_probability: number;
    confidence_level?: string;
  } | null;
  guest_locked?: boolean;
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
  const locked = Boolean(pick.guest_locked);
  const badge = leagueBadgeSource(pick.league);
  const homeCrest = teamLogoUriCandidates({
    league: pick.league,
    abbreviation: pick.home_team?.abbreviation,
    logo_url: pick.home_team?.logo_url,
  });
  const awayCrest = teamLogoUriCandidates({
    league: pick.league,
    abbreviation: pick.away_team?.abbreviation,
    logo_url: pick.away_team?.logo_url,
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.sportIconWrap}>
          {badge ? (
            <Image source={badge} style={styles.leagueBadgeImg} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <Ionicons name="football-outline" size={18} color={theme.colors.accent} />
          )}
        </View>
        <Text style={styles.league} numberOfLines={1}>{formatLeagueLabel(pick.league)}</Text>
      </View>
      <View style={styles.clubsRow}>
        <ClubFace candidates={homeCrest} fallbackLabel={home} />
        <Text style={styles.clubsVs}>vs</Text>
        <ClubFace candidates={awayCrest} fallbackLabel={away} />
      </View>
      <Text style={styles.matchup} numberOfLines={2}>{matchup}</Text>
      {locked ? (
        <View style={styles.lockRow}>
          <Ionicons name="lock-closed" size={14} color={theme.colors.accent} />
          <Text style={styles.lockText}>Sign up to unlock</Text>
        </View>
      ) : null}
      {pred && !locked && (
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

function ClubFace({ candidates, fallbackLabel }: { candidates: string[]; fallbackLabel: string }) {
  return (
    <TeamCrestImage
      candidates={candidates}
      fallbackLabel={fallbackLabel}
      style={styles.clubLogo}
      contentFit="contain"
    />
  );
}

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
    overflow: 'hidden',
  },
  leagueBadgeImg: {
    width: 22,
    height: 22,
  },
  clubsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  clubLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.backgroundElevated,
  },
  clubFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubFallbackText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  clubsVs: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
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
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lockText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});
