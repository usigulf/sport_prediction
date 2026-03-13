# Architecture Comparison: SportOracle vs Production Design vs PredictIQ

This document compares the three architecture sources in the repo:

| Document | Scope | Length | Positioning |
|----------|--------|--------|-------------|
| **ARCHITECTURE.md** | SportOracle — full technical architecture | ~2,500 lines | Betting-informed analytics; multiple tiers including “Sharp” / API |
| **ARCHITECTURE_DESIGN.md** | AI-Powered Sports Prediction Mobile Application | ~1,000 lines | Production design; **no betting**; information-only |
| **PredictIQ_ARCHITECTURE.md** | PredictIQ — complete system architecture | ~1,100 lines | **Information-only**; legal disclaimers; phased sports & rollout |

---

## 1. Product vision & positioning

| Aspect | ARCHITECTURE.md (SportOracle) | ARCHITECTURE_DESIGN.md | PredictIQ_ARCHITECTURE.md |
|--------|-------------------------------|------------------------|----------------------------|
| **Mission** | Democratize sports analytics; sell *insight* and explainable reasoning, not “sure things” | Accurate, transparent, real-time predictions; help fans make informed decisions | Information-only platform; transparent, explainable AI — not gambling advice |
| **Betting** | Personas include “Analytical Bettor,” “Entertainment Bettor,” “Sharp/Syndicate”; feature matrix includes odds, line movement, value | Explicit: **no betting integration** — pure information, read-only odds comparison | Explicit: **no wagering**; legal positioning and disclaimers called out |
| **Personas** | 4: Data-Driven Dan, Casual Casey, Fantasy Frank, Professional Pete (with $ and betting behavior) | 4: Casual Fan (40%), Fantasy Player (30%), Analytics Enthusiast (20%), Sports Bettor as “Information Seeker” (10%) | 4: Casual Fan (60%), Analyst (25%), Content Creator (10%), Enterprise (5%) — table format, willingness to pay |
| **Tone** | Product and monetization focused; sharp/pro tiers | Trust and transparency; “no betting” as differentiator | Legal/compliance-aware; “information-only” and disclaimers emphasized |

**Takeaway:** PredictIQ and ARCHITECTURE_DESIGN are aligned on **information-only, no gambling**. SportOracle is broader and includes betting-oriented personas and features (odds, sharp movement, API for syndicates).

---

## 2. Core features

| Feature area | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------------|-----------------|------------------------|-----------|
| **Prediction feed** | Pre-game + live; spread/moneyline/totals; player props; tier matrix | Pre-game (win prob, score, props, injury impact); live (dynamic prob, momentum, key events) | Outcome + draw prob; confidence band; top factors; model consensus; historical accuracy badge |
| **Explainability** | “Prediction Autopsy” with SHAP; scenario engine; natural language | SHAP/LIME; feature importance; confidence levels; historical accuracy | “Why This Prediction?” — SHAP bar chart, **LLM/NLG narrative**, comparable matchups, **counter-arguments** |
| **Live / in-play** | Live momentum score; sharp movement; sub-second API for pros | Dynamic win prob (e.g. 30s); momentum; key events; real-time recalibration | Win prob graph; momentum; “Upset Alert”; key moment annotations on timeline |
| **Accuracy transparency** | Confidence calibration dashboard; “we got this wrong” style | Transparency dashboard; model performance over time | Full accuracy dashboard; Brier/calibration; **“We got this wrong”** with post-mortems |
| **Alerts & watchlists** | Custom alerts by tier; push; webhooks for API | Favorite teams/leagues; prediction alerts; prediction history | Follow teams/players/leagues; multiple alert types; smart digest (email/push) |
| **Social / community** | Not a focus | Sharing, comparison mode | **Prediction challenges & leaderboards** (no money); shareable cards; streak badges |
| **API / widgets** | API tier ($299/mo); raw probabilities; low latency | Not detailed | **REST + GraphQL**; embeddable iframe widgets; webhooks; SDKs (Python, JS, Swift, Kotlin) |
| **Scenario / what-if** | “Scenario Engine” — toggle conditions, real-time recalc | Not detailed | Counterfactual (“What if Player X is out?”) in Pro tier |

