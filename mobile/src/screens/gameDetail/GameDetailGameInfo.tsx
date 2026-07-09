import React from 'react';
import { View, Text } from 'react-native';
import { HousePromotionCard } from '../../ads/components/HousePromotionCard';
import type { Game } from '../../types';
import { gameDetailStyles as s } from './gameDetailStyles';

type Props = {
  game: Game;
};

export function GameDetailGameInfo({ game }: Props) {
  return (
    <>
      <View style={s.infoSection}>
        <Text style={s.sectionTitle}>Game Information</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Scheduled Time:</Text>
          <Text style={s.infoValue}>{new Date(game.scheduled_time).toLocaleString()}</Text>
        </View>
        {game.venue ? (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Venue:</Text>
            <Text style={s.infoValue}>{game.venue}</Text>
          </View>
        ) : null}
      </View>

      {game.status === 'finished' ? (
        <View style={s.resultsSponsor}>
          <Text style={s.resultsSponsorLabel}>After the match</Text>
          <HousePromotionCard
            surface="results"
            title="See what the model learned"
            subtitle="Review accuracy and explore the next slate while demand partners support free insights."
          />
        </View>
      ) : null}
    </>
  );
}
