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

export interface PredictionExplanation {
  top_features: Array<{
    feature: string;
    shap_value: number;
    description?: string;
  }>;
  confidence_explanation?: string;
  model_version: string;
  accuracy?: number;
}

export interface PlayerProp {
  id: string;
  player_id: string;
  game_id: string;
  prop_type: string;
  predicted_value: number;
  confidence_level: 'high' | 'medium' | 'low';
}