**Takeaway:** PredictIQ adds **NLG explanations**, **counter-arguments**, **community/gamification** (non-monetary), and a **GraphQL + widget** story. SportOracle goes deepest on odds and sharp/pro features.

---

## 3. AI/ML approach

| Aspect | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------|-----------------|------------------------|-----------|
| **Data sources** | Sportradar, Stats Perform, Odds API, Twitter, ESPN, etc.; Kafka-centric | TheSportsDB, Sportradar, ESPN, RapidAPI; batch + streaming; S3 + feature store | Sportradar, Opta, ESPN, Odds API; cost estimates; secondary (weather, Twitter, Reddit, injury, ref, travel, altitude) |
| **Feature store** | Feast (offline ClickHouse, online Redis) | Feast or Tecton; offline/online | Same idea; Kafka → live features |
| **Base models** | LightGBM primary; NN secondary; logistic baseline; ensemble | XGBoost/LightGBM; NN; logistic; ensemble | **XGBoost, LightGBM, CatBoost, Logistic, TabNet, TFT**; per-sport registry (nfl/, nba/, soccer/, shared/) |
| **Live model** | LSTM + state-space; Triton; Flink; Kafka | LSTM + XGBoost; 30s updates | LSTM/GRU on play-by-play; **Rust inference service**; ONNX Runtime; &lt;500 ms end-to-end |
| **Soccer** | — | — | **xG model** (shot-level) feeding match outcome |
| **Ensemble** | Weighted blend + isotonic calibration | Weighted ensemble + Platt scaling | **Layer 1 base → Layer 2 sport-specific → Layer 3 meta-learner (LightGBM + isotonic)** |
| **Explainability** | SHAP; natural language from templates | SHAP/LIME; feature importance | SHAP (TreeSHAP/DeepSHAP); **feature grouping**; **LLM NLG** (Llama 3 / GPT-4); counterfactuals |
| **Retraining** | Airflow DAG; drift (PSI, Page-Hinkley); champion/challenger | Scheduled + drift; incremental/full; A/B | Weekly + season start + drift; **DVC + Great Expectations + Evidently**; shadow deploy → promote |
| **ML stack** | MLflow; Triton; Feast; Flink | MLflow; SageMaker/Vertex; Feast | MLflow; DVC; Evidently; Airflow; **Rust inference service** |

**Takeaway:** PredictIQ specifies a **richer model zoo** (CatBoost, TabNet, TFT), **per-sport directory layout**, **Rust + ONNX** for live inference, and **LLM-based explanations**. All three use SHAP, calibration, and drift-aware retraining.

---

## 4. Backend system

| Aspect | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------|-----------------|------------------------|-----------|
| **API style** | REST (OpenAPI); Kong gateway | REST; versioning; rate limits by tier | **REST (primary) + GraphQL (Apollo) + WebSocket**; Kong |
| **Services** | Predictions (Rust), Users (Go), Betting (Go), Odds, Alerts, Analytics (Python) | Prediction, Live, User (microservices) | Prediction (Python/FastAPI), Live Event (Rust), User (NestJS), Notification (NestJS), **Content/NLG (Python + LLM)** |
| **DB** | PostgreSQL, TimescaleDB, ClickHouse, Redis, S3, MLflow, Elasticsearch | PostgreSQL, TimescaleDB, MongoDB optional, Redis | PostgreSQL, TimescaleDB, Redis cluster, **ClickHouse** (analytics), **Elasticsearch** (search), S3, MLflow |
| **Streaming** | Kafka; Flink; topics for raw, features, predictions | Kafka/Kinesis; Flink/Kinesis Analytics | Kafka (raw-events, normalized, live-features, live-predictions, etc.); consumer groups defined |
| **Caching** | CDN; Redis; invalidation rules | Redis; TTLs for pre-game/live/sessions | CDN → API cache → Redis; invalidation by prediction type and user writes |
| **Scale target** | — | 10K req/s; 99.9% | **5M DAU**; table for peak concurrent, req/s, strategy |

