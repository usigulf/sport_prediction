import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Game } from '../types';
import { theme } from '../constants/theme';
import { formatLeagueLabel } from '../utils/leagueDisplay';

interface GameCardProps {
  game: Game;
  onPress?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPress }) => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return theme.colors.secondary;
      case 'scheduled':
        return theme.colors.textMuted;
      case 'finished':
        return theme.colors.accent;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.league}>{formatLeagueLabel(game.league)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(game.status) },
          ]}
        >
          <Text style={styles.statusText}>{game.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.teamsContainer}>
        <View style={styles.team}>
          {game.home_team?.logo_url && (
            <Image
              source={{ uri: game.home_team.logo_url }}
              style={styles.logo}
            />
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {game.home_team?.name || 'Home Team'}
          </Text>
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={styles.team}>
          {game.away_team?.logo_url && (
            <Image
              source={{ uri: game.away_team.logo_url }}
              style={styles.logo}
            />
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {game.away_team?.name || 'Away Team'}
          </Text>
        </View>
      </View>

      {game.status === 'live' && (
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>
            {game.home_score} - {game.away_score}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.date}>{formatDate(game.scheduled_time)}</Text>
        {game.prediction && (
          <View style={styles.predictionIndicator}>
            <Text style={styles.predictionText}>Prediction Available</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm + 4,
  },
  league: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm + 4,
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: theme.spacing.sm,
    borderRadius: 25,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  vs: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  predictionIndicator: {
    backgroundColor: theme.colors.accentDim,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
  },
  predictionText: {
    fontSize: 10,
    color: theme.colors.accent,
    fontWeight: '600',
  },
});
