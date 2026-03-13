/**
 * Create Challenge: select up to 10 upcoming games, then create a challenge.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

const MAX_GAMES = 10;

type Nav = StackNavigationProp<RootStackParamList, 'CreateChallenge'>;

export const CreateChallengeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getUpcomingGames({ limit: 50 });
      const list = (res.games ?? []).filter(
        (g: any) => g.status === 'scheduled' || g.status === 'live' || g.status === 'in_progress'
      );
      setGames(list);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const toggle = (gameId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else if (next.size < MAX_GAMES) next.add(gameId);
      return next;
    });
  };

  const handleCreate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      Alert.alert('Select games', 'Choose at least one game for your challenge.');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.createChallenge(ids);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', getUserFriendlyMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => toggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.checkbox}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? theme.colors.accent : theme.colors.textMuted}
          />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.league}>{item.league?.toUpperCase() ?? '—'}</Text>
          <Text style={styles.teams}>
            {item.home_team?.name ?? 'Home'} vs {item.away_team?.name ?? 'Away'}
          </Text>
          <Text style={styles.time}>{formatTime(item.scheduled_time)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Select up to {MAX_GAMES} games. The model’s picks will be scored when all games finish.</Text>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No upcoming games available for challenges.</Text>
          }
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.count}>
          {selected.size} / {MAX_GAMES} selected
        </Text>
        <TouchableOpacity
          style={[
            styles.createBtn,
            (selected.size === 0 || submitting) && styles.createBtnDisabled,
          ]}
          onPress={handleCreate}
          disabled={selected.size === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={styles.createBtnText}>Create challenge</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  list: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowSelected: {
    backgroundColor: theme.colors.accentDim,
  },
  checkbox: {
    marginRight: theme.spacing.md,
  },
  gameInfo: {
    flex: 1,
  },
  league: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  teams: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  count: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  createBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