**Takeaway:** PredictIQ adds **GraphQL**, a dedicated **Content/NLG service**, and explicit **5M DAU** capacity planning. SportOracle specifies Rust/Go for several services; PredictIQ uses Rust for live path and NestJS for user/notification.

---

## 5. Mobile app

| Aspect | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------|----------------|------------------------|-----------|
| **Stack** | React Native (implied); real-time, offline | React Native + Expo; Redux Toolkit + RTK Query; React Navigation | **React Native 0.76+ (New Architecture)**; TypeScript; **Zustand + TanStack Query**; React Navigation 7 |
| **State** | — | Redux slices (auth, games, user, notifications) | **TanStack Query** (server) + **Zustand** (client + live) + **WatermelonDB** (offline); MMKV for prefs |
| **Charts** | — | — | **react-native-skia + Victory Native** (live probability charts) |
| **Lists** | — | FlatList + getItemLayout | **FlashList** |
| **Structure** | Screens, components, nav | Screens, components, store, services, types | **Feature-based**: features/predictions, live, accuracy, community, profile, auth; shared/ |
| **Real-time** | WebSocket | WebSocket; 30s; reconnect | Custom WebSocket hook; subscribe/unsubscribe; heartbeat; **Zustand live store** |
| **Auth** | — | — | **Firebase Auth**; custom JWT (User Service) |
| **Offline** | — | AsyncStorage or Realm; cache strategy | **WatermelonDB** (sync); MMKV; CodePush |

**Takeaway:** PredictIQ is the most prescriptive on mobile: **feature-based layout**, **Zustand + TanStack Query**, **Skia-based charts**, **FlashList**, **Firebase Auth**, and **WatermelonDB** for offline.

---

## 6. Security, compliance, ethics

| Aspect | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------|----------------|------------------------|-----------|
| **Auth** | JWT; refresh; OAuth; 2FA for premium | bcrypt; JWT (15 min / 7 d); OAuth optional | **Firebase Auth**; custom JWT (15 min / 30 d); RBAC; API keys for B2B |
| **Compliance** | GDPR, CCPA, COPPA; sports licensing | GDPR, CCPA, COPPA; data retention | GDPR, CCPA, App Store rules, **sports data licensing**, **accessibility (WCAG 2.1 AA)** |
| **Ethics** | Responsible AI; bias; no gambling encouragement | User protection; no gambling; accuracy claims | **Disclaimers on every screen**; no “will win”; “We got this wrong”; no gambling links; **addiction-aware** (usage-based reminder) |
| **Infra** | WAF, DDoS, secrets, VPC | TLS; encryption at rest; secrets | TLS 1.3; pinning; **certificate pinning**; Trivy; distroless; audit logging |

**Takeaway:** PredictIQ stresses **legal positioning**, **disclaimers**, **addiction awareness**, and **WCAG**. All three align on no gambling facilitation and GDPR/CCPA.

---

## 7. Monetization

| Aspect | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------|----------------|------------------------|-----------|
| **Tiers** | Free, Pro $29, Elite $79, API $299 | Free (10 pred/day), Premium $9.99, Premium+ $19.99; B2B $499–custom | Free, **Premium $9.99**, **Pro $29.99**, **Enterprise $5K–50K/mo** |
| **Free** | 3 sports; basic confidence; summary explanation; 3 push/day | 10 pred/day; basic; no live; ads | Top-line predictions; top 3 factors; 2 sports; pre-game only; **ads** (banner/interstitial); community picks 5/day |
| **Premium** | All sports; full + SHAP; live; unlimited push; 1y accuracy | Unlimited; player props; full explanations; no ads | All sports; live; full SHAP + **NLG**; custom alerts; ad-free; **unlimited community picks** |
| **Pro / API** | API tier; raw probs; model backtests | B2B $499–$1,999–custom | **Pro:** API 10K/hr; widgets; export; counterfactual; **Enterprise:** white-label; SLA; webhooks; SOC 2 |
| **Revenue** | Conservative projections | Year 1–3 (e.g. $840K → $30M) | **18-month table**: MRR from ~$5K to **$1.13M**; DAU 10K → 1M |
| **Extra revenue** | — | — | Sponsored insights; affiliate (streaming); data licensing; premium content |

