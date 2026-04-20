"""
Prediction schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class StandingsRowDetail(BaseModel):
    team_name: str
    league_rank: int
    played: int
    wins: int
    draws: int
    losses: int
    points: Optional[int] = None
    goals_for: Optional[int] = None
    goals_against: Optional[int] = None
    goal_difference: int


class H2HMeetingDetail(BaseModel):
    date_iso: str
    home_team_name: str
    away_team_name: str
    home_score: int
    away_score: int


class MetricComparisonRow(BaseModel):
    label: str
    home_display: str
    away_display: str
    footnote: Optional[str] = None


class ProbabilityTrendPoint(BaseModel):
    timestamp_iso: str
    home_win_probability: float
    away_win_probability: float
    draw_probability: Optional[float] = None
    confidence_level: Optional[str] = None


class PlayerSpotlightDetail(BaseModel):
    player_name: str
    team_name: str
    role: Optional[str] = None
    summary: str


class StructuredGameAnalysis(BaseModel):
    """Tabular / card-friendly breakdown; narrative remains in rich_analysis."""

    league_label: Optional[str] = None
    standings_rows: List[StandingsRowDetail] = Field(default_factory=list)
    h2h_meetings: List[H2HMeetingDetail] = Field(default_factory=list)
    h2h_series_summary: Optional[str] = None
    metric_comparisons: List[MetricComparisonRow] = Field(default_factory=list)
    probability_trend: List[ProbabilityTrendPoint] = Field(default_factory=list)
    # Last up to 5 finished league games per team (W–D–L) before kickoff, when present in DB.
    recent_form_snapshot: Optional[str] = None
    player_spotlights: List[PlayerSpotlightDetail] = Field(default_factory=list)
    data_freshness_note: Optional[str] = None
    # Sportradar snapshot when configured: NFL and/or soccer season standings for the two teams.
    provider_context_note: Optional[str] = None


class PredictionResponse(BaseModel):
    id: str
    game_id: str
    model_version: str
    home_win_probability: float
    away_win_probability: float
    expected_home_score: Optional[float] = None
    expected_away_score: Optional[float] = None
    confidence_level: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class FeatureImportance(BaseModel):
    feature: str
    shap_value: float
    description: Optional[str] = None


class RichAnalysisSections(BaseModel):
    """Optional narrative sections from job pipeline, DB context, and generated scenarios."""

    real_time_analysis: Optional[str] = None
    form_standings: Optional[str] = None
    head_to_head: Optional[str] = None
    key_players: Optional[str] = None
    tactical: Optional[str] = None
    # Enriched at read time (H2H from games, standings from team_standings, metrics/scenarios from model inputs)
    h2h_history: Optional[str] = None
    standings_context: Optional[str] = None
    advanced_metrics: Optional[str] = None
    scenario_outcomes: Optional[str] = None


class PredictionExplanationResponse(BaseModel):
    top_features: List[FeatureImportance]
    confidence_explanation: Optional[str] = None
    model_version: str
    accuracy: Optional[float] = None
    rich_analysis: Optional[RichAnalysisSections] = None
    structured_analysis: Optional[StructuredGameAnalysis] = None