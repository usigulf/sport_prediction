import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

type PredictionHistoryNavigationProp = StackNavigationProp<RootStackParamList>;

interface GameInfo {
  id: string;
  league: string;
  home_team?: { id: string; name: string } | null;
  away_team?: { id: string; name: string } | null;
  scheduled_time: string;
  status: string;
  home_score?: number;
  away_score?: number;
}

interface HistoryItem {
  id: string;
  game_id: string;
  prediction_id: string | null;
  viewed_at: string | null;
  game: GameInfo | null;
}

export const PredictionHistoryScreen: React.FC = () => {
  const navigation = useNavigation<PredictionHistoryNavigationProp>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiService.getPredictionHistory({ skip: 0, limit: 50 });
      const data = res as { predictions: HistoryItem[]; total: number };
      setItems(data.predictions ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(getUserFriendlyMessage(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onItemPress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const now = new Date();
      const sameDay =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
      if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const g = item.game;
    const home = g?.home_team?.name ?? 'Home';
    const away = g?.away_team?.name ?? 'Away';
    const subtitle =
      g?.status === 'final' && g?.home_score != null && g?.away_score != null
        ? `${g.home_score} – ${g.away_score}`
        : g?.scheduled_time
          ? new Date(g.scheduled_time).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => onItemPress(item.game_id)}
        activeOpacity={0.7}
      >
        <Text style={styles.matchup}>{home} vs {away}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.viewed}>Viewed {formatDate(item.viewed_at)}</Text>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No prediction history yet. View a game and open its prediction to see it here.
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.accent} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  item: {
    backgroundColor: theme.colors.backgroundCard,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: theme.radii.sm,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  matchup: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  viewed: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  emptyList: {
    flexGrow: 1,
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
  },
  retryText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
