/**
 * Challenges: list your challenges (vs AI). Create new with up to 10 games; we resolve when all games finish.
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../constants/theme';

type ChallengeItem = {
  id: string;
  status: string;
  correct_count: number;
  total_count: number;
  created_at: string | null;
  completed_at: string | null;
  game_ids: string[];
};

type Nav = StackNavigationProp<RootStackParamList, 'Challenges'>;

export const ChallengesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await apiService.getChallenges({ limit: 20 });
      setChallenges(res.challenges ?? []);
    } catch (e) {
      setChallenges([]);
      setError((e as Error)?.message ?? 'Failed to load challenges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Challenges</Text>
          <Text style={styles.subtitle}>Track how the model does on your picked games</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateChallenge')}
        >
          <Ionicons name="add" size={22} color={theme.colors.background} />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Couldn't load challenges</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : challenges.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No challenges yet</Text>
          <Text style={styles.emptyText}>
            Create a challenge by selecting up to 10 games. When they all finish, we'll show how many the model got right.
          </Text>
          <TouchableOpacity
            style={styles.createBtnLarge}
            onPress={() => navigation.navigate('CreateChallenge')}
          >
            <Text style={styles.createBtnText}>Create your first challenge</Text>
          </TouchableOpacity>
        </View>
      ) : (
        challenges.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, c.status === 'completed' ? styles.badgeCompleted : styles.badgeActive]}>
                <Text style={styles.badgeText}>{c.status === 'completed' ? 'Completed' : 'Active'}</Text>
              </View>
              <Text style={styles.cardDate}>{formatDate(c.created_at)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardGames}>{c.total_count} game{c.total_count !== 1 ? 's' : ''}</Text>
              {c.status === 'completed' ? (
                <Text style={styles.cardResult}>
                  Model: <Text style={styles.correct}>{c.correct_count}/{c.total_count}</Text> correct
                </Text>
              ) : (
                <Text style={styles.cardPending}>Results when all games finish</Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.background,
  },
  createBtnLarge: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  retryBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  retryBtnText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
  },
  badgeActive: {
    backgroundColor: theme.colors.accentDim,
  },
  badgeCompleted: {
    backgroundColor: theme.colors.secondaryDim,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  cardBody: {},
  cardGames: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  cardResult: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 4,
  },
  correct: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  cardPending: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
