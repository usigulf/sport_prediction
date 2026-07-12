/**
 * Auditable accuracy scorecard (external audit #15).
 * Surfaces public-audit windows, invite-beta acceptance gates, calibration,
 * and closing-line comparison — not marketing claims.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Linking,
} from 'react-native';
import {
  apiService,
  type AccuracyResponse,
  type CalibrationResponse,
  type CoverageResponse,
  type ModelAcceptanceResponse,
  type ModelVsClosingResponse,
  type PublicAuditResponse,
} from '../services/api';
import { getUserFriendlyMessage } from '../utils/errorMessages';
import { formatLeagueLabel } from '../utils/leagueDisplay';
import { ACCURACY_METHODOLOGY_DETAIL } from '../utils/methodologyDisplay';
import { theme } from '../constants/theme';
import { useModelStatus } from '../hooks/useModelStatus';
import { CalibrationChart } from '../components/CalibrationChart';
import { PredictionDisclaimer } from '../components/PredictionDisclaimer';
import { maybeRequestStoreReview, recordPositiveSession } from '../utils/storeReview';
import { trackScorecardOpened } from '../services/productAnalytics';
import { AcceptanceGateCard } from './accuracy/AcceptanceGateCard';
import { ClosingLineCard } from './accuracy/ClosingLineCard';
import { ScoreWindowGrid } from './accuracy/ScoreWindowGrid';
import {
  CONFIDENCE_ORDER,
  confidenceLabel,
  formatLastUpdated,
  formatWindowStart,
} from './accuracy/accuracyFormatters';

const PUBLIC_SCORECARD_URL = 'https://octobetiq.com/scorecard.html';

export const AccuracyScreen: React.FC = () => {
  const { width: windowWidth } = useWindowDimensions();
  const [data, setData] = useState<AccuracyResponse | null>(null);
  const [audit, setAudit] = useState<PublicAuditResponse | null>(null);
  const [calibration, setCalibration] = useState<CalibrationResponse | null>(null);
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [acceptance, setAcceptance] = useState<ModelAcceptanceResponse | null>(null);
  const [closing, setClosing] = useState<ModelVsClosingResponse | null>(null);
  const [coverageFailed, setCoverageFailed] = useState(false);
  const [acceptanceFailed, setAcceptanceFailed] = useState(false);
  const [closingFailed, setClosingFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isWarming, status: modelStatus, reload: reloadModelStatus } = useModelStatus();
  const reviewPromptedRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [accRes, auditRes, calRes, covRes, acceptRes, closeRes] = await Promise.allSettled([
        apiService.getAccuracy(),
        apiService.getPublicAudit(),
        apiService.getCalibration(),
        apiService.getCoverage(),
        apiService.getModelAcceptance('invite_beta'),
        apiService.getModelVsClosing(),
      ]);
      if (accRes.status === 'rejected') throw accRes.reason;
      setData(accRes.value);

      if (auditRes.status === 'fulfilled') setAudit(auditRes.value);
      else setAudit(null);

      if (calRes.status === 'fulfilled') setCalibration(calRes.value);
      else setCalibration(null);

      if (covRes.status === 'fulfilled') {
        setCoverage(covRes.value);
        setCoverageFailed(false);
      } else {
        setCoverage(null);
        setCoverageFailed(true);
      }

      if (acceptRes.status === 'fulfilled') {
        setAcceptance(acceptRes.value);
        setAcceptanceFailed(false);
      } else {
        setAcceptance(null);
        setAcceptanceFailed(true);
      }

      if (closeRes.status === 'fulfilled') {
        setClosing(closeRes.value);
        setClosingFailed(false);
      } else {
        setClosing(null);
        setClosingFailed(true);
      }
    } catch (e) {
      setError(getUserFriendlyMessage(e));
      setData(null);
      setAudit(null);
      setCalibration(null);
      setCoverage(null);
      setAcceptance(null);
      setClosing(null);
      setCoverageFailed(false);
      setAcceptanceFailed(false);
      setClosingFailed(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    void reloadModelStatus();
    return load(true);
  }, [load, reloadModelStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data || reviewPromptedRef.current) return;
    const totalGames = data.total ?? data.total_games ?? 0;
    if (totalGames < 30 || data.accuracy_pct < 50) return;
    reviewPromptedRef.current = true;
    void (async () => {
      await recordPositiveSession();
      await maybeRequestStoreReview();
    })();
  }, [data]);

  useEffect(() => {
    void trackScorecardOpened('other');
  }, []);

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
  const totalGames = d.total ?? d.total_games ?? 0;
  const leagues = Object.entries(d.by_league || {}).sort((a, b) => b[1].total - a[1].total);
  const roll = d.rolling_30d;
  const confidenceEntries = CONFIDENCE_ORDER.filter((k) => (d.by_confidence[k]?.total ?? 0) > 0).map(
    (k) => [k, d.by_confidence[k]] as const,
  );
  const covRows = coverage?.leagues?.length
    ? [...coverage.leagues].sort((a, b) => b.standings_rows - a.standings_rows)
    : [];
  const updatedIso = audit?.computed_at_iso ?? d.computed_at_iso;
  const allTime = audit?.accuracy_all_time ?? {
    accuracy_pct: d.accuracy_pct,
    correct: d.correct,
    total_games: totalGames,
  };
  const roll30 = audit?.accuracy_rolling_30d ?? {
    accuracy_pct: roll.accuracy_pct,
    correct: roll.correct,
    total: roll.total ?? (roll as { total_games?: number }).total_games,
  };
  const roll7 = audit?.accuracy_rolling_7d;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="accuracy-scorecard"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => onRefresh()} colors={[theme.colors.accent]} />
      }
    >
      <Text style={styles.title}>Auditable scorecard</Text>
      <Text style={styles.subtitle}>
        Pre-kickoff picks vs final results · soccer wedge · not betting advice
      </Text>
      {formatLastUpdated(updatedIso) ? (
        <Text style={styles.freshnessLine}>Last updated {formatLastUpdated(updatedIso)}</Text>
      ) : null}

      <AcceptanceGateCard acceptance={acceptance} failed={acceptanceFailed} />

      <Text style={styles.sectionTitle}>Tracked windows</Text>
      <Text style={styles.sectionHint}>
        Same rules as GET /stats/public-audit — first pre-kickoff prediction only; live refreshes
        excluded.
      </Text>
      <ScoreWindowGrid
        windows={[
          ...(roll7
            ? [{ label: '7 days', ...roll7 }]
            : [{ label: '7 days', accuracy_pct: undefined, correct: 0, total: 0 }]),
          { label: '30 days', ...roll30 },
          { label: 'All time', ...allTime },
        ]}
      />
      {roll?.window_start_iso ? (
        <Text style={styles.windowHint}>30-day window since {formatWindowStart(roll.window_start_iso)}</Text>
      ) : null}

      {isWarming ? (
        <View style={styles.warmingCard}>
          <Text style={styles.warmingTitle}>Model warming</Text>
          <Text style={styles.warmingBody}>
            Publish-ready artifacts are not live yet. Numbers below still score pre-kickoff picks;
            inference may use the baseline engine until invite-beta gates pass.
          </Text>
        </View>
      ) : null}

      <View style={styles.methodCard}>
        <Text style={styles.methodShort}>
          {d.methodology?.short ?? audit?.methodology?.short ?? 'Transparent scoring'}
        </Text>
        <Text style={styles.methodDetail}>{ACCURACY_METHODOLOGY_DETAIL}</Text>
        {(modelStatus?.trained_at || audit?.model?.trained_at) && (
          <Text style={styles.trainedAt}>
            Last trained{' '}
            {formatLastUpdated(modelStatus?.trained_at ?? audit?.model?.trained_at) ?? '—'}
          </Text>
        )}
      </View>

      {calibration?.min_sample_met ? (
        <View style={styles.cardSecondaryBlock}>
          <Text style={styles.sectionTitle}>Calibration</Text>
          <Text style={styles.sectionHint}>
            Predicted probability vs how often we were right ({calibration.total_scored} scored
            games)
          </Text>
          <CalibrationChart
            buckets={calibration.buckets}
            width={windowWidth - theme.spacing.md * 2}
          />
        </View>
      ) : calibration && calibration.total_scored > 0 ? (
        <Text style={styles.mutedSmall}>
          Calibration chart unlocks at {calibration.min_sample} scored games (
          {calibration.total_scored} so far).
        </Text>
      ) : null}

      <ClosingLineCard closing={closing} failed={closingFailed} />

      {totalGames === 0 && (
        <Text style={styles.emptyText}>
          No finished games with predictions yet. The scorecard fills in as games complete.
        </Text>
      )}

      {confidenceEntries.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>By confidence label</Text>
          <Text style={styles.sectionHint}>
            How often each confidence bucket matched the final result
          </Text>
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
              <Text style={styles.leagueName}>{formatLeagueLabel(league)}</Text>
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
              <Text style={styles.leagueName}>{formatLeagueLabel(row.league)}</Text>
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
        <Text style={styles.mutedSmall}>Standings data not available yet for any competition.</Text>
      )}

      <View style={styles.auditFooter}>
        <Text style={styles.auditFooterTitle}>Independent review</Text>
        <Text style={styles.auditFooterBody}>
          Machine-readable bundle: GET /api/v1/stats/public-audit
          {audit?.contact ? ` · ${audit.contact}` : ' · accuracy@octobetiq.com'}
        </Text>
        <Text
          style={styles.auditLink}
          onPress={() => Linking.openURL(PUBLIC_SCORECARD_URL).catch(() => {})}
          accessibilityRole="link"
        >
          Open web scorecard
        </Text>
      </View>

      <PredictionDisclaimer compact style={styles.disclaimer} />
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
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 21,
  },
  freshnessLine: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  warmingCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  warmingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  warmingBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
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
  trainedAt: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  cardSecondaryBlock: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.borderSubtle,
  },
  windowHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
  auditFooter: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundElevated,
  },
  auditFooterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  auditFooterBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  auditLink: {
    fontSize: 14,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
