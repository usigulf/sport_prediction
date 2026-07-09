import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TeamCrestImage } from '../../components/TeamCrestImage';
import { teamLogoUriCandidates } from '../../utils/teamLogoUrl';
import type { Game } from '../../types';
import { gameDetailStyles as s } from './gameDetailStyles';

type Props = {
  game: Game;
  homeName: string;
  awayName: string;
  favoriteTeamIds: Set<string>;
  addingTeamId: string | null;
  onAddFavorite: (teamId: string) => void;
};

export function GameDetailMatchup({
  game,
  homeName,
  awayName,
  favoriteTeamIds,
  addingTeamId,
  onAddFavorite,
}: Props) {
  const homeCrestCandidates = teamLogoUriCandidates(game.home_team, game.league);
  const awayCrestCandidates = teamLogoUriCandidates(game.away_team, game.league);

  const renderFavButton = (teamId: string, teamName: string) => {
    const inFavorites = favoriteTeamIds.has(teamId);
    const isAdding = addingTeamId === teamId;
    return (
      <TouchableOpacity
        style={[s.favButtonGreen, (inFavorites || isAdding) && s.favButtonGreenDisabled]}
        onPress={() => onAddFavorite(teamId)}
        disabled={inFavorites || !!addingTeamId}
        accessibilityRole="button"
        accessibilityLabel={
          inFavorites ? `${teamName} in favorites` : `Add ${teamName} to favorites`
        }
      >
        <Text style={s.favButtonGreenText}>
          {inFavorites ? '✓ In favorites' : isAdding ? 'Adding…' : '⭐ Add to favorites'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.teamsSection}>
      <View style={s.teamColumn}>
        <Text style={s.teamRole}>Home</Text>
        <TeamCrestImage
          candidates={homeCrestCandidates}
          fallbackLabel={homeName}
          style={s.teamLogo}
          contentFit="contain"
        />
        <Text style={s.teamName} numberOfLines={2}>
          {homeName}
        </Text>
        {game.status === 'live' ? <Text style={s.score}>{game.home_score}</Text> : null}
        {game.home_team?.id ? renderFavButton(game.home_team.id, game.home_team.name) : null}
      </View>

      <View style={s.vsDivider}>
        <Text style={s.vs}>VS</Text>
      </View>

      <View style={s.teamColumn}>
        <Text style={s.teamRole}>Away</Text>
        <TeamCrestImage
          candidates={awayCrestCandidates}
          fallbackLabel={awayName}
          style={s.teamLogo}
          contentFit="contain"
        />
        <Text style={s.teamName} numberOfLines={2}>
          {awayName}
        </Text>
        {game.status === 'live' ? <Text style={s.score}>{game.away_score}</Text> : null}
        {game.away_team?.id ? renderFavButton(game.away_team.id, game.away_team.name) : null}
      </View>
    </View>
  );
}
