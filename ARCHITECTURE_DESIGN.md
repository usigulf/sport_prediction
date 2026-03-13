# AI-Powered Sports Prediction Mobile Application
## Production Architecture & Design Document

> **Document role:** This doc is the **production design baseline** (backend API, mobile stack, DB schema). The **primary system architecture** (vision, legal, roadmap, infra, cost) is **[PredictIQ_ARCHITECTURE.md](PredictIQ_ARCHITECTURE.md)**. Comparison: **[ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md)**.  
> **2026 baseline:** Multi-sport from launch, gamification, enhanced personalization, refined freemium.

---

## 1. Product Vision & User Personas

### 1.1 Product Vision
**Mission**: Provide accurate, transparent, and real-time sports predictions across multiple sports that help fans make informed decisions, enhance their viewing experience, and understand the game through data-driven insights—with no betting integration.

**Core Value Propositions**:
- **Accuracy**: Beat market odds through advanced ML models and per-sport ensemble techniques
- **Transparency**: Explainable AI that shows users WHY predictions are made
- **Real-time**: Live in-play predictions that update as games progress
- **Multi-sport**: 8+ sports from MVP (NFL, NBA, MLB, NHL, Premier League, MLS/Champions League, College Football/Basketball, Tennis (Grand Slams), Esports (LoL/CS2 majors), UFC/MMA) with unified cross-sport dashboard
- **Trust**: No betting integration—pure information and insights
- **Engagement**: Social prediction community, leaderboards, shareable picks, and gamified accuracy challenges

### 1.2 User Personas

#### Persona 1: The Casual Fan (35% of user base)
- **Demographics**: 25-45, watches sports occasionally, checks scores on mobile
- **Goals**: Quick predictions before games, understand team form
- **Pain Points**: Too much data overload, don't understand complex stats
- **Features Needed**: Simple win/loss predictions, visual confidence scores, game previews

#### Persona 2: The Fantasy Player (25% of user base)
- **Demographics**: 22-40, plays fantasy sports, follows multiple leagues
- **Goals**: Optimize fantasy lineups, get player performance predictions
- **Pain Points**: Need player-level insights, injury updates, matchup analysis
- **Features Needed**: Player prop predictions, injury reports, matchup ratings, DFS recommendations

#### Persona 3: The Analytics Enthusiast (18% of user base)
- **Demographics**: 28-50, data-driven, follows advanced metrics
- **Goals**: Deep dive into models, understand methodology, track prediction accuracy
- **Pain Points**: Want transparency, model explanations, historical performance data
- **Features Needed**: Model explainability, feature importance, prediction history, accuracy metrics

#### Persona 4: The Sports Bettor (Information Seeker) (7% of user base)
- **Demographics**: 25-55, uses external betting platforms, seeks edge
- **Goals**: Compare predictions vs. odds, find value, understand market inefficiencies
- **Pain Points**: Need fast updates, live predictions, market comparison
- **Features Needed**: Odds comparison (read-only), value indicators, live updates, arbitrage alerts

#### Persona 5: The Multi-Sport Fan (15% of user base)
- **Demographics**: 22-45, seasonal switcher across 3+ sports (e.g., NFL → NBA → MLB → Soccer)
- **Goals**: One app for all sports, cross-sport "Today's Top Picks," personalized feed by favorite leagues
- **Pain Points**: Fragmented apps, too many taps to switch sports
- **Features Needed**: Sport selector carousel/tabs on home, cross-sport feed, per-sport filters, daily digest across favorites

---

## 2. Core Features & Differentiation

### 2.1 Core Features

#### 2.1.1 Multi-Sport & League Coverage (Core from Launch)
- **8+ sports at MVP/Phase 1**: NFL, NBA, MLB, NHL, Premier League Soccer, MLS/Champions League, College Football/Basketball, Tennis (Grand Slams), Esports (LoL/CS2 majors), UFC/MMA
- **Unified cross-sport dashboard**: Sport selector carousel/tabs on home; per-sport filters and data ingestion modularity (Sportradar + other providers)
- **Per-sport model specialization**: Dedicated models, feature sets, and drift detection per sport/league
- **Today's Top Picks**: Cross-sport feed of high-confidence picks across all supported sports
- **Modular data ingestion**: Pluggable adapters per sport (e.g., esports feeds for younger demographics)

#### 2.1.2 Pre-Game Predictions
- **Win Probability**: ML-based win probability with confidence intervals (per-sport tuned)
- **Score Predictions**: Expected final scores with ranges (e.g., "Team A 24-21, ±3 points")
- **Player Props**: Individual player performance predictions (points, rebounds, goals, etc.)
- **Game Flow Predictions**: When key events might occur (first goal, lead changes)
- **Injury Impact Analysis**: How injuries affect team performance

#### 2.1.3 Live In-Play Predictions
- **Dynamic Win Probability**: Updates every 30 seconds during games
- **Momentum Shifts**: Detect and alert on momentum changes
- **Key Event Predictions**: Next score, next goal scorer, quarter/half outcomes
- **Real-time Model Recalibration**: Adjust predictions based on live game state
- **Live Hub tab**: Dedicated view for ongoing games across sports with momentum graphs and alerts

#### 2.1.4 Explainability & Trust
- **Prediction Explanations**: "Team A favored because: +5.2 PPG offense, +3.1 home advantage, -2.3 key player injury"
- **Feature Importance**: Visual breakdown of top 5 factors influencing prediction
- **Confidence Scores**: Clear confidence levels (High/Medium/Low) with reasoning
- **Historical Accuracy**: Show model performance over time (e.g., "68% accuracy last 30 days")

