/**
 * Challenge detail: status, score, and links to each game.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';
import { formatLeagueLabel } from '../utils/predictionDisplay';
import type { Game } from '../types';

type Route = RouteProp<RootStackParamList, 'ChallengeDetail'>;

export const ChallengeDetailScreen: React.FC = () => {
  const { challengeId } = useRoute<Route>().params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{
    id: string;
    status: string;
    correct_count: number;
    total_count: number;
    game_ids: string[];
    created_at: string | null;
    completed_at: string | null;
  } | null>(null);
  const [games, setGames] = useState<Game[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const c = await apiService.getChallenge(challengeId);
      setChallenge(c);
      const ids = c.game_ids ?? [];
      if (!ids.length) {
        setGames([]);
        return;
      }
      const upcoming = await apiService.getUpcomingGames({ limit: 100 });
      const list = (upcoming.games ?? []) as Game[];
      const byId = new Map(list.map((g) => [g.id, g]));
      const matched = ids.map((id) => byId.get(id)).filter((g): g is Game => !!g);
      setGames(matched);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to load challenge');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [challengeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !challenge) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (error || !challenge) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error ?? 'Challenge not found'}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retry}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={theme.colors.accent}
        />
      }
    >
      <View style={styles.summary}>
        <Text style={styles.status}>
          {challenge.status === 'completed' ? 'Completed' : 'Active'}
        </Text>
        {challenge.status === 'completed' ? (
          <Text style={styles.score}>
            Model: {challenge.correct_count}/{challenge.total_count} correct
          </Text>
        ) : (
          <Text style={styles.pending}>Results when all games finish</Text>
        )}
        <Text style={styles.meta}>{challenge.total_count} games · vs model</Text>
      </View>

      <Text style={styles.sectionTitle}>Games</Text>
      {games.length === 0 ? (
        <Text style={styles.muted}>Open each game from Games or Home if not listed here.</Text>
      ) : (
        games.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={styles.gameRow}
            onPress={() => navigation.navigate('GameDetail', { gameId: g.id })}
          >
            <View style={styles.gameRowBody}>
              <Text style={styles.league}>{formatLeagueLabel(g.league)}</Text>
              <Text style={styles.matchup}>
                {g.home_team?.name ?? 'Home'} vs {g.away_team?.name ?? 'Away'}
              </Text>
              <Text style={styles.statusLine}>
                {g.status}
                {g.home_score != null && g.away_score != null
                  ? ` · ${g.home_score}–${g.away_score}`
                  : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))
      )}
      {challenge.game_ids
        .filter((id) => !games.some((g) => g.id === id))
        .map((id) => (
          <TouchableOpacity
            key={id}
            style={styles.gameRow}
            onPress={() => navigation.navigate('GameDetail', { gameId: id })}
          >
            <Text style={styles.matchup}>Game {id.slice(0, 8)}…</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  summary: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  status: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  score: { fontSize: 16, color: theme.colors.accent, marginTop: 8, fontWeight: '600' },
  pending: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8 },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  gameRowBody: { flex: 1 },
  league: { fontSize: 12, color: theme.colors.accent, fontWeight: '600' },
  matchup: { fontSize: 16, color: theme.colors.text, marginTop: 4 },
  statusLine: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  muted: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 20 },
  errorText: { color: theme.colors.textSecondary, marginBottom: 12 },
  retry: { color: theme.colors.accent, fontWeight: '600' },
});
