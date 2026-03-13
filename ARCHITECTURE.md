# SportOracle: AI-Powered Sports Prediction Platform
## Complete Technical Architecture & Design Document

> **Document role:** This doc is a **technical reference** (data pipelines, ML, backend detail, tier matrix). For **product vision, legal positioning, and roadmap**, the canonical source is **[ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md)** (information-only, no gambling; 2026 baseline: multi-sport, gamification, refined freemium). See **[ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md)** for a side-by-side comparison.

---

## Table of Contents
1. [Product Vision & User Personas](#1-product-vision--user-personas)
2. [Core Features & Differentiation](#2-core-features--differentiation)
3. [AI/ML Architecture](#3-aiml-architecture)
4. [Backend System Architecture](#4-backend-system-architecture)
5. [Mobile App Architecture](#5-mobile-app-architecture)
6. [Security, Compliance & Ethics](#6-security-compliance--ethics)
7. [Monetization Strategy](#7-monetization-strategy)
8. [Metrics & Analytics](#8-metrics--analytics)
9. [12-Month Technical Roadmap](#9-12-month-technical-roadmap)

---

## 1. Product Vision & User Personas

### 1.1 Product Vision

**Mission**: Democratize sports analytics by providing AI-driven predictions with full transparency across multiple sports, empowering fans to make informed decisions and deepen their engagement—with **no betting integration** (information-only).

**Core Principles**:
- We don't sell "sure things." We sell *insight*, *probability distributions*, and *explainable reasoning*. Users understand WHY a prediction is made, not just WHAT it is.
- **Multi-sport from launch**: 8+ sports (NFL, NBA, MLB, NHL, Premier League, MLS/Champions League, College Football/Basketball, Tennis, Esports, UFC/MMA) with unified dashboard and Today's Top Picks.
- **Engagement**: Social prediction community, leaderboards, shareable picks, and gamified accuracy challenges to drive retention (target >35% DAU/MAU).

### 1.2 User Personas

#### Persona 1: "Data-Driven Dan" - The Analytical Bettor
```
Demographics: Male, 28-45, tech-savvy, income $60K-150K
Behavior:
  - Places 5-15 bets per week
  - Spends 2+ hours researching before betting
  - Uses spreadsheets to track performance
  - Frustrated by "gut feel" tipsters
Pain Points:
  - Lacks time to aggregate data from multiple sources
  - Can't build ML models himself
  - Distrusts black-box predictions
Willingness to Pay: $29-79/month for quality insights
Key Features Needed:
  - Detailed model explanations
  - Historical accuracy tracking
  - Custom filters and alerts
  - API access for personal tools
```

#### Persona 2: "Casual Casey" - The Entertainment Bettor
```
Demographics: Male/Female, 21-35, moderate tech literacy
Behavior:
  - Bets on weekends, primarily major events
  - Social aspect matters (shares picks with friends)
  - Budget-conscious ($20-100/week betting budget)
Pain Points:
  - Overwhelmed by statistics
  - Wants simple, actionable guidance
  - Worried about "getting scammed"
Willingness to Pay: Free tier or $9.99/month
Key Features Needed:
  - Simple confidence scores (1-5 stars)
  - Push notifications for high-value picks
  - Social sharing
  - Gamification elements
```

#### Persona 3: "Fantasy Frank" - The DFS/Fantasy Player
```
Demographics: Male, 25-40, highly engaged sports fan
Behavior:
  - Plays daily fantasy on DraftKings/FanDuel
  - Needs player-level projections, not game outcomes
  - Optimizes lineups algorithmically
Pain Points:
  - Existing projections are stale
  - Needs injury/lineup news integrated
  - Correlation analysis is manual
Willingness to Pay: $49-149/month during season
Key Features Needed:
  - Player prop predictions
  - Lineup optimization integration
  - Ownership projections
  - Correlation matrices
```

#### Persona 4: "Professional Pete" - The Sharp/Syndicate
```
Demographics: Professional bettor or betting syndicate (uses external platforms; we provide information only)
Behavior:
  - High volume, needs edge detection
  - Interested in line movement and CLV
  - May want white-label or API access
Pain Points:
  - Most retail products too slow/inaccurate
  - Needs raw probability outputs, not picks
  - Latency matters for live betting
Willingness to Pay: $500-5000/month or revenue share (B2B/API)
Key Features Needed:
  - Raw model outputs (not just picks)
  - Sub-second API latency
  - Historical odds data (read-only comparison)
  - Custom model training
```

#### Persona 5: "Multi-Sport Fan" (2026 baseline)
```
Demographics: 22-45, seasonal switcher across 3+ sports (NFL → NBA → MLB → Soccer)
Behavior:
  - One app for all sports; dislikes fragmented apps
  - Wants cross-sport "Today's Top Picks" and personalized feed
  - Engages with leaderboards and shareable picks
Pain Points:
  - Too many taps to switch sports; no unified home
Willingness to Pay: Free or Premium $9.99/month
Key Features Needed:
  - Sport selector carousel/tabs on home, cross-sport feed
  - Per-sport filters, daily digest across favorites
  - Leaderboards and challenges across sports
```

---

## 2. Core Features & Differentiation

### 2.1 Feature Matrix (2026 baseline – aligned with ARCHITECTURE_DESIGN.md)

| Feature | Free | Premium ($9.99/mo) | API / B2B |
|---------|------|---------------------|-----------|
| Sports (limit) | 3–5 sport limit | Unlimited (8+ sports) | All |
| Pre-game win probability | ✓ (selected sports) | ✓ All | ✓ |
| Prediction explanations | Watermarked / top 3 only | Full, exportable | Programmatic |
| Live in-play | Basic live score only | Full live + momentum | Full |
| Player props | 1–2 teaser/day | Full | All |
| Push notifications | Limited | Granular (per-sport/team) + "Trending Pick" | Webhooks |
| Ads | Non-intrusive | None | N/A |
| Prediction history | Limited | Exportable | Full |
| Leaderboards & challenges | View only / limited | Full access | N/A |
| Shareable picks (graphic) | ✓ | ✓ | N/A |
| 7-day free trial | - | ✓ | - |
| API access | - | - | ✓ |

*Differentiation: Social prediction community + gamified accuracy challenges (leaderboards, shareable picks, user challenges).*

### 2.2 Differentiating Features (What Competitors Don't Have)

#### Feature 1: "Prediction Autopsy" - Full Explainability
```
Most apps: "Lakers -3.5: 67% confident"
SportOracle:
  "Lakers -3.5: 67% confident

  TOP FACTORS (SHAP values):
  ├── Lakers home court advantage: +8.2%
  ├── AD probable return from injury: +6.1%
  ├── Celtics on 2nd night of B2B: +5.4%
  ├── Lakers poor 3PT% last 10 games: -4.8%
  ├── Celtics ATS record vs West: -2.1%
  └── [12 more factors...]

  HISTORICAL CONTEXT:
  - Model accuracy on similar spots: 61% (n=234)
  - When Lakers favored 3-5 at home: 58% (n=89)

  UNCERTAINTY ANALYSIS:
  - 95% confidence interval: 52% - 79%
  - Key swing factor: If AD sits, drops to 54%"
```

This is built on SHAP (SHapley Additive exPlanations) values from our gradient boosting models, translated into natural language.

#### Feature 2: "Scenario Engine" - Interactive What-If Analysis
```
User can toggle conditions:
  [x] Anthony Davis plays
  [ ] LeBron rests
  [x] Include last 30 days only
  [ ] Weight recent games higher

  → Real-time probability recalculation
  → Shows which inputs matter most
```

This requires sub-100ms model inference and pre-computed partial dependence plots.

#### Feature 3: "Sharp Movement Detector"
```
Detects when:
  - Line moves against public betting %
  - Reverse line movement patterns
  - Steam moves across books

Alerts users: "Sharp money detected on Celtics +3.5
  - Line opened: Lakers -4.5
  - Now: Lakers -3.5
  - Public: 72% on Lakers
  - This pattern historically: 56% on closing line"
```

Requires real-time odds feeds from multiple books and pattern recognition.

#### Feature 4: "Confidence Calibration Dashboard"
```
Shows users our model's historical calibration:
  "When we say 60% confident:
   - Actual win rate: 59.2% (n=1,247)
   - 95% CI: [56.4%, 62.0%]

   When we say 70% confident:
   - Actual win rate: 68.7% (n=412)
   - 95% CI: [64.1%, 73.3%]"
```

This builds trust and sets realistic expectations.

#### Feature 5: "Live Momentum Score" - In-Play Intelligence
```
During games, real-time updates:
  "Current win probability: 62% → 58%

   MOMENTUM SHIFT: Celtics (+4% last 3 min)
   ├── Tatum: 8 pts in last 4 possessions
   ├── Lakers: 2 turnovers
   └── Foul trouble: AD 4 fouls

   LIVE SPREAD EDGE:
   Current line: Lakers -1.5 (was -3.5)
   Model fair line: Lakers +0.5
   Edge: 2.0 points on Celtics"
```

#### Feature 6: Community & Gamification (2026)
- **Leaderboards**: Weekly/monthly accuracy by sport; streaks and badges (e.g. "Prop Master", "Hot Streak 7 Days").
- **Pick Challenges**: User vs. AI, friend challenges, private groups.
- **Shareable Picks**: One-tap export to X/Instagram with generated graphic (confidence %, reasoning, logos).
- **User-Generated Tips**: Top-accuracy users can submit picks; verified track record for visibility.
- **Live Hub**: Dedicated tab for ongoing games across sports with momentum graphs and alerts.

---

## 3. AI/ML Architecture

### 3.1 Data Sources

#### Primary Data Sources

| Source | Data Type | Update Frequency | Ingestion Method |
|--------|-----------|------------------|------------------|
| Sportradar | Official stats, play-by-play (multi-sport) | Real-time | Push API |
| Stats Perform | Advanced metrics, tracking | Daily + live | Pull API |
| The Odds API | Lines from 40+ books (read-only comparison) | 30-second polls | REST API |
| Weather.gov | Weather conditions | Hourly | REST API |
| Twitter/X API | Injury news, sentiment | Real-time | Streaming |
| ESPN/Yahoo | Injury reports, lineups | 15-minute polls | Scraping |
| Rotowire | Injury analysis, projections | Hourly | Partnership |
| Team websites | Official injury reports | Event-driven | Scraping |
| **Esports feeds** (Panda Score, Esports One, etc.) | LoL, CS2 majors | Event + live | REST/WebSocket |

#### Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Sportradar│  │Stats Perf│  │ Odds API │  │ Twitter  │           │
│  │  (Push)  │  │  (Pull)  │  │  (Poll)  │  │(Stream)  │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │             │                  │
│       ▼             ▼             ▼             ▼                  │
│  ┌─────────────────────────────────────────────────────┐          │
│  │              Apache Kafka (Event Streaming)          │          │
│  │  Topics: raw.sportradar, raw.odds, raw.social, ...  │          │
│  └─────────────────────────────────────────────────────┘          │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA PROCESSING LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────┐          │
│  │            Apache Flink (Stream Processing)          │          │
│  │  - Data validation & cleaning                       │          │
│  │  - Entity resolution (player/team matching)         │          │
│  │  - Feature computation (rolling averages, etc.)     │          │
│  │  - Anomaly detection                                │          │
│  └─────────────────────────────────────────────────────┘          │
│                              │                                     │
│              ┌───────────────┴───────────────┐                    │
│              ▼                               ▼                    │
│  ┌──────────────────────┐       ┌──────────────────────┐         │
│  │  TimescaleDB (OLTP)  │       │  ClickHouse (OLAP)   │         │
│  │  - Live game state   │       │  - Historical stats  │         │
│  │  - Current odds      │       │  - Feature store     │         │
│  │  - User data         │       │  - Model training    │         │
│  └──────────────────────┘       └──────────────────────┘         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Feature Engineering

#### Feature Categories

**1. Team Performance Features (per sport)**
```python
# Example: NBA team features
team_features = {
    # Basic stats (last N games, weighted)
    "pts_per_game": rolling_weighted_mean(points, window=10, decay=0.9),
    "pts_allowed": rolling_weighted_mean(pts_against, window=10, decay=0.9),
    "net_rating": offensive_rating - defensive_rating,

    # Advanced metrics
    "effective_fg_pct": (fg + 0.5 * three_pt) / fga,
    "true_shooting": pts / (2 * (fga + 0.44 * fta)),
    "pace": possessions_per_48,
    "turnover_rate": tov / possessions,

    # Situational
    "home_court_advantage": home_win_pct - road_win_pct,
    "back_to_back_impact": performance_delta_on_b2b,
    "vs_conference": win_pct_vs_same_conf,
    "clutch_performance": net_rating_last_5_min_close_games,

    # Trend features
    "momentum_5g": win_pct_last_5 - season_win_pct,
    "scoring_trend": slope_of_pts_last_10,
    "defensive_trend": slope_of_pts_allowed_last_10,

    # Rest and travel
    "days_rest": days_since_last_game,
    "travel_miles": haversine(last_game_city, current_city),
    "timezone_changes": tz_diff_last_3_games,
}
```

**2. Player Features**
```python
player_features = {
    # Status
    "injury_status": categorical(OUT, DOUBTFUL, QUESTIONABLE, PROBABLE, HEALTHY),
    "minutes_trend": rolling_mean(minutes, 5),

    # Impact metrics
    "usage_rate": (fga + 0.44*fta + tov) / (team_possessions * minutes/48),
    "box_plus_minus": advanced_bpm_calculation(),
    "win_shares_per_48": ws / minutes * 48,
    "raptor_war": fivethirtyeight_raptor,  # If available

    # Matchup-specific
    "vs_position_performance": pts_against_position / league_avg,
    "vs_team_history": performance_vs_opponent_career,

    # Replacement impact (for injury adjustments)
    "replacement_level_impact": player_war - replacement_war,
}
```

**3. Market/Odds Features**
```python
market_features = {
    # Line movement
    "opening_line": first_available_spread,
    "current_line": latest_spread,
    "line_movement": current_line - opening_line,

    # Market consensus
    "market_implied_prob": convert_odds_to_prob(moneyline),
    "book_disagreement": std_dev_across_books(spread),

    # Public betting
    "public_betting_pct": tickets_on_favorite,
    "money_pct_vs_ticket_pct": money_pct - ticket_pct,  # Sharp indicator

    # Historical patterns
    "rlm_indicator": is_reverse_line_movement(),
    "steam_move_detected": is_steam_move(),
}
```

**4. Contextual Features**
```python
context_features = {
    # Game context
    "is_rivalry": binary_rivalry_flag,
    "is_playoffs": playoff_indicator,
    "is_elimination": is_team_eliminated_if_loss,
    "national_tv": is_nationally_televised,

    # External factors
    "weather_impact": outdoor_weather_score,  # For football, baseball
    "altitude": venue_altitude,  # Denver, Mexico City

    # Referee/umpire
    "ref_crew_home_advantage": historical_ref_home_bias,
    "ref_crew_over_tendency": historical_ref_foul_rate,

    # Scheduling
    "schedule_loss": calculate_schedule_difficulty(),
    "lookahead_spot": is_before_marquee_game(),
    "letdown_spot": is_after_big_win(),
}
```

#### Feature Store Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FEATURE STORE (Feast)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  OFFLINE STORE (ClickHouse)               │   │
│  │  - Historical feature values for training                │   │
│  │  - Point-in-time correct joins                           │   │
│  │  - Backfill capabilities                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ Materialization                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  ONLINE STORE (Redis Cluster)             │   │
│  │  - Latest feature values for inference                   │   │
│  │  - Sub-millisecond reads                                 │   │
│  │  - TTL-based expiration                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Feature Groups:                                                │
│  ├── team_performance_features (updated: hourly)                │
│  ├── player_features (updated: hourly)                          │
│  ├── odds_features (updated: real-time)                         │
│  ├── live_game_features (updated: real-time)                    │
│  └── contextual_features (updated: daily)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Model Architecture

#### Model Types by Prediction Task

**Task 1: Game Outcome (Spread/Moneyline)**
```
Primary Model: LightGBM Ensemble
├── Why: Best performance on tabular sports data
├── Features: ~150 features per game
├── Target: Point differential (continuous)
├── Training: Walk-forward validation, 3-year history
└── Output: Point spread + probability distribution

Secondary Model: Neural Network (Residual Learning)
├── Architecture: 3-layer MLP with residual connections
├── Input: LightGBM predictions + raw features
├── Purpose: Capture non-linear interactions missed by GBM
└── Ensemble Weight: 0.3 (determined by meta-learning)

Final Ensemble:
├── LightGBM Base: 0.4
├── LightGBM with Bayesian optimization: 0.3
├── Neural Network: 0.2
├── Market-informed prior: 0.1
└── Calibration: Isotonic regression on holdout
```

**Task 2: Totals (Over/Under)**
```
Model: Separate LightGBM
├── Why: Different feature importance than spread models
├── Key features: Pace, defensive rating, referee tendencies
├── Target: Total points scored
└── Note: Trained separately, not derived from spread model
```

**Task 3: Player Props**
```
Model: Hierarchical Bayesian Model + LightGBM
├── Bayesian component: Player-specific priors
├── Addresses: Low sample sizes for individual props
├── Pooling: Partial pooling across similar players
└── LightGBM: Handles matchup-specific adjustments

Example (Points prop):
  prior ~ Normal(season_avg, season_std)
  likelihood ~ Normal(matchup_adjusted, game_variance)
  posterior = bayesian_update(prior, recent_games, matchup)
```

**Task 4: Live/In-Play Predictions**
```
Model: LSTM + Attention for temporal patterns
├── Input sequence: Last N play-by-play events
├── Features per event: score, time, players, play_type
├── Attention: Weights recent events higher
├── Output: Win probability at current moment

Complementary Model: State-space model
├── Tracks: Latent "momentum" variable
├── Updates: Bayesian filtering each possession
├── Interpretable: Can explain momentum shifts
```

#### Model Training Pipeline

```python
# Pseudo-code for training pipeline

class PredictionModelPipeline:
    def __init__(self, sport: str, prediction_type: str):
        self.sport = sport
        self.prediction_type = prediction_type
        self.feature_store = FeatureStore()
        self.model_registry = MLflowRegistry()

    def prepare_training_data(self, start_date: date, end_date: date):
        """
        Walk-forward cross-validation setup
        """
        games = self.fetch_historical_games(start_date, end_date)

        # Point-in-time correct feature retrieval
        features = self.feature_store.get_historical_features(
            entity_ids=[g.game_id for g in games],
            feature_refs=self.get_feature_refs(),
            timestamp_column="game_datetime"
        )

        # Create walk-forward folds
        folds = []
        for year in range(start_date.year, end_date.year):
            train = features[features.year < year]
            val = features[features.year == year]
            folds.append((train, val))

        return folds

    def train_lgbm_model(self, folds):
        """
        Train LightGBM with Optuna hyperparameter optimization
        """
        def objective(trial):
            params = {
                'num_leaves': trial.suggest_int('num_leaves', 20, 100),
                'learning_rate': trial.suggest_float('lr', 0.01, 0.1, log=True),
                'feature_fraction': trial.suggest_float('ff', 0.5, 1.0),
                'bagging_fraction': trial.suggest_float('bf', 0.5, 1.0),
                'min_child_samples': trial.suggest_int('mcs', 10, 100),
                'lambda_l1': trial.suggest_float('l1', 1e-8, 10.0, log=True),
                'lambda_l2': trial.suggest_float('l2', 1e-8, 10.0, log=True),
            }

            cv_scores = []
            for train, val in folds:
                model = lgb.LGBMRegressor(**params)
                model.fit(
                    train[self.features], train['target'],
                    eval_set=[(val[self.features], val['target'])],
                    callbacks=[lgb.early_stopping(50)]
                )
                preds = model.predict(val[self.features])
                cv_scores.append(mean_squared_error(val['target'], preds))

            return np.mean(cv_scores)

        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=100)

        # Train final model on all data
        final_model = lgb.LGBMRegressor(**study.best_params)
        final_model.fit(all_train[self.features], all_train['target'])

        return final_model

    def calibrate_probabilities(self, model, holdout):
        """
        Ensure probability outputs are well-calibrated
        """
        raw_probs = model.predict_proba(holdout[self.features])

        # Isotonic regression for calibration
        calibrator = IsotonicRegression(out_of_bounds='clip')
        calibrator.fit(raw_probs, holdout['outcome'])

        return calibrator

    def compute_shap_values(self, model, sample):
        """
        Pre-compute SHAP values for explainability
        """
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(sample)

        return shap_values
```

### 3.4 Live/In-Play Prediction System

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVE PREDICTION SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SPORTRADAR PUSH FEED                         │   │
│  │  - Play-by-play events (100-500ms latency)               │   │
│  │  - Score updates                                          │   │
│  │  - Player stats updates                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              KAFKA STREAMING LAYER                        │   │
│  │  Topic: live.plays.{sport}                               │   │
│  │  Partitioned by: game_id                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FLINK PROCESSING                             │   │
│  │  1. Parse and validate event                             │   │
│  │  2. Update game state (score, time, possession)          │   │
│  │  3. Compute live features                                │   │
│  │  4. Invoke prediction model                              │   │
│  │  5. Publish to output topic                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MODEL SERVING (TRITON)                       │   │
│  │  - GPU inference for LSTM model                          │   │
│  │  - Batched predictions (latency vs throughput)           │   │
│  │  - Model versioning and A/B testing                      │   │
│  │  - Target: <50ms p99 latency                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OUTPUT KAFKA TOPIC                           │   │
│  │  Topic: predictions.live.{sport}                         │   │
│  │  Consumers: WebSocket server, mobile push, analytics     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  LATENCY BUDGET:                                                │
│  ├── Event reception: 100-500ms (vendor)                        │
│  ├── Kafka produce: 5ms                                         │
│  ├── Flink processing: 10ms                                     │
│  ├── Model inference: 30ms                                      │
│  ├── Kafka consume: 5ms                                         │
│  ├── WebSocket push: 10ms                                       │
│  └── TOTAL: 160-560ms end-to-end                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Model Retraining & Drift Detection

#### Retraining Schedule

| Model Type | Retraining Frequency | Trigger Conditions |
|------------|---------------------|-------------------|
| Pre-game spread | Weekly (per sport) | New week of data |
| Pre-game totals | Weekly (per sport) | New week of data |
| Player props | Daily | New game results |
| Live in-play | Monthly | Concept drift detected |

**Per-sport drift detection**: Run drift checks and alerts per sport/league; separate retraining triggers per domain (e.g. NFL vs NBA).

#### Drift Detection System

```python
class DriftDetector:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.baseline_distribution = None

    def detect_feature_drift(self, current_features: pd.DataFrame) -> Dict:
        """
        Detect distribution shift in input features
        Uses Population Stability Index (PSI)
        """
        drift_report = {}

        for feature in current_features.columns:
            psi = self.calculate_psi(
                self.baseline_distribution[feature],
                current_features[feature]
            )

            drift_report[feature] = {
                'psi': psi,
                'status': 'drift' if psi > 0.2 else 'stable'
            }

        return drift_report

    def detect_prediction_drift(self, predictions: np.array, actuals: np.array) -> Dict:
        """
        Detect concept drift via prediction performance degradation
        Uses Page-Hinkley test for change detection
        """
        errors = predictions - actuals
        cumsum = np.cumsum(errors - np.mean(errors))

        # Page-Hinkley test
        m_t = cumsum - np.min(cumsum)
        drift_detected = np.max(m_t) > self.threshold

        return {
            'drift_detected': drift_detected,
            'drift_magnitude': np.max(m_t),
            'rolling_accuracy': self.calculate_rolling_accuracy(predictions, actuals)
        }

    def calculate_psi(self, expected: pd.Series, actual: pd.Series, bins: int = 10) -> float:
        """
        Population Stability Index
        PSI > 0.2 indicates significant drift
        """
        expected_bins = pd.cut(expected, bins=bins).value_counts(normalize=True)
        actual_bins = pd.cut(actual, bins=bins).value_counts(normalize=True)

        psi = np.sum((actual_bins - expected_bins) * np.log(actual_bins / expected_bins))
        return psi
```

#### Automated Retraining Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                  MODEL RETRAINING PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │  Scheduled Cron  │ ──────────────────┐                       │
│  │  (weekly)        │                   │                       │
│  └──────────────────┘                   ▼                       │
│                              ┌──────────────────────┐           │
│  ┌──────────────────┐       │  Airflow DAG          │           │
│  │  Drift Detector  │ ─────▶│  "model_retrain"      │           │
│  │  (alert trigger) │       └──────────┬───────────┘           │
│  └──────────────────┘                  │                        │
│                                        ▼                        │
│                         ┌──────────────────────────┐           │
│                         │  1. Fetch training data  │           │
│                         │     (Feast feature store)│           │
│                         └──────────────────────────┘           │
│                                        │                        │
│                                        ▼                        │
│                         ┌──────────────────────────┐           │
│                         │  2. Train new model      │           │
│                         │     (Optuna + LightGBM)  │           │
│                         └──────────────────────────┘           │
│                                        │                        │
│                                        ▼                        │
│                         ┌──────────────────────────┐           │
│                         │  3. Validate performance │           │
│                         │     - Holdout accuracy   │           │
│                         │     - Calibration check  │           │
│                         │     - SHAP consistency   │           │
│                         └──────────────────────────┘           │
│                                        │                        │
│                           ┌────────────┴────────────┐          │
│                           ▼                         ▼          │
│                    ┌────────────┐           ┌────────────┐     │
│                    │   PASS     │           │   FAIL     │     │
│                    └─────┬──────┘           └─────┬──────┘     │
│                          │                        │             │
│                          ▼                        ▼             │
│               ┌──────────────────┐    ┌──────────────────┐     │
│               │ 4. Register in   │    │ Alert on-call    │     │
│               │    MLflow        │    │ Investigate      │     │
│               └────────┬─────────┘    └──────────────────┘     │
│                        │                                        │
│                        ▼                                        │
│               ┌──────────────────┐                             │
│               │ 5. Gradual rollout│                             │
│               │    (shadow mode)  │                             │
│               └────────┬─────────┘                             │
│                        │                                        │
│                        ▼                                        │
│               ┌──────────────────┐                             │
│               │ 6. Promote to    │                             │
│               │    production    │                             │
│               └──────────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Explainability System

#### SHAP Integration

```python
class PredictionExplainer:
    def __init__(self, model, feature_names: List[str]):
        self.model = model
        self.feature_names = feature_names
        self.explainer = shap.TreeExplainer(model)

        # Pre-compute feature descriptions for natural language
        self.feature_descriptions = {
            'pts_per_game_10': 'Points per game (last 10)',
            'home_court_advantage': 'Home court impact',
            'days_rest': 'Days of rest',
            'b2b_indicator': 'Back-to-back game',
            'injury_impact_score': 'Injury impact',
            # ... etc
        }

    def explain_prediction(self, features: pd.DataFrame) -> Dict:
        """
        Generate human-readable explanation for a prediction
        """
        shap_values = self.explainer.shap_values(features)

        # Get top contributing factors
        feature_contributions = list(zip(self.feature_names, shap_values[0]))
        sorted_contributions = sorted(feature_contributions, key=lambda x: abs(x[1]), reverse=True)

        explanation = {
            'top_factors': [],
            'base_prediction': self.explainer.expected_value,
            'final_prediction': self.explainer.expected_value + sum(shap_values[0])
        }

        for feature, contribution in sorted_contributions[:10]:
            direction = 'increases' if contribution > 0 else 'decreases'
            magnitude = abs(contribution)

            explanation['top_factors'].append({
                'feature': self.feature_descriptions.get(feature, feature),
                'value': float(features[feature].values[0]),
                'contribution': float(contribution),
                'direction': direction,
                'magnitude_pct': float(magnitude / abs(explanation['final_prediction'] - explanation['base_prediction']) * 100)
            })

        return explanation

    def generate_natural_language(self, explanation: Dict, game_context: Dict) -> str:
        """
        Convert SHAP explanation to user-friendly text
        """
        team_name = game_context['favorite_team']
        spread = game_context['spread']
        confidence = game_context['confidence_pct']

        narrative = f"Our model predicts {team_name} {spread} with {confidence:.0f}% confidence.\n\n"
        narrative += "KEY FACTORS:\n"

        for i, factor in enumerate(explanation['top_factors'][:5], 1):
            symbol = "+" if factor['direction'] == 'increases' else "-"
            narrative += f"{i}. {factor['feature']}: {symbol}{factor['magnitude_pct']:.1f}%\n"

        return narrative
```

---

## 4. Backend System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER (Cloudflare)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   WAF       │  │  DDoS       │  │   CDN       │  │ Rate Limit  │        │
│  │  Protection │  │  Protection │  │  (Static)   │  │  (API)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   API Gateway (Kong)        │     │   WebSocket Gateway         │
│   - Authentication          │     │   - Real-time updates       │
│   - Rate limiting           │     │   - Live predictions        │
│   - Request routing         │     │   - Presence management     │
│   - API versioning          │     └─────────────────────────────┘
└─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER (EKS)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    APPLICATION SERVICES                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Predictions │  │    Users     │  │  Betting     │              │   │
│  │  │   Service    │  │   Service    │  │   Service    │              │   │
│  │  │  (Rust)      │  │  (Go)        │  │  (Go)        │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Odds        │  │  Alerts      │  │  Analytics   │              │   │
│  │  │  Service     │  │  Service     │  │  Service     │              │   │
│  │  │  (Rust)      │  │  (Go)        │  │  (Python)    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ML SERVING LAYER                                  │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │   NVIDIA Triton Inference Server (GPU instances)              │  │   │
│  │  │   - Pre-game models (LightGBM via FIL backend)               │  │   │
│  │  │   - Live models (LSTM via TensorRT)                          │  │   │
│  │  │   - Model versioning and A/B testing                         │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA PROCESSING LAYER                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Apache Flink │  │ Apache Kafka │  │ Feast        │              │   │
│  │  │ (Streaming)  │  │ (Events)     │  │ (Features)   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │ TimescaleDB  │  │ ClickHouse   │  │ Redis        │   │
│  │ (Users, etc) │  │ (Time-series)│  │ (Analytics)  │  │ (Cache)      │   │
│  │ RDS          │  │ (Live data)  │  │ (Historical) │  │ Cluster      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ S3           │  │ MLflow       │  │ Elasticsearch│                      │
│  │ (Data Lake)  │  │ (Model Reg.) │  │ (Search/Logs)│                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 API Design

#### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: SportOracle API
  version: 1.0.0

paths:
  /v1/predictions/games:
    get:
      summary: Get predictions for upcoming games
      parameters:
        - name: sport
          in: query
          schema:
            type: string
            enum: [nba, nfl, mlb, nhl, ncaab, ncaaf, premier_league, mls, tennis, esports, ufc]
        - name: leagues
          in: query
          schema:
            type: string
            description: "comma-separated for multi-league filter"
        - name: date
          in: query
          schema:
            type: string
            format: date
        - name: include_explanations
          in: query
          schema:
            type: boolean
            default: false
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  predictions:
                    type: array
                    items:
                      $ref: '#/components/schemas/GamePrediction'

  /v1/predictions/games/{game_id}:
    get:
      summary: Get detailed prediction for specific game
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DetailedGamePrediction'

  /v1/predictions/live/{game_id}:
    get:
      summary: Get current live prediction
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LivePrediction'

  /v1/predictions/props:
    get:
      summary: Get player prop predictions
      parameters:
        - name: game_id
          in: query
          required: true
        - name: player_id
          in: query
        - name: prop_type
          in: query
          schema:
            enum: [points, rebounds, assists, threes, pts_reb_ast]
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PropPrediction'

  /v1/odds:
    get:
      summary: Get current odds from multiple books
      parameters:
        - name: game_id
          in: query
        - name: books
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OddsComparison'

  /v1/scenarios/{game_id}:
    post:
      summary: Run what-if scenario analysis
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                player_status_overrides:
                  type: object
                  additionalProperties:
                    type: string
                    enum: [OUT, DOUBTFUL, QUESTIONABLE, PROBABLE, AVAILABLE]
                weight_recent_games:
                  type: number
                  minimum: 0
                  maximum: 1
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScenarioResult'

  /v1/users/alerts:
    post:
      summary: Create custom alert
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AlertConfig'
    get:
      summary: List user's alerts

  /v1/accuracy:
    get:
      summary: Get model accuracy statistics
      parameters:
        - name: sport
        - name: prediction_type
        - name: confidence_bucket
        - name: date_range
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccuracyReport'

  # Multi-sport & gamification (2026 baseline)
  /v1/feed/top-picks:
    get:
      summary: Today's Top Picks (cross-sport)
      parameters:
        - name: sport
          in: query
          schema: { type: string }
        - name: leagues
          in: query
          schema: { type: string, description: "comma-separated league codes" }
        - name: limit
          in: query
          schema: { type: integer, default: 10 }
  /v1/leaderboards:
    get:
      summary: Weekly/monthly accuracy leaderboards
      parameters:
        - name: period
          in: query
          schema: { type: string, enum: [weekly, monthly] }
        - name: sport
          in: query
  /v1/challenges/active:
    get:
      summary: Active pick challenges (vs AI, friends, groups)
  /v1/picks/{id}/share:
    post:
      summary: Generate shareable pick graphic (X/Instagram)
  /v1/user/for-you:
    get:
      summary: For You feed (personalized picks by favorites + history)
      parameters:
        - name: sports
          in: query
          schema: { type: string }

components:
  schemas:
    GamePrediction:
      type: object
      properties:
        game_id:
          type: string
        sport:
          type: string
        home_team:
          $ref: '#/components/schemas/Team'
        away_team:
          $ref: '#/components/schemas/Team'
        game_time:
          type: string
          format: date-time
        predictions:
          type: object
          properties:
            spread:
              type: object
              properties:
                pick:
                  type: string
                line:
                  type: number
                confidence:
                  type: number
                fair_line:
                  type: number
            moneyline:
              type: object
              properties:
                pick:
                  type: string
                implied_prob:
                  type: number
                fair_prob:
                  type: number
            total:
              type: object
              properties:
                pick:
                  type: string
                  enum: [OVER, UNDER]
                line:
                  type: number
                confidence:
                  type: number
                projected_total:
                  type: number

    DetailedGamePrediction:
      allOf:
        - $ref: '#/components/schemas/GamePrediction'
        - type: object
          properties:
            explanation:
              type: object
              properties:
                top_factors:
                  type: array
                  items:
                    type: object
                    properties:
                      factor:
                        type: string
                      contribution_pct:
                        type: number
                      direction:
                        type: string
                historical_context:
                  type: object
                  properties:
                    similar_situations_record:
                      type: string
                    model_accuracy_this_spot:
                      type: number
                uncertainty:
                  type: object
                  properties:
                    confidence_interval_95:
                      type: array
                      items:
                        type: number
                    key_swing_factors:
                      type: array
                      items:
                        type: string

    LivePrediction:
      type: object
      properties:
        game_id:
          type: string
        current_score:
          type: object
          properties:
            home:
              type: integer
            away:
              type: integer
        game_clock:
          type: string
        period:
          type: integer
        win_probability:
          type: object
          properties:
            home:
              type: number
            away:
              type: number
        live_spread:
          type: object
          properties:
            current_line:
              type: number
            fair_line:
              type: number
            edge:
              type: number
        momentum:
          type: object
          properties:
            score:
              type: number
            direction:
              type: string
            recent_events:
              type: array
              items:
                type: string
        updated_at:
          type: string
          format: date-time
```

#### WebSocket API

```javascript
// WebSocket connection
const ws = new WebSocket('wss://api.sportoracle.io/v1/live');

// Subscribe to live game updates
ws.send(JSON.stringify({
  action: 'subscribe',
  channels: [
    'predictions.live.nba.{game_id}',
    'odds.live.nba.{game_id}',
    'alerts.user.{user_id}'
  ]
}));

// Incoming message types
{
  "type": "prediction_update",
  "game_id": "nba_20240315_lal_bos",
  "data": {
    "win_probability": { "home": 0.58, "away": 0.42 },
    "live_spread": { "current": -1.5, "fair": +0.5, "edge": 2.0 },
    "momentum_score": 0.72,
    "timestamp": "2024-03-15T20:45:32Z"
  }
}

{
  "type": "odds_update",
  "game_id": "nba_20240315_lal_bos",
  "data": {
    "book": "draftkings",
    "spread": { "home": -1.5, "away": +1.5 },
    "total": { "over": 224.5, "under": 224.5 },
    "timestamp": "2024-03-15T20:45:30Z"
  }
}

{
  "type": "alert_triggered",
  "alert_id": "alert_123",
  "data": {
    "trigger": "sharp_movement",
    "game_id": "nba_20240315_lal_bos",
    "message": "Sharp money detected on Celtics +1.5",
    "details": {...}
  }
}
```

### 4.3 Database Schema

#### PostgreSQL (Users, Subscriptions, Alerts)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50), -- 'email', 'google', 'apple'
    auth_provider_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    profile JSONB DEFAULT '{}'
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plan VARCHAR(50) NOT NULL, -- 'free', 'pro', 'elite', 'api'
    status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'past_due'
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User alerts configuration
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'sharp_movement', 'confidence_threshold', 'game_start', 'custom'
    config JSONB NOT NULL,
    /*
    Example config:
    {
        "sport": "nba",
        "conditions": [
            {"field": "confidence", "operator": ">=", "value": 0.7},
            {"field": "line_movement", "operator": ">=", "value": 1.5}
        ],
        "delivery": ["push", "email"]
    }
    */
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_enabled ON alerts(user_id, enabled);

-- User bankroll tracking
CREATE TABLE bankroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entry_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win', 'loss'
    amount DECIMAL(12, 2) NOT NULL,
    bet_details JSONB, -- For bet entries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bankroll_user_date ON bankroll_entries(user_id, created_at DESC);

-- API keys for API tier
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    permissions JSONB DEFAULT '["read"]',
    rate_limit_per_minute INTEGER DEFAULT 60,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);
```

#### TimescaleDB (Live Data, Odds)

```sql
-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Live odds (hypertable)
CREATE TABLE odds_history (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    book VARCHAR(50) NOT NULL,
    market_type VARCHAR(50) NOT NULL, -- 'spread', 'moneyline', 'total'
    home_line DECIMAL(6, 2),
    away_line DECIMAL(6, 2),
    home_odds INTEGER, -- American odds
    away_odds INTEGER,
    over_line DECIMAL(6, 2),
    under_line DECIMAL(6, 2),
    over_odds INTEGER,
    under_odds INTEGER
);

SELECT create_hypertable('odds_history', 'time');

-- Create indexes
CREATE INDEX idx_odds_game_time ON odds_history(game_id, time DESC);
CREATE INDEX idx_odds_book ON odds_history(book, time DESC);

-- Retention policy: keep 2 years
SELECT add_retention_policy('odds_history', INTERVAL '2 years');

-- Continuous aggregate for odds movement analysis
CREATE MATERIALIZED VIEW odds_movement_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    game_id,
    book,
    market_type,
    FIRST(home_line, time) AS opening_line,
    LAST(home_line, time) AS closing_line,
    MAX(home_line) - MIN(home_line) AS line_range
FROM odds_history
GROUP BY bucket, game_id, book, market_type;

-- Live game state
CREATE TABLE live_game_state (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    period INTEGER,
    game_clock VARCHAR(20),
    home_score INTEGER,
    away_score INTEGER,
    possession VARCHAR(10),
    last_play JSONB,
    win_probability_home DECIMAL(5, 4),
    live_spread_fair DECIMAL(5, 2),
    momentum_score DECIMAL(5, 4)
);

SELECT create_hypertable('live_game_state', 'time');

-- Predictions log (for accuracy tracking)
CREATE TABLE predictions_log (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    prediction_type VARCHAR(50) NOT NULL, -- 'spread', 'moneyline', 'total', 'prop'
    model_version VARCHAR(50) NOT NULL,
    prediction JSONB NOT NULL,
    /*
    {
        "pick": "home",
        "line": -3.5,
        "confidence": 0.67,
        "fair_line": -4.2,
        "model_output": {...}
    }
    */
    actual_result JSONB, -- Filled in after game
    is_correct BOOLEAN, -- Filled in after game
    closing_line DECIMAL(6, 2) -- For CLV calculation
);

SELECT create_hypertable('predictions_log', 'time');
```

#### ClickHouse (Analytics, Historical)

```sql
-- Historical game data (immutable)
CREATE TABLE games
(
    game_id String,
    sport String,
    season String,
    game_date Date,
    game_time DateTime,
    home_team String,
    away_team String,
    home_score UInt16,
    away_score UInt16,
    spread_close Decimal(6, 2),
    total_close Decimal(6, 2),
    home_spread_result Decimal(6, 2), -- Actual margin vs spread
    total_result Decimal(6, 2), -- Actual total
    venue String,
    attendance UInt32,
    weather Nullable(String),
    officials Array(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (sport, game_date, game_id);

-- Feature snapshots (for training)
CREATE TABLE feature_snapshots
(
    snapshot_time DateTime,
    game_id String,
    feature_set String, -- 'team_performance', 'player', 'odds', etc.
    features String -- JSON blob
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(snapshot_time)
ORDER BY (game_id, feature_set, snapshot_time);

-- Model accuracy aggregates
CREATE TABLE model_accuracy_daily
(
    date Date,
    sport String,
    prediction_type String,
    model_version String,
    confidence_bucket String, -- '50-55', '55-60', etc.
    total_predictions UInt32,
    correct_predictions UInt32,
    avg_clv Decimal(6, 4), -- Closing line value
    roi Decimal(6, 4)
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, sport, prediction_type, model_version, confidence_bucket);

-- User analytics (aggregated, anonymized)
CREATE TABLE user_analytics_daily
(
    date Date,
    user_tier String,
    platform String, -- 'ios', 'android', 'web'
    metric String,
    value Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_tier, platform, metric);
```

### 4.4 Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      CACHING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: CDN (Cloudflare)                                      │
│  ├── Static assets: 1 year                                      │
│  ├── Public API responses: 30 seconds                           │
│  └── Stale-while-revalidate for non-live data                  │
│                                                                  │
│  LAYER 2: API Gateway (Kong)                                    │
│  ├── Rate limit counters: Redis                                 │
│  └── Auth token cache: 5 minutes                                │
│                                                                  │
│  LAYER 3: Application Cache (Redis Cluster)                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   REDIS CLUSTER                          │   │
│  │                                                          │   │
│  │  Namespace: predictions:pregame:{game_id}                │   │
│  │  TTL: 5 minutes (refreshed on feature update)            │   │
│  │  Content: Full prediction response                       │   │
│  │                                                          │   │
│  │  Namespace: predictions:live:{game_id}                   │   │
│  │  TTL: 10 seconds                                         │   │
│  │  Content: Latest live prediction                         │   │
│  │                                                          │   │
│  │  Namespace: odds:current:{game_id}                       │   │
│  │  TTL: 30 seconds                                         │   │
│  │  Content: Current odds from all books                    │   │
│  │                                                          │   │
│  │  Namespace: features:online:{entity_type}:{entity_id}    │   │
│  │  TTL: 1 hour (Feast online store)                        │   │
│  │  Content: Latest feature values                          │   │
│  │                                                          │   │
│  │  Namespace: user:session:{session_id}                    │   │
│  │  TTL: 24 hours                                           │   │
│  │  Content: User session data                              │   │
│  │                                                          │   │
│  │  Namespace: accuracy:stats:{sport}:{type}                │   │
│  │  TTL: 1 hour                                             │   │
│  │  Content: Pre-computed accuracy statistics               │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CACHE INVALIDATION STRATEGY:                                   │
│  ├── Event-driven: Kafka consumers invalidate on data update   │
│  ├── TTL-based: Natural expiration for time-sensitive data     │
│  └── Manual: Admin API for emergency invalidation               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Scalability Considerations

#### Horizontal Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCALABILITY ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRAFFIC PATTERNS:                                              │
│  ├── Base load: ~1,000 req/sec                                  │
│  ├── Game day peaks: ~50,000 req/sec (10x weekday)             │
│  ├── Super Bowl / Finals: ~200,000 req/sec                     │
│  └── Live game spikes: Bursty, 5x within minutes               │
│                                                                  │
│  SCALING APPROACH BY COMPONENT:                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Services (Kubernetes HPA)                           │   │
│  │  ├── Metric: CPU utilization + request latency p99       │   │
│  │  ├── Min replicas: 3                                     │   │
│  │  ├── Max replicas: 50                                    │   │
│  │  ├── Scale-up threshold: CPU > 70% or p99 > 200ms       │   │
│  │  └── Scale-down delay: 5 minutes                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WebSocket Gateway                                       │   │
│  │  ├── Sticky sessions via Redis pub/sub                   │   │
│  │  ├── Connection limit: 10,000 per instance               │   │
│  │  ├── Auto-scale based on connection count                │   │
│  │  └── Graceful connection migration on scale-down         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ML Inference (Triton)                                   │   │
│  │  ├── GPU instances (g4dn.xlarge)                        │   │
│  │  ├── Batching: Dynamic batching with 10ms max delay     │   │
│  │  ├── Model replication across instances                 │   │
│  │  └── Pre-warmed model cache                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Kafka                                                   │   │
│  │  ├── Partitions: 12 per topic (matches max consumers)   │   │
│  │  ├── Replication factor: 3                              │   │
│  │  ├── Auto-scaling consumers via KEDA                    │   │
│  │  └── Retention: 7 days                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Databases                                               │   │
│  │                                                          │   │
│  │  PostgreSQL (RDS):                                       │   │
│  │  ├── Primary + 2 read replicas                          │   │
│  │  ├── Read replicas for analytics queries                │   │
│  │  └── Connection pooling via PgBouncer                   │   │
│  │                                                          │   │
│  │  Redis Cluster:                                          │   │
│  │  ├── 6 nodes (3 masters, 3 replicas)                    │   │
│  │  ├── Hash slot distribution for sharding                │   │
│  │  └── Cluster-aware client libraries                     │   │
│  │                                                          │   │
│  │  ClickHouse:                                             │   │
│  │  ├── 3-node cluster with replication                    │   │
│  │  ├── Distributed tables for heavy queries               │   │
│  │  └── Materialized views for common aggregations         │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  COST OPTIMIZATION:                                             │
│  ├── Spot instances for batch processing: 70% savings          │
│  ├── Reserved instances for baseline load: 40% savings         │
│  ├── Auto-shutdown dev/staging at night                        │
│  └── S3 Intelligent Tiering for historical data                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Mobile App Architecture

### 5.1 Tech Stack Decision

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React Native | Cross-platform, strong ecosystem, near-native performance |
| Navigation | React Navigation 6 | Standard, well-maintained |
| State Management | Zustand + React Query | Zustand for local, React Query for server state |
| Styling | Tailwind (NativeWind) | Rapid development, consistent design |
| Real-time | Socket.io-client | Robust reconnection, fallback support |
| Charts | Victory Native | Good performance, customizable |
| Push Notifications | Firebase Cloud Messaging | Cross-platform, reliable |
| Analytics | Mixpanel + Amplitude | Product analytics + experimentation |
| Crash Reporting | Sentry | Industry standard |
| OTA Updates | Expo EAS Update | Fast iteration without app store |

### 5.2 App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     UI LAYER                             │   │
│  │                                                          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │   │
│  │  │   Screens   │ │ Components  │ │   Hooks     │       │   │
│  │  │  (Features) │ │  (Shared)   │ │  (Custom)   │       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │   │
│  │                                                          │   │
│  │  Feature Modules:                                        │   │
│  │  ├── Home (Today's picks, featured games)               │   │
│  │  ├── Games (Sport-specific game lists)                   │   │
│  │  ├── GameDetail (Full prediction, explanation)          │   │
│  │  ├── Live (Real-time updates, in-play)                  │   │
│  │  ├── Props (Player prop predictions)                    │   │
│  │  ├── Accuracy (Model performance dashboard)             │   │
│  │  ├── Alerts (Custom alert management)                   │   │
│  │  ├── Bankroll (Tracking, analytics)                     │   │
│  │  └── Profile (Settings, subscription)                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   STATE LAYER                            │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  Zustand Stores (Local State)                    │    │   │
│  │  │  ├── authStore: { user, token, isAuthenticated } │    │   │
│  │  │  ├── preferencesStore: { theme, notifications }  │    │   │
│  │  │  ├── liveStore: { subscribedGames, liveData }    │    │   │
│  │  │  └── alertsStore: { pendingAlerts, history }     │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  React Query (Server State)                      │    │   │
│  │  │  ├── usePredictions(sport, date)                 │    │   │
│  │  │  ├── useGameDetail(gameId)                       │    │   │
│  │  │  ├── useOdds(gameId)                             │    │   │
│  │  │  ├── useAccuracy(sport, type)                    │    │   │
│  │  │  ├── useProps(gameId)                            │    │   │
│  │  │  └── Automatic caching, refetching, invalidation│    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  SERVICE LAYER                           │   │
│  │                                                          │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │   │
│  │  │  API Client   │ │  WebSocket    │ │  Push         │  │   │
│  │  │  (Axios)      │ │  Manager      │ │  Handler      │  │   │
│  │  └───────────────┘ └───────────────┘ └───────────────┘  │   │
│  │                                                          │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │   │
│  │  │  Auth         │ │  Storage      │ │  Analytics    │  │   │
│  │  │  Service      │ │  (MMKV)       │ │  Service      │  │   │
│  │  └───────────────┘ └───────────────┘ └───────────────┘  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Key Screen Designs

#### Home Screen (2026 baseline)
- **Sport selector**: Carousel or horizontal tabs (All, NFL, NBA, MLB, NHL, Soccer, College, Tennis, Esports, UFC/MMA).
- **Today's Top Picks**: Cross-sport feed of high-confidence picks; horizontal strip or vertical list.
- **For You feed**: Personalized recommended picks from favorites + history + trends.
- **Upcoming games**: Filterable by sport; quick win-probability cards.

#### Live Hub Tab
- Dedicated tab for **ongoing games across all sports**.
- Per-game momentum graphs, live win probability; alerts for key events.
- Optional: mini polls / quick predictions during events (non-gambling engagement).

#### Gamification Screens
- **Leaderboards**: Weekly/monthly accuracy by sport; user rank, streaks, badges.
- **Challenges**: Pick challenges (vs. AI, friends, private groups); join/create flows.
- **Share Picks**: One-tap share with generated graphic (confidence %, reasoning, team logos).

#### Game Detail Screen - Prediction Breakdown

```
┌─────────────────────────────────────────┐
│ ← Back                    ⭐ Favorite   │
├─────────────────────────────────────────┤
│                                         │
│     🏀 Lakers vs Celtics                │
│     Mar 15, 2024 • 7:30 PM ET          │
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │         OUR PICK                 │   │
│  │                                  │   │
│  │     LAKERS -3.5                  │   │
│  │     ████████████░░░░ 67%        │   │
│  │                                  │   │
│  │  Fair Line: -4.2  |  Edge: +0.7 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  TOP FACTORS                     │   │
│  │  ─────────────────────────────── │   │
│  │  + Lakers home court    +8.2%   │   │
│  │  + AD probable return   +6.1%   │   │
│  │  + Celtics on B2B       +5.4%   │   │
│  │  - Lakers cold 3PT      -4.8%   │   │
│  │  - Celtics ATS vs West  -2.1%   │   │
│  │                                  │   │
│  │  [See Full Analysis →]           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ODDS COMPARISON                 │   │
│  │  ─────────────────────────────── │   │
│  │  DraftKings   -3.5 (-110)  BEST │   │
│  │  FanDuel      -3.5 (-112)       │   │
│  │  BetMGM       -3   (-115)       │   │
│  │  Caesars      -3.5 (-115)       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  MODEL ACCURACY                  │   │
│  │  ─────────────────────────────── │   │
│  │  Similar spots: 61% (n=234)     │   │
│  │  This season: 58% on NBA spread │   │
│  │  Last 30 days: 62% (hot streak) │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [──────────────────────────────────]  │
│  │ Spread │ Total │ Props │ Scenario │ │
│  [──────────────────────────────────]  │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4 Real-Time Update Architecture

```typescript
// WebSocket Manager with reconnection and state sync
class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private subscriptions = new Set<string>();

  connect(token: string) {
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      // Resubscribe to all channels
      this.subscriptions.forEach(channel => {
        this.socket?.emit('subscribe', { channel });
      });
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server disconnected, need to manually reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('prediction_update', (data: LivePrediction) => {
      useLiveStore.getState().updatePrediction(data.game_id, data);
    });

    this.socket.on('odds_update', (data: OddsUpdate) => {
      queryClient.setQueryData(['odds', data.game_id], (old: any) => ({
        ...old,
        [data.book]: data.odds,
      }));
    });

    this.socket.on('alert', (data: Alert) => {
      useAlertsStore.getState().addAlert(data);
      this.showAlertNotification(data);
    });
  }

  subscribe(gameId: string) {
    const channel = `predictions.live.${gameId}`;
    this.subscriptions.add(channel);
    this.socket?.emit('subscribe', { channel });
  }

  unsubscribe(gameId: string) {
    const channel = `predictions.live.${gameId}`;
    this.subscriptions.delete(channel);
    this.socket?.emit('unsubscribe', { channel });
  }

  private showAlertNotification(alert: Alert) {
    // Trigger local notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.message,
        data: { gameId: alert.game_id },
      },
      trigger: null, // Immediate
    });
  }
}

// React hook for live predictions
function useLivePrediction(gameId: string) {
  const wsManager = useWebSocketManager();
  const livePrediction = useLiveStore(state => state.predictions[gameId]);

  useEffect(() => {
    wsManager.subscribe(gameId);
    return () => wsManager.unsubscribe(gameId);
  }, [gameId]);

  return livePrediction;
}
```

### 5.5 Offline Support Strategy

```typescript
// Offline-first data strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Persist cache to MMKV
const asyncStoragePersister = createAsyncStoragePersister({
  storage: MMKVStorage,
  key: 'sportoracle-query-cache',
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist certain queries
      const persistedQueries = ['predictions', 'accuracy', 'user'];
      return persistedQueries.some(q =>
        (query.queryKey as string[]).includes(q)
      );
    },
  },
});

// Network status aware fetching
function useNetworkAwarePredictions(sport: string, date: string) {
  const netInfo = useNetInfo();

  return useQuery({
    queryKey: ['predictions', sport, date],
    queryFn: () => api.getPredictions(sport, date),
    enabled: netInfo.isConnected !== false,
    placeholderData: (previousData) => previousData,
    meta: {
      offlineMessage: 'Showing cached predictions. Connect to update.',
    },
  });
}
```

---

## 6. Security, Compliance & Ethics

### 6.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AUTHENTICATION & AUTHORIZATION                                 │
│  ├── Auth Provider: Auth0 (or Firebase Auth)                   │
│  ├── JWT tokens with RS256 signing                             │
│  ├── Access token TTL: 15 minutes                              │
│  ├── Refresh token TTL: 7 days (revocable)                     │
│  ├── OAuth2 providers: Google, Apple, Email                    │
│  └── RBAC: free, premium, api, admin                            │
│                                                                  │
│  API SECURITY                                                   │
│  ├── TLS 1.3 everywhere (no exceptions)                        │
│  ├── API key hashing: Argon2id                                 │
│  ├── Rate limiting per tier:                                   │
│  │   ├── Free: 60 req/min                                      │
│  │   ├── Premium: 300 req/min                                  │
│  │   └── API: 3000 req/min (customizable)                      │
│  ├── Request signing for API tier (HMAC-SHA256)                │
│  └── Input validation: JSON Schema + sanitization              │
│                                                                  │
│  DATA PROTECTION                                                │
│  ├── Encryption at rest: AES-256 (AWS managed keys)            │
│  ├── PII encrypted with customer-specific keys                 │
│  ├── Database: Row-level security in PostgreSQL                │
│  ├── Logs: PII redacted before storage                         │
│  └── Backups: Encrypted, cross-region replication              │
│                                                                  │
│  INFRASTRUCTURE SECURITY                                        │
│  ├── WAF: Cloudflare with OWASP rules                          │
│  ├── VPC: Private subnets for databases                        │
│  ├── Security groups: Least privilege                          │
│  ├── Secrets: AWS Secrets Manager + rotation                   │
│  ├── Container scanning: Trivy in CI/CD                        │
│  └── Penetration testing: Annual third-party                   │
│                                                                  │
│  MONITORING & RESPONSE                                          │
│  ├── SIEM: Datadog Security Monitoring                         │
│  ├── Anomaly detection on auth patterns                        │
│  ├── Automated blocking of suspicious IPs                      │
│  └── Incident response playbook documented                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Compliance Considerations

| Regulation | Applicability | Requirements |
|------------|---------------|--------------|
| GDPR | EU users | Data subject rights, DPA, data minimization |
| CCPA | California users | Right to delete, opt-out of sale |
| PCI DSS | Payment processing | Use Stripe (PCI compliant) |
| State gambling laws | Varies by state | Geofencing for restricted states |
| Age verification | All users | 18+/21+ depending on jurisdiction |

#### Gambling Compliance Specifics

```
IMPORTANT: We are NOT a sportsbook. We provide predictions and analysis.

However, we must still:
1. NOT guarantee outcomes or profits
2. Include responsible gambling disclaimers
3. Provide links to gambling addiction resources
4. Implement age verification (18+)
5. Geofence in states where even predictions may be restricted
6. NOT accept bets or facilitate betting directly

Every prediction must include:
"Past performance does not guarantee future results.
 Gamble responsibly. If you have a gambling problem,
 call 1-800-GAMBLER."
```

### 6.3 Ethical AI Considerations

```
ETHICAL GUIDELINES:

1. TRANSPARENCY
   - Always show model confidence intervals, not just point estimates
   - Publish historical accuracy publicly
   - Explain when and why predictions change
   - Never hide poor performance periods

2. PREVENTING HARM
   - Implement self-exclusion option for problem gamblers
   - Detect patterns of concerning behavior:
     - Excessive checking (>50 app opens/day)
     - Large losses tracked in bankroll
     - Increasing bet sizes after losses
   - Proactive outreach with resources

3. FAIRNESS
   - Model monitored for bias across teams/leagues
   - No personalized "hot streak" manipulation
   - Same model for all users (no A/B testing outcomes)

4. NO DECEPTIVE PRACTICES
   - Never cherry-pick displayed results
   - Show both wins AND losses prominently
   - No fake scarcity or pressure tactics
   - Clear distinction between prediction and guarantee

5. DATA ETHICS
   - Only collect necessary data
   - No selling user betting data to third parties
   - Anonymized data for model training only
```

---

## 7. Monetization Strategy

### 7.1 Pricing Tiers (2026 – aligned with ARCHITECTURE_DESIGN.md)

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRICING STRUCTURE                           │
├─────────────────────────────────────────────────────────────────┤
│  Product: Information-only; no gambling integration             │
│                                                                  │
│  FREE TIER                                                      │
│  ├── Price: $0                                                  │
│  ├── Purpose: Acquisition, conversion funnel entry              │
│  ├── Limitations:                                               │
│  │   ├── 3–5 sports limit (user selects; rest locked/teaser)    │
│  │   ├── Basic win probabilities; watermarked explanations     │
│  │   ├── Limited daily predictions (cap per day)                │
│  │   ├── No or 1–2 player props/day (teaser)                    │
│  │   ├── Live: basic score only (no full live win prob)         │
│  │   ├── Non-intrusive ads                                      │
│  │   └── Teaser unlocks (e.g. "Unlock Today's NFL Picks Free")  │
│  └── Conversion target: 8–12% to premium; DAU/MAU >35%           │
│                                                                  │
│  PREMIUM ($9.99/month or $99/year)                              │
│  ├── 7-day free trial; cancel anytime                           │
│  ├── Features:                                                  │
│  │   ├── Unlimited sports/leagues (8+ sports)                   │
│  │   ├── Full player props & live depth (momentum, win prob)    │
│  │   ├── Full explanations (no watermark); exportable           │
│  │   ├── Ad-free                                                │
│  │   ├── Granular alerts (per-sport/team) + "Trending Pick"     │
│  │   ├── Exportable prediction history                          │
│  │   ├── Leaderboards & challenges (full access)                │
│  │   └── Early access to new sports/features                    │
│  └── Target: 8–12% conversion from free                        │
│                                                                  │
│  API / B2B TIER ($299/month base + usage)                       │
│  ├── Target: Media, fantasy platforms, research (read-only)     │
│  ├── Features: Full API, raw probabilities, webhooks, SLA       │
│  └── Enterprise: White-label, custom; $5,000–50,000/month       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Revenue Projections (Conservative)

| Month | Free Users | Paid Users | MRR | Notes |
|-------|------------|------------|-----|-------|
| 3 | 10,000 | 800 | $8,000 | MVP: NFL+NBA+Soccer, leaderboards, share |
| 6 | 50,000 | 4,000 | $40,000 | More sports, Live Hub, challenges |
| 9 | 150,000 | 12,000 | $120,000 | Full 8+ sports, UGC tips |
| 12 | 300,000 | 24,000 | $240,000 | Scale, B2B, esports/UFC |

**Assumptions:**
- 8–12% free-to-paid conversion (target)
- Premium $9.99/month; trial conversion tracked
- Churn: <5% monthly; DAU/MAU target >35%

### 7.3 Additional Revenue Streams

1. **B2B / API**: Licensing to media, fantasy platforms (read-only predictions).
2. **Premium Content**: Expert analysis, video breakdowns (optional add-on).
3. **Data Licensing**: Historical predictions to researchers (anonymized).
4. **Advertising** (Free tier): Non-intrusive; no gambling operators (brand-safe).

---

## 8. Metrics & Analytics

### 8.1 Key Performance Indicators

```
┌─────────────────────────────────────────────────────────────────┐
│                         KPI FRAMEWORK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACQUISITION METRICS                                            │
│  ├── Daily Active Users (DAU)                                   │
│  ├── Monthly Active Users (MAU)                                 │
│  ├── DAU/MAU ratio (stickiness target: >35%)                   │
│  ├── New user signups (daily, weekly)                          │
│  ├── App store ranking (Sports category)                       │
│  └── Cost per acquisition (CPA) by channel                     │
│                                                                  │
│  ENGAGEMENT METRICS                                             │
│  ├── Session duration (target: >5 min)                         │
│  ├── Sessions per user per day                                 │
│  ├── Predictions viewed per session                            │
│  ├── Daily picks viewed (per user & aggregate)                 │
│  ├── Cross-sport session % (sessions with 2+ sports)           │
│  ├── Leaderboard participation % (DAU that views/interacts)    │
│  ├── Share rate (% of predictions that trigger share)         │
│  ├── Feature usage: explanations, scenario engine, alerts      │
│  ├── Push notification open rate (target: >15%)                │
│  └── Live feature engagement (% users during games)             │
│                                                                  │
│  RETENTION METRICS                                              │
│  ├── D1 retention (target: >40%)                               │
│  ├── D7 retention (target: >25%)                               │
│  ├── D30 retention (target: >15%)                              │
│  ├── Cohort retention curves                                   │
│  ├── Churn rate (monthly, by tier)                             │
│  └── Reactivation rate                                         │
│                                                                  │
│  MONETIZATION METRICS                                           │
│  ├── Monthly Recurring Revenue (MRR)                           │
│  ├── Annual Recurring Revenue (ARR)                            │
│  ├── Average Revenue Per User (ARPU)                           │
│  ├── Lifetime Value (LTV) by cohort                            │
│  ├── LTV:CAC ratio (target: >3:1)                              │
│  ├── Free-to-paid conversion rate (target: 8–12%)               │
│  ├── Trial conversion rate (7-day trial → paid)                │
│  └── Subscription churn by tier (target: <5%)                  │
│                                                                  │
│  MODEL PERFORMANCE METRICS (THE PRODUCT IS THE MODEL)          │
│  ├── Overall accuracy by sport/bet type                        │
│  ├── Calibration score (predicted prob vs actual)              │
│  ├── Closing Line Value (CLV) - key for sharps                 │
│  ├── ROI if following all picks (theoretical)                  │
│  ├── High-confidence pick accuracy (>65% conf)                 │
│  ├── Live prediction accuracy                                  │
│  ├── Prediction latency (p50, p99)                             │
│  └── Model drift indicators                                    │
│                                                                  │
│  SYSTEM HEALTH METRICS                                          │
│  ├── API latency (p50, p95, p99)                               │
│  ├── API error rate                                            │
│  ├── WebSocket connection success rate                         │
│  ├── Data pipeline freshness (lag from source)                 │
│  ├── Model inference latency                                   │
│  └── Infrastructure costs per user                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Analytics Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANALYTICS ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DATA COLLECTION                                                │
│  ├── Mobile: Segment SDK → unified event tracking               │
│  ├── Backend: Custom events → Kafka → ClickHouse               │
│  ├── Infrastructure: Datadog metrics                           │
│  └── Model performance: MLflow metrics                         │
│                                                                  │
│  DESTINATIONS                                                   │
│  ├── Mixpanel: Product analytics, funnels, retention           │
│  ├── Amplitude: Experimentation, cohort analysis               │
│  ├── ClickHouse: Custom SQL analytics                          │
│  ├── Looker: Business dashboards                               │
│  └── Datadog: Technical monitoring                             │
│                                                                  │
│  KEY EVENTS TRACKED                                             │
│  ├── app_opened                                                 │
│  ├── prediction_viewed { sport, game_id, type }                │
│  ├── explanation_expanded { game_id, section }                 │
│  ├── scenario_run { game_id, params_changed }                  │
│  ├── alert_created { type, conditions }                        │
│  ├── subscription_started { tier, source }                     │
│  ├── subscription_cancelled { tier, reason }                   │
│  ├── push_notification_received { type }                       │
│  ├── push_notification_opened { type }                         │
│  ├── leaderboard_viewed { period, sport }                       │
│  ├── challenge_joined { challenge_id }                         │
│  ├── pick_shared { game_id, channel }                          │
│  └── error_occurred { error_type, context }                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 12-Month Technical Roadmap (2026 baseline – aligned with ARCHITECTURE_DESIGN.md)

### Phase 1: MVP (Months 1-3) – Multi-sport + engagement hooks

```
MONTH 1: Core Infrastructure
├── Week 1-2:
│   ├── Set up AWS infrastructure (Terraform)
│   ├── Kubernetes cluster (EKS)
│   ├── CI/CD pipelines (GitHub Actions)
│   └── Development environments
├── Week 3-4:
│   ├── PostgreSQL + TimescaleDB setup
│   ├── Redis cluster
│   ├── Kafka cluster
│   └── Basic monitoring (Datadog)

MONTH 2: Data Pipeline + MVP Backend (multi-sport)
├── Week 1-2:
│   ├── Sportradar integration (NFL, NBA, soccer)
│   ├── Odds API integration (read-only)
│   ├── Data ingestion pipeline (Flink)
│   └── Feature store setup (Feast); sport/league query params
├── Week 3-4:
│   ├── User service; Auth integration
│   ├── Predictions service; REST API v1
│   ├── /feed/top-picks, /leaderboards (stub or v1)
│   └── Onboarding wizard (multi-select sports/teams)

MONTH 3: MVP Models + Mobile (NFL, NBA, Soccer)
├── Week 1-2:
│   ├── Train initial NFL/NBA/soccer spread models
│   ├── Model serving (Triton); explainability pipeline
│   └── Accuracy tracking; leaderboards backend
├── Week 3-4:
│   ├── React Native: Home with sport selector, Today's Top Picks
│   ├── Leaderboards UI; Shareable Picks (one-tap graphic)
│   ├── Core navigation, auth, subscription (Stripe, trial)
│   └── Internal alpha / beta
```

### Phase 2: Core Product (Months 4-6) – Live Hub, more sports, challenges

```
MONTH 4: More sports + Live Hub
├── Week 1-2:
│   ├── Add MLB, NHL, College Football/Basketball, Tennis
│   ├── Live data pipeline; WebSocket infrastructure
│   └── Live prediction service
├── Week 3-4:
│   ├── Live Hub tab (ongoing games, momentum graphs)
│   ├── Push notifications (granular per-sport/team + "Trending Pick")
│   └── Game detail, explanations UI; odds comparison (read-only)

MONTH 5: Pick Challenges + Premium depth
├── Week 1-2:
│   ├── Challenges backend (vs AI, friends, groups)
│   ├── Challenges UI; badges & streaks
│   └── LSTM live model; real-time updates in app
├── Week 3-4:
│   ├── Player props (premium); prediction history export
│   ├── For You feed tuning; daily digest pushes
│   └── Performance optimization

MONTH 6: Explainability + Launch
├── Week 1-2:
│   ├── SHAP integration; natural language explanations
│   ├── Scenario engine backend; accuracy dashboard
│   └── Per-sport drift detection
├── Week 3-4:
│   ├── App store submission; landing + marketing
│   └── PUBLIC LAUNCH (v1.0)
```

### Phase 3: Growth Features (Months 7-9)

```
MONTH 7: Player Props + UGC
├── Week 1-2:
│   ├── Player prop models (all sports)
│   ├── Props UI; prop explanations
│   └── Correlation / DFS helpers (optional)
├── Week 3-4:
│   ├── User-Generated Tips (verified track record)
│   ├── Community tips API & moderation
│   └── Badges & streaks polish

MONTH 8: Alerts + Personalization
├── Week 1-2:
│   ├── Custom alert builder; sharp movement (read-only)
│   └── Alert delivery; granular per-sport/team
├── Week 3-4:
│   ├── For You feed optimization
│   ├── Favorite teams/leagues; notification preferences
│   └── Daily digest: "Your Teams + High-Confidence Picks"

MONTH 9: API Platform
├── Week 1-2:
│   ├── API tier implementation; API key management
│   ├── Usage metering; developer docs
│   └── Webhook system; rate limiting
├── Week 3-4:
│   └── API analytics dashboard; B2B launch prep
```

### Phase 4: Scale + Differentiation (Months 10-12)

```
MONTH 10: More sports + model ops
├── Week 1-2:
│   ├── Per-sport retraining automation; drift detection
│   ├── A/B testing for models; ensemble tuning per sport
│   └── Esports (LoL, CS2); UFC/MMA feeds
├── Week 3-4:
│   ├── 10+ leagues; model optimization
│   └── Mini live polls / quick predictions (in-event)

MONTH 11: Platform Hardening
├── Week 1-2:
│   ├── Performance (target: 100ms p99)
│   ├── Cost optimization; security audit
│   └── Compliance (GDPR/CCPA, information-only)
├── Week 3-4:
│   ├── DR testing; auto-scaling; SLA for API
│   └── Documentation overhaul

MONTH 12: Future Platform
├── Week 1-2:
│   ├── Enterprise / white-label scoping
│   ├── International expansion prep
│   └── v2.0 planning
├── Week 3-4:
│   ├── Retrospective; technical debt
│   └── YEAR 1 COMPLETE
```

### Key Milestones Timeline

```
                                2025/2026
    ─────────────────────────────────────────────────────
    │ M1  │ M2  │ M3  │ M4  │ M5  │ M6  │ M7  │ M8  │ M9  │ M10 │ M11 │ M12 │
    ─────────────────────────────────────────────────────
         ▲           ▲                 ▲                       ▲           ▲
         │           │                 │                       │           │
    Infrastructure  Beta           PUBLIC                   API         Year 1
    Complete       (multi-sport)   LAUNCH                  Launch      Complete

    Target Metrics at Each Milestone:

    M3 (Beta):      NFL+NBA+Soccer, leaderboards, share picks, onboarding
    M6 (Launch):    10K users, ~800 paid (8%), 3+ sports, Live Hub, challenges
    M9 (Growth):    100K users, 12K paid, UGC tips, full 8+ sports
    M12 (Scale):    300K users, 24K paid, API, esports/UFC, DAU/MAU >35%
```

---

## Appendix A: Team Structure

```
RECOMMENDED TEAM (Month 12 target: 15 people)

Engineering (9)
├── Backend Lead (1) - System architecture, Go/Rust
├── Backend Engineers (2) - API development, data pipelines
├── ML Engineer (2) - Model development, MLOps
├── Mobile Lead (1) - React Native architecture
├── Mobile Engineers (2) - iOS/Android features
└── DevOps/Platform (1) - Infrastructure, CI/CD

Product (2)
├── Product Manager (1) - Roadmap, prioritization
└── Product Designer (1) - UX/UI, user research

Data (2)
├── Data Engineer (1) - Pipelines, feature store
└── Data Analyst (1) - Metrics, model evaluation

Operations (2)
├── Customer Success (1) - Support, onboarding
└── Marketing (1) - Growth, content
```

---

## Appendix B: Technology Decisions Summary

| Category | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Backend Language | Go + Rust | Node.js, Python | Go for APIs (productivity), Rust for hot paths (performance) |
| Mobile Framework | React Native | Flutter, Native | Larger talent pool, good performance, OTA updates |
| ML Framework | LightGBM + PyTorch | XGBoost, TensorFlow | LightGBM best for tabular, PyTorch for flexibility |
| Streaming | Kafka + Flink | Pulsar, Spark Streaming | Industry standard, strong Flink for complex processing |
| Primary DB | PostgreSQL | MySQL, CockroachDB | Robust, excellent tooling, RLS |
| Time-series | TimescaleDB | InfluxDB, QuestDB | PostgreSQL compatibility, mature |
| Analytics DB | ClickHouse | Druid, BigQuery | Fast, cost-effective at scale |
| Cache | Redis Cluster | Memcached, KeyDB | Feature-rich, pub/sub for real-time |
| Search | Elasticsearch | Algolia, Meilisearch | Flexibility for logs + search |
| Cloud | AWS | GCP, Azure | Best ML infrastructure, EKS maturity |
| Feature Store | Feast | Tecton, Hopsworks | Open source, good community |
| Model Serving | Triton | TF Serving, Seldon | Multi-framework, batching, GPU |
| Orchestration | Airflow | Dagster, Prefect | Industry standard, mature |

---

This document represents a production-ready architecture for an AI-powered sports prediction platform. All technical decisions are grounded in real-world constraints and trade-offs.
