#!/usr/bin/env python3
"""Generate docs/AUDIT_STATUS_MATRIX.md from AUDIT_SOURCE_LISTS.json + status registry."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "AUDIT_SOURCE_LISTS.json"
OUT = ROOT / "docs" / "AUDIT_STATUS_MATRIX.md"

# Status: done | partial | open | blocked
# Evidence paths relative to repo root
REGISTRY: dict[str, tuple[str, str]] = {
    "W1": ("done", "backend/app/services/free_tier_limits.py, backend/tests/test_free_tier_prediction_limits.py"),
    "W2": ("done", "docs/PRODUCTION_REALITY.md canonical + ARCHITECTURE.md §3 production banner"),
    "W3": ("blocked", "docs/HA_AND_SCALING.md + EXTERNAL_OPS_PLAYBOOK.md — second VPS/orchestrator ops-only"),
    "W4": ("done", "run_pg_backup + setup_offsite_backup + OFFSITE_BACKUP_RUNBOOK + verify_offsite_backup_scaffold.sh; DO Spaces keys ops-only"),
    "W5": ("done", "deploy/nginx-deny-internal-snippet.conf, backend/tests/test_nginx_deny_internal.py"),
    "W6": ("done", "pytest.ini --cov-fail-under=60, .github/workflows/ci.yml"),
    "W7": ("done", "backend/app/services/stripe_webhook_idempotency.py"),
    "W8": ("done", "backend/app/services/revenuecat_webhook_idempotency.py"),
    "W9": ("done", "rotate_app_review_demo_account.py + DEV_CREDENTIALS.md without literal passwords"),
    "W10": ("done", "backend/tests/test_env_examples.py"),
    "W11": ("done", "docker-compose.yml Redis requirepass"),
    "W12": ("done", "backend/app/services/leaderboard_service.py"),
    "W13": ("done", "live_websocket_hub one poller per game + Redis pub/sub; test_job_worker_and_ws_hub"),
    "W14": ("done", "GameDetail split into hook + section components; PaywallHero extracted"),
    "W15": ("done", "backend/app/services/password_reset_service.py, mobile ForgotPasswordScreen"),
    "W16": ("done", "mobile/src/utils/pushNotifications.ts, backend/tests/test_push_consent_order.py"),
    "W17": ("done", "VoiceOver tabs/cards + ACCESSIBILITY_QA.md + contrast/dynamic-type scaffold (#16)"),
    "W18": ("done", "mobile/src/components/OfflineBanner.tsx"),
    "W19": ("done", "backend/app/utils/prediction_source.py, mobile PredictionCard"),
    "W20": ("done", "backend/app/services/model_training.py soccer 1X2"),
    "W21": ("done", "backend/tests/test_feature_builder_pit.py"),
    "W22": ("done", "backend/tests/test_explanation_service.py"),
    "W23": ("done", "archive/README.md + ARCHITECTURE.md §3.0 shipped table"),
    "W24": ("done", "archive/services/ + services/users/README.md — legacy not deployed"),
    "W25": ("done", ".github/workflows/ci.yml Ruff without || true"),
    "W26": ("done", "pip-audit + npm audit + bandit + SECURITY_THREAT_MODEL.md + verify_security_scaffold.sh"),
    "W27": ("done", "scripts/deploy_api.sh alembic upgrade head"),
    "W28": ("done", "backend/app/monitoring/prometheus_metrics.py"),
    "W29": ("done", "backend/app/services/subscription_cancel_service.py"),
    "W30": ("done", "backend/app/utils/subscription_tiers.py"),
    "W31": ("done", "mobile PaywallScreen guest preview"),
    "W32": ("done", "MarketOddsCard edge badge + LineMovementCard + model-vs-market dashboard"),
    "W33": ("done", "Annual Stripe + Paywall gating + docs/ANNUAL_IAP_SETUP.md + verify_annual_iap_scaffold.sh; ASC product ops-only"),
    "W34": ("done", "ReferralSection + referral/apply API + docs/REFERRAL_PROGRAM.md; bonus days need ASC/Stripe promo"),
    "W35": ("done", "productAnalytics.ts + mobile/.env.example; set EXPO_PUBLIC_POSTHOG_API_KEY in EAS prod"),
    "W36": ("blocked", "docs/ASC_OPS_CHECKLIST.md + print_asc_keywords.sh — ASC login ops-only"),
    "W37": ("done", "backend/app/services/game_search_service.py, GET /games/search"),
    "W38": ("done", "useSubscriptionTier + useGameDetailQuery React Query; GameDetail/ExplanationView migrated"),
    "W39": ("done", "mobile HomeFeedSections error+retry"),
    "W40": ("done", "backend/app/config.py auto-disables OpenAPI in production"),
    "W41": ("done", "backend/app/services/token_revocation_service.py Redis jti denylist; prod requires REDIS_URL"),
    "W42": ("done", "job_queue_service + job_worker_service + /internal/jobs/run-one + cron"),
    "W43": ("done", "docker-compose.yml pinned image tags"),
    "W44": ("done", "mobile/src/utils/subscription.test.ts, CI mobile Jest job"),
    "W45": ("done", "docs/SUBSCRIPTION_TIERS.md — premium_plus legacy; Paywall Premium-only by design"),
    "W46": ("done", "backend/tests/test_revenuecat_webhook.py entitlement mapping"),
    "W47": ("done", "web/subscriber-portal.html, POST /subscription/billing-portal"),
    "W48": ("done", ".gitignore coverage.xml"),
    "W49": ("done", "Makefile ml-evaluate → backend/scripts/evaluate_models_cli.py"),
    "W50": ("done", "docker-compose.staging.yml + run_staging_local.sh + STAGING_ENVIRONMENT.md + verify_staging_scaffold.sh; public DNS ops-only"),
    "I1": ("done", "backend/app/services/free_tier_limits.py"),
    "I2": ("done", "backend/app/utils/subscription_tiers.py"),
    "I3": ("done", "backend/app/utils/prediction_source.py"),
    "I4": ("done", "backend/app/services/prediction_payload.py"),
    "I5": ("done", "scripts/rotate_app_review_demo_account.py; public docs reference seed script only"),
    "I6": ("done", "backend/.env.example placeholders"),
    "I7": ("done", "deploy/nginx-deny-internal-snippet.conf"),
    "I8": ("done", ".env.production.example INTERNAL_ALLOWED_CIDRS"),
    "I9": ("done", "alembic 011/012 webhook events"),
    "I10": ("done", "setup_offsite_backup + OFFSITE_BACKUP_RUNBOOK + verify_offsite_backup_scaffold.sh; credentials ops-only"),
    "I11": ("done", "docker-compose Redis auth"),
    "I12": ("done", "scripts/deploy_api.sh migrations"),
    "I13": ("done", "CI Ruff"),
    "I14": ("done", "CI pip-audit npm audit bandit; dependabot.yml; restore drill scaffold"),
    "I15": ("done", "backend/requirements.txt pinned"),
    "I16": ("done", "subscription_cancel_service on delete"),
    "I17": ("done", "backend/tests/test_web_marketing_copy.py"),
    "I18": ("blocked", "docs/ASC_OPS_CHECKLIST.md §1 — paste keywords in App Store Connect"),
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
    "I29": ("done", "walk_forward market_benchmark + CLI hint + GET /stats/model-vs-market live"),
    "I30": ("done", "model_training calibration mins"),
    "I31": ("done", "mobile React Query hooks"),
    "I32": ("done", "mobile/src/screens/home/HomeFeedSections.tsx"),
    "I33": ("done", "OfflineBanner + NetInfo"),
    "I34": ("done", "a11y labels + LiveHub/Help/PredictionCard/HousePromo + verify_a11y_scaffold.sh"),
    "I35": ("done", "password reset flow"),
    "I36": ("done", "push consent order"),
    "I37": ("done", "mobile manageSubscriptions.ts"),
    "I38": ("done", "PaywallHero + accuracy pill + dynamic trial days"),
    "I39": ("done", "FeedSkeleton/FeedErrorBanner/FeedEmptyState on Favorites, LiveHub, Games, Profile"),
    "I40": ("done", "guest paywall preview"),
    "I41": ("done", "annual plan code + docs/ANNUAL_IAP_SETUP.md + test_annual_subscription_plan.py; ASC IAP ops-only"),
    "I42": ("done", "ReferralSection + docs/REFERRAL_PROGRAM.md; bonus days need ASC/Stripe promo setup"),
    "I43": ("done", "SharePickCard rollingAccuracyPct, build_share_card rolling_accuracy_pct"),
    "I44": ("done", "productAnalytics.ts + mobile/.env.example PostHog keys + screen tracking"),
    "I76": ("done", "e2e gates/guest/auth/game/paywall/delete + helpers + verify_detox_scaffold.sh"),
    "I45": ("done", "push_trigger_service types + push_service categoryId + mobile iOS categories"),
    "I46": ("done", "send_trial_ending_reminders push + send_trial_ending_email when SMTP set"),
    "I47": ("done", "mobile storeReview.ts"),
    "I48": ("done", "web/widgets/accuracy-widget.html"),
    "I49": ("done", "web/scorecard.html 7d/30d/all-time + model status from public-audit"),
    "I50": ("blocked", "docs/GOOGLE_PLAY_LAUNCH.md + eas.json android submit — Play Console ops-only"),
    "I51": ("blocked", "docs/MANAGED_POSTGRES_MIGRATION.md + migrate_to_managed_postgres.sh — cloud account ops-only"),
    "I52": ("done", "job_worker_service + /internal/jobs/run-one + scripts/cron/internal_jobs_run_one.sh"),
    "I53": ("done", "leaderboard_service SQL aggregation"),
    "I54": ("done", "live_websocket_hub Redis pub/sub"),
    "I55": ("done", "websocket_max_connections_per_game + WebSocketConnectionLimitError"),
    "I56": ("blocked", "docs/HA_AND_SCALING.md § Autoscaling — orchestrator ops-only"),
    "I57": ("blocked", "docs/CDN_STATIC_ASSETS.md + nginx-static-cache-snippet — CDN account ops-only"),
    "I58": ("done", "docker-compose.staging.yml + run_staging_local.sh + deploy_staging_* scripts; public URL ops-only"),
    "I59": ("done", "deploy_api_blue_green.sh + scripts/nginx_swap_upstream.sh (NGINX_AUTO_SWAP=1)"),
    "I60": ("done", "Prometheus + Grafana compose profile"),
    "I61": ("done", "MarketOddsCard + LineMovementCard on GameDetail when odds_display flag on"),
    "I62": ("done", "LineMovementCard + GET /games/{id}/line-movement + odds_snapshots on market-odds fetch"),
    "I63": ("done", "recordUserPick on GameDetail + UserPickStatsCard CLV on My Picks"),
    "I64": ("done", "GET /stats/model-vs-market, web/model-vs-market.html"),
    "I65": ("done", "player_props feed on Games tab + GameDetail polish + FEATURE_PLAYER_PROPS flag"),
    "I66": ("done", "parlay_correlation_service.py, POST /tools/parlay-correlation"),
    "I67": ("done", "email_digest_service + /internal/email-digest/run + cron + job type email_digest"),
    "I68": ("done", "useFavorites React Query + sync notice + team-filtered games"),
    "I69": ("done", "WideContent on main tabs + Scorecard; tablet steps in ACCESSIBILITY_QA.md"),
    "I70": ("done", "widget API + Swift template + docs/IOS_WIDGET.md + verify_ios_widget_embed.sh + npm run widget:verify"),
    "I71": ("done", "CI coverage ≥60%"),
    "I72": ("done", "backend/tests/test_stripe_webhook.py"),
    "I73": ("done", "backend/tests/test_premium_gating.py — auth, quota, share-pick bypass"),
    "I74": ("done", ".github/workflows/ci.yml backend-postgres job, test_postgres_integration.py"),
    "I75": ("done", "mobile subscription.test.ts + CI"),
    "I77": ("done", "backend/app/services/feature_flags.py, GET /config/feature-flags"),
    "I78": ("done", "docs/API_V2_PLAN.md"),
    "I79": ("done", "export_openapi.py, docs/OPENAPI_CODEGEN.md, mobile codegen:api"),
    "I80": ("done", "archive/README.md + services/users/README.md — legacy paths documented"),
    "I81": ("done", "GET /user/me/export, gdpr_export_service.py"),
    "I82": ("done", "POST /user/me/privacy/ccpa-opt-out"),
    "I83": ("done", "PredictionDisclaimer on picks, feeds, paywall, GameDetail, Games, Profile, SharePickCard"),
    "I84": ("done", "mobile AgeGateScreen + ageGateStorage.ts"),
    "I85": ("blocked", "docs/ASC_OPS_CHECKLIST.md §2 + asc_privacy_review_reminder.sh — quarterly ASC ops-only"),
    "I86": ("done", "trial_length_days wired in PaywallScreen + PaywallHero via useServerFeatureFlags"),
    "I87": ("done", "paywall_price_tier promo banner + reference price + PostHog paywall_experiment_viewed; RevenueCat checkout primary"),
    "I88": ("done", "intro_offer_variant winback banner on PaywallScreen"),
    "I89": ("done", "rewarded_ads_messaging A/B copy in RewardedUnlockCTA"),
    "I90": ("done", "ad_density server flag floors native ad spacing in AdEngine"),
    "I91": ("done", "game_feature_snapshots, feature_store_service.py, GET /stats/feature-store"),
    "I92": ("done", "POST /user/me/picks, GET /user/me/picks/brier, user_brier_service.py"),
    "I93": ("done", "GET /stats/community-vs-model, community_predictions_service.py"),
    "I94": ("done", "GET /stats/public-audit"),
    "I95": ("blocked", "docs/EXTERNAL_OPS_PLAYBOOK.md § Partnership — external"),
    "I96": ("blocked", "docs/EXTERNAL_OPS_PLAYBOOK.md § Hiring — external"),
    "I97": ("done", "GameDetailInjurySection + GET /games/{id}/injuries + spotlight sync"),
    "I98": ("done", "GameDetailWeatherSection + GET /games/{id}/weather for NFL outdoor games"),
    "I99": ("done", "ensemble_gating_service.py, docs/ENSEMBLE_GATING.md, metrics ensemble_eligible"),
    "I100": ("blocked", "docs/EXTERNAL_OPS_PLAYBOOK.md § Legal — counsel external"),
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

    blocked_rows: list[str] = []
    for key in w_keys + i_keys:
        status, evidence = REGISTRY.get(key, ("open", ""))
        if status != "blocked":
            continue
        title = next(
            (t for n, t in weaknesses if f"W{n}" == key),
            next((t for n, t in improvements if f"I{n}" == key), key),
        )
        blocked_rows.append(f"| {key} | {title} | {evidence} |")

    today = date.today().isoformat()

    md = f"""# Audit Status Matrix

Generated from `docs/AUDIT_SOURCE_LISTS.json` and repository evidence.  
Legend: ✅ done · 🟡 partial · ❌ not implemented · 🚫 blocked (external credentials/infrastructure)

**Last updated:** {today} · **In-repo coverage:** {coverage_pct}% complete

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

## Remaining blocked items (external ops only)

In-repo scaffolds and runbooks are complete. Operator checklist: **`docs/EXTERNAL_OPS_PLAYBOOK.md`**

Verify: `bash scripts/verify_external_ops_readiness.sh`

| ID | Title | Runbook / action |
|----|-------|------------------|
"""
    md += "\n".join(blocked_rows)
    md += """

---

## Audit completion note

All implementable code, tests, and documentation for the 150-item due diligence pass are **done**.  
The 11 blocked items require manual ops (ASC, Play Console, cloud accounts, legal/hiring).  
Use the external ops playbook to execute them in priority order.
"""
    OUT.write_text(md)
    print(f"Wrote {OUT} — coverage {coverage_pct}%")


if __name__ == "__main__":
    main()
