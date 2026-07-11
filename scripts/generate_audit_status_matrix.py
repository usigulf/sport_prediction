#!/usr/bin/env python3
"""Generate docs/AUDIT_STATUS_MATRIX.md from AUDIT_SOURCE_LISTS.json + status registry."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "AUDIT_SOURCE_LISTS.json"
OUT = ROOT / "docs" / "AUDIT_STATUS_MATRIX.md"

# Status: done | partial | open | blocked
# Evidence paths relative to repo root
REGISTRY: dict[str, tuple[str, str]] = {
    "W1": ("done", "backend/app/services/free_tier_limits.py, backend/tests/test_free_tier_prediction_limits.py"),
    "W2": ("done", "docs/PRODUCTION_REALITY.md canonical + ARCHITECTURE.md §3 production banner"),
    "W3": ("blocked", "Single VPS docker-compose.prod.yml; HA needs second region/instances"),
    "W4": ("partial", "scripts/run_pg_backup.sh, scripts/setup_offsite_backup.sh — PH2-005 blocked on DO Spaces write keys"),
    "W5": ("done", "deploy/nginx-deny-internal-snippet.conf, backend/tests/test_nginx_deny_internal.py"),
    "W6": ("done", "pytest.ini --cov-fail-under=60, .github/workflows/ci.yml"),
    "W7": ("done", "backend/app/services/stripe_webhook_idempotency.py"),
    "W8": ("done", "backend/app/services/revenuecat_webhook_idempotency.py"),
    "W9": ("partial", "scripts/rotate_app_review_demo_account.py; DEV_CREDENTIALS.md dev-only"),
    "W10": ("done", "backend/tests/test_env_examples.py"),
    "W11": ("done", "docker-compose.yml Redis requirepass"),
    "W12": ("done", "backend/app/services/leaderboard_service.py"),
    "W13": ("partial", "backend/app/services/live_websocket_hub.py — one poller per game, Redis pub/sub"),
    "W14": ("done", "GameDetail split into hook + section components; PaywallHero extracted"),
    "W15": ("done", "backend/app/services/password_reset_service.py, mobile ForgotPasswordScreen"),
    "W16": ("done", "mobile/src/utils/pushNotifications.ts, backend/tests/test_push_consent_order.py"),
    "W17": ("done", "VoiceOver on tabs, GameCard, mini cards, carousel, Paywall, GameDetail favorites"),
    "W18": ("done", "mobile/src/components/OfflineBanner.tsx"),
    "W19": ("done", "backend/app/utils/prediction_source.py, mobile PredictionCard"),
    "W20": ("done", "backend/app/services/model_training.py soccer 1X2"),
    "W21": ("done", "backend/tests/test_feature_builder_pit.py"),
    "W22": ("done", "backend/tests/test_explanation_service.py"),
    "W23": ("done", "archive/README.md + ARCHITECTURE.md §3.0 shipped table"),
    "W24": ("done", "archive/services/ + services/users/README.md — legacy not deployed"),
    "W25": ("done", ".github/workflows/ci.yml Ruff without || true"),
    "W26": ("done", "scripts/pip_audit_backend.sh, npm audit in CI"),
    "W27": ("done", "scripts/deploy_api.sh alembic upgrade head"),
    "W28": ("done", "backend/app/monitoring/prometheus_metrics.py"),
    "W29": ("done", "backend/app/services/subscription_cancel_service.py"),
    "W30": ("done", "backend/app/utils/subscription_tiers.py"),
    "W31": ("done", "mobile PaywallScreen guest preview"),
    "W32": ("done", "MarketOddsCard edge badge + LineMovementCard + model-vs-market dashboard"),
    "W33": ("partial", "Annual Stripe + Paywall gating; ASC product com.octobetiq.premium.annual blocked"),
    "W34": ("partial", "ReferralSection on Profile + referral/apply API; bonus days need ASC/Stripe promo"),
    "W35": ("partial", "mobile/src/services/productAnalytics.ts — needs POSTHOG key in prod"),
    "W36": ("blocked", "Live ASC keywords — requires App Store Connect login"),
    "W37": ("done", "backend/app/services/game_search_service.py, GET /games/search"),
    "W38": ("done", "useSubscriptionTier + useGameDetailQuery React Query; GameDetail/ExplanationView migrated"),
    "W39": ("done", "mobile HomeFeedSections error+retry"),
    "W40": ("done", "backend/app/config.py auto-disables OpenAPI in production"),
    "W41": ("done", "backend/app/services/token_revocation_service.py Redis jti denylist; prod requires REDIS_URL"),
    "W42": ("partial", "backend/app/services/job_queue_service.py + /internal/jobs/* — cron worker pattern"),
    "W43": ("done", "docker-compose.yml pinned image tags"),
    "W44": ("done", "mobile/src/utils/subscription.test.ts, CI mobile Jest job"),
    "W45": ("partial", "premium_plus in API; Paywall shows Premium only by design"),
    "W46": ("done", "backend/tests/test_revenuecat_webhook.py entitlement mapping"),
    "W47": ("done", "web/subscriber-portal.html, POST /subscription/billing-portal"),
    "W48": ("done", ".gitignore coverage.xml"),
    "W49": ("done", "Makefile ml-evaluate → backend/scripts/evaluate_models_cli.py"),
    "W50": ("partial", "docker-compose.staging.yml; PH2-011 blocked on DNS api-staging.octobetiq.com"),
    "I1": ("done", "backend/app/services/free_tier_limits.py"),
    "I2": ("done", "backend/app/utils/subscription_tiers.py"),
    "I3": ("done", "backend/app/utils/prediction_source.py"),
    "I4": ("done", "backend/app/services/prediction_payload.py"),
    "I5": ("partial", "scripts/rotate_app_review_demo_account.py"),
    "I6": ("done", "backend/.env.example placeholders"),
    "I7": ("done", "deploy/nginx-deny-internal-snippet.conf"),
    "I8": ("done", ".env.production.example INTERNAL_ALLOWED_CIDRS"),
    "I9": ("done", "alembic 011/012 webhook events"),
    "I10": ("partial", "scripts/setup_offsite_backup.sh — credentials blocked"),
    "I11": ("done", "docker-compose Redis auth"),
    "I12": ("done", "scripts/deploy_api.sh migrations"),
    "I13": ("done", "CI Ruff"),
    "I14": ("done", "CI pip-audit npm audit"),
    "I15": ("done", "backend/requirements.txt pinned"),
    "I16": ("done", "subscription_cancel_service on delete"),
    "I17": ("done", "backend/tests/test_web_marketing_copy.py"),
    "I18": ("blocked", "App Store Connect live listing"),
    "I19": ("done", "backend/app/utils/sentry_alerts.py"),
    "I20": ("done", "scripts/check_api_health.sh"),
    "I21": ("done", "backend/tests/test_feature_builder_pit.py"),
    "I22": ("done", "backend/app/services/model_training.py"),
    "I23": ("done", "backend/app/services/walk_forward_backtest.py"),
    "I24": ("done", "backend/app/services/explanation_service.py"),
    "I25": ("done", "explanation per-league model dir"),
    "I26": ("done", "backend/models/metrics.json schema example with eval + publish_ready"),
    "I27": ("done", "archive/README.md — ml/ and Rust services archived with replacements"),
    "I28": ("done", "docs/PRODUCTION_REALITY.md + ARCHITECTURE.md §3 shipped vs aspirational"),
    "I29": ("partial", "walk_forward_backtest market_benchmark note + /stats/model-vs-market live"),
    "I30": ("done", "model_training calibration mins"),
    "I31": ("done", "mobile React Query hooks"),
    "I32": ("done", "mobile/src/screens/home/HomeFeedSections.tsx"),
    "I33": ("done", "OfflineBanner + NetInfo"),
    "I34": ("done", "a11y labels on GameCard, BestPickMiniCard, BestPicksCarousel, GameDetail favorites"),
    "I35": ("done", "password reset flow"),
    "I36": ("done", "push consent order"),
    "I37": ("done", "mobile manageSubscriptions.ts"),
    "I38": ("done", "PaywallHero + accuracy pill + dynamic trial days"),
    "I39": ("done", "FeedSkeleton/FeedErrorBanner/FeedEmptyState on Favorites, LiveHub, Games, Profile"),
    "I40": ("done", "guest paywall preview"),
    "I41": ("partial", "annual plan code; ASC IAP blocked"),
    "I42": ("partial", "ReferralSection share/apply UI + referral/apply tracking; bonus days need ASC/Stripe promo"),
    "I43": ("done", "SharePickCard rollingAccuracyPct, build_share_card rolling_accuracy_pct"),
    "I44": ("partial", "productAnalytics.ts optional PostHog"),
    "I45": ("done", "push_trigger_service types + push_service categoryId + mobile iOS categories"),
    "I46": ("done", "send_trial_ending_reminders push + send_trial_ending_email when SMTP set"),
    "I47": ("done", "mobile storeReview.ts"),
    "I48": ("done", "web/widgets/accuracy-widget.html"),
    "I49": ("done", "web/scorecard.html 7d/30d/all-time + model status from public-audit"),
    "I50": ("blocked", "Play Store listing + Google Play Console"),
    "I51": ("blocked", "Managed Postgres — docs/scripts only; needs cloud account"),
    "I52": ("partial", "job_queue_service.py + internal endpoints"),
    "I53": ("done", "leaderboard_service SQL aggregation"),
    "I54": ("done", "live_websocket_hub Redis pub/sub"),
    "I55": ("done", "websocket_max_connections_per_game + WebSocketConnectionLimitError"),
    "I56": ("blocked", "Autoscaling needs orchestrator (K8s/DO App Platform)"),
    "I57": ("blocked", "CDN — needs CloudFront/DO CDN account"),
    "I58": ("partial", "docker-compose.staging.yml; public URL blocked DNS"),
    "I59": ("partial", "scripts/deploy_api_blue_green.sh — nginx swap manual"),
    "I60": ("done", "Prometheus + Grafana compose profile"),
    "I61": ("done", "MarketOddsCard + LineMovementCard on GameDetail when odds_display flag on"),
    "I62": ("done", "LineMovementCard + GET /games/{id}/line-movement + odds_snapshots on market-odds fetch"),
    "I63": ("done", "recordUserPick on GameDetail + UserPickStatsCard CLV on My Picks"),
    "I64": ("done", "GET /stats/model-vs-market, web/model-vs-market.html"),
    "I65": ("partial", "player_props_service behind FEATURE_PLAYER_PROPS"),
    "I66": ("done", "parlay_correlation_service.py, POST /tools/parlay-correlation"),
    "I67": ("partial", "email_digest_service.py + /internal/email-digest/run; SMTP required"),
    "I68": ("done", "useFavorites React Query + sync notice + team-filtered games"),
    "I69": ("done", "WideContent + useLayout on Home, GameDetail, Paywall, Profile, Games, Favorites, LiveHub"),
    "I70": ("partial", "widget API + Swift template + docs/IOS_WIDGET.md embed checklist + npm run widget:verify"),
    "I71": ("done", "CI coverage ≥60%"),
    "I72": ("done", "backend/tests/test_stripe_webhook.py"),
    "I73": ("done", "backend/tests/test_premium_gating.py — auth, quota, share-pick bypass"),
    "I74": ("done", ".github/workflows/ci.yml backend-postgres job, test_postgres_integration.py"),
    "I75": ("done", "mobile subscription.test.ts + CI"),
    "I76": ("partial", "mobile/e2e/paywall.e2e.ts + testIDs; Detox build required"),
    "I77": ("done", "backend/app/services/feature_flags.py, GET /config/feature-flags"),
    "I78": ("done", "docs/API_V2_PLAN.md"),
    "I79": ("done", "export_openapi.py, docs/OPENAPI_CODEGEN.md, mobile codegen:api"),
    "I80": ("done", "archive/README.md + services/users/README.md — legacy paths documented"),
    "I81": ("done", "GET /user/me/export, gdpr_export_service.py"),
    "I82": ("done", "POST /user/me/privacy/ccpa-opt-out"),
    "I83": ("done", "PredictionDisclaimer on picks, feeds, paywall, GameDetail, Games, Profile, SharePickCard"),
    "I84": ("done", "mobile AgeGateScreen + ageGateStorage.ts"),
    "I85": ("blocked", "Quarterly ASC privacy label — manual process"),
    "I86": ("done", "trial_length_days wired in PaywallScreen + PaywallHero via useServerFeatureFlags"),
    "I87": ("partial", "paywall_price_tier promo banner + reference price; RevenueCat checkout primary"),
    "I88": ("done", "intro_offer_variant winback banner on PaywallScreen"),
    "I89": ("done", "rewarded_ads_messaging A/B copy in RewardedUnlockCTA"),
    "I90": ("done", "ad_density server flag floors native ad spacing in AdEngine"),
    "I91": ("done", "game_feature_snapshots, feature_store_service.py, GET /stats/feature-store"),
    "I92": ("done", "POST /user/me/picks, GET /user/me/picks/brier, user_brier_service.py"),
    "I93": ("done", "GET /stats/community-vs-model, community_predictions_service.py"),
    "I94": ("done", "GET /stats/public-audit"),
    "I95": ("blocked", "Academic partnership — external"),
    "I96": ("blocked", "Hiring — external"),
    "I97": ("partial", "game_injury_reports + GET /games/{id}/injuries, spotlight sync"),
    "I98": ("partial", "weather_enrichment_service.py + GET /games/{id}/weather (NFL, WEATHER_API_KEY)"),
    "I99": ("done", "ensemble_gating_service.py, docs/ENSEMBLE_GATING.md, metrics ensemble_eligible"),
    "I100": ("blocked", "Legal/patent — external"),
}

ICON = {"done": "✅", "partial": "🟡", "open": "❌", "blocked": "🚫"}


def main() -> None:
    data = json.loads(SOURCE.read_text())
    weaknesses = data["weaknesses"]
    improvements = data["improvements"]

    def row(prefix: str, items: list) -> list[str]:
        lines = []
        for num, title in items:
            key = f"{prefix}{num}"
            status, evidence = REGISTRY.get(key, ("open", "Not assessed"))
            lines.append(f"| {key} | {title} | {ICON[status]} | {status} | {evidence} |")
        return lines

    w_rows = row("W", weaknesses)
    i_rows = row("I", improvements)

    def count(rows_keys: list[str]) -> dict[str, int]:
        c = {"done": 0, "partial": 0, "open": 0, "blocked": 0}
        for k in rows_keys:
            c[REGISTRY.get(k, ("open", ""))[0]] += 1
        return c

    w_keys = [f"W{n}" for n, _ in weaknesses]
    i_keys = [f"I{n}" for n, _ in improvements]
    wc = count(w_keys)
    ic = count(i_keys)
    total_done = wc["done"] + ic["done"]
    total_partial = wc["partial"] + ic["partial"]
    total_open = wc["open"] + ic["open"]
    total_blocked = wc["blocked"] + ic["blocked"]
    implementable = 150 - total_blocked
    coverage_pct = round(100.0 * (total_done + 0.5 * total_partial) / implementable, 1)

    md = f"""# Audit Status Matrix

