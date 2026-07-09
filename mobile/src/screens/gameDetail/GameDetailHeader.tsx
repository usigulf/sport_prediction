import React from 'react';
import { View, Text } from 'react-native';
import { formatLeagueLabel } from '../../utils/predictionDisplay';
import type { Game } from '../../types';
import { gameDetailStyles as s } from './gameDetailStyles';

type Props = {
  game: Game;
  homeName: string;
  awayName: string;
};

export function GameDetailHeader({ game, homeName, awayName }: Props) {
  const statusUpper = game.status.toUpperCase();
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <Text style={s.league}>{formatLeagueLabel(game.league)}</Text>
        <Text style={s.matchTitle} numberOfLines={2}>
          {homeName} vs {awayName}
        </Text>
      </View>
      <View
        style={[
          s.statusBadge,
          game.status === 'live' && s.statusBadgeLive,
          game.status === 'finished' && s.statusBadgeFinished,
        ]}
      >
        <Text
          style={[
            s.statusBadgeText,
            game.status === 'live' && s.statusBadgeTextLive,
            game.status === 'finished' && s.statusBadgeTextFinished,
          ]}
        >
          {statusUpper}
        </Text>
      </View>
    </View>
  );
}
