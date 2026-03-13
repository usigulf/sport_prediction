"""
Simple ML inference example
Loads trained model and makes predictions
"""
import pickle
import os
import pandas as pd
import numpy as np


class SimplePredictor:
    def __init__(self, model_path=None, feature_path=None):
        """Initialize predictor with trained model"""
        if model_path is None:
            model_dir = os.path.join(os.path.dirname(__file__), '../../models')
            model_path = os.path.join(model_dir, 'simple_model.pkl')
            feature_path = os.path.join(model_dir, 'feature_columns.pkl')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Please train the model first.")
        
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        
        with open(feature_path, 'rb') as f:
            self.feature_columns = pickle.load(f)
    
    def predict(self, features: dict) -> dict:
        """
        Predict game outcome
        
        Args:
            features: Dictionary with feature values
            
        Returns:
            Dictionary with prediction results
        """
        # Convert features to DataFrame
        feature_df = pd.DataFrame([features])
        
        # Ensure all required features are present
        for col in self.feature_columns:
            if col not in feature_df.columns:
                feature_df[col] = 0.5  # Default value
        
        # Reorder columns to match training
        feature_df = feature_df[self.feature_columns]
        
        # Make prediction
        proba = self.model.predict_proba(feature_df)[0]
        home_win_prob = proba[1]  # Probability of home team winning
        
        # Determine confidence level
        if home_win_prob >= 0.70 or home_win_prob <= 0.30:
            confidence = "high"
        elif home_win_prob >= 0.55 or home_win_prob <= 0.45:
            confidence = "medium"
        else:
            confidence = "low"
        
        return {
            "home_win_probability": float(home_win_prob),
            "away_win_probability": float(1 - home_win_prob),
            "confidence_level": confidence,
            "model_version": "simple_v1.0"
        }
    
    def predict_batch(self, features_list: list) -> list:
        """Predict multiple games at once"""
        return [self.predict(f) for f in features_list]


def example_usage():
    """Example of how to use the predictor"""
    try:
        predictor = SimplePredictor()
        
        # Example features for a game
        features = {
            'home_team_win_rate': 0.65,
            'away_team_win_rate': 0.55,
            'home_team_avg_score': 25.5,
            'away_team_avg_score': 23.2,
            'home_team_recent_form': 0.70,
            'away_team_recent_form': 0.60,
            'home_advantage': 0.08,
            'rest_days_home': 7,
            'rest_days_away': 6,
        }
        
        prediction = predictor.predict(features)
        
        print("Prediction Results:")
        print(f"  Home Win Probability: {prediction['home_win_probability']:.2%}")
        print(f"  Away Win Probability: {prediction['away_win_probability']:.2%}")
        print(f"  Confidence Level: {prediction['confidence_level']}")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please run train_simple_model.py first to train the model.")


if __name__ == "__main__":
    example_usage()