Generated from `docs/AUDIT_SOURCE_LISTS.json` and repository evidence.  
Legend: ✅ done · 🟡 partial · ❌ not implemented · 🚫 blocked (external credentials/infrastructure)

**Last updated:** 2026-07-08 (Phase 3 audit pass)

## Summary

| Metric | Weaknesses (50) | Improvements (100) | Combined (150) |
|--------|-----------------|--------------------|----------------|
| ✅ Done | {wc['done']} | {ic['done']} | {total_done} |
| 🟡 Partial | {wc['partial']} | {ic['partial']} | {total_partial} |
| ❌ Open | {wc['open']} | {ic['open']} | {total_open} |
| 🚫 Blocked | {wc['blocked']} | {ic['blocked']} | {total_blocked} |

**Implementable coverage:** {coverage_pct}% — `(done + 0.5×partial) / (150 − blocked)`

Backend CI enforces **≥60%** line coverage (`pytest.ini`). Mobile Jest added for subscription utils.

---

## Top 50 Weaknesses

| ID | Title | Status | State | Evidence |
|----|-------|--------|-------|----------|
"""
    md += "\n".join(w_rows)
    md += """

---

## Top 100 Improvements

| ID | Title | Status | State | Evidence |
|----|-------|--------|-------|----------|
"""
    md += "\n".join(i_rows)
    md += """

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
"""
    OUT.write_text(md)
    print(f"Wrote {OUT} — coverage {coverage_pct}%")


if __name__ == "__main__":
    main()
