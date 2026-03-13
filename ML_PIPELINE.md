# ML Pipeline Implementation Guide

## 1. ML Pipeline Architecture

### 1.1 Pipeline Overview

```
Data Collection → Feature Engineering → Model Training → Model Evaluation → 
Model Registry → Model Deployment → Inference → Monitoring → Retraining
```

### 1.2 Directory Structure

```
ml/
├── data/
│   ├── raw/              # Raw data from APIs
│   ├── processed/        # Processed features
│   └── features/        # Feature store
│
├── models/
│   ├── pre_game/        # Pre-game prediction models
│   ├── live/            # Live in-play models
│   └── player_props/    # Player prop models
│
├── training/
│   ├── train_pre_game.py
│   ├── train_live.py
│   ├── train_player_props.py
│   └── hyperparameter_tuning.py
│
├── inference/
│   ├── pre_game_inference.py
│   ├── live_inference.py
│   └── player_prop_inference.py
│
├── feature_engineering/
│   ├── team_features.py
│   ├── player_features.py
│   ├── game_context_features.py
│   └── live_features.py
│
├── explainability/
│   ├── shap_explainer.py
│   └── lime_explainer.py
│
└── monitoring/
    ├── drift_detection.py
    ├── performance_tracking.py
    └── model_comparison.py
```

## 2. Feature Engineering

### 2.1 Team Features

```python
# ml/feature_engineering/team_features.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class TeamFeatureEngineer:
    def __init__(self):
        self.historical_data = None
    
    def compute_recent_form(self, team_id: str, games_back: int = 10) -> dict:
        """Compute recent form metrics"""
        recent_games = self.get_recent_games(team_id, games_back)
        
        wins = sum(1 for g in recent_games if g['result'] == 'win')
        losses = sum(1 for g in recent_games if g['result'] == 'loss')
        win_rate = wins / len(recent_games) if recent_games else 0.5
        
        avg_margin = np.mean([
            g['score_diff'] for g in recent_games
        ]) if recent_games else 0
        
        return {
            f'recent_form_win_rate_{games_back}': win_rate,
            f'recent_form_avg_margin_{games_back}': avg_margin,
            f'recent_form_wins_{games_back}': wins,
            f'recent_form_losses_{games_back}': losses,
        }
    
    def compute_home_away_splits(self, team_id: str) -> dict:
        """Compute home vs away performance"""
        home_games = self.get_games_by_venue(team_id, venue='home')
        away_games = self.get_games_by_venue(team_id, venue='away')
        
        home_win_rate = self.calculate_win_rate(home_games)
        away_win_rate = self.calculate_win_rate(away_games)
        
        return {
            'home_win_rate': home_win_rate,
            'away_win_rate': away_win_rate,
            'home_away_differential': home_win_rate - away_win_rate,
        }
    
    def compute_rest_days(self, team_id: str, game_date: datetime) -> int:
        """Calculate days since last game"""
        last_game = self.get_last_game(team_id, before_date=game_date)
        if last_game:
            return (game_date - last_game['date']).days
        return 7  # Default to 7 if no previous game
    
    def compute_strength_of_schedule(self, team_id: str, games_back: int = 10) -> float:
        """Compute opponent-adjusted strength of schedule"""
        recent_games = self.get_recent_games(team_id, games_back)
        opponent_win_rates = []
        
        for game in recent_games:
            opponent_id = game['opponent_id']
            opponent_win_rate = self.get_season_win_rate(opponent_id)
            opponent_win_rates.append(opponent_win_rate)
        
        return np.mean(opponent_win_rates) if opponent_win_rates else 0.5
    
    def compute_injury_impact(self, team_id: str, game_date: datetime) -> float:
        """Calculate impact of injuries on team performance"""
        injuries = self.get_active_injuries(team_id, game_date)
        
        if not injuries:
            return 0.0
        
        total_impact = 0.0
        for injury in injuries:
            player_importance = self.get_player_importance(
                injury['player_id'],
                injury['position']
            )
            injury_severity = self.get_injury_severity(injury['injury_type'])
            total_impact += player_importance * injury_severity
        
        return min(total_impact, 1.0)  # Cap at 1.0
```

### 2.2 Player Features