#### 2.1.5 User Personalization & Discovery
- **Favorite Teams/Leagues**: Customized dashboard; onboarding wizard with multi-select sports/teams and quick persona quiz (Casual / Fantasy / Analytics)
- **AI-driven "For You" home feed**: Recommended picks based on favorites, viewing history, and trends
- **Prediction Alerts**: Granular (per-sport/team) and global "Trending Pick" push notifications
- **Daily digest pushes**: "Your Teams + High-Confidence Cross-Sport Picks"
- **Prediction History**: Track user's viewed predictions and outcomes; exportable for premium
- **Comparison Mode**: Compare predictions across different models

#### 2.1.6 Community & Gamification (Engagement & Retention)
- **Leaderboards**: Weekly/monthly accuracy contests; streaks and badges (e.g., "Prop Master," "Hot Streak 7 Days"); target DAU/MAU >35%, leaderboard participation as core metric
- **Pick Challenges**: User vs. AI, friend challenges, private groups
- **Shareable Picks**: One-tap export to X/Instagram with generated graphic (confidence %, reasoning, team logos)
- **User-Generated Tips**: Top-accuracy users can submit picks; verified track record for visibility and trust
- **Mini live polls / quick predictions**: Lightweight in-event engagement (e.g., "Who scores next?" during a game) for fun, non-gambling engagement
- **Metrics**: Daily picks viewed, leaderboard participation %, share rate, cross-sport session %

#### 2.1.7 Advanced Analytics
- **Team/Player Profiles**: Deep dive into performance metrics
- **Matchup Analysis**: Head-to-head history, style compatibility
- **Trend Detection**: Identify hot streaks, cold streaks, regression candidates
- **Market Comparison**: Compare predictions vs. betting odds (read-only, no betting)

### 2.2 Differentiation Factors

1. **Explainable AI**: Unlike black-box models, show users WHY predictions are made
2. **Multi-Model Ensemble**: Combine multiple specialized models per sport (team performance, player props, game flow)
3. **Real-time Adaptation**: Models that adjust during games, not just pre-game
4. **Transparency Dashboard**: Public model performance metrics, prediction accuracy tracking
5. **No Betting Integration**: Pure information platform builds trust and avoids regulatory issues
6. **Multi-Sport from Day One**: 8+ sports at launch with unified dashboard and Today's Top Picks
7. **Player-Level Granularity**: Not just team predictions, but individual player performance
8. **Social Prediction Community + Gamified Accuracy Challenges**: Leaderboards, shareable picks, challenges, and UGC from top users differentiate from static prediction tools

---

## 3. AI/ML Approach

### 3.1 Data Sources

#### 3.1.1 Primary Data Sources
- **Sports Data APIs (multi-sport)**:
  - Sportradar API (comprehensive, paid; primary for NFL, NBA, MLB, NHL, soccer)
  - TheSportsDB (free tier for basic data)
  - ESPN API (limited but free)
  - RapidAPI sports endpoints
  - **Esports**: Dedicated feeds for LoL, CS2 majors (Panda Score, Esports One, or similar) for younger demographics
- **Historical Game Data**: 
  - 5+ years of historical results per league
  - Play-by-play data for in-game modeling
  - Player statistics and performance metrics (per-sport)
- **Real-time Data Feeds**:
  - Live scores APIs (TheScore, FlashScore)
  - Play-by-play streaming for in-game predictions
- **External Context**:
  - Weather APIs (for outdoor sports)
  - Injury reports (scraped from official sources)
  - Team news and lineup announcements
  - Referee assignments (some sports show bias patterns)

#### 3.1.2 Data Collection Strategy
- **Batch Ingestion**: Daily cron jobs for historical data, schedules, rosters
- **Streaming Ingestion**: Real-time game events via WebSocket or polling (30s intervals)
- **Data Validation**: Schema validation, outlier detection, missing data handling
- **Data Storage**: Raw data in data lake (S3), processed features in feature store

### 3.2 Feature Engineering

#### 3.2.1 Team-Level Features
- **Recent Form**: Last 5/10 games win rate, average margin of victory/defeat
- **Home/Away Splits**: Performance differentials
- **Rest Days**: Days since last game (fatigue factor)
- **Head-to-Head**: Historical matchup performance
- **Strength of Schedule**: Opponent-adjusted metrics
- **Injury Impact**: ELO-style adjustments based on missing players
- **Time-of-Season**: Early season vs. playoff performance differences
- **Momentum**: Recent trend direction (improving/declining)

#### 3.2.2 Player-Level Features
- **Recent Performance**: Rolling averages (last 5/10 games)
- **Matchup History**: Performance vs. specific opponents
- **Usage Rate**: Minutes/touches/attempts per game
- **Efficiency Metrics**: Shooting %, completion %, etc.
- **Injury Status**: Days since return, minutes restrictions
- **Rest Days**: Player-specific rest
- **Home/Away Splits**: Player performance by venue

#### 3.2.3 Game Context Features
- **Weather**: Temperature, wind, precipitation (outdoor sports)
- **Venue**: Stadium characteristics, altitude
- **Referee**: Historical bias patterns (if available)
- **Time Zone**: Travel effects, jet lag
- **Stakes**: Regular season vs. playoff intensity
- **Lineup Changes**: Last-minute roster adjustments

#### 3.2.4 In-Game Features (Live Predictions)
- **Current Score**: Score differential, time remaining
- **Momentum**: Recent scoring runs, possession time
- **Key Events**: Injuries, ejections, substitutions
- **Time Decay**: How much time left affects comeback probability
- **Game State**: Quarter/half, timeout usage, foul trouble

#### 3.2.5 Feature Store Architecture
- **Offline Features**: Pre-computed daily for all upcoming games
- **Online Features**: Real-time computed during games
- **Feature Versioning**: Track feature changes for model reproducibility
- **Feature Monitoring**: Detect feature drift, missing values, outliers

### 3.3 Model Types

#### 3.3.1 Pre-Game Win Probability Model
**Primary Model**: Gradient Boosting (XGBoost/LightGBM)
- **Why**: Handles non-linear relationships, feature interactions, robust to outliers
- **Input**: 200+ engineered features (team form, injuries, context)
- **Output**: Win probability (0-1), expected score margin
- **Training**: Daily retraining on last 2 years of data
- **Ensemble**: Combine with neural network for robustness

