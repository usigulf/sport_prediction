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
import { hasProAccess } from '../utils/subscription';
import { PremiumFeatureEmptyState } from '../components/PremiumFeatureEmptyState';

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
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      let tier = 'free';
      try {
        const u = await apiService.getCurrentUser() as { subscription_tier?: string };
        tier = u?.subscription_tier ?? 'free';
        setSubscriptionTier(tier);
      } catch {
        setSubscriptionTier('free');
        return;
      }
      if (!hasProAccess(tier)) {
        setChallenges([]);
        return;
      }
      const res = await apiService.getChallenges({ limit: 20 });
      setChallenges(res.challenges ?? []);
    } catch (e) {
      setSubscriptionTier((t) => t ?? 'free');
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

  if (subscriptionTier === null) {
    return (
      <View style={[styles.container, styles.centered]} accessibilityLabel="Loading challenges">
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!hasProAccess(subscriptionTier)) {
    return (
      <View style={styles.container}>
        <PremiumFeatureEmptyState
          icon="trophy-outline"
          badge="Premium"
          title="Challenges"
          message="Pick up to 10 games and see how the model performs when they finish. Upgrade to Premium to create and track challenges."
          primaryLabel="View Premium"
          onPrimaryPress={() =>
            navigation.navigate('Paywall', {
              emphasizeTier: 'premium',
              contextMessage: 'Premium includes challenges, leaderboards, and unlimited picks.',
            })
          }
        />
      </View>
    );
  }

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
        <PremiumFeatureEmptyState
          icon="trophy-outline"
          badge="Beta"
          title="Start your first challenge"
          message="Select up to 10 upcoming games. When they all finish, we score how many the model got right — great for tracking a slate or rivalry weekend."
          primaryLabel="Create challenge"
          onPrimaryPress={() => navigation.navigate('CreateChallenge')}
          secondaryLabel="Browse games"
          onSecondaryPress={() => navigation.navigate('MainTabs', { screen: 'Games' } as never)}
        />
      ) : (
        challenges.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ChallengeDetail', { challengeId: c.id })}
          >
            <View style={styles.cardMain}>
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
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
              style={styles.cardChevron}
            />
          </TouchableOpacity>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  proGate: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proGateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  proGateText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  proGateButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
  },
  proGateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardMain: {
    flex: 1,
  },
  cardChevron: {
    marginLeft: theme.spacing.sm,
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
