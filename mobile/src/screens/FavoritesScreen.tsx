import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GameCard } from '../components/GameCard';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { AVAILABLE_LEAGUES } from '../constants/leagues';
import { theme } from '../constants/theme';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const [favorites, setFavorites] = useState<any>({ teams: [], leagues: [] });
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const favs = (await apiService.getFavorites()) as { teams?: { id: string; name: string }[]; leagues?: { id: string; name: string }[] };
      setFavorites(favs);

      // Load upcoming games for all favorite leagues (or no filter if none)
      const leagueIds = favs.leagues?.map((l: { id: string }) => l.id) ?? [];
      const gamesData = await apiService.getUpcomingGames({
        leagues: leagueIds.length > 0 ? leagueIds.join(',') : undefined,
        limit: 30,
      });
      setGames(gamesData.games || []);
    } catch (error) {
      Alert.alert('Error', getUserFriendlyMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAddLeague = async (leagueId: string) => {
    try {
      await apiService.addFavoriteLeague(leagueId);
      await loadFavorites();
    } catch (error) {
      Alert.alert('Could not add league', getUserFriendlyMessage(error));
    }
  };

  const handleRemoveLeague = async (leagueCode: string) => {
    try {
      await apiService.removeFavoriteLeague(leagueCode);
      await loadFavorites();
    } catch (error) {
      Alert.alert('Could not remove league', getUserFriendlyMessage(error));
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      await apiService.removeFavoriteTeam(teamId);
      await loadFavorites();
    } catch (error) {
      Alert.alert('Could not remove favorite', getUserFriendlyMessage(error));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleGamePress = (gameId: string) => {
    navigation.navigate('GameDetail', { gameId });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {favorites.teams?.length === 0 && favorites.leagues?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            Add teams from a game detail screen (tap a game, then tap the star next to a team), or add leagues below to see upcoming games.
          </Text>
          <View style={styles.addLeagueSection}>
            <Text style={styles.sectionLabel}>Add a league</Text>
            {AVAILABLE_LEAGUES.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={styles.addLeagueButton}
                onPress={() => handleAddLeague(league.id)}
              >
                <Text style={styles.addLeagueButtonText}>{league.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleGamePress(item.id)}>
              <GameCard game={item} />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Favorite Teams</Text>
              {favorites.teams?.length > 0 && (
                <View style={styles.teamChips}>
                  {favorites.teams.map((t: { id: string; name: string }) => (
                    <View key={t.id} style={styles.chipRow}>
                      <Text style={styles.chipText}>{t.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTeam(t.id)}
                        style={styles.removeChip}
                      >
                        <Text style={styles.removeChipText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.sectionLabel}>Favorite Leagues</Text>
              <View style={styles.leagueRowWrap}>
                {favorites.leagues?.map((l: { id: string; name: string }) => (
                  <View key={l.id} style={styles.chipRow}>
                    <Text style={styles.chipText}>{l.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveLeague(l.id)}
                      style={styles.removeChip}
                    >
                      <Text style={styles.removeChipText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {AVAILABLE_LEAGUES.filter(
                  (al) => !favorites.leagues?.some((fl: { id: string }) => fl.id === al.id)
                ).map((league) => (
                  <TouchableOpacity
                    key={league.id}
                    style={styles.addLeagueChip}
                    onPress={() => handleAddLeague(league.id)}
                  >
                    <Text style={styles.addLeagueChipText}>+ {league.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sectionLabel}>Upcoming Games</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  addLeagueSection: {
    marginTop: theme.spacing.sm,
    width: '100%',
    maxWidth: 280,
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
});
