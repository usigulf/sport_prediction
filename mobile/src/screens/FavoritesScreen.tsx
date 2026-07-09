import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GameCard } from '../components/GameCard';
import { FeedSkeleton } from '../components/feed/FeedSkeleton';
import { FeedErrorBanner } from '../components/feed/FeedErrorBanner';
import { FeedEmptyState } from '../components/feed/FeedEmptyState';
import { PredictionDisclaimer } from '../components/PredictionDisclaimer';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { AVAILABLE_LEAGUES } from '../constants/leagues';
import { theme } from '../constants/theme';
import { WideContent } from '../components/WideContent';
import {
  useFavoriteGames,
  useFavoriteMutations,
  useFavoritesQuery,
} from '../hooks/useFavorites';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const {
    data: favorites,
    isLoading: favoritesLoading,
    error: favoritesError,
    refetch: refetchFavorites,
    syncNotice,
    clearSyncNotice,
  } = useFavoritesQuery();
  const {
    games,
    isLoading: gamesLoading,
    error: gamesError,
    refetch: refetchGames,
    isRefetching,
  } = useFavoriteGames();
  const { addLeague, removeLeague, removeTeam } = useFavoriteMutations();

  const loading = favoritesLoading || gamesLoading;
  const error = favoritesError || gamesError;
  const teams = favorites?.teams ?? [];
  const leagues = favorites?.leagues ?? [];
  const isEmpty = teams.length === 0 && leagues.length === 0;

  const onRefresh = async () => {
    clearSyncNotice();
    await Promise.all([refetchFavorites(), refetchGames()]);
  };

  const handleGamePress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  const handleAddLeague = async (leagueId: string) => {
    try {
      await addLeague.mutateAsync(leagueId);
    } catch (e) {
      // surfaced via mutation error state if needed
    }
  };

  const handleRemoveLeague = async (leagueCode: string) => {
    try {
      await removeLeague.mutateAsync(leagueCode);
    } catch (_) {
      /* ignore */
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      await removeTeam.mutateAsync(teamId);
    } catch (_) {
      /* ignore */
    }
  };

  if (loading && !favorites) {
    return (
      <WideContent style={styles.container}>
        <FeedSkeleton count={4} />
      </WideContent>
    );
  }

  if (error && isEmpty) {
    return (
      <WideContent style={styles.container}>
        <FeedErrorBanner
          message={getUserFriendlyMessage(error)}
          onRetry={() => void onRefresh()}
        />
      </WideContent>
    );
  }

  if (isEmpty) {
    return (
      <WideContent style={styles.container}>
        <FeedEmptyState
          icon="heart-outline"
          title="No favorites yet"
          subtitle="Add teams from a game detail screen, or add leagues below."
        />
        <View style={styles.addLeagueSection}>
          <Text style={styles.sectionLabel}>Add a league</Text>
          {AVAILABLE_LEAGUES.map((league) => (
            <TouchableOpacity
              key={league.id}
              style={styles.addLeagueButton}
              onPress={() => void handleAddLeague(league.id)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${league.name} to favorites`}
            >
              <Text style={styles.addLeagueButtonText}>{league.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <PredictionDisclaimer compact style={styles.disclaimer} />
      </WideContent>
    );
  }

  return (
    <WideContent style={styles.container}>
      {syncNotice ? (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>{syncNotice}</Text>
          <TouchableOpacity onPress={clearSyncNotice} accessibilityLabel="Dismiss sync notice">
            <Text style={styles.syncDismiss}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error ? (
        <FeedErrorBanner
          message={getUserFriendlyMessage(error)}
          onRetry={() => void onRefresh()}
        />
      ) : null}
      <FlatList
        data={games}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleGamePress(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open game ${item.home_team?.name ?? 'Home'} vs ${item.away_team?.name ?? 'Away'}`}
          >
            <GameCard game={item} />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void onRefresh()} />
        }
        ListEmptyComponent={
          loading ? (
            <FeedSkeleton count={3} />
          ) : (
            <FeedEmptyState
              title="No upcoming games"
              subtitle="Pull to refresh or add more leagues."
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Favorite Teams
            </Text>
            {teams.length > 0 ? (
              <View style={styles.teamChips}>
                {teams.map((t) => (
                  <View key={t.id} style={styles.chipRow}>
                    <Text style={styles.chipText}>{t.name}</Text>
                    <TouchableOpacity
                      onPress={() => void handleRemoveTeam(t.id)}
                      style={styles.removeChip}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${t.name} from favorites`}
                    >
                      <Text style={styles.removeChipText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.sectionLabel}>Favorite Leagues</Text>
            <View style={styles.leagueRowWrap}>
              {leagues.map((l) => (
                <View key={l.id} style={styles.chipRow}>
                  <Text style={styles.chipText}>{l.name}</Text>
                  <TouchableOpacity
                    onPress={() => void handleRemoveLeague(l.id)}
                    style={styles.removeChip}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${l.name} league`}
                  >
                    <Text style={styles.removeChipText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {AVAILABLE_LEAGUES.filter(
                (al) => !leagues.some((fl) => fl.id === al.id),
              ).map((league) => (
                <TouchableOpacity
                  key={league.id}
                  style={styles.addLeagueChip}
                  onPress={() => void handleAddLeague(league.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${league.name}`}
                >
                  <Text style={styles.addLeagueChipText}>+ {league.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Upcoming Games</Text>
            <PredictionDisclaimer compact style={styles.disclaimer} />
          </View>
        }
      />
    </WideContent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.sm,
  },
  header: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  teamChips: {
    marginTop: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundCard,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm + 4,
    borderRadius: theme.radii.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  removeChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    minHeight: theme.minTouchSize,
    justifyContent: 'center',
  },
  removeChipText: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm + 4,
    marginBottom: theme.spacing.xs,
  },
  leagueRowWrap: {
    marginTop: theme.spacing.xs,
  },
  addLeagueChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentDim,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm + 4,
    borderRadius: theme.radii.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  addLeagueChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  addLeagueSection: {
    paddingHorizontal: theme.spacing.lg,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  addLeagueButton: {
    backgroundColor: theme.colors.accentDim,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  addLeagueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.accentDim,
    padding: theme.spacing.sm + 4,
    margin: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  syncText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  syncDismiss: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
  },
  disclaimer: {
    marginTop: theme.spacing.sm,
  },
});