```python
# ml/feature_engineering/player_features.py
class PlayerFeatureEngineer:
    def compute_recent_performance(
        self,
        player_id: str,
        games_back: int = 10
    ) -> dict:
        """Compute player's recent performance metrics"""
        recent_games = self.get_player_recent_games(player_id, games_back)
        
        if not recent_games:
            return self.get_default_player_features()
        
        stats = {
            'avg_points': np.mean([g['points'] for g in recent_games]),
            'avg_rebounds': np.mean([g['rebounds'] for g in recent_games]),
            'avg_assists': np.mean([g['assists'] for g in recent_games]),
            'usage_rate': np.mean([g['usage_rate'] for g in recent_games]),
            'efficiency': np.mean([g['efficiency'] for g in recent_games]),
        }
        
        # Trend (improving/declining)
        if len(recent_games) >= 5:
            recent_5 = recent_games[:5]
            previous_5 = recent_games[5:10] if len(recent_games) >= 10 else []
            
            if previous_5:
                recent_avg = np.mean([g['points'] for g in recent_5])
                previous_avg = np.mean([g['points'] for g in previous_5])
                stats['trend'] = recent_avg - previous_avg
            else:
                stats['trend'] = 0
        else:
            stats['trend'] = 0
        
        return stats
    
    def compute_matchup_history(
        self,
        player_id: str,
        opponent_team_id: str
    ) -> dict:
        """Compute player's historical performance vs opponent"""
        matchup_games = self.get_matchup_games(player_id, opponent_team_id)
        
        if not matchup_games:
            return {'matchup_avg_points': None, 'matchup_games': 0}
        
        return {
            'matchup_avg_points': np.mean([g['points'] for g in matchup_games]),
            'matchup_avg_rebounds': np.mean([g['rebounds'] for g in matchup_games]),
            'matchup_games': len(matchup_games),
        }
```

### 2.3 Game Context Features

```python
# ml/feature_engineering/game_context_features.py
class GameContextFeatureEngineer:
    def compute_weather_features(self, venue: str, game_date: datetime) -> dict:
        """Compute weather-related features for outdoor sports"""
        weather_data = self.get_weather_data(venue, game_date)
        
        return {
            'temperature': weather_data.get('temp', 70),
            'wind_speed': weather_data.get('wind_speed', 0),
            'precipitation': weather_data.get('precip', 0),
            'humidity': weather_data.get('humidity', 50),
        }
    
    def compute_travel_impact(
        self,
        team_id: str,
        venue: str,
        game_date: datetime
    ) -> dict:
        """Compute travel and time zone impact"""
        team_location = self.get_team_location(team_id)
        venue_location = self.get_venue_location(venue)
        
        time_zone_diff = venue_location['timezone'] - team_location['timezone']
        distance = self.calculate_distance(
            team_location['coordinates'],
            venue_location['coordinates']
        )
        
        return {
            'timezone_difference': time_zone_diff,
            'travel_distance': distance,
            'days_since_travel': self.get_days_since_travel(team_id, game_date),
        }
    
    def compute_stakes_level(self, game: dict) -> float:
        """Compute game importance (regular season vs playoff)"""
        if game['is_playoff']:
            return 1.0
        elif game['is_rivalry']:
            return 0.7
        else:
            return 0.5
```

## 3. Model Training

### 3.1 Pre-Game Model Training