**Takeaway:** PredictIQ’s tier names and prices are close to ARCHITECTURE_DESIGN but add a clear **Pro** tier and **Enterprise** band; SportOracle’s Elite/API skews toward high-end and betting-oriented users.

---

## 8. Roadmap

| Phase | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|-------|-----------------|------------------------|-----------|
| **1 (MVP)** | Foundation (Months 1–3): auth, one league, basic predictions | Months 1–3: NFL only; basic explanation; iOS + Android | Months 1–3: **NBA + Premier League**; pre-game only; **iOS only** (TestFlight); free only; **1K beta, 200 DAU** |
| **2** | Core product (4–6): live, more leagues, SHAP | Months 4–6: live; 3 more leagues; push | Months 4–6: **NFL, MLB**; live; full explainability; **Android**; **Premium**; **50K DAU, 3.5K premium** |
| **3** | Growth (7–9): premium, props, history | Months 7–9: premium; player props; analytics | Months 7–12: NHL, La Liga, etc.; **Pro + API**; shareable cards; **web app**; **Enterprise**; 250K DAU |
| **4** | Scale (10–12): B2B, scale, international | Months 10–12: 10+ leagues; B2B; international | Months 13–18: Tennis, Cricket, College, **Esports**, F1; white-label; **voice**; prediction marketplace; **1M DAU, $1M+ MRR** |

**Takeaway:** PredictIQ’s roadmap is phased and numeric (DAU, MRR, tiers). It adds **web app**, **voice**, and **prediction marketplace** in later phases; SportOracle is more feature/tier focused.

---

## 9. Infrastructure & DevOps

| Aspect | ARCHITECTURE.md | ARCHITECTURE_DESIGN.md | PredictIQ |
|--------|----------------|------------------------|-----------|
| **Cloud** | Edge (Cloudflare); Kong; EKS; Triton; Flink; Kafka; RDS; etc. | AWS/GCP; Docker + K8s; Kong; Istio optional | **AWS us-east-1**; Route 53; CloudFront; ALB; **EKS** (namespaces: api, services, live, ml, monitoring) |
| **CI/CD** | — | — | **GitHub Actions** (lint, test, scan, build, staging, E2E); **ArgoCD** (GitOps); canary; **Fastlane** for mobile; **CodePush** |
| **DR** | — | — | **RTO &lt;1h, RPO &lt;5 min**; WAL archiving; cross-region S3; **GameDay** chaos |
| **Cost** | — | — | **Appendix A**: ~**$27.6K/month** (EKS, RDS, Redis, MSK, Timescale, OpenSearch, APIs, Datadog, etc.); scale to ~$150–200K at 5M DAU |
| **Risks** | — | — | **Appendix B**: data outage, model drift, latency, contract cost, App Store, WebSocket scale, **LLM hallucination**, GDPR deletion |

**Takeaway:** PredictIQ is the only doc with **explicit cost estimates**, **RTO/RPO**, **chaos engineering**, and **risk/mitigation** appendices.

---

## 10. Summary: which doc to use when

- **ARCHITECTURE.md (SportOracle):** Use for **betting-adjacent** product (odds, sharp movement, pro/API tier), full technical depth (Kafka, Flink, Feast, Triton), and tier matrix. Longest and most “pro” focused.
- **ARCHITECTURE_DESIGN.md:** Use for **information-only mobile-first** product and **first production build**: no betting, clear feature list, backend/mobile/ML at moderate depth. Good single-doc reference.
- **PredictIQ_ARCHITECTURE.md:** Use for **legal-safe, information-only** product with **phased rollout**, **cost and risk** awareness, **GraphQL + widgets**, **community/gamification**, **LLM explainability**, and **modern mobile stack** (Zustand, TanStack Query, Skia, FlashList, WatermelonDB). Best for a greenfield “PredictIQ” brand and 18-month plan.

**Recommendation:** If the product is **information-only and no gambling**, treat **PredictIQ_ARCHITECTURE.md** as the primary system architecture and **ARCHITECTURE_DESIGN.md** as the production design baseline; use **ARCHITECTURE.md** for optional advanced/odds-oriented features and backend detail, not for positioning or legal stance.
