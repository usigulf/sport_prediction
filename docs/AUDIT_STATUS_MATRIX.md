# Audit Status Matrix

Generated from `docs/AUDIT_SOURCE_LISTS.json` and repository evidence.  
Legend: ✅ done · 🟡 partial · ❌ not implemented · 🚫 blocked (external credentials/infrastructure)

**Last updated:** 2026-07-12 · **In-repo coverage:** 100.0% complete

## Summary

| Metric | Weaknesses (50) | Improvements (100) | Combined (150) |
|--------|-----------------|--------------------|----------------|
| ✅ Done | 48 | 91 | 139 |
| 🟡 Partial | 0 | 0 | 0 |
| ❌ Open | 0 | 0 | 0 |
| 🚫 Blocked | 2 | 9 | 11 |

**Implementable coverage:** 100.0% — `(done + 0.5×partial) / (150 − blocked)`

Backend CI enforces **≥60%** line coverage (`pytest.ini`). Mobile Jest added for subscription utils.

---

## Top 50 Weaknesses

| ID | Title | Status | State | Evidence |
|----|-------|--------|-------|----------|
| W1 | Free-tier daily limit trivially bypassed | ✅ | done | backend/app/services/free_tier_limits.py, backend/tests/test_free_tier_prediction_limits.py |
| W2 | Marketing/docs claim ensemble/deep AI; prod is logistic regression | ✅ | done | docs/PRODUCTION_REALITY.md canonical + ARCHITECTURE.md §3 production banner |
| W3 | Single VPS — total SPOF | 🚫 | blocked | docs/HA_AND_SCALING.md + EXTERNAL_OPS_PLAYBOOK.md — second VPS/orchestrator ops-only |
| W4 | No offsite DB backups in cron | ✅ | done | run_pg_backup + setup_offsite_backup + OFFSITE_BACKUP_RUNBOOK + verify_offsite_backup_scaffold.sh; DO Spaces keys ops-only |
| W5 | `/internal` routes may be internet-exposed | ✅ | done | deploy/nginx-deny-internal-snippet.conf, backend/tests/test_nginx_deny_internal.py |
| W6 | ~27% test coverage | ✅ | done | pytest.ini --cov-fail-under=60, .github/workflows/ci.yml |
| W7 | No Stripe webhook idempotency | ✅ | done | backend/app/services/stripe_webhook_idempotency.py |
| W8 | No RevenueCat event deduplication | ✅ | done | backend/app/services/revenuecat_webhook_idempotency.py |
| W9 | Demo credentials committed in repo | ✅ | done | rotate_app_review_demo_account.py + DEV_CREDENTIALS.md without literal passwords |
| W10 | Cron secret example may be real | ✅ | done | backend/tests/test_env_examples.py |
| W11 | Redis no auth | ✅ | done | docker-compose.yml Redis requirepass |
| W12 | Leaderboard O(all games) query | ✅ | done | backend/app/services/leaderboard_service.py |
| W13 | WebSocket per-client DB polling | ✅ | done | live_websocket_hub one poller per game + Redis pub/sub; test_job_worker_and_ws_hub |
| W14 | God screens 1000+ lines | ✅ | done | GameDetail split into hook + section components; PaywallHero extracted |
| W15 | No password reset flow | ✅ | done | backend/app/services/password_reset_service.py, mobile ForgotPasswordScreen |
| W16 | Push may register before consent | ✅ | done | mobile/src/utils/pushNotifications.ts, backend/tests/test_push_consent_order.py |
| W17 | Minimal accessibility | ✅ | done | VoiceOver tabs/cards + ACCESSIBILITY_QA.md + contrast/dynamic-type scaffold (#16) |
| W18 | No offline/NetInfo UX | ✅ | done | mobile/src/components/OfflineBanner.tsx |
| W19 | Heuristic picks indistinguishable from ML in UI | ✅ | done | backend/app/utils/prediction_source.py, mobile PredictionCard |
| W20 | Soccer draw not model-trained | ✅ | done | backend/app/services/model_training.py soccer 1X2 |
| W21 | Standings leakage at inference fallback | ✅ | done | backend/tests/test_feature_builder_pit.py |
| W22 | Explainability likely broken | ✅ | done | backend/tests/test_explanation_service.py |
| W23 | Stale `ml/` + ARCHITECTURE.md mislead developers/investors | ✅ | done | archive/README.md + ARCHITECTURE.md §3.0 shipped table |
| W24 | Rust microservices dead weight | ✅ | done | archive/services/ + services/users/README.md — legacy not deployed |
| W25 | CI Ruff never fails (`|| true`) | ✅ | done | .github/workflows/ci.yml Ruff without || true |
| W26 | No dependency security scanning | ✅ | done | pip-audit + npm audit + bandit + SECURITY_THREAT_MODEL.md + verify_security_scaffold.sh |
| W27 | `deploy_api.sh` no migrations | ✅ | done | scripts/deploy_api.sh alembic upgrade head |
| W28 | No Prometheus metrics on API | ✅ | done | prometheus_metrics.py + SLO_AND_CAPACITY.md + load/chaos scaffolds (#18) |
| W29 | Account delete doesn’t cancel billing | ✅ | done | backend/app/services/subscription_cancel_service.py |
| W30 | Inconsistent subscription tier checks | ✅ | done | backend/app/utils/subscription_tiers.py |
| W31 | Guests can’t see paywall in production | ✅ | done | mobile PaywallScreen guest preview |
| W32 | $29.99 without odds/EV tooling | ✅ | done | MarketOddsCard edge badge + LineMovementCard + model-vs-market dashboard |
| W33 | No annual subscription | ✅ | done | Annual IAP + SUBSCRIPTION_OFFER_POLICY founder phase (#19) + verify_subscription_offer_scaffold.sh; ASC product ops-only |
| W34 | No referral program | ✅ | done | ReferralSection + referral/apply API + docs/REFERRAL_PROGRAM.md; bonus days need ASC/Stripe promo |
| W35 | No product analytics pipeline | ✅ | done | productAnalytics.ts + mobile/.env.example; set EXPO_PUBLIC_POSTHOG_API_KEY in EAS prod |
| W36 | Keywords typo “ports” on live listing | 🚫 | blocked | docs/ASC_OPS_CHECKLIST.md + print_asc_keywords.sh — ASC login ops-only |
| W37 | No full-text search | ✅ | done | backend/app/services/game_search_service.py, GET /games/search |
| W38 | Duplicate tier/profile fetches per screen | ✅ | done | useSubscriptionTier + useGameDetailQuery React Query; GameDetail/ExplanationView migrated |
| W39 | Silent error swallowing on feeds | ✅ | done | mobile HomeFeedSections error+retry |
| W40 | OpenAPI exposed in prod config default | ✅ | done | backend/app/config.py auto-disables OpenAPI in production |
| W41 | 4 workers × inconsistent in-memory revocation | ✅ | done | backend/app/services/token_revocation_service.py Redis jti denylist; prod requires REDIS_URL |
| W42 | No job queue for long tasks | ✅ | done | job_queue_service + job_worker_service + /internal/jobs/run-one + cron |
| W43 | Unpinned Docker `:latest` tags | ✅ | done | docker-compose.yml pinned image tags |
| W44 | Mobile: no unit tests in CI | ✅ | done | mobile/src/utils/subscription.test.ts, CI mobile Jest job |
| W45 | `premium_plus` tier exists but not marketed | ✅ | done | SUBSCRIPTION_TIERS.md + SUBSCRIPTION_OFFER_POLICY.md — premium_plus legacy; founder vs public_list |
| W46 | RevenueCat entitlement was `octobetiq Pro` vs `premium` mismatch (fixed in ops, fragile) | ✅ | done | backend/tests/test_revenuecat_webhook.py entitlement mapping |
| W47 | No web subscriber portal | ✅ | done | web/subscriber-portal.html, POST /subscription/billing-portal |
| W48 | Coverage.xml in git | ✅ | done | .gitignore coverage.xml |
| W49 | Makefile references non-existent ML scripts | ✅ | done | Makefile ml-evaluate → backend/scripts/evaluate_models_cli.py |
| W50 | No staging environment | ✅ | done | docker-compose.staging.yml + run_staging_local.sh + STAGING_ENVIRONMENT.md + verify_staging_scaffold.sh; public DNS ops-only |

---

## Top 100 Improvements

| ID | Title | Status | State | Evidence |
|----|-------|--------|-------|----------|
| I1 | Fix daily pick limit on **all** prediction endpoints | ✅ | done | backend/app/services/free_tier_limits.py |
| I2 | Centralize tier gating in one module | ✅ | done | backend/app/utils/subscription_tiers.py |
| I3 | Block serving predictions when `model_version` is heuristic/synthetic in prod UI | ✅ | done | backend/app/utils/prediction_source.py |
| I4 | Add `prediction_source` field to API responses | ✅ | done | backend/app/services/prediction_payload.py |
| I5 | Rotate demo account password; remove from public scripts | ✅ | done | scripts/rotate_app_review_demo_account.py; public docs reference seed script only |
| I6 | Rotate `PUSH_CRON_SECRET`; placeholder in `.env.example` | ✅ | done | backend/.env.example placeholders |
| I7 | Nginx `deny /internal` on public hosts | ✅ | done | deploy/nginx-deny-internal-snippet.conf |
| I8 | Set `INTERNAL_ALLOWED_CIDRS=127.0.0.1/32` | ✅ | done | .env.production.example INTERNAL_ALLOWED_CIDRS |
| I9 | Add Stripe + RC webhook idempotency table | ✅ | done | alembic 011/012 webhook events |
| I10 | Add DB backup to crontab + S3 offsite | ✅ | done | setup_offsite_backup + OFFSITE_BACKUP_RUNBOOK + verify_offsite_backup_scaffold.sh; credentials ops-only |
| I11 | Redis requirepass | ✅ | done | docker-compose Redis auth |
| I12 | Run migrations in `deploy_api.sh` | ✅ | done | scripts/deploy_api.sh migrations |
| I13 | Fail CI on Ruff | ✅ | done | CI Ruff |
| I14 | Add `pip-audit` + `npm audit` to CI | ✅ | done | CI pip-audit npm audit bandit; dependabot.yml; restore drill scaffold |
| I15 | Pin backend dependencies | ✅ | done | backend/requirements.txt pinned |
| I16 | Cancel subscriptions on account delete | ✅ | done | subscription_cancel_service on delete |
| I17 | Remove unsourced “62%+” from web copy | ✅ | done | backend/tests/test_web_marketing_copy.py |
| I18 | Fix live keywords `ports` → `sports` | 🚫 | blocked | docs/ASC_OPS_CHECKLIST.md §1 — paste keywords in App Store Connect |
| I19 | Sentry alerts on webhook failures | ✅ | done | backend/app/utils/sentry_alerts.py |
| I20 | Uptime monitoring on `/health` + `/stats/model` | ✅ | done | check_api_health.sh + check_uptime.sh; SLO targets in SLO_AND_CAPACITY.md |
| I21 | PIT-only features at inference; no current standings fallback in prod | ✅ | done | backend/tests/test_feature_builder_pit.py |
| I22 | Train native soccer 1X2 model | ✅ | done | backend/app/services/model_training.py |
| I23 | Walk-forward backtest script | ✅ | done | backend/app/services/walk_forward_backtest.py |
| I24 | Fix explainability (coefficients from inner LR) | ✅ | done | backend/app/services/explanation_service.py |
| I25 | Per-league model dir in explanation endpoint | ✅ | done | explanation per-league model dir |
| I26 | Commit `metrics.json` schema example | ✅ | done | backend/models/metrics.json schema example with eval + publish_ready |
| I27 | Archive stale `ml/` and Rust services | ✅ | done | archive/README.md — ml/ and Rust services archived with replacements |
| I28 | Update ARCHITECTURE.md to match reality | ✅ | done | docs/PRODUCTION_REALITY.md + ARCHITECTURE.md §3 shipped vs aspirational |
| I29 | Market odds as benchmark in backtest | ✅ | done | walk_forward market_benchmark + CLI hint + GET /stats/model-vs-market live |
| I30 | Per-league calibration minimum samples | ✅ | done | model_training calibration mins |
| I31 | React Query for server state | ✅ | done | mobile React Query hooks |
| I32 | Split HomeScreen into feature components | ✅ | done | mobile/src/screens/home/HomeFeedSections.tsx |
| I33 | NetInfo + offline banner | ✅ | done | OfflineBanner + NetInfo |
| I34 | VoiceOver labels on tabs, cards, carousels | ✅ | done | a11y labels + LiveHub/Help/PredictionCard/HousePromo + verify_a11y_scaffold.sh |
| I35 | Password reset flow | ✅ | done | password reset flow |
| I36 | Fix push consent order (after onboarding opt-in) | ✅ | done | push consent order |
| I37 | Native Manage Subscriptions link (iOS 15+) | ✅ | done | mobile manageSubscriptions.ts |
| I38 | Paywall hero redesign + social proof | ✅ | done | PaywallHero + accuracy pill + dynamic trial days |
| I39 | Consistent skeleton/error/empty components | ✅ | done | FeedSkeleton/FeedErrorBanner/FeedEmptyState on Favorites, LiveHub, Games, Profile |
| I40 | Guest paywall preview (read-only) | ✅ | done | guest paywall preview |
| I41 | Annual plan ($199/yr) | ✅ | done | annual plan + SUBSCRIPTION_OFFER_POLICY founder/$29.99 gates; ASC IAP ops-only |
| I42 | Referral: “invite friend, 7 extra trial days” | ✅ | done | ReferralSection + docs/REFERRAL_PROGRAM.md; bonus days need ASC/Stripe promo setup |
| I43 | Share card: “My model accuracy this month” | ✅ | done | SharePickCard rollingAccuracyPct, build_share_card rolling_accuracy_pct |
| I44 | PostHog/Mixpanel integration | ✅ | done | productAnalytics.ts + mobile/.env.example PostHog keys + screen tracking |
| I45 | Push categories (kickoff, upsets, results) | ✅ | done | push_trigger_service types + push_service categoryId + mobile iOS categories |
| I46 | Trial-ending push + email | ✅ | done | send_trial_ending_reminders push + send_trial_ending_email when SMTP set |
| I47 | App Store review prompt after positive accuracy session | ✅ | done | mobile storeReview.ts |
| I48 | Public embed: accuracy widget for octobetiq.com | ✅ | done | web/widgets/accuracy-widget.html |
| I49 | Blog: weekly transparent scorecard | ✅ | done | web/scorecard.html 7d/30d/all-time + model status from public-audit |
| I50 | Android Play Store launch | 🚫 | blocked | docs/GOOGLE_PLAY_LAUNCH.md + eas.json android submit — Play Console ops-only |
| I51 | Managed Postgres (RDS/DO managed) | 🚫 | blocked | docs/MANAGED_POSTGRES_MIGRATION.md + migrate_to_managed_postgres.sh — cloud account ops-only |
| I52 | Celery/ARQ job queue | ✅ | done | job_worker_service + /internal/jobs/run-one + scripts/cron/internal_jobs_run_one.sh |
| I53 | SQL aggregation for leaderboards | ✅ | done | leaderboard_service SQL aggregation |
| I54 | WebSocket pub/sub via Redis | ✅ | done | live_websocket_hub Redis pub/sub |
| I55 | Connection limits on WS | ✅ | done | websocket_max_connections_per_game + WebSocketConnectionLimitError |
| I56 | API autoscaling (2+ instances) | 🚫 | blocked | docs/HA_AND_SCALING.md § Autoscaling — orchestrator ops-only |
| I57 | CloudFront/CDN for static | 🚫 | blocked | docs/CDN_STATIC_ASSETS.md + nginx-static-cache-snippet — CDN account ops-only |
| I58 | Staging environment | ✅ | done | docker-compose.staging.yml + run_staging_local.sh + deploy_staging_* scripts; public URL ops-only |
| I59 | Blue/green deploy | ✅ | done | deploy_api_blue_green.sh + scripts/nginx_swap_upstream.sh (NGINX_AUTO_SWAP=1) |
| I60 | Prometheus metrics + Grafana dashboards | ✅ | done | Prometheus + Grafana; load/chaos scaffold + verify_slo_scaffold.sh (#18) |
| I61 | Odds display (informational, not affiliate-first) | ✅ | done | MarketOddsCard + LineMovementCard on GameDetail when odds_display flag on |
| I62 | Line movement charts | ✅ | done | LineMovementCard + GET /games/{id}/line-movement + odds_snapshots on market-odds fetch |
| I63 | Closing line value tracker | ✅ | done | recordUserPick on GameDetail + UserPickStatsCard CLV on My Picks |
| I64 | “Model vs market” dashboard | ✅ | done | GET /stats/model-vs-market, web/model-vs-market.html |
| I65 | Player props (when licensed) | ✅ | done | player_props feed on Games tab + GameDetail polish + FEATURE_PLAYER_PROPS flag |
| I66 | Parlay correlation warnings | ✅ | done | parlay_correlation_service.py, POST /tools/parlay-correlation |
| I67 | Email digest: daily picks | ✅ | done | email_digest_service + /internal/email-digest/run + cron + job type email_digest |
| I68 | Watchlist sync across devices | ✅ | done | useFavorites React Query + sync notice + team-filtered games |
| I69 | iPad-optimized layouts | ✅ | done | WideContent on main tabs + Scorecard; tablet steps in ACCESSIBILITY_QA.md |
| I70 | Widget: today’s top pick | ✅ | done | widget API + Swift template + docs/IOS_WIDGET.md + verify_ios_widget_embed.sh + npm run widget:verify |
| I71 | Raise coverage to 60%+ | ✅ | done | CI coverage ≥60% |
| I72 | Stripe webhook test suite | ✅ | done | backend/tests/test_stripe_webhook.py |
| I73 | Monetization bypass regression tests | ✅ | done | backend/tests/test_premium_gating.py — auth, quota, share-pick bypass |
| I74 | Integration tests with Postgres in CI | ✅ | done | .github/workflows/ci.yml backend-postgres job, test_postgres_integration.py |
| I75 | Mobile Jest tests for subscription utils | ✅ | done | mobile subscription.test.ts + CI |
| I76 | E2E Detox for paywall flow | ✅ | done | e2e gates/guest/auth/game/paywall/delete + helpers + verify_detox_scaffold.sh |
| I77 | Feature flags service (LaunchDarkly/PostHog) | ✅ | done | backend/app/services/feature_flags.py, GET /config/feature-flags |
| I78 | API v2 planning doc | ✅ | done | docs/API_V2_PLAN.md |
| I79 | OpenAPI client codegen for mobile | ✅ | done | export_openapi.py, docs/OPENAPI_CODEGEN.md, mobile codegen:api |
| I80 | Delete dead code paths | ✅ | done | archive/README.md + services/users/README.md — legacy paths documented |
| I81 | GDPR data export endpoint | ✅ | done | GET /user/me/export, gdpr_export_service.py |
| I82 | CCPA opt-out flow | ✅ | done | POST /user/me/privacy/ccpa-opt-out |
| I83 | Gambling disclaimer audit on all screens | ✅ | done | PredictionDisclaimer on picks, feeds, paywall, GameDetail, Games, Profile, SharePickCard |
| I84 | Age gate if expanding content | ✅ | done | mobile AgeGateScreen + ageGateStorage.ts |
| I85 | App Privacy nutrition label review quarterly | 🚫 | blocked | docs/ASC_OPS_CHECKLIST.md §2 + asc_privacy_review_reminder.sh — quarterly ASC ops-only |
| I86 | A/B test trial length (7 vs 14 days) | ✅ | done | trial_length_days wired in PaywallScreen + PaywallHero via useServerFeatureFlags |
| I87 | A/B test price ($19.99 vs $29.99) | ✅ | done | paywall_price_tier promo + founder offer phase (#19); RevenueCat checkout primary |
| I88 | Intro offer for lapsed users | ✅ | done | intro_offer_variant winback banner on PaywallScreen |
| I89 | Rewarded ads vs premium messaging test | ✅ | done | rewarded_ads_messaging A/B copy in RewardedUnlockCTA |
| I90 | Ad density test on free tier | ✅ | done | ad_density server flag floors native ad spacing in AdEngine |
| I91 | Proprietary historical feature store | ✅ | done | game_feature_snapshots, feature_store_service.py, GET /stats/feature-store |
| I92 | User pick tracking vs model (Brier per user) | ✅ | done | POST /user/me/picks, GET /user/me/picks/brier, user_brier_service.py |
| I93 | Community predictions vs model | ✅ | done | GET /stats/community-vs-model, community_predictions_service.py |
| I94 | API for third-party accuracy audits | ✅ | done | GET /stats/public-audit |
| I95 | Academic partnership for methodology paper | 🚫 | blocked | docs/EXTERNAL_OPS_PLAYBOOK.md § Partnership — external |
| I96 | Sport-specific model teams (hire) | 🚫 | blocked | docs/EXTERNAL_OPS_PLAYBOOK.md § Hiring — external |
| I97 | Real-time injury feed integration | ✅ | done | GameDetailInjurySection + GET /games/{id}/injuries + spotlight sync |
| I98 | Weather/feature enrichment for outdoor sports | ✅ | done | GameDetailWeatherSection + GET /games/{id}/weather for NFL outdoor games |
| I99 | Ensemble only when backtest proves lift | ✅ | done | ensemble_gating_service.py, docs/ENSEMBLE_GATING.md, metrics ensemble_eligible |
| I100 | Patent/trade secret on calibration display UX | 🚫 | blocked | docs/EXTERNAL_OPS_PLAYBOOK.md § Legal — counsel external |

---

## Remaining blocked items (external ops only)

In-repo scaffolds and runbooks are complete. Operator checklist: **`docs/EXTERNAL_OPS_PLAYBOOK.md`**

Verify: `bash scripts/verify_external_ops_readiness.sh`

| ID | Title | Runbook / action |
|----|-------|------------------|
| W3 | Single VPS — total SPOF | docs/HA_AND_SCALING.md + EXTERNAL_OPS_PLAYBOOK.md — second VPS/orchestrator ops-only |
| W36 | Keywords typo “ports” on live listing | docs/ASC_OPS_CHECKLIST.md + print_asc_keywords.sh — ASC login ops-only |
| I18 | Fix live keywords `ports` → `sports` | docs/ASC_OPS_CHECKLIST.md §1 — paste keywords in App Store Connect |
| I50 | Android Play Store launch | docs/GOOGLE_PLAY_LAUNCH.md + eas.json android submit — Play Console ops-only |
| I51 | Managed Postgres (RDS/DO managed) | docs/MANAGED_POSTGRES_MIGRATION.md + migrate_to_managed_postgres.sh — cloud account ops-only |
| I56 | API autoscaling (2+ instances) | docs/HA_AND_SCALING.md § Autoscaling — orchestrator ops-only |
| I57 | CloudFront/CDN for static | docs/CDN_STATIC_ASSETS.md + nginx-static-cache-snippet — CDN account ops-only |
| I85 | App Privacy nutrition label review quarterly | docs/ASC_OPS_CHECKLIST.md §2 + asc_privacy_review_reminder.sh — quarterly ASC ops-only |
| I95 | Academic partnership for methodology paper | docs/EXTERNAL_OPS_PLAYBOOK.md § Partnership — external |
| I96 | Sport-specific model teams (hire) | docs/EXTERNAL_OPS_PLAYBOOK.md § Hiring — external |
| I100 | Patent/trade secret on calibration display UX | docs/EXTERNAL_OPS_PLAYBOOK.md § Legal — counsel external |

---

## Audit completion note

All implementable code, tests, and documentation for the 150-item due diligence pass are **done**.  
The 11 blocked items require manual ops (ASC, Play Console, cloud accounts, legal/hiring).  
Use the external ops playbook to execute them in priority order.