**Secondary Model**: Deep Neural Network (PyTorch/TensorFlow)
- **Architecture**: 3-4 hidden layers (256, 128, 64 neurons), dropout (0.3)
- **Purpose**: Capture complex non-linear patterns
- **Ensemble Weight**: 30% (70% gradient boosting)

**Tertiary Model**: Logistic Regression (Baseline)
- **Purpose**: Interpretable baseline, feature importance
- **Ensemble Weight**: 10% (for explainability)

**Final Prediction**: Weighted ensemble (70% XGBoost, 30% Neural Net, 10% Logistic)

#### 3.3.2 Score Prediction Model
**Model**: Poisson Regression (for low-scoring sports) + Neural Network
- **Why**: Scores follow Poisson-like distributions
- **Output**: Expected score for each team, confidence intervals
- **Specialization**: Separate models per sport (NFL different from NBA)

#### 3.3.3 Player Prop Models
**Model**: Random Forest + XGBoost Ensemble
- **Why**: Player stats have high variance, ensemble reduces overfitting
- **Specialization**: Separate models per position/role
- **Features**: Matchup difficulty, usage rate, recent form, injury status

#### 3.3.4 Live In-Play Model
**Model**: Recurrent Neural Network (LSTM/GRU) + Real-time XGBoost
- **Why**: Sequential game state requires temporal modeling
- **Architecture**: 
  - LSTM processes play-by-play sequence
  - XGBoost uses current game state features
  - Ensemble combines both
- **Update Frequency**: Every 30 seconds during games
- **Features**: Current score, time remaining, momentum, recent events

#### 3.3.5 Model Specialization Strategy
- **Per-Sport / Per-League Models**: NFL, NBA, MLB, NHL, Premier League, MLS, Champions League, College Football/Basketball, Tennis, Esports, UFC/MMA (different rules, different patterns); ensemble tuning per sport
- **Per-Game-Type Models**: Regular season vs. playoffs (different intensity)
- **Per-Time-Period Models**: Early season vs. late season (teams evolve)
- **Sport-specific drift detection**: Monitor feature and prediction drift per sport; trigger retraining or alerts per league

### 3.4 Model Training Pipeline

#### 3.4.1 Training Infrastructure
- **Framework**: MLflow for experiment tracking, model versioning
- **Compute**: AWS SageMaker / Google Vertex AI for distributed training
- **Training Schedule**: 
  - Daily retraining (overnight, after all games complete)
  - Incremental updates (add new games, remove old games)
  - Full retraining weekly (to catch long-term trends)

#### 3.4.2 Training Process
1. **Data Preparation**: 
   - Load historical games (last 2 years)
   - Feature engineering pipeline
   - Train/validation/test split (70/15/15)
2. **Hyperparameter Tuning**: 
   - Bayesian optimization (Optuna)
   - Cross-validation (time-series aware, no data leakage)
3. **Model Training**: 
   - Train ensemble components
   - Calibrate probabilities (Platt scaling)
4. **Validation**: 
   - Backtesting on held-out test set
   - Check calibration (Brier score, reliability diagrams)
5. **Model Registry**: 
   - Version models in MLflow
   - A/B test new models vs. production
6. **Deployment**: 
   - Gradual rollout (10% → 50% → 100% traffic)
   - Monitor performance metrics

#### 3.4.3 Model Evaluation Metrics
- **Accuracy**: Win/loss prediction accuracy
- **Brier Score**: Probability calibration quality
- **Log Loss**: Probabilistic prediction quality
- **ROI Simulation**: If predictions were used vs. market odds (information value)
- **Feature Importance**: Track which features matter most

### 3.5 Model Retraining & Drift Detection

#### 3.5.1 Drift Detection
**Statistical Tests**:
- **KS Test**: Compare feature distributions (training vs. production)
- **PSI (Population Stability Index)**: Monitor feature drift
- **Prediction Drift**: Monitor prediction distribution changes
- **Performance Drift**: Track accuracy degradation over time
- **Sport-specific drift**: Run drift checks per sport/league; separate thresholds and retraining triggers per domain

**Automated Alerts**:
- Alert if PSI > 0.25 (significant drift)
- Alert if accuracy drops > 5% over 7 days (per sport)
- Alert if prediction distribution shifts significantly

#### 3.5.2 Retraining Triggers
1. **Scheduled**: Daily incremental, weekly full retrain
2. **Drift-Based**: Retrain if drift detected
3. **Performance-Based**: Retrain if accuracy degrades
4. **Data-Based**: Retrain when new season starts (rule changes, roster changes)

#### 3.5.3 Retraining Strategy
- **Incremental Learning**: Add new games, remove old games (sliding window)
- **Full Retraining**: Complete retrain when significant changes detected
- **A/B Testing**: New models compete with production models
- **Rollback**: Automatic rollback if new model underperforms

### 3.6 Explainability & Trust

#### 3.6.1 Prediction Explanations
**SHAP Values** (SHapley Additive exPlanations):
- Show top 5 features contributing to prediction
- Visualize feature contributions (positive/negative)
- Example: "Team A +15% win probability because: +8% home advantage, +5% recent form, +2% rest days"

**LIME** (Local Interpretable Model-agnostic Explanations):
- Generate local explanations for individual predictions
- Highlight which game factors matter most

**Feature Importance Rankings**:
- Global: Which features matter most across all predictions
- Local: Which features matter for this specific game

#### 3.6.2 Trust Building Features
- **Transparency Dashboard**: 
  - Model accuracy over time (public)
  - Prediction history (what we predicted vs. what happened)
  - Confidence calibration (are we overconfident/underconfident?)
