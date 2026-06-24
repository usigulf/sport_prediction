"""Market odds snapshot (M-01 spike — display only, not sportsbook integration)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ConsensusLine(BaseModel):
    home_moneyline: Optional[int] = None
    away_moneyline: Optional[int] = None
    home_implied_prob: Optional[float] = Field(None, ge=0.0, le=1.0)
    away_implied_prob: Optional[float] = Field(None, ge=0.0, le=1.0)
    spread_home: Optional[float] = None
    spread_home_price: Optional[int] = None
    total_points: Optional[float] = None
    over_price: Optional[int] = None


class ModelMarketComparison(BaseModel):
    model_home_win_prob: Optional[float] = Field(None, ge=0.0, le=1.0)
    market_home_implied_prob: Optional[float] = Field(None, ge=0.0, le=1.0)
    home_edge_pct: Optional[float] = None
    edge_label: Literal[
        "model_leans_home",
        "model_leans_away",
        "aligned",
        "unavailable",
    ] = "unavailable"


class MarketOddsResponse(BaseModel):
    available: bool
    reason: Optional[str] = None
    provider: Optional[str] = None
    sport_key: Optional[str] = None
    book_count: int = 0
    consensus: Optional[ConsensusLine] = None
    model_comparison: Optional[ModelMarketComparison] = None
    disclaimer: Optional[str] = None
    fetched_at_iso: Optional[str] = None
