import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GameCard } from '../GameCard';
import { PlayerPropRow } from './PlayerPropRow';
import { theme } from '../../constants/theme';
import type { Game } from '../../types';
import type { PlayerPropItem } from '../../screens/gameDetail/types';

export type PlayerPropsFeedItem = {
  game: Game;
  props: PlayerPropItem[];
  prop_count: number;
  has_named_players: boolean;
};

type Props = {
  item: PlayerPropsFeedItem;
  onPressGame: (gameId: string) => void;
};

export function PlayerPropsFeedCard({ item, onPressGame }: Props) {
  const { game, props, prop_count, has_named_players } = item;

  return (
    <View style={styles.card} testID="player-props-feed-card">
      <GameCard game={game} onPress={() => onPressGame(game.id)} />
      <View style={styles.propsBlock}>
        <Text style={styles.propsTitle}>
          {has_named_players ? 'Top player props' : 'Model prop estimates'}
        </Text>
        {props.map((prop, i) => (
          <PlayerPropRow key={`${prop.player_name}-${prop.prop_type}-${i}`} prop={prop} compact />
        ))}
        {prop_count > props.length ? (
          <TouchableOpacity onPress={() => onPressGame(game.id)} style={styles.moreBtn}>
            <Text style={styles.moreBtnText}>
              +{prop_count - props.length} more on game detail
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  propsBlock: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  propsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  moreBtn: {
    paddingTop: theme.spacing.xs,
  },
  moreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});