```python
# ml/training/train_pre_game.py
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
import mlflow
import mlflow.sklearn
import pandas as pd
import numpy as np

class PreGameModelTrainer:
    def __init__(self):
        self.feature_engineer = TeamFeatureEngineer()
        self.models = {}
    
    def prepare_training_data(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> tuple:
        """Prepare features and labels for training"""
        games = self.load_historical_games(start_date, end_date)
        
        features_list = []
        labels = []
        
        for game in games:
            # Compute features
            features = self.compute_game_features(game)
            features_list.append(features)
            
            # Label: 1 if home team wins, 0 if away team wins
            label = 1 if game['home_score'] > game['away_score'] else 0
            labels.append(label)
        
        X = pd.DataFrame(features_list)
        y = np.array(labels)
        
        return X, y
    
    def train_xgboost_model(self, X: pd.DataFrame, y: np.array) -> xgb.XGBClassifier:
        """Train XGBoost model"""
        # Time-series cross-validation (no data leakage)
        tscv = TimeSeriesSplit(n_splits=5)
        
        best_params = None
        best_score = float('inf')
        
        # Hyperparameter grid
        param_grid = {
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.1, 0.2],
            'n_estimators': [100, 200, 300],
            'subsample': [0.8, 0.9, 1.0],
        }
        
        for params in self.param_combinations(param_grid):
            scores = []
            
            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y[train_idx], y[val_idx]
                
                model = xgb.XGBClassifier(**params, random_state=42)
                model.fit(X_train, y_train)
                
                y_pred_proba = model.predict_proba(X_val)[:, 1]
                score = brier_score_loss(y_val, y_pred_proba)
                scores.append(score)
            
            avg_score = np.mean(scores)
            if avg_score < best_score:
                best_score = avg_score
                best_params = params
        
        # Train final model on all data
        final_model = xgb.XGBClassifier(**best_params, random_state=42)
        final_model.fit(X, y)
        
        return final_model
    
    def train_neural_network(self, X: pd.DataFrame, y: np.array):
        """Train neural network model"""
        from tensorflow import keras
        from tensorflow.keras import layers
        
        # Normalize features
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        model = keras.Sequential([
            layers.Dense(256, activation='relu', input_shape=(X.shape[1],)),
            layers.Dropout(0.3),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        # Train with validation split
        history = model.fit(
            X_scaled, y,
            epochs=50,
            batch_size=32,
            validation_split=0.2,
            verbose=1
        )
        
        return model, scaler
    
    def train_ensemble(self, X: pd.DataFrame, y: np.array):
        """Train ensemble of models"""
        # Train individual models
        xgb_model = self.train_xgboost_model(X, y)
        nn_model, scaler = self.train_neural_network(X, y)
        
        # Simple logistic regression baseline
        from sklearn.linear_model import LogisticRegression
        lr_model = LogisticRegression(max_iter=1000)
        lr_model.fit(X, y)
        
        # Ensemble weights (tuned via validation)
        weights = {
            'xgb': 0.7,
            'nn': 0.3,
            'lr': 0.1
        }
        
        # Normalize weights
        total = sum(weights.values())
        weights = {k: v/total for k, v in weights.items()}
        
        ensemble = {
            'xgb': xgb_model,
            'nn': (nn_model, scaler),
            'lr': lr_model,
            'weights': weights
        }
        
        return ensemble
    
    def log_model_to_mlflow(self, model, X_test, y_test, model_name: str):
        """Log model to MLflow registry"""
        with mlflow.start_run():
            # Evaluate model
            predictions = self.predict(model, X_test)
            predictions_proba = self.predict_proba(model, X_test)
            
            metrics = {
                'accuracy': accuracy_score(y_test, predictions),
                'brier_score': brier_score_loss(y_test, predictions_proba),
                'log_loss': log_loss(y_test, predictions_proba),
                'roc_auc': roc_auc_score(y_test, predictions_proba),
            }
            
            mlflow.log_metrics(metrics)
            mlflow.log_params(model.get_params() if hasattr(model, 'get_params') else {})
            
            # Log model
            mlflow.sklearn.log_model(model, model_name)
            
            # Register model
            mlflow.register_model(
                f"runs:/{mlflow.active_run().info.run_id}/{model_name}",
                f"{model_name}_production"
            )
```

### 3.2 Live In-Play Model Training

```python
# ml/training/train_live.py
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np

class LiveModelTrainer:
    def prepare_sequence_data(self, games: list) -> tuple:
        """Prepare sequential data for LSTM"""
        sequences = []
        labels = []
        
        for game in games:
            # Get play-by-play events
            events = self.get_play_by_play(game['id'])
            
            # Create sequences of game states
            for i in range(10, len(events)):  # Minimum 10 events before prediction
                sequence = events[i-10:i]  # Last 10 events
                next_event = events[i]
                
                # Features: score, time remaining, momentum, etc.
                seq_features = [self.extract_event_features(e) for e in sequence]
                sequences.append(seq_features)
                
                # Label: final outcome (home win = 1, away win = 0)
                label = 1 if game['home_score'] > game['away_score'] else 0
                labels.append(label)
        
        return np.array(sequences), np.array(labels)
    
    def train_lstm_model(self, sequences: np.array, labels: np.array):
        """Train LSTM model for live predictions"""
        model = keras.Sequential([
            layers.LSTM(128, return_sequences=True, input_shape=(sequences.shape[1], sequences.shape[2])),
            layers.Dropout(0.3),
            layers.LSTM(64, return_sequences=False),
            layers.Dropout(0.3),
            layers.Dense(32, activation='relu'),
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        model.fit(
            sequences, labels,
            epochs=30,
            batch_size=32,
            validation_split=0.2
        )
        
        return model
```

## 4. Model Inference

### 4.1 Pre-Game Inference

