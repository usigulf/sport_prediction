import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchExplanation } from '../store/slices/gamesSlice';
import { theme } from '../constants/theme';
import { isSoccerLeague } from '../constants/leagues';
import { impliedDrawForSoccer, normalizeThreeWay } from '../utils/predictionDisplay';
import type {
  H2HMeetingDetail,
  MetricComparisonRow,
  ProbabilityTrendPoint,
  PlayerSpotlightDetail,
  StandingsRowDetail,
} from '../types';

interface ExplanationViewProps {
  gameId: string;
  predictionId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  /** ISO timestamp of the prediction row driving this analysis */
  analysisAsOf?: string;
  /** Bumps when live WS reports a prediction refresh — refetches explanation for up-to-date tables. */
  analysisRefreshToken?: string | null;
  /** Game league id — soccer competitions get an explicit 1X2 block when probs are set. */
  league?: string;
  homeWinProbability?: number;
  awayWinProbability?: number;
}

/** Backend returns these three when no ML artifact dir is configured — not real SHAP factors. */
function isStubTopFeatures(
  features: { feature: string }[] | undefined
): boolean {
  if (!features?.length || features.length !== 3) return false;
  const names = new Set(features.map((f) => f.feature));
  return (
    names.has('Home win probability') &&
    names.has('Away win probability') &&
    names.has('Confidence')
  );
}

function stripDevConfidenceCopy(text: string): string | null {
  const cut = text.indexOf('Set EXPLANATION_MODEL_DIR');
  const t = (cut >= 0 ? text.slice(0, cut) : text).trim();
  return t.length > 0 ? t : null;
}

function AnalysisSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.analysisHeading}>{title}</Text>
      {children}
    </View>
  );
}