- **Prediction Confidence Levels**:
  - High (70%+): Strong model agreement, clear favorite
  - Medium (55-70%): Moderate confidence, close game
  - Low (<55%): High uncertainty, coin flip
- **Historical Performance**:
  - "Our model predicted 68% of games correctly last month"
  - "We beat market odds 52% of the time (value indicator)"
- **Model Cards**: 
  - Explain model methodology
  - Show training data characteristics
  - Disclose limitations

#### 3.6.3 User Education
- **Glossary**: Explain metrics (expected value, confidence intervals)
- **Tutorials**: How to interpret predictions, confidence scores
- **Blog**: Regular posts on model improvements, methodology

---

## 4. Backend System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────┐
│  Mobile Apps    │ (iOS, Android)
└────────┬────────┘
         │ HTTPS/REST + WebSocket
         ▼
┌─────────────────────────────────────────┐
│         API Gateway (Kong/AWS)          │
│  - Rate Limiting, Auth, Routing         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Application Services Layer          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │Prediction│  │  Live    │  │  User  ││
│  │ Service  │  │  Updates │  │ Service││
│  └──────────┘  └──────────┘  └────────┘│
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      ML Inference Layer                  │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Pre-Game │  │  Live    │  │ Player ││
│  │  Models  │  │  Models  │  │ Props  ││
│  └──────────┘  └──────────┘  └────────┘│
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Data Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │PostgreSQL│  │  Redis   │  │  S3    ││
│  │  (Main)  │  │ (Cache)  │  │(Models)││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
```

### 4.2 Technology Stack

#### 4.2.1 Backend Framework
- **Primary**: Python 3.11+ with FastAPI
  - Why: High performance, async support, automatic API docs, type hints
- **Alternative**: Node.js with Express (if team prefers JS)
- **Microservices**: Separate services for predictions, live updates, user management

#### 4.2.2 ML Infrastructure
- **Training**: AWS SageMaker / Google Vertex AI
- **Inference**: 
  - **Batch**: Pre-compute predictions for all upcoming games (daily)
  - **Real-time**: On-demand inference for live games (TensorFlow Serving / TorchServe)
- **Model Registry**: MLflow
- **Feature Store**: Feast (open-source) or Tecton (enterprise)

#### 4.2.3 Databases
- **Primary Database**: PostgreSQL 15+
  - **Tables**: Users, games, predictions, teams, players, user_favorites
  - **Why**: ACID compliance, JSON support, excellent for relational data
- **Time-Series Data**: TimescaleDB (PostgreSQL extension)
  - **Use Case**: Historical game data, prediction history, live game events
- **Document Store**: MongoDB (optional, for flexible schemas)
  - **Use Case**: Player profiles, team stats, unstructured data

#### 4.2.4 Caching Strategy
- **Redis** (Primary Cache):
  - **Pre-game predictions**: Cache for 1 hour (predictions don't change until game starts)
  - **Live predictions**: Cache for 30 seconds (frequent updates)
  - **User sessions**: Store JWT tokens, user preferences
  - **Rate limiting**: Track API calls per user
- **CDN** (CloudFront/Cloudflare):
  - **Static assets**: Images, team logos, player photos
  - **API responses**: Cache GET requests for public data (games, teams)

#### 4.2.5 Message Queue & Streaming
- **Message Queue**: Apache Kafka / AWS Kinesis
  - **Use Case**: 
    - Live game events (scores, plays)
    - Model prediction updates
    - User notification events (granular: per-sport/team; global: "Trending Pick" alerts)
- **Stream Processing**: Apache Flink / AWS Kinesis Analytics
  - **Use Case**: Real-time feature computation for live predictions

#### 4.2.6 Infrastructure
- **Cloud Provider**: AWS (primary) or GCP
- **Containerization**: Docker + Kubernetes (EKS/GKE)
- **Orchestration**: Kubernetes for auto-scaling, service discovery
- **Service Mesh**: Istio (optional, for advanced traffic management)

### 4.3 API Design

#### 4.3.1 REST API Endpoints

**Authentication**:
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

**Games & Predictions** (sport/league params for multi-sport):
```
GET  /api/v1/games/upcoming?league=nfl&sport=nfl&date=2026-02-10
GET  /api/v1/games/upcoming?leagues=nba,premier_league   # multi-league filter
GET  /api/v1/games/{gameId}
GET  /api/v1/games/{gameId}/predictions
GET  /api/v1/games/{gameId}/live-predictions  # WebSocket preferred
GET  /api/v1/games/{gameId}/explanation       # SHAP values, feature importance
GET  /api/v1/feed/top-picks?sport=nfl&limit=10 # Today's Top Picks cross-sport
```

**Player Props**:
```
GET  /api/v1/players/{playerId}/props?gameId={gameId}
GET  /api/v1/games/{gameId}/player-props
```

**User Features**:
```
GET  /api/v1/user/favorites
POST /api/v1/user/favorites/teams
POST /api/v1/user/favorites/leagues
GET  /api/v1/user/prediction-history
GET  /api/v1/user/notifications
GET  /api/v1/user/for-you?sports=nfl,nba     # For You feed (personalized)
```

**Gamification & Community**:
```
GET  /api/v1/leaderboards?period=weekly&sport=nfl
GET  /api/v1/challenges/active
POST /api/v1/challenges/{id}/join
GET  /api/v1/user/badges
POST /api/v1/picks/{id}/share                # Generate share graphic
GET  /api/v1/community/tips?verified=1      # User-generated tips (verified)
```

**Analytics**:
```
GET  /api/v1/analytics/model-performance
GET  /api/v1/analytics/prediction-accuracy
GET  /api/v1/teams/{teamId}/stats
GET  /api/v1/players/{playerId}/stats
```

#### 4.3.2 WebSocket API (Live Updates)
```
WS /ws/live/{gameId}
  - Subscribe to live prediction updates
  - Receive: score updates, prediction recalculation, key events
  - Heartbeat: 30s ping/pong
