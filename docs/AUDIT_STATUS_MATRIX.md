# Audit Status Matrix

Generated from `docs/AUDIT_SOURCE_LISTS.json` and repository evidence.  
Legend: ✅ done · 🟡 partial · ❌ not implemented · 🚫 blocked (external credentials/infrastructure)

**Last updated:** 2026-07-08 (Phase 3 audit pass)

## Summary

| Metric | Weaknesses (50) | Improvements (100) | Combined (150) |
|--------|-----------------|--------------------|----------------|
| ✅ Done | 32 | 50 | 82 |
| 🟡 Partial | 16 | 32 | 48 |
| ❌ Open | 0 | 9 | 9 |
| 🚫 Blocked | 2 | 9 | 11 |

**Implementable coverage:** 76.3% — `(done + 0.5×partial) / (150 − blocked)`

Backend CI enforces **≥60%** line coverage (`pytest.ini`). Mobile Jest added for subscription utils.

---

## Top 50 Weaknesses

| ID | Title | Status | State | Evidence |
|----|-------|--------|-------|----------|
| W1 | Free-tier daily limit trivially bypassed | ✅ | done | backend/app/services/free_tier_limits.py, backend/tests/test_free_tier_prediction_limits.py |
| W2 | Marketing/docs claim ensemble/deep AI; prod is logistic regression | 🟡 | partial | docs/PRODUCTION_REALITY.md + ARCHITECTURE.md banner |
| W3 | Single VPS — total SPOF | 🚫 | blocked | Single VPS docker-compose.prod.yml; HA needs second region/instances |
| W4 | No offsite DB backups in cron | 🟡 | partial | scripts/run_pg_backup.sh, scripts/setup_offsite_backup.sh — PH2-005 blocked on DO Spaces write keys |
| W5 | `/internal` routes may be internet-exposed | ✅ | done | deploy/nginx-deny-internal-snippet.conf, backend/tests/test_nginx_deny_internal.py |
| W6 | ~27% test coverage | ✅ | done | pytest.ini --cov-fail-under=60, .github/workflows/ci.yml |
| W7 | No Stripe webhook idempotency | ✅ | done | backend/app/services/stripe_webhook_idempotency.py |
| W8 | No RevenueCat event deduplication | ✅ | done | backend/app/services/revenuecat_webhook_idempotency.py |
| W9 | Demo credentials committed in repo | 🟡 | partial | scripts/rotate_app_review_demo_account.py; DEV_CREDENTIALS.md dev-only |
| W10 | Cron secret example may be real | ✅ | done | backend/tests/test_env_examples.py |
| W11 | Redis no auth | ✅ | done | docker-compose.yml Redis requirepass |
| W12 | Leaderboard O(all games) query | ✅ | done | backend/app/services/leaderboard_service.py |
| W13 | WebSocket per-client DB polling | 🟡 | partial | backend/app/services/live_websocket_hub.py — one poller per game, Redis pub/sub |
| W14 | God screens 1000+ lines | 🟡 | partial | HomeScreen split; GameDetailScreen/PaywallScreen still large |
| W15 | No password reset flow | ✅ | done | backend/app/services/password_reset_service.py, mobile ForgotPasswordScreen |
| W16 | Push may register before consent | ✅ | done | mobile/src/utils/pushNotifications.ts, backend/tests/test_push_consent_order.py |
| W17 | Minimal accessibility | 🟡 | partial | VoiceOver on tabs/cards; not exhaustive |
| W18 | No offline/NetInfo UX | ✅ | done | mobile/src/components/OfflineBanner.tsx |
| W19 | Heuristic picks indistinguishable from ML in UI | ✅ | done | backend/app/utils/prediction_source.py, mobile PredictionCard |
| W20 | Soccer draw not model-trained | ✅ | done | backend/app/services/model_training.py soccer 1X2 |
| W21 | Standings leakage at inference fallback | ✅ | done | backend/tests/test_feature_builder_pit.py |
| W22 | Explainability likely broken | ✅ | done | backend/tests/test_explanation_service.py |
| W23 | Stale `ml/` + ARCHITECTURE.md mislead developers/investors | 🟡 | partial | archive/README.md; ARCHITECTURE.md partially updated |
| W24 | Rust microservices dead weight | 🟡 | partial | archive/services/; services/users/ legacy |
| W25 | CI Ruff never fails (`|| true`) | ✅ | done | .github/workflows/ci.yml Ruff without || true |
| W26 | No dependency security scanning | ✅ | done | scripts/pip_audit_backend.sh, npm audit in CI |
| W27 | `deploy_api.sh` no migrations | ✅ | done | scripts/deploy_api.sh alembic upgrade head |
| W28 | No Prometheus metrics on API | ✅ | done | backend/app/monitoring/prometheus_metrics.py |
| W29 | Account delete doesn’t cancel billing | ✅ | done | backend/app/services/subscription_cancel_service.py |
| W30 | Inconsistent subscription tier checks | ✅ | done | backend/app/utils/subscription_tiers.py |
| W31 | Guests can’t see paywall in production | ✅ | done | mobile PaywallScreen guest preview |
| W32 | $29.99 without odds/EV tooling | 🟡 | partial | odds_service edge_pct + /stats/model-vs-market dashboard |
| W33 | No annual subscription | 🟡 | partial | Annual Stripe + Paywall gating; ASC product com.octobetiq.premium.annual blocked |
| W34 | No referral program | 🟡 | partial | backend/app/api/v1/user.py referral/apply, share_referral_service.py |
| W35 | No product analytics pipeline | 🟡 | partial | mobile/src/services/productAnalytics.ts — needs POSTHOG key in prod |
| W36 | Keywords typo “ports” on live listing | 🚫 | blocked | Live ASC keywords — requires App Store Connect login |
| W37 | No full-text search | ✅ | done | backend/app/services/game_search_service.py, GET /games/search |
| W38 | Duplicate tier/profile fetches per screen | 🟡 | partial | React Query hooks reduce refetch; GameDetailScreen still heavy |
| W39 | Silent error swallowing on feeds | ✅ | done | mobile HomeFeedSections error+retry |
| W40 | OpenAPI exposed in prod config default | ✅ | done | backend/app/config.py auto-disables OpenAPI in production |
| W41 | 4 workers × inconsistent in-memory revocation | ✅ | done | backend/app/services/token_revocation_service.py Redis jti denylist; prod requires REDIS_URL |
| W42 | No job queue for long tasks | 🟡 | partial | backend/app/services/job_queue_service.py + /internal/jobs/* — cron worker pattern |
| W43 | Unpinned Docker `:latest` tags | ✅ | done | docker-compose.yml pinned image tags |
| W44 | Mobile: no unit tests in CI | ✅ | done | mobile/src/utils/subscription.test.ts, CI mobile Jest job |
| W45 | `premium_plus` tier exists but not marketed | 🟡 | partial | premium_plus in API; Paywall shows Premium only by design |
| W46 | RevenueCat entitlement was `octobetiq Pro` vs `premium` mismatch (fixed in ops, fragile) | ✅ | done | backend/tests/test_revenuecat_webhook.py entitlement mapping |
| W47 | No web subscriber portal | ✅ | done | web/subscriber-portal.html, POST /subscription/billing-portal |
| W48 | Coverage.xml in git | ✅ | done | .gitignore coverage.xml |
| W49 | Makefile references non-existent ML scripts | ✅ | done | Makefile ml-evaluate → backend/scripts/evaluate_models_cli.py |
| W50 | No staging environment | 🟡 | partial | docker-compose.staging.yml; PH2-011 blocked on DNS api-staging.octobetiq.com |

---

## Top 100 Improvements

| ID | Title | Status | State | Evidence |
|----|-------|--------|-------|----------|
| I1 | Fix daily pick limit on **all** prediction endpoints | ✅ | done | backend/app/services/free_tier_limits.py |
| I2 | Centralize tier gating in one module | ✅ | done | backend/app/utils/subscription_tiers.py |
| I3 | Block serving predictions when `model_version` is heuristic/synthetic in prod UI | ✅ | done | backend/app/utils/prediction_source.py |
| I4 | Add `prediction_source` field to API responses | ✅ | done | backend/app/services/prediction_payload.py |
| I5 | Rotate demo account password; remove from public scripts | 🟡 | partial | scripts/rotate_app_review_demo_account.py |
| I6 | Rotate `PUSH_CRON_SECRET`; placeholder in `.env.example` | ✅ | done | backend/.env.example placeholders |
| I7 | Nginx `deny /internal` on public hosts | ✅ | done | deploy/nginx-deny-internal-snippet.conf |
| I8 | Set `INTERNAL_ALLOWED_CIDRS=127.0.0.1/32` | ✅ | done | .env.production.example INTERNAL_ALLOWED_CIDRS |
| I9 | Add Stripe + RC webhook idempotency table | ✅ | done | alembic 011/012 webhook events |
| I10 | Add DB backup to crontab + S3 offsite | 🟡 | partial | scripts/setup_offsite_backup.sh — credentials blocked |
| I11 | Redis requirepass | ✅ | done | docker-compose Redis auth |
| I12 | Run migrations in `deploy_api.sh` | ✅ | done | scripts/deploy_api.sh migrations |
| I13 | Fail CI on Ruff | ✅ | done | CI Ruff |
| I14 | Add `pip-audit` + `npm audit` to CI | ✅ | done | CI pip-audit npm audit |
| I15 | Pin backend dependencies | ✅ | done | backend/requirements.txt pinned |
| I16 | Cancel subscriptions on account delete | ✅ | done | subscription_cancel_service on delete |
| I17 | Remove unsourced “62%+” from web copy | ✅ | done | backend/tests/test_web_marketing_copy.py |
| I18 | Fix live keywords `ports` → `sports` | 🚫 | blocked | App Store Connect live listing |
| I19 | Sentry alerts on webhook failures | ✅ | done | backend/app/utils/sentry_alerts.py |
| I20 | Uptime monitoring on `/health` + `/stats/model` | ✅ | done | scripts/check_api_health.sh |
| I21 | PIT-only features at inference; no current standings fallback in prod | ✅ | done | backend/tests/test_feature_builder_pit.py |
| I22 | Train native soccer 1X2 model | ✅ | done | backend/app/services/model_training.py |
| I23 | Walk-forward backtest script | ✅ | done | backend/app/services/walk_forward_backtest.py |
| I24 | Fix explainability (coefficients from inner LR) | ✅ | done | backend/app/services/explanation_service.py |
| I25 | Per-league model dir in explanation endpoint | ✅ | done | explanation per-league model dir |
| I26 | Commit `metrics.json` schema example | 🟡 | partial | backend/models/metrics.json example |
| I27 | Archive stale `ml/` and Rust services | 🟡 | partial | archive/README.md |
| I28 | Update ARCHITECTURE.md to match reality | 🟡 | partial | docs/PRODUCTION_REALITY.md canonical prod facts |
| I29 | Market odds as benchmark in backtest | 🟡 | partial | walk_forward_backtest market_benchmark note + /stats/model-vs-market live |
| I30 | Per-league calibration minimum samples | ✅ | done | model_training calibration mins |
| I31 | React Query for server state | ✅ | done | mobile React Query hooks |
| I32 | Split HomeScreen into feature components | ✅ | done | mobile/src/screens/home/HomeFeedSections.tsx |
| I33 | NetInfo + offline banner | ✅ | done | OfflineBanner + NetInfo |
| I34 | VoiceOver labels on tabs, cards, carousels | 🟡 | partial | GameCard/Landing accessibility labels |
| I35 | Password reset flow | ✅ | done | password reset flow |
| I36 | Fix push consent order (after onboarding opt-in) | ✅ | done | push consent order |
| I37 | Native Manage Subscriptions link (iOS 15+) | ✅ | done | mobile manageSubscriptions.ts |
| I38 | Paywall hero redesign + social proof | 🟡 | partial | PaywallScreen hero copy |
| I39 | Consistent skeleton/error/empty components | 🟡 | partial | PremiumFeatureEmptyState; not all screens |
| I40 | Guest paywall preview (read-only) | ✅ | done | guest paywall preview |
| I41 | Annual plan ($199/yr) | 🟡 | partial | annual plan code; ASC IAP blocked |
| I42 | Referral: “invite friend, 7 extra trial days” | 🟡 | partial | referral/apply tracking; bonus days need ASC/Stripe promo |
| I43 | Share card: “My model accuracy this month” | ✅ | done | SharePickCard rollingAccuracyPct, build_share_card rolling_accuracy_pct |
| I44 | PostHog/Mixpanel integration | 🟡 | partial | productAnalytics.ts optional PostHog |
| I45 | Push categories (kickoff, upsets, results) | 🟡 | partial | push_trigger_service kickoff/high-conf/post-game |
| I46 | Trial-ending push + email | 🟡 | partial | send_trial_ending_reminders push; email via digest when SMTP set |
| I47 | App Store review prompt after positive accuracy session | ✅ | done | mobile storeReview.ts |
| I48 | Public embed: accuracy widget for octobetiq.com | ✅ | done | web/widgets/accuracy-widget.html |
| I49 | Blog: weekly transparent scorecard | 🟡 | partial | web/scorecard.html weekly public-audit scorecard |
| I50 | Android Play Store launch | 🚫 | blocked | Play Store listing + Google Play Console |
| I51 | Managed Postgres (RDS/DO managed) | 🚫 | blocked | Managed Postgres — docs/scripts only; needs cloud account |
| I52 | Celery/ARQ job queue | 🟡 | partial | job_queue_service.py + internal endpoints |
| I53 | SQL aggregation for leaderboards | ✅ | done | leaderboard_service SQL aggregation |
| I54 | WebSocket pub/sub via Redis | ✅ | done | live_websocket_hub Redis pub/sub |
| I55 | Connection limits on WS | ✅ | done | websocket_max_connections_per_game + WebSocketConnectionLimitError |
| I56 | API autoscaling (2+ instances) | 🚫 | blocked | Autoscaling needs orchestrator (K8s/DO App Platform) |
| I57 | CloudFront/CDN for static | 🚫 | blocked | CDN — needs CloudFront/DO CDN account |
| I58 | Staging environment | 🟡 | partial | docker-compose.staging.yml; public URL blocked DNS |
| I59 | Blue/green deploy | 🟡 | partial | scripts/deploy_api_blue_green.sh — nginx swap manual |
| I60 | Prometheus metrics + Grafana dashboards | ✅ | done | Prometheus + Grafana compose profile |
| I61 | Odds display (informational, not affiliate-first) | 🟡 | partial | odds_service + MarketOddsCard behind flag |
| I62 | Line movement charts | ❌ | open | Line movement charts |
| I63 | Closing line value tracker | ❌ | open | CLV tracker |
| I64 | “Model vs market” dashboard | ✅ | done | GET /stats/model-vs-market, web/model-vs-market.html |
| I65 | Player props (when licensed) | 🟡 | partial | player_props_service behind FEATURE_PLAYER_PROPS |
| I66 | Parlay correlation warnings | ✅ | done | parlay_correlation_service.py, POST /tools/parlay-correlation |
| I67 | Email digest: daily picks | 🟡 | partial | email_digest_service.py + /internal/email-digest/run; SMTP required |
| I68 | Watchlist sync across devices | 🟡 | partial | favorites API sync; no conflict resolution UI |
| I69 | iPad-optimized layouts | 🟡 | partial | iPad screenshots; layouts not fully optimized |
| I70 | Widget: today’s top pick | ❌ | open | iOS widget extension not shipped |
| I71 | Raise coverage to 60%+ | ✅ | done | CI coverage ≥60% |
| I72 | Stripe webhook test suite | ✅ | done | backend/tests/test_stripe_webhook.py |
| I73 | Monetization bypass regression tests | 🟡 | partial | free tier + share tests; no dedicated paywall bypass suite |
| I74 | Integration tests with Postgres in CI | ✅ | done | .github/workflows/ci.yml backend-postgres job, test_postgres_integration.py |
| I75 | Mobile Jest tests for subscription utils | ✅ | done | mobile subscription.test.ts + CI |
| I76 | E2E Detox for paywall flow | 🟡 | partial | mobile/e2e/paywall.e2e.ts + docs/DETOX_E2E.md skeleton |
| I77 | Feature flags service (LaunchDarkly/PostHog) | ✅ | done | backend/app/services/feature_flags.py, GET /config/feature-flags |
| I78 | API v2 planning doc | ✅ | done | docs/API_V2_PLAN.md |
| I79 | OpenAPI client codegen for mobile | ✅ | done | export_openapi.py, docs/OPENAPI_CODEGEN.md, mobile codegen:api |
| I80 | Delete dead code paths | 🟡 | partial | archive/; legacy services/users |
| I81 | GDPR data export endpoint | ✅ | done | GET /user/me/export, gdpr_export_service.py |
| I82 | CCPA opt-out flow | ✅ | done | POST /user/me/privacy/ccpa-opt-out |
| I83 | Gambling disclaimer audit on all screens | 🟡 | partial | predictionTrust disclaimers; not audited on every screen |
| I84 | Age gate if expanding content | ✅ | done | mobile AgeGateScreen + ageGateStorage.ts |
| I85 | App Privacy nutrition label review quarterly | 🚫 | blocked | Quarterly ASC privacy label — manual process |
| I86 | A/B test trial length (7 vs 14 days) | 🟡 | partial | experiments.trial_length_days in /config/feature-flags |
| I87 | A/B test price ($19.99 vs $29.99) | 🟡 | partial | experiments.paywall_price_tier in /config/feature-flags |
| I88 | Intro offer for lapsed users | 🟡 | partial | intro_offer_variant experiment bucket in /config/feature-flags |
| I89 | Rewarded ads vs premium messaging test | 🟡 | partial | rewarded_ads_messaging experiment bucket |
| I90 | Ad density test on free tier | 🟡 | partial | ad_density experiment bucket |
| I91 | Proprietary historical feature store | ❌ | open | Feature store |
| I92 | User pick tracking vs model (Brier per user) | ❌ | open | Per-user Brier tracking |
| I93 | Community predictions vs model | ❌ | open | Community predictions |
| I94 | API for third-party accuracy audits | ✅ | done | GET /stats/public-audit |
| I95 | Academic partnership for methodology paper | 🚫 | blocked | Academic partnership — external |
| I96 | Sport-specific model teams (hire) | 🚫 | blocked | Hiring — external |
| I97 | Real-time injury feed integration | ❌ | open | Real-time injury feed |
| I98 | Weather/feature enrichment for outdoor sports | ❌ | open | Weather enrichment |
| I99 | Ensemble only when backtest proves lift | ❌ | open | Ensemble when backtest proves lift |
| I100 | Patent/trade secret on calibration display UX | 🚫 | blocked | Legal/patent — external |

---

## Remaining blocked items (external only)

| ID | Blocker |
|----|---------|
| W3 | Second VPS / managed platform for HA |
| W4 / I10 | DO Spaces write credentials for offsite backup |
| W36 / I18 | App Store Connect — live keywords |
| W50 / I58 | DNS `api-staging.octobetiq.com` + TLS |
| W33 / I41 | ASC + RevenueCat annual IAP product |
| I50 | Google Play Console submission |
| I51 | Managed Postgres cloud provisioning |
| I56 | Autoscaling orchestrator |
| I57 | CDN account |
| I85 | ASC privacy label quarterly review |
| I95–I96, I100 | Partnership / hiring / legal |

---

## Phase 3 implementations (this pass)

- Migration `014`: stripe_customer_id, trial fields, CCPA, referral, trial push sent
- GDPR export, CCPA opt-out, referral apply, game search, billing portal
- Feature flags + A/B experiment buckets API
- Trial-ending push reminders
- WebSocket per-game connection limits
- Redis job queue + email digest cron endpoints
- Docker image pinning, blue/green deploy script, subscriber portal, accuracy widget
- Mobile Jest + CI, Detox skeleton
- Tests: `backend/tests/test_audit_phase3_features.py`