```python
# ml/inference/pre_game_inference.py
import mlflow
import pandas as pd
import numpy as np

class PreGameInference:
    def __init__(self, model_version: str = "latest"):
        self.model_version = model_version
        self.ensemble = self.load_ensemble_model()
        self.feature_engineer = TeamFeatureEngineer()
    
    def load_ensemble_model(self):
        """Load ensemble model from MLflow"""
        model_uri = f"models:/pre_game_ensemble/{self.model_version}"
        ensemble = mlflow.sklearn.load_model(model_uri)
        return ensemble
    
    def predict(self, game: dict) -> dict:
        """Generate prediction for a game"""
        # Compute features
        features = self.compute_game_features(game)
        X = pd.DataFrame([features])
        
        # Get predictions from each model
        xgb_pred = self.ensemble['xgb'].predict_proba(X)[0][1]
        
        nn_model, scaler = self.ensemble['nn']
        X_scaled = scaler.transform(X)
        nn_pred = nn_model.predict(X_scaled)[0][0]
        
        lr_pred = self.ensemble['lr'].predict_proba(X)[0][1]
        
        # Weighted ensemble
        weights = self.ensemble['weights']
        final_pred = (
            weights['xgb'] * xgb_pred +
            weights['nn'] * nn_pred +
            weights['lr'] * lr_pred
        )
        
        # Determine confidence level
        confidence = self.determine_confidence(final_pred)
        
        return {
            'home_win_probability': float(final_pred),
            'away_win_probability': float(1 - final_pred),
            'confidence_level': confidence,
            'model_version': self.model_version,
        }
    
    def determine_confidence(self, probability: float) -> str:
        """Determine confidence level based on probability"""
        if probability >= 0.70 or probability <= 0.30:
            return "high"
        elif probability >= 0.55 or probability <= 0.45:
            return "medium"
        else:
            return "low"
```

### 4.2 Live Inference

```python
# ml/inference/live_inference.py
class LiveInference:
    def __init__(self):
        self.lstm_model = self.load_lstm_model()
        self.xgb_model = self.load_xgb_model()
    
    def predict(
        self,
        game_id: str,
        current_state: dict
    ) -> dict:
        """Generate live prediction"""
        # Get recent events
        recent_events = self.get_recent_events(game_id, n=10)
        
        # LSTM prediction (sequential)
        sequence = np.array([self.extract_event_features(e) for e in recent_events])
        lstm_pred = self.lstm_model.predict(sequence.reshape(1, *sequence.shape))[0][0]
        
        # XGBoost prediction (current state features)
        state_features = self.extract_state_features(current_state)
        xgb_pred = self.xgb_model.predict_proba([state_features])[0][1]
        
        # Ensemble (weighted)
        final_pred = 0.6 * lstm_pred + 0.4 * xgb_pred
        
        return {
            'home_win_probability': float(final_pred),
            'away_win_probability': float(1 - final_pred),
            'timestamp': datetime.now().isoformat(),
        }
```

## 5. Explainability

### 5.1 SHAP Explanations

```python
# ml/explainability/shap_explainer.py
import shap
import pandas as pd

class SHAPExplainer:
    def __init__(self, model, feature_names: list):
        self.model = model
        self.feature_names = feature_names
        self.explainer = shap.TreeExplainer(model) if hasattr(model, 'tree_') else shap.KernelExplainer(model.predict_proba, background_data)
    
    def explain_prediction(self, X: pd.DataFrame) -> dict:
        """Generate SHAP explanation for a prediction"""
        shap_values = self.explainer.shap_values(X)
        
        # Get feature importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_names,
            'shap_value': shap_values[0] if isinstance(shap_values, list) else shap_values,
        }).sort_values('shap_value', key=abs, ascending=False)
        
        # Top 5 features
        top_features = feature_importance.head(5).to_dict('records')
        
        return {
            'top_features': top_features,
            'shap_values': shap_values.tolist() if isinstance(shap_values, np.ndarray) else shap_values,
        }
```

## 6. Model Monitoring & Retraining

### 6.1 Drift Detection