```

#### 4.3.3 API Versioning
- **URL Versioning**: `/api/v1/`, `/api/v2/`
- **Backward Compatibility**: Maintain v1 for 6 months after v2 launch
- **Deprecation**: 3-month notice before removing endpoints

#### 4.3.4 Rate Limiting
- **Free Tier**: 100 requests/hour
- **Premium Tier**: 1000 requests/hour
- **B2B Tier**: 10,000 requests/hour
- **Implementation**: Redis-based token bucket algorithm

### 4.4 Database Schema Design

#### 4.4.1 Core Tables

**users**:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**games**:
```sql
CREATE TABLE games (
    id UUID PRIMARY KEY,
    league VARCHAR(50) NOT NULL,
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, live, finished
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**predictions**:
```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id),
    model_version VARCHAR(50) NOT NULL,
    home_win_probability DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    away_win_probability DECIMAL(5,4) NOT NULL,
    expected_home_score DECIMAL(5,2),
    expected_away_score DECIMAL(5,2),
    confidence_level VARCHAR(20), -- high, medium, low
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(game_id, model_version, created_at)
);
```

**prediction_explanations**:
```sql
CREATE TABLE prediction_explanations (
    id UUID PRIMARY KEY,
    prediction_id UUID REFERENCES predictions(id),
    feature_name VARCHAR(100) NOT NULL,
    feature_value DECIMAL(10,4),
    shap_value DECIMAL(10,4), -- contribution to prediction
    rank INTEGER -- top 5 features ranked
);
```

**live_predictions** (TimescaleDB hypertable):
```sql
CREATE TABLE live_predictions (
    time TIMESTAMP NOT NULL,
    game_id UUID NOT NULL,
    home_win_probability DECIMAL(5,4),
    away_win_probability DECIMAL(5,4),
    current_score_home INTEGER,
    current_score_away INTEGER,
    PRIMARY KEY (time, game_id)
);
SELECT create_hypertable('live_predictions', 'time');
```

#### 4.4.2 Indexing Strategy
- **Primary Keys**: UUID with B-tree indexes
- **Foreign Keys**: Indexed for JOIN performance
- **Time-Series**: TimescaleDB automatic indexing on time column
- **Query Optimization**: Composite indexes on (league, scheduled_time), (game_id, created_at)

### 4.5 Scalability Considerations

#### 4.5.1 Horizontal Scaling
- **Stateless Services**: All API services are stateless, can scale horizontally
- **Load Balancing**: Application Load Balancer (AWS) distributes traffic
- **Auto-Scaling**: 
  - Scale based on CPU (70% threshold)
  - Scale based on request queue length
  - Scale based on prediction latency (P95 < 200ms)

#### 4.5.2 Database Scaling
- **Read Replicas**: 3+ read replicas for PostgreSQL (read-heavy workload)
- **Connection Pooling**: PgBouncer for connection management
- **Sharding** (Future): Shard by league if single database becomes bottleneck
- **Caching**: Aggressive Redis caching (90%+ cache hit rate target)

#### 4.5.3 ML Inference Scaling
- **Batch Pre-computation**: Pre-compute all predictions overnight (no real-time load)
- **Model Serving**: 
  - TensorFlow Serving / TorchServe with GPU instances
  - Auto-scale based on inference queue length
- **Model Caching**: Cache model predictions in Redis (pre-game predictions don't change)

#### 4.5.4 CDN & Edge Computing
- **Static Assets**: CloudFront CDN for images, logos
- **API Caching**: Cache public GET endpoints at edge (games, teams)
- **Geographic Distribution**: Deploy in multiple regions (US-East, US-West, EU)

#### 4.5.5 Performance Targets
- **API Latency**: P95 < 200ms (pre-game predictions), P95 < 500ms (live predictions)
- **Throughput**: 10,000 requests/second (peak)
- **Availability**: 99.9% uptime (8.76 hours downtime/year)
- **Database**: < 50ms query latency (P95)

---

## 5. Mobile App Architecture

### 5.1 Technology Stack

#### 5.1.1 Cross-Platform Framework
**Primary Choice**: React Native (with Expo)
- **Why**: 
  - Single codebase for iOS + Android
  - Large ecosystem, active community
  - Good performance for this use case
  - Expo simplifies deployment

**Alternative**: Flutter (if team prefers Dart/Google ecosystem)
- **Pros**: Better performance, more consistent UI
- **Cons**: Smaller ecosystem, less mature

**Native**: Only if performance is critical (unlikely for this app)

#### 5.1.2 State Management
**Primary**: Redux Toolkit + RTK Query
- **Why**: 
  - Predictable state management
  - RTK Query handles API calls, caching automatically
  - Good DevTools for debugging
- **Structure**:
  - `authSlice`: User authentication state
  - `gamesSlice`: Games, predictions, live updates
  - `userSlice`: User preferences, favorites
  - `notificationsSlice`: Push notification state

**Alternative**: Zustand (lighter weight, simpler API)
- Consider if Redux feels overkill

#### 5.1.3 Real-Time Updates
- **WebSocket**: `react-native-websocket` or `socket.io-client`
- **Connection Management**: 
  - Auto-reconnect on disconnect
  - Subscribe/unsubscribe to games on-demand
  - Heartbeat to keep connection alive
- **Fallback**: Long polling if WebSocket fails

#### 5.1.4 UI Framework
- **Component Library**: React Native Paper (Material Design) or NativeBase
- **Custom Components**: Build prediction cards, confidence indicators, explanation views
- **Animations**: React Native Reanimated for smooth transitions

#### 5.1.5 Navigation
- **Library**: React Navigation v6
- **Structure**: 
  - Tab Navigator (Home, Games, Live Hub, Favorites, Profile)
  - Stack Navigator (Game Details, Prediction Explanation, Settings, Leaderboards, Challenges)
  - **Sport selector**: Carousel or horizontal tabs on Home/Games for 8+ sports; dynamic tabs per user favorites (optional)
  - **Gamification screens**: Leaderboards (weekly/monthly, per-sport), Pick Challenges (vs. AI, friends, groups), Share Picks (share sheet + graphic generation)

#### 5.1.6 Offline Support
- **Storage**: AsyncStorage (simple) or Realm (complex queries)
- **Cache Strategy**: 
  - Cache predictions for 1 hour
  - Cache game schedules for 24 hours
  - Show "Last updated" timestamp
- **Sync**: Refresh on app open, background refresh

### 5.2 App Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer           │
│  ┌──────────┐  ┌──────────┐        │
│  │ Screens  │  │Components│        │
│  └──────────┘  └──────────┘        │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│      State Management (Redux)       │
│  ┌──────────┐  ┌──────────┐        │
│  │  Slices  │  │RTK Query │        │
│  └──────────┘  └──────────┘        │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│      Services Layer                 │
│  ┌──────────┐  ┌──────────┐        │
│  │   API    │  │WebSocket │        │
│  └──────────┘  └──────────┘        │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│      Storage Layer                   │
│  ┌──────────┐  ┌──────────┐        │
│  │ AsyncStor│  │   Cache  │        │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
```

### 5.3 Key Screens & Features

#### 5.3.1 Home Screen
- **Sport selector**: Carousel or tabs (All, NFL, NBA, MLB, NHL, Soccer, College, Tennis, Esports, UFC/MMA) for unified cross-sport dashboard
- **Today's Top Picks**: Cross-sport feed of high-confidence picks (single scroll or horizontal strip)
- **For You feed**: AI-driven recommended picks based on favorites + history + trends
- **Upcoming Games**: List of games today/tomorrow with predictions (filterable by sport)
- **Quick Predictions**: Win probability cards with confidence indicators
- **Live Games**: Active games with real-time updates
- **Pull to Refresh**: Manual refresh

#### 5.3.2 Live Hub Tab
- **Dedicated tab**: Ongoing games across all sports
- **Momentum graphs**: Per-game win probability over time
- **Alerts**: Key events, momentum shifts; granular per-sport/team notification settings
- **Quick polls / mini predictions**: Optional in-event engagement (e.g., "Who scores next?")

#### 5.3.3 Game Detail Screen
- **Pre-Game**: 
  - Win probability visualization (pie chart, bar chart)
  - Score prediction
  - Key factors (top 5 features)
  - Player props (if premium)
- **Live Game**:
  - Live score
  - Dynamic win probability (updates every 30s)
  - Key events timeline
  - Momentum indicators

#### 5.3.4 Prediction Explanation Screen
- **Visual Breakdown**: 
  - Feature importance chart (horizontal bar chart)
  - SHAP values visualization
  - "Why Team A is favored" text explanation
- **Confidence Indicator**: Visual confidence meter
- **Historical Context**: Similar games, historical accuracy

#### 5.3.5 Favorites Screen
- **Favorite Teams**: Quick access to team predictions
- **Favorite Leagues**: Filter by league
- **Notification Settings**: Toggle alerts for games

#### 5.3.6 Profile Screen
- **Subscription Status**: Current tier, upgrade options, trial status
- **Prediction History**: Past predictions viewed, outcomes (exportable for premium)
- **Badges & Leaderboard**: Link to leaderboards, challenges, earned badges
- **Settings**: Notifications (granular per-sport/team), preferences, logout

### 5.4 Real-Time Updates Implementation

#### 5.4.1 WebSocket Connection
```javascript
// Pseudo-code structure
class LiveUpdateService {
  connect(gameId) {
    // Establish WebSocket connection
    // Subscribe to game updates
  }
  
  onMessage(callback) {
    // Handle: score updates, prediction updates, key events
  }
  
  disconnect() {
    // Cleanup, unsubscribe
  }
}
```

#### 5.4.2 Update Strategy
- **Frequency**: Receive updates every 30 seconds during live games
- **Optimistic Updates**: Update UI immediately, handle errors gracefully
- **Batching**: Batch multiple updates if connection was offline
- **Background**: Keep connection alive in background (limited battery impact)

### 5.5 Performance Optimization

#### 5.5.1 Code Splitting
- **Lazy Loading**: Load screens on-demand
- **Bundle Size**: Keep initial bundle < 2MB

#### 5.5.2 Image Optimization
- **CDN**: Load images from CDN
- **Caching**: Cache team logos, player photos locally
- **Format**: Use WebP for smaller file sizes

#### 5.5.3 List Performance
- **Virtualization**: Use `FlatList` with `getItemLayout` for smooth scrolling
- **Pagination**: Load games in pages (20 per page)

#### 5.5.4 Memory Management
- **Cleanup**: Unsubscribe from WebSocket on screen unmount
- **Image Caching**: Limit cache size (e.g., 50MB)

---

## 6. Security, Compliance & Ethics

### 6.1 Security

#### 6.1.1 Authentication & Authorization
- **Password Hashing**: bcrypt (cost factor 12)
- **JWT Tokens**: 
  - Access token (15 min expiry)
  - Refresh token (7 days expiry, stored in httpOnly cookie)
- **OAuth**: Optional Google/Apple Sign-In
- **2FA**: Optional for premium users

#### 6.1.2 API Security
- **HTTPS Only**: TLS 1.3, enforce HTTPS everywhere
- **Rate Limiting**: Prevent abuse, DDoS protection
- **Input Validation**: Sanitize all inputs, prevent SQL injection
- **CORS**: Restrict to mobile app domains only
- **API Keys**: Rotate keys regularly, use environment variables

#### 6.1.3 Data Security
- **Encryption at Rest**: Encrypt database (AES-256)
- **Encryption in Transit**: TLS for all connections
- **PII Handling**: Minimize PII collection, encrypt sensitive data
- **Data Retention**: Delete user data after account deletion (GDPR compliance)

#### 6.1.4 Infrastructure Security
- **Secrets Management**: AWS Secrets Manager / HashiCorp Vault
- **Network Security**: VPC, security groups, private subnets
- **DDoS Protection**: CloudFlare / AWS Shield
- **Vulnerability Scanning**: Regular dependency updates, security audits

### 6.2 Compliance

#### 6.2.1 GDPR (EU Users)
- **Privacy Policy**: Clear, accessible
- **Data Portability**: Export user data on request
- **Right to Deletion**: Delete user data within 30 days
- **Consent Management**: Cookie consent, data usage consent
- **Data Processing Agreement**: With third-party vendors (AWS, etc.)

#### 6.2.2 CCPA (California Users)
- **Do Not Sell**: Opt-out mechanism (we don't sell data, but provide option)
- **Data Disclosure**: Transparent about data collection
- **Deletion Rights**: Same as GDPR

#### 6.2.3 COPPA (Under-13 Users)
- **Age Verification**: Require 13+ age
- **Parental Consent**: If allowing under-13, require parental consent

#### 6.2.4 Sports Data Licensing
- **API Terms**: Comply with sports data API terms (no redistribution)
- **Attribution**: Credit data sources where required

### 6.3 Ethics

#### 6.3.1 Responsible AI
- **Bias Detection**: Monitor for demographic bias in predictions
- **Fairness**: Ensure predictions don't discriminate
- **Transparency**: Disclose model limitations, uncertainty

#### 6.3.2 User Protection
- **No Gambling**: Explicitly state app is information-only
- **Gamification**: Leaderboards, challenges, and badges are designed for fun and skill (accuracy), not addictive loops; no real-money stakes or compulsive mechanics
- **Accuracy Claims**: Don't overstate prediction accuracy

#### 6.3.3 Data Ethics
- **Minimal Data Collection**: Only collect necessary data
- **User Control**: Users control their data, can delete anytime
- **No Dark Patterns**: No manipulative UI to drive engagement

---

## 7. Monetization Strategy

### 7.1 Freemium Model (Refined for 2026)

#### 7.1.1 Free Tier
**Limitations**:
- **3–5 sports limit**: User selects which sports to follow; rest locked or teaser-only
- **Basic win probabilities**: Full win/loss and confidence for selected sports only
- **Watermarked explanations**: Top 3 features visible; full explanation blurred or "Unlock with Premium"
- **Non-intrusive ads**: Banner or rewarded; no interstitials on critical flows
- **Limited daily predictions**: Cap (e.g., 10–15 predictions per day) to encourage upgrade
- **No player props** (or 1–2 teaser props per day)
- **No live in-play depth**: Basic live score only; live win probability and momentum behind paywall
- **Teaser unlocks**: Occasional "Unlock Today's NFL Picks Free" or single-sport unlock to showcase value

**Goal**: Acquire users, demonstrate value, drive trial sign-up; target 8–12% conversion to premium

#### 7.1.2 Premium Tier ($9.99/month or $99/year)
**Features**:
- **Unlimited sports/leagues**: Access to all 8+ sports and leagues
- **Full player props & live depth**: All player props, live in-play predictions, momentum graphs
- **Ad-free** experience
- **Full explanations**: All features, no watermarking; exportable explanation text
- **Priority alerts**: Granular per-sport/team + global "Trending Pick" push notifications
- **Exportable prediction history**: Download or share history for personal use
- **Leaderboards & challenges**: Full access to Pick Challenges, leaderboards, badges
- **7-day free trial**: Full premium access for 3–7 days; cancel anytime
- **Early access**: New sports/leagues and features first

**Target**: 8–12% conversion rate from free to premium; retention >35% DAU/MAU

#### 7.1.3 Premium+ Tier ($19.99/month) [Optional]
**Additional Features**:
- Advanced analytics (team/player deep dives)
- Custom prediction alerts (e.g., "Notify when confidence >70% for Team X")
- API access (limited)
- Priority support
- Beta features

### 7.2 B2B Strategy

#### 7.2.1 API Licensing
**Target Customers**:
- Sports media companies
- Fantasy sports platforms
- Sports analytics websites
- Betting platforms (read-only, information only)

**Pricing**:
- **Starter**: $499/month (10,000 API calls/month)
- **Professional**: $1,999/month (100,000 API calls/month)
- **Enterprise**: Custom pricing (unlimited, SLA, dedicated support)

**Value Proposition**: 
- High-quality predictions without building ML team
- White-label solution
- Real-time updates

#### 7.2.2 White-Label Solution
- **Target**: Sports media companies, broadcasters
- **Offer**: Custom-branded prediction widgets
- **Pricing**: $5,000-$50,000/month (depending on usage)

### 7.3 Revenue Projections (Year 1-3)

#### Year 1 (Launch Year)
- **Users**: 100,000 free, 5,000 premium (5% conversion)
- **Revenue**: 
  - Premium: $50,000/month = $600,000/year
  - B2B: $20,000/month = $240,000/year
  - **Total**: $840,000/year

#### Year 2 (Growth)
- **Users**: 500,000 free, 50,000 premium (10% conversion)
- **Revenue**:
  - Premium: $500,000/month = $6,000,000/year
  - B2B: $100,000/month = $1,200,000/year
  - **Total**: $7,200,000/year

#### Year 3 (Scale)
- **Users**: 2,000,000 free, 200,000 premium (10% conversion)
- **Revenue**:
  - Premium: $2,000,000/month = $24,000,000/year
  - B2B: $500,000/month = $6,000,000/year
  - **Total**: $30,000,000/year

### 7.4 Unit Economics

#### Customer Acquisition Cost (CAC)
- **Target**: $5-10 per free user (social media ads, app store optimization)
- **Premium Conversion**: 5-10% = $50-200 CAC per premium user

#### Lifetime Value (LTV)
- **Premium User**: $9.99/month × 12 months average retention = $120 LTV
- **LTV:CAC Ratio**: 2.4:1 to 6:1 (healthy)

#### Churn Management
- **Target Churn**: < 5% monthly churn
- **Retention Strategies**: 
  - Onboarding emails
  - Win-back campaigns
  - Feature updates
  - Accuracy improvements

---

## 8. Implementation Roadmap

### 8.1 MVP (Months 1-3)
**Goal**: Launch multi-sport prediction app with NFL + NBA + Soccer and engagement hooks

**Features**:
- User authentication; onboarding wizard (multi-select sports/teams, persona quiz)
- Pre-game win probability predictions for NFL, NBA, Premier League (or MLS)
- Unified home with sport selector carousel/tabs; Today's Top Picks cross-sport feed
- Basic explanation (top 3 features); watermarked full explanation for free
- **Leaderboards**: Weekly accuracy leaderboard (at least one sport)
- **Shareable Picks**: One-tap share to X/Instagram with generated graphic (confidence %, reasoning, logos)
- iOS + Android apps

**Team**: 2 backend engineers, 1 ML engineer, 1 mobile engineer, 1 designer

### 8.2 Phase 2 (Months 4-6)
**Goal**: More sports, Live Hub, Pick Challenges

**Features**:
- Add MLB, NHL, College Football/Basketball, Tennis (Grand Slams), optional Esports/UFC
- **Live Hub tab**: Ongoing games across sports with momentum graphs and alerts
- Live in-play predictions; improved explanations (SHAP values)
- **Pick Challenges**: User vs. AI, friend challenges, private groups
- Push notifications (granular per-sport/team + global "Trending Pick")
- Premium subscription (Stripe); 7-day free trial

### 8.3 Phase 3 (Months 7-9)
**Goal**: Premium depth, player props, retention

**Features**:
- Full player prop predictions (premium)
- Prediction history (exportable for premium)
- **User-Generated Tips**: Verified top-accuracy users can submit picks; visibility by track record
- **Badges & streaks**: Prop Master, Hot Streak 7 Days, etc.
- Daily digest pushes: "Your Teams + High-Confidence Cross-Sport Picks"
- For You feed tuning

### 8.4 Phase 4 (Months 10-12)
**Goal**: Scale, B2B, esports/UFC expansion

**Features**:
- 10+ leagues; esports (LoL/CS2 majors), UFC/MMA where not yet present
- B2B API launch
- Performance optimizations; international expansion
- Mini live polls / quick predictions (in-event engagement)

---

## 9. Success Metrics

### 9.1 Product Metrics
- **DAU/MAU Ratio**: > 35% (target for strong engagement and retention)
- **Session Length**: > 5 minutes average
- **Predictions per User**: > 3 per session
- **Daily picks viewed**: Per-user and aggregate; track For You and Top Picks effectiveness
- **Cross-sport session %**: % of sessions where user views 2+ sports; indicator of multi-sport stickiness
- **Leaderboard participation %**: % of DAU that views or interacts with leaderboards/challenges
- **Share rate**: % of predictions that trigger a share (X/Instagram); viral and engagement proxy
- **Return Rate**: > 40% weekly return rate

### 9.2 ML Metrics
- **Prediction Accuracy**: > 65% (beats 50% baseline significantly); per-sport tracking
- **Brier Score**: < 0.20 (well-calibrated probabilities)
- **Model Latency**: < 200ms (P95) for pre-game, < 500ms for live

### 9.3 Business Metrics
- **Premium Conversion**: 8–12% (target range)
- **Monthly Churn**: < 5%
- **CAC Payback**: < 3 months
- **LTV**: > $100 per premium user
- **Trial-to-paid**: Track 7-day trial conversion and cancel-at-trial-end rate

---

## 10. Risk Mitigation

### 10.1 Technical Risks
- **Model Accuracy**: Continuous monitoring, A/B testing, ensemble methods
- **Scalability**: Load testing, auto-scaling, caching strategy
- **Data Quality**: Data validation pipelines, outlier detection

### 10.2 Business Risks
- **Low Conversion**: A/B test pricing, improve free tier value
- **High Churn**: Improve product, better onboarding, win-back campaigns
- **Competition**: Focus on differentiation (explainability, accuracy)

### 10.3 Regulatory Risks
- **Gambling Regulations**: Explicitly state information-only, no betting
- **Data Privacy**: GDPR/CCPA compliance, regular audits
- **Sports Data Licensing**: Comply with API terms, proper attribution

---

## Conclusion

This architecture is designed for production-scale deployment, serving millions of users globally, with **2026 market fit**: multi-sport from launch, gamification and social features for engagement, and refined freemium to boost DAU, retention, and premium conversion.

**Core strengths (preserved)**:
1. **Explainable AI**: Transparency builds trust; full explanations for premium, watermarked teasers for free
2. **Multi-model Ensemble**: Per-sport specialization and ensemble tuning for better accuracy
3. **Real-time Adaptation**: Live predictions that update during games; Live Hub for cross-sport live experience
4. **Scalable Architecture**: Horizontal scaling, caching, CDN; sport/league query params across APIs
5. **Freemium + B2B**: Refined tiers (3–5 sport limit, trial, teaser unlocks) targeting 8–12% conversion and >35% DAU/MAU
6. **No-betting purity**: Information-only platform; gamification for skill and community, not gambling

**Enhancements for engagement and retention**:
- **Multi-sport**: 8+ sports at MVP/Phase 1 with unified dashboard, Today's Top Picks, and per-sport models
- **Community & gamification**: Leaderboards, Pick Challenges, shareable picks, UGC tips, badges
- **Personalization**: For You feed, onboarding wizard, daily digest, granular notifications
- **Metrics**: Daily picks viewed, leaderboard participation %, share rate, cross-sport session %

The system is built to evolve: models improve per sport, features expand (esports, UFC, more leagues), and the platform scales with user growth while maintaining a clear, production-baseline design.