/** Renders API text with newline breaks and • bullet lines (matches backend rich_analysis). */
function RichFormattedBody({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) {
          return <View key={`e-${i}`} style={styles.paragraphSpacer} />;
        }
        if (t.startsWith('•')) {
          return (
            <View key={`b-${i}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{t.replace(/^•\s*/, '')}</Text>
            </View>
          );
        }
        return (
          <Text key={`p-${i}`} style={styles.richBody}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

function RichBodyIfPresent({ text }: { text?: string | null }) {
  const t = text?.trim();
  if (!t) return null;
  return <RichFormattedBody text={t} />;
}

function formatAsOf(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function StructuredStandingsBlock({
  leagueLabel,
  rows,
}: {
  leagueLabel?: string | null;
  rows: StandingsRowDetail[];
}) {
  if (!rows.length) return null;
  return (
    <AnalysisSection title={leagueLabel ? `Standings (${leagueLabel})` : 'Current form & standings'}>
      {rows.map((r) => (
        <View key={r.team_name} style={styles.standingsCard}>
          <Text style={styles.standingsTeam}>
            {r.team_name}
            <Text style={styles.standingsRank}> · #{r.league_rank}</Text>
          </Text>
          <Text style={styles.standingsMeta}>
            {r.played} played · {r.wins}-{r.draws}-{r.losses}
            {r.points != null ? ` · ${r.points} pts` : ''}
          </Text>
          <Text style={styles.standingsMeta}>
            GF–GA {(r.goals_for ?? 0)}–{(r.goals_against ?? 0)} ({r.goal_difference >= 0 ? '+' : ''}
            {r.goal_difference} GD)
          </Text>
        </View>
      ))}
    </AnalysisSection>
  );
}

function StructuredH2HBlock({
  meetings,
  summary,
}: {
  meetings: H2HMeetingDetail[];
  summary?: string | null;
}) {
  if (!meetings.length && !summary?.trim()) return null;
  return (
    <AnalysisSection title="Head-to-head history">
      {meetings.map((m, i) => (
        <Text key={`${m.date_iso}-${i}`} style={styles.h2hRow}>
          {m.date_iso} · {m.home_team_name} {m.home_score}–{m.away_score} {m.away_team_name}
        </Text>
      ))}
      {summary?.trim() ? <Text style={styles.h2hSummary}>{summary}</Text> : null}
    </AnalysisSection>
  );
}

function StructuredMetricsBlock({
  homeLabel,
  awayLabel,
  rows,
}: {
  homeLabel: string;
  awayLabel: string;
  rows: MetricComparisonRow[];
}) {
  if (!rows.length) return null;
  return (
    <AnalysisSection title="Advanced statistics & key metrics">
      <View style={styles.metricsHeaderRow}>
        <Text style={[styles.metricsCell, styles.metricsLabelCol]} />
        <Text style={[styles.metricsCell, styles.metricsTeamCol]}>{homeLabel}</Text>
        <Text style={[styles.metricsCell, styles.metricsTeamCol]}>{awayLabel}</Text>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.metricsRow}>
          <Text style={[styles.metricsCell, styles.metricsLabelCol]}>{row.label}</Text>
          <Text style={[styles.metricsCell, styles.metricsTeamCol]}>{row.home_display}</Text>
          <Text style={[styles.metricsCell, styles.metricsTeamCol]}>{row.away_display}</Text>
        </View>
      ))}
      {rows.some((r) => r.footnote) ? (
        <Text style={styles.metricsFootnote}>
          {rows
            .filter((r) => r.footnote)
            .map((r) => r.footnote)
            .join(' · ')}
        </Text>
      ) : null}
      <Text style={styles.metricsDisclaimer}>
        Row footnotes describe each input. Soccer uses standings and last-5 league results in the DB when
        synced.
      </Text>
    </AnalysisSection>
  );
}

function OneX2AnalysisBlock({
  homeLabel,
  awayLabel,
  home,
  away,
  draw,
}: {
  homeLabel: string;
  awayLabel: string;
  home: number;
  away: number;
  draw: number;
}) {
  return (
    <AnalysisSection title="1X2 — three-way probabilities">
      <Text style={styles.bodyLead}>
        Draw (X) is the residual mass: 1 − P(home) − P(away). Values below are renormalized to sum to 100%.
      </Text>
      <View style={styles.oneX2Grid}>
        <View style={styles.oneX2Cell}>
          <Text style={styles.oneX2Code}>1</Text>
          <Text style={styles.oneX2Team} numberOfLines={2}>
            {homeLabel}
          </Text>
          <Text style={styles.oneX2Pct}>{(home * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.oneX2Cell}>
          <Text style={styles.oneX2Code}>X</Text>
          <Text style={styles.oneX2Team}>Draw</Text>
          <Text style={styles.oneX2Pct}>{(draw * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.oneX2Cell}>
          <Text style={styles.oneX2Code}>2</Text>
          <Text style={styles.oneX2Team} numberOfLines={2}>
            {awayLabel}
          </Text>
          <Text style={styles.oneX2Pct}>{(away * 100).toFixed(1)}%</Text>
        </View>
      </View>
    </AnalysisSection>
  );
}

function StructuredRecentFormBlock({ text }: { text: string }) {
  const t = text.trim();
  if (!t) return null;
  return (
    <AnalysisSection title="Recent league form (last 5 in DB)">
      <RichFormattedBody text={t} />
    </AnalysisSection>
  );
}

function StructuredProbabilityTrendBlock({
  homeLabel,
  awayLabel,
  points,
}: {
  homeLabel: string;
  awayLabel: string;
  points: ProbabilityTrendPoint[];
}) {
  if (points.length < 2) return null;
  return (
    <AnalysisSection title="Probability trend (latest model snapshots)">
      <View style={styles.metricsHeaderRow}>
        <Text style={[styles.metricsCell, styles.trendTimeCol]}>As of</Text>
        <Text style={[styles.metricsCell, styles.metricsTeamCol]}>{homeLabel}</Text>
        <Text style={[styles.metricsCell, styles.metricsTeamCol]}>Draw</Text>
        <Text style={[styles.metricsCell, styles.metricsTeamCol]}>{awayLabel}</Text>
      </View>
      {points.map((p) => {
        const t = formatAsOf(p.timestamp_iso) ?? p.timestamp_iso.slice(11, 16);
        return (
          <View key={p.timestamp_iso} style={styles.metricsRow}>
            <Text style={[styles.metricsCell, styles.trendTimeCol]}>{t}</Text>
            <Text style={[styles.metricsCell, styles.metricsTeamCol]}>
              {(p.home_win_probability * 100).toFixed(1)}%
            </Text>
            <Text style={[styles.metricsCell, styles.metricsTeamCol]}>
              {typeof p.draw_probability === 'number' ? `${(p.draw_probability * 100).toFixed(1)}%` : '—'}
            </Text>
            <Text style={[styles.metricsCell, styles.metricsTeamCol]}>
              {(p.away_win_probability * 100).toFixed(1)}%
            </Text>
          </View>
        );
      })}
      <Text style={styles.metricsDisclaimer}>Shows up to the last 6 prediction recalculations for this game.</Text>
    </AnalysisSection>
  );
}

function StructuredPlayersBlock({
  spotlights,
}: {
  spotlights: PlayerSpotlightDetail[];
}) {
  if (!spotlights.length) return null;
  return (
    <AnalysisSection title="Key players & performer form">
      {spotlights.map((p) => (
        <View key={`${p.player_name}-${p.team_name}`} style={styles.playerCard}>
          <Text style={styles.playerTitle}>
            {p.player_name}
            {p.role ? <Text style={styles.playerRole}> · {p.role}</Text> : null}
          </Text>
          <Text style={styles.playerTeam}>{p.team_name}</Text>
          <Text style={styles.playerSummary}>{p.summary}</Text>
        </View>
      ))}
    </AnalysisSection>
  );
}

export const ExplanationView: React.FC<ExplanationViewProps> = ({
  gameId,
  predictionId,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  analysisAsOf,
  analysisRefreshToken,
  league,
  homeWinProbability,
  awayWinProbability,
}) => {
  const dispatch = useAppDispatch();
  const { explanation, loadingExplanation } = useAppSelector((state) => state.games);

  useEffect(() => {
    dispatch(fetchExplanation({ gameId, predictionId }));
  }, [gameId, predictionId, analysisRefreshToken, dispatch]);

  const narrativeSections = useMemo(() => {
    const ra = explanation?.rich_analysis;
    if (!ra) return [];
    const sa = explanation?.structured_analysis;
    const standingsRows = sa?.standings_rows ?? [];
    const h2hMeetings = sa?.h2h_meetings ?? [];
    const h2hSummary = sa?.h2h_series_summary?.trim() ?? '';
    const metricRows = sa?.metric_comparisons ?? [];
    const playerRows = sa?.player_spotlights ?? [];
    const recentFormSnap = sa?.recent_form_snapshot?.trim() ?? '';

    /** When structured UI already covers a topic, skip redundant rich_analysis prose. */
    const skipStandingsNarrative = standingsRows.length > 0;
    const skipH2hNarrative = h2hMeetings.length > 0 || Boolean(h2hSummary);
    const skipMetricsNarrative = metricRows.length > 0;
    const skipPlayersNarrative = playerRows.length > 0;
    const skipFormStandingsNarrative = Boolean(recentFormSnap);

    const defs: { title: string; text: string | null | undefined }[] = [
      { title: 'Live & match context', text: ra.real_time_analysis },
      { title: 'Current form & standings', text: ra.standings_context },
      { title: 'Form & team inputs', text: ra.form_standings },
      { title: 'Head-to-head history', text: ra.h2h_history },
      { title: 'Strength matchup', text: ra.head_to_head },
      { title: 'Performer & scoring profile', text: ra.key_players },
      { title: 'Advanced metrics', text: ra.advanced_metrics },
      { title: 'Venue, rest & tactics', text: ra.tactical },
      { title: 'Possible outcomes & scenarios', text: ra.scenario_outcomes },
    ];
    return defs.filter((d) => {
      if (!d.text?.trim()) return false;
      if (skipStandingsNarrative && (d.title === 'Current form & standings' || d.title === 'Form & team inputs')) {
        return false;
      }
      if (skipFormStandingsNarrative && d.title === 'Form & team inputs') {
        return false;
      }
      if (skipH2hNarrative && (d.title === 'Head-to-head history' || d.title === 'Strength matchup')) {
        return false;
      }
      if (skipMetricsNarrative && d.title === 'Advanced metrics') return false;
      if (skipPlayersNarrative && d.title === 'Performer & scoring profile') return false;
      return true;
    });
  }, [explanation?.rich_analysis, explanation?.structured_analysis]);

  if (loadingExplanation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Loading analysis…</Text>
      </View>
    );
  }

  if (!explanation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Analysis not available</Text>
      </View>
    );
  }

  const asOf = formatAsOf(analysisAsOf);
  const showModelDrivers =
    explanation.top_features &&
    explanation.top_features.length > 0 &&
    !isStubTopFeatures(explanation.top_features);
  const confidenceText = explanation.confidence_explanation
    ? stripDevConfidenceCopy(explanation.confidence_explanation)
    : null;

  const sa = explanation.structured_analysis;
  const standingsRows = sa?.standings_rows ?? [];
  const h2hMeetings = sa?.h2h_meetings ?? [];
  const metricRows = sa?.metric_comparisons ?? [];
  const playerRows = sa?.player_spotlights ?? [];
  const trendPoints = sa?.probability_trend ?? [];
  const recentFormSnap = sa?.recent_form_snapshot?.trim() ?? '';
  const hasStructuredDetail =
    standingsRows.length > 0 ||
    h2hMeetings.length > 0 ||
    Boolean(sa?.h2h_series_summary?.trim()) ||
    metricRows.length > 0 ||
    trendPoints.length > 1 ||
    Boolean(recentFormSnap) ||
    playerRows.length > 0;

  const showOneX2 =
    isSoccerLeague(league) &&
    typeof homeWinProbability === 'number' &&
    typeof awayWinProbability === 'number';
  const oneX2Split = showOneX2
    ? normalizeThreeWay(
        homeWinProbability,
        awayWinProbability,
        impliedDrawForSoccer(homeWinProbability, awayWinProbability)
      )
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analysis</Text>
      <Text style={styles.matchSubtitle}>
        {homeTeamName} vs {awayTeamName}
        {asOf ? ` · ${asOf}` : ''}
      </Text>

      {oneX2Split ? (
        <OneX2AnalysisBlock
          homeLabel={homeTeamName}
          awayLabel={awayTeamName}
          home={oneX2Split.home}
          away={oneX2Split.away}
          draw={oneX2Split.draw}
        />
      ) : null}

      {sa?.data_freshness_note ? (
        <Text style={styles.freshnessNote}>{sa.data_freshness_note}</Text>
      ) : null}

      {sa?.provider_context_note?.trim() ? (
        <AnalysisSection title="Live standings (Sportradar)">
          <RichFormattedBody text={sa.provider_context_note.trim()} />
        </AnalysisSection>
      ) : null}

      {hasStructuredDetail ? (
        <>
          <StructuredStandingsBlock leagueLabel={sa?.league_label} rows={standingsRows} />
          <StructuredProbabilityTrendBlock
            homeLabel={homeTeamName}
            awayLabel={awayTeamName}
            points={trendPoints}
          />
          {recentFormSnap ? <StructuredRecentFormBlock text={recentFormSnap} /> : null}
          <StructuredH2HBlock meetings={h2hMeetings} summary={sa?.h2h_series_summary} />
          <StructuredPlayersBlock spotlights={playerRows} />
          <StructuredMetricsBlock
            homeLabel={homeTeamName}
            awayLabel={awayTeamName}
            rows={metricRows}
          />
        </>
      ) : null}

      {!hasStructuredDetail && narrativeSections.length === 0 ? (
        <Text style={styles.placeholderText}>
          No written breakdown is stored for this pick yet. Pull to refresh after the next model run.
        </Text>
      ) : null}

      {narrativeSections.length === 0
        ? null
        : narrativeSections.map((s) => (
            <AnalysisSection key={s.title} title={s.title}>
              <RichBodyIfPresent text={s.text} />
            </AnalysisSection>
          ))}

      {showModelDrivers ? (
        <AnalysisSection title="What drove this pick">
          <Text style={styles.bodyLead}>Strongest model inputs for this version (not live odds).</Text>
          {explanation.top_features!.map((feature: { feature: string; shap_value: number; description?: string }, index: number) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureHeader}>
                <Text style={styles.featureName}>{feature.feature}</Text>
                <View
                  style={[
                    styles.shapBadge,
                    {
                      backgroundColor:
                        feature.shap_value > 0 ? theme.colors.accentDim : theme.colors.secondaryDim,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.shapValue,
                      {
                        color: feature.shap_value > 0 ? theme.colors.accent : theme.colors.secondary,
                      },
                    ]}
                  >
                    {feature.shap_value > 0 ? '+' : ''}
                    {(feature.shap_value * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
              {feature.description ? (
                <Text style={styles.featureDescription}>{feature.description}</Text>
              ) : null}
            </View>
          ))}
        </AnalysisSection>
      ) : null}

      {confidenceText ? (
        <AnalysisSection title="Confidence">
          <Text style={styles.explanationText}>{confidenceText}</Text>
          <Text style={styles.modelNote}>Picks are probabilistic, not guarantees.</Text>
        </AnalysisSection>
      ) : null}

      {explanation.model_version ? (
        <View style={[styles.sectionCard, styles.modelInfoCard]}>
          <Text style={styles.sectionTitle}>Model</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{explanation.model_version}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  matchSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  freshnessNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 17,
  },
  standingsCard: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  standingsTeam: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  standingsRank: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  standingsMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  h2hRow: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  h2hSummary: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  metricsHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingBottom: 6,
    marginBottom: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  metricsCell: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  metricsLabelCol: {
    flex: 1.15,
    paddingRight: 6,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricsTeamCol: {
    flex: 0.75,
    textAlign: 'center',
  },
  trendTimeCol: {
    flex: 0.9,
  },
  metricsFootnote: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  metricsDisclaimer: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  playerCard: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  playerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  playerRole: {
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  playerTeam: {
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 2,
  },
  playerSummary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 21,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  modelInfoCard: {
    marginBottom: 0,
  },
  analysisHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  richBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  paragraphSpacer: {
    height: theme.spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingRight: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: theme.colors.accent,
    width: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  bodyLead: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: theme.spacing.sm,
  },
  oneX2Grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  oneX2Cell: {
    flex: 1,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
  },
  oneX2Code: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  oneX2Team: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 28,
  },
  oneX2Pct: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  featureItem: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    paddingRight: 8,
  },
  shapBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  shapValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  explanationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  modelNote: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 0,
  },
});
