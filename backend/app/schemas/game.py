"""
Game schemas
"""
from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import datetime
from app.schemas.prediction import PredictionResponse


class TeamResponse(BaseModel):
    id: str
    name: str
    league: str
    abbreviation: Optional[str] = None
    logo_url: Optional[str] = None

    @field_validator("id", mode="before")
    @classmethod
    def id_to_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v) if not isinstance(v, str) else v

    class Config:
        from_attributes = True


class GameResponse(BaseModel):
    id: str
    league: str
    home_team_id: str
    away_team_id: str
    home_team: Optional[TeamResponse] = None
    away_team: Optional[TeamResponse] = None
    scheduled_time: datetime
    status: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    venue: Optional[str] = None
    prediction: Optional[PredictionResponse] = None

    @field_validator("id", "home_team_id", "away_team_id", mode="before")
    @classmethod
    def uuid_to_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v) if not isinstance(v, str) else v

    class Config:
        from_attributes = True


class GameListResponse(BaseModel):
    games: list[GameResponse]
    total: int
    skip: int
    limit: int
