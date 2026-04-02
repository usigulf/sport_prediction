/**
 * TypeScript type definitions for the app
 */

export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'premium' | 'premium_plus';
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  league: string;
  abbreviation: string;
  logo_url?: string;
}

export interface Game {
  id: string;
  league: string;
  home_team_id: string;
  away_team_id: string;
  home_team?: Team;
  away_team?: Team;
  scheduled_time: string;
  status: 'scheduled' | 'live' | 'finished';
  home_score?: number;
  away_score?: number;
  venue?: string;
  prediction?: Prediction;
}

export interface Prediction {
  id: string;
  game_id: string;
  model_version: string;
  home_win_probability: number;
  away_win_probability: number;
  expected_home_score?: number;
  expected_away_score?: number;
  confidence_level: 'high' | 'medium' | 'low';
  created_at: string;
}

export interface RichAnalysisSections {
  real_time_analysis?: string | null;
  form_standings?: string | null;
  head_to_head?: string | null;
  key_players?: string | null;
  tactical?: string | null;
  h2h_history?: string | null;
  standings_context?: string | null;
  advanced_metrics?: string | null;
  scenario_outcomes?: string | null;
}

export interface StandingsRowDetail {
  team_name: string;
  league_rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  goal_difference: number;
}

export interface H2HMeetingDetail {
  date_iso: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
}

export interface MetricComparisonRow {
  label: string;
  home_display: string;
  away_display: string;
  footnote?: string | null;
}

export interface PlayerSpotlightDetail {
  player_name: string;
  team_name: string;
  role?: string | null;
  summary: string;
}

export interface StructuredGameAnalysis {
  league_label?: string | null;
  standings_rows: StandingsRowDetail[];
  h2h_meetings: H2HMeetingDetail[];
  h2h_series_summary?: string | null;
  metric_comparisons: MetricComparisonRow[];
  player_spotlights: PlayerSpotlightDetail[];
  data_freshness_note?: string | null;
  /** NFL: Sportradar REG standings snapshot when API key configured */
  provider_context_note?: string | null;
}

export interface PredictionExplanation {
  top_features: Array<{
    feature: string;
    shap_value: number;
    description?: string;
  }>;
  confidence_explanation?: string;
  model_version: string;
  accuracy?: number;
  rich_analysis?: RichAnalysisSections | null;
  structured_analysis?: StructuredGameAnalysis | null;
}

export interface PlayerProp {
  id: string;
  player_id: string;
  game_id: string;
  prop_type: string;
  predicted_value: number;
  confidence_level: 'high' | 'medium' | 'low';
}
