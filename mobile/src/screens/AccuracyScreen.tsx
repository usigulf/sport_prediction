import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  apiService,
  type AccuracyResponse,
  type CoverageResponse,
} from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { theme } from '../constants/theme';

const CONFIDENCE_ORDER = ['high', 'medium', 'low', 'unknown'] as const;

function confidenceLabel(key: string): string {
  switch (key) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    case 'unknown':
      return 'Not labeled';
    default:
      return key;
  }
}

function formatLeagueTitle(league: string): string {
  return league.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWindowStart(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatLastUpdated(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export const AccuracyScreen: React.FC = () => {
  const [data, setData] = useState<AccuracyResponse | null>(null);
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [coverageFailed, setCoverageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [accRes, covRes] = await Promise.allSettled([
        apiService.getAccuracy(),
        apiService.getCoverage(),
      ]);
      if (accRes.status === 'rejected') throw accRes.reason;
      setData(accRes.value);
      if (covRes.status === 'fulfilled') {
        setCoverage(covRes.value);
        setCoverageFailed(false);
      } else {
        setCoverage(null);
        setCoverageFailed(true);
      }
    } catch (e) {
      setError(getUserFriendlyMessage(e));
      setData(null);
      setCoverage(null);
      setCoverageFailed(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      </View>
    );
  }

  const d = data!;
  const leagues = Object.entries(d.by_league || {}).sort((a, b) => b[1].total - a[1].total);
  const roll = d.rolling_30d;
  const confidenceEntries = CONFIDENCE_ORDER.filter((k) => (d.by_confidence[k]?.total ?? 0) > 0).map(
    (k) => [k, d.by_confidence[k]] as const
  );
  const covRows = coverage?.leagues?.length
    ? [...coverage.leagues].sort((a, b) => b.standings_rows - a.standings_rows)
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[theme.colors.accent]} />
      }
    >
      <Text style={styles.title}>How we've done</Text>
      <Text style={styles.subtitle}>Prediction accuracy on finished games</Text>

      <View style={styles.methodCard}>
        <Text style={styles.methodShort}>{d.methodology.short}</Text>
        <Text style={styles.methodDetail}>{d.methodology.detail}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.bigNumber}>{d.accuracy_pct}%</Text>
        <Text style={styles.cardLabel}>Overall accuracy</Text>
        <Text style={styles.cardDetail}>
          {d.correct} correct out of {d.total} games
        </Text>
      </View>

      <View style={[styles.card, styles.cardSecondary]}>
        <Text style={styles.sectionTitleSmall}>Last 30 days</Text>
        <Text style={styles.windowHint}>Since {formatWindowStart(roll.window_start_iso)}</Text>
        <Text style={styles.bigNumberSmall}>{roll.accuracy_pct}%</Text>
        <Text style={styles.cardDetail}>
          {roll.correct} correct out of {roll.total} games (in window)
        </Text>
      </View>

      {d.total === 0 && (
        <Text style={styles.emptyText}>
          No finished games with predictions yet. Accuracy will appear here as games complete.
        </Text>
      )}

      {confidenceEntries.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>By confidence label</Text>
          <Text style={styles.sectionHint}>How often each confidence bucket matched the final result</Text>
          {confidenceEntries.map(([key, stats]) => (
            <View key={key} style={styles.leagueRow}>
              <Text style={styles.leagueName}>{confidenceLabel(key)}</Text>
              <Text style={styles.leagueStat}>
                {stats.accuracy_pct}% ({stats.correct}/{stats.total})
              </Text>
            </View>
          ))}
        </>
      )}

      {leagues.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>By league</Text>
          {leagues.map(([league, stats]) => (
            <View key={league} style={styles.leagueRow}>
              <Text style={styles.leagueName}>{formatLeagueTitle(league)}</Text>
              <Text style={styles.leagueStat}>
                {stats.accuracy_pct}% ({stats.correct}/{stats.total})
              </Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Data coverage</Text>
      {coverage?.summary?.latest_standings_sync_iso ? (
        <Text style={styles.coverageSummary}>
          Last standings sync: {formatLastUpdated(coverage.summary.latest_standings_sync_iso)}
        </Text>
      ) : null}
      <Text style={styles.sectionHint}>
        {coverage?.disclaimer ??
          'Standings and feed depth vary by competition. This is informational, not a promise of completeness.'}
      </Text>
      {coverageFailed ? (
        <Text style={styles.mutedSmall}>Coverage snapshot could not be loaded. Pull to refresh.</Text>
      ) : covRows.length > 0 ? (
        covRows.map((row) => {
          const updatedLabel = formatLastUpdated(row.standings_last_updated_iso);
          return (
            <View key={row.league} style={styles.leagueRow}>
              <Text style={styles.leagueName}>{formatLeagueTitle(row.league)}</Text>
              <View style={styles.coverageStatBlock}>
                <Text style={styles.leagueStat}>
                  {row.standings_rows} standings row{row.standings_rows === 1 ? '' : 's'}
                </Text>
                {updatedLabel ? <Text style={styles.leagueStatSub}>Updated {updatedLabel}</Text> : null}
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.mutedSmall}>No league standings synced in the database yet.</Text>
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
    paddingBottom: theme.spacing.xl + theme.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  methodCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.borderSubtle,
  },
  methodShort: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  methodDetail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  cardSecondary: {
    alignItems: 'stretch',
    borderLeftColor: theme.colors.borderSubtle,
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
  bigNumberSmall: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  windowHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  cardLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  cardDetail: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  coverageSummary: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  leagueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.md,
    borderRadius: theme.radii.sm,
    marginBottom: theme.spacing.sm,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  leagueStat: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  coverageStatBlock: {
    alignItems: 'flex-end',
  },
  leagueStatSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  mutedSmall: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