```python
# ml/monitoring/drift_detection.py
from scipy import stats
import numpy as np

class DriftDetector:
    def detect_feature_drift(
        self,
        training_features: pd.DataFrame,
        production_features: pd.DataFrame
    ) -> dict:
        """Detect feature distribution drift"""
        drift_results = {}
        
        for feature in training_features.columns:
            train_dist = training_features[feature]
            prod_dist = production_features[feature]
            
            # Kolmogorov-Smirnov test
            ks_statistic, p_value = stats.ks_2samp(train_dist, prod_dist)
            
            # Population Stability Index
            psi = self.calculate_psi(train_dist, prod_dist)
            
            drift_results[feature] = {
                'ks_statistic': ks_statistic,
                'p_value': p_value,
                'psi': psi,
                'drifted': psi > 0.25 or p_value < 0.05
            }
        
        return drift_results
    
    def calculate_psi(self, expected: np.array, actual: np.array) -> float:
        """Calculate Population Stability Index"""
        # Bin the distributions
        bins = np.linspace(
            min(min(expected), min(actual)),
            max(max(expected), max(actual)),
            11
        )
        
        expected_percents = np.histogram(expected, bins=bins)[0] / len(expected)
        actual_percents = np.histogram(actual, bins=bins)[0] / len(actual)
        
        # Avoid division by zero
        expected_percents = np.where(expected_percents == 0, 0.0001, expected_percents)
        actual_percents = np.where(actual_percents == 0, 0.0001, actual_percents)
        
        psi = np.sum((actual_percents - expected_percents) * 
                     np.log(actual_percents / expected_percents))
        
        return psi
```

### 6.2 Performance Tracking

```python
# ml/monitoring/performance_tracking.py
class PerformanceTracker:
    def track_prediction_accuracy(self, predictions: list, outcomes: list) -> dict:
        """Track prediction accuracy over time"""
        correct = sum(1 for p, o in zip(predictions, outcomes) 
                     if (p > 0.5 and o == 1) or (p <= 0.5 and o == 0))
        
        accuracy = correct / len(predictions) if predictions else 0
        
        # Brier score
        brier_scores = [(p - o)**2 for p, o in zip(predictions, outcomes)]
        avg_brier = np.mean(brier_scores)
        
        return {
            'accuracy': accuracy,
            'brier_score': avg_brier,
            'total_predictions': len(predictions),
            'correct_predictions': correct,
        }
    
    def check_retraining_needed(self, recent_performance: dict) -> bool:
        """Determine if model needs retraining"""
        # Retrain if accuracy drops below threshold
        if recent_performance['accuracy'] < 0.60:
            return True
        
        # Retrain if Brier score increases significantly
        if recent_performance['brier_score'] > 0.25:
            return True
        
        return False
```

## 7. Training Pipeline (Airflow/Dagster)

```python
# ml/pipelines/training_pipeline.py
from dagster import job, op, schedule

@op
def extract_data(context):
    """Extract historical game data"""
    # Load data from database
    return load_historical_games()

@op
def engineer_features(context, data):
    """Engineer features"""
    feature_engineer = TeamFeatureEngineer()
    return feature_engineer.compute_all_features(data)

@op
def train_models(context, features):
    """Train models"""
    trainer = PreGameModelTrainer()
    model = trainer.train_ensemble(features['X'], features['y'])
    return model

@op
def evaluate_model(context, model, test_data):
    """Evaluate model"""
    metrics = evaluate_model_performance(model, test_data)
    return metrics

@op
def register_model(context, model, metrics):
    """Register model if metrics are good"""
    if metrics['accuracy'] > 0.65:
        mlflow.register_model(model, "pre_game_ensemble")
        return True
    return False

@job
def training_job():
    data = extract_data()
    features = engineer_features(data)
    model = train_models(features)
    metrics = evaluate_model(model, features['test'])
    register_model(model, metrics)

@schedule(cron_schedule="0 2 * * *", job=training_job)
def daily_training_schedule(context):
    """Run training daily at 2 AM"""
    return {}
```

## 8. Model Serving (TensorFlow Serving)

```python
# ml/serving/model_server.py
from tensorflow import keras
import tensorflow as tf

# Convert models to TensorFlow SavedModel format
def export_model_for_serving(model, model_path: str):
    """Export model in SavedModel format for TensorFlow Serving"""
    model.save(model_path, save_format='tf')

# Model config for TensorFlow Serving
model_config = {
    "model_config_list": [
        {
            "name": "sports_prediction",
            "base_path": "/models/sports_prediction",
            "model_platform": "tensorflow"
        }
    ]
}

# Start TensorFlow Serving
# docker run -p 8501:8501 \
#   --mount type=bind,source=/path/to/models,target=/models \
#   -e MODEL_NAME=sports_prediction \
#   tensorflow/serving:latest
```
