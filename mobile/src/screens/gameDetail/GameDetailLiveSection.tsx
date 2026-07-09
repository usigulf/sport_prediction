import React from 'react';
import { View, Text } from 'react-native';
import type { Game } from '../../types';
import { gameDetailStyles as s } from './gameDetailStyles';

type LiveUpdate = {
  is_in_play?: boolean;
  home_score?: number;
  away_score?: number;
  home_win_probability?: number;
  away_win_probability?: number;
  confidence_level?: string;
};

type Props = {
  game: Game;
  lastUpdate: LiveUpdate | null;
  connected: boolean;
  liveError: string | null;
};

export function GameDetailLiveSection({ game, lastUpdate, connected, liveError }: Props) {
  return (
    <View style={s.infoSection}>
      <Text style={s.sectionTitle}>
        {lastUpdate?.is_in_play || game.status === 'live' ? 'In-play updates' : 'Live updates'}
      </Text>
      <Text style={s.mutedText}>
        {lastUpdate?.is_in_play
          ? 'Win probability adjusts with the score — informational only, not betting odds.'
          : 'Connects when the match is on; probabilities refresh as the model updates.'}
      </Text>
      {liveError ? (
        <Text style={s.playerPropsError}>{liveError}</Text>
      ) : (
        <>
          <Text style={s.mutedText}>{connected ? '● Connected' : '○ Connecting…'}</Text>
          {lastUpdate ? (
            <View style={s.liveUpdateRow}>
              <Text style={s.liveScore}>
                {lastUpdate.home_score} – {lastUpdate.away_score}
              </Text>
              <Text style={s.liveProbs}>
                Win prob: {Math.round((lastUpdate.home_win_probability ?? 0) * 100)}% /{' '}
                {Math.round((lastUpdate.away_win_probability ?? 0) * 100)}%
                {lastUpdate.confidence_level ? ` · ${lastUpdate.confidence_level}` : ''}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
