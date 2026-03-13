"""
Prediction schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


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


class PredictionExplanationResponse(BaseModel):
    top_features: List[FeatureImportance]
    confidence_explanation: Optional[str] = None
    model_version: str
    accuracy: Optional[float] = None
