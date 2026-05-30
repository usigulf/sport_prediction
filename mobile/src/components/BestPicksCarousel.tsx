/**
 * Best Picks carousel: horizontal FlatList with snap (no Reanimated for Expo compatibility).
 * Colors from `theme` (dark navy + accent + confidence scale).
 * Tap → onPickPress(id) and optional onSetFeatured(id) to swap Featured Game.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../constants/theme';
import type { BestPickItem } from './BestPickMiniCard';
import { confidenceToPickStrength } from './PredictionCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const CARD_MARGIN = 10;
const CARD_WIDTH = Math.min(168, Math.floor((SCREEN_WIDTH - H_PADDING * 2 - CARD_MARGIN * 2) * 0.48));
export const CAROUSEL_ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

const getSportIcon = (leagueId: string): keyof typeof Ionicons.glyphMap => {
  switch (leagueId) {
    case 'nfl': return 'football';
    case 'nba': return 'basketball';
    case 'soccer':
    case 'premier_league':
    case 'champions_league':
    case 'la_liga':
    case 'serie_a':
    case 'bundesliga':
    case 'mls':
      return 'football';
    default:
      return 'football-outline';
  }
};

export interface BestPicksCarouselProps {
  picks: BestPickItem[];
  onPickPress: (gameId: string) => void;
  onSetFeatured?: (gameId: string) => void;
}

interface CarouselCardProps {
  pick: BestPickItem;
  onPress: () => void;
  onSetFeatured?: () => void;
}

const CarouselCard = React.memo<CarouselCardProps>(function CarouselCard({
  pick,
  onPress,
  onSetFeatured,
}) {
  const home = pick.home_team?.name ?? 'Home';
  const away = pick.away_team?.name ?? 'Away';
  const matchup = `${home} vs ${away}`;
  const pred = pick.prediction;
  const stars = pred ? confidenceToPickStrength(pred.confidence_level) : 0;
  const probHome = pred ? pred.home_win_probability : 0;

  return (
    <View style={styles.cardWrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          onPress();
          onSetFeatured?.();
        }}
        activeOpacity={0.9}
      >
        <View style={styles.header}>
          <View style={styles.sportIconWrap}>
            <Ionicons name={getSportIcon(pick.league)} size={18} color={theme.colors.textSecondary} />
          </View>
          <Text style={styles.league} numberOfLines={1}>
            {pick.league.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
        <Text style={styles.matchup} numberOfLines={2}>
          {matchup}
        </Text>
        {pred && (
          <>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= stars ? 'star' : 'star-outline'}
                  size={10}
                  color={i <= stars ? theme.colors.confidenceMedium : theme.colors.textMuted}
                />
              ))}
            </View>
            <View style={styles.barRow}>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.round(probHome * 100)}%`,
                      backgroundColor: theme.colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.pct}>{Math.round(probHome * 100)}%</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
});

export function BestPicksCarousel({ picks, onPickPress, onSetFeatured }: BestPicksCarouselProps) {
  const renderItem = ({ item }: ListRenderItemInfo<BestPickItem>) => (
    <CarouselCard
      pick={item}
      onPress={() => onPickPress(item.id)}
      onSetFeatured={onSetFeatured ? () => onSetFeatured(item.id) : undefined}
    />
  );

  const getItemLayout = (_: unknown, index: number) => ({
    length: CAROUSEL_ITEM_WIDTH,
    offset: CAROUSEL_ITEM_WIDTH * index,
    index,
  });

  return (
    <FlatList
      data={picks}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CAROUSEL_ITEM_WIDTH}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      getItemLayout={getItemLayout}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: H_PADDING,
    paddingVertical: 8,
  },
  cardWrap: {
    width: CAROUSEL_ITEM_WIDTH,
    marginRight: 0,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    padding: 12,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
