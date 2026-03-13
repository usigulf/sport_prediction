"""
Simple ML model training example
This is a basic implementation to get started with ML predictions
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, brier_score_loss
import pickle
import os
from datetime import datetime

# This is a simplified example - in production, you'd use the full feature engineering pipeline


def generate_synthetic_data(n_samples=1000):
    """Generate synthetic training data for demonstration"""
    np.random.seed(42)
    
    data = {
        # Team features
        'home_team_win_rate': np.random.uniform(0.3, 0.8, n_samples),
        'away_team_win_rate': np.random.uniform(0.3, 0.8, n_samples),
        'home_team_avg_score': np.random.uniform(20, 30, n_samples),
        'away_team_avg_score': np.random.uniform(20, 30, n_samples),
        
        # Recent form
        'home_team_recent_form': np.random.uniform(0.2, 0.9, n_samples),
        'away_team_recent_form': np.random.uniform(0.2, 0.9, n_samples),
        
        # Context features
        'home_advantage': np.random.uniform(0.0, 0.15, n_samples),
        'rest_days_home': np.random.randint(3, 10, n_samples),
        'rest_days_away': np.random.randint(3, 10, n_samples),
    }
    
    # Calculate target (home team wins)
    # Simple rule: higher win rate + home advantage = more likely to win
    home_win_prob = (
        data['home_team_win_rate'] * 0.4 +
        (1 - data['away_team_win_rate']) * 0.3 +
        data['home_advantage'] * 0.2 +
        (data['home_team_recent_form'] - data['away_team_recent_form']) * 0.1
    )
    
    # Add some noise
    home_win_prob += np.random.normal(0, 0.1, n_samples)
    home_win_prob = np.clip(home_win_prob, 0, 1)
    
    # Convert to binary (home team wins = 1)
    data['home_team_wins'] = (home_win_prob > 0.5).astype(int)
    
    return pd.DataFrame(data)


def train_model():
    """Train a simple Random Forest model"""
    print("Generating synthetic training data...")
    df = generate_synthetic_data(n_samples=2000)
    
    # Prepare features and target
    feature_cols = [
        'home_team_win_rate', 'away_team_win_rate',
        'home_team_avg_score', 'away_team_avg_score',
        'home_team_recent_form', 'away_team_recent_form',
        'home_advantage', 'rest_days_home', 'rest_days_away'
    ]
    
    X = df[feature_cols]
    y = df['home_team_wins']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    
    # Train model
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    brier_score = brier_score_loss(y_test, y_pred_proba)
    
    print(f"\nModel Performance:")
    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Brier Score: {brier_score:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop Features:")
    for _, row in feature_importance.head(5).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    # Save model
    model_dir = os.path.join(os.path.dirname(__file__), '../../models')
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, 'simple_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    # Save feature columns for inference
    feature_path = os.path.join(model_dir, 'feature_columns.pkl')
    with open(feature_path, 'wb') as f:
        pickle.dump(feature_cols, f)
    
    print(f"\nModel saved to: {model_path}")
    print(f"Feature columns saved to: {feature_path}")
    
    return model, feature_cols


if __name__ == "__main__":
    print("=" * 60)
    print("Simple ML Model Training")
    print("=" * 60)
    train_model()
    print("\nTraining complete!")
