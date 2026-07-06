# Audit Implementation Backlog

Master backlog from technical due diligence (2026-07-04).  
**Workflow:** ONE task at a time. Mark `done` only when implementation, tests, lint, and verification complete.

**Status legend:** `pending` | `in_progress` | `done` | `blocked`

---

## P0 — Revenue & trust

| ID | Task | Depends | Status |
|----|------|---------|--------|
| P0-001 | Fix free-tier daily prediction limit on all endpoints (dedupe by game/day) | — | done |
| P0-002 | Centralize subscription tier gating (`premium`, `pro`, `trialing`) | P0-001 | done |
| P0-003 | Expose `prediction_source` / block heuristic in prod UI | P0-002 | done |
| P0-004 | Rotate demo credentials; remove from public scripts | — | done |
| P0-005 | Replace real-looking secrets in `.env.example` with placeholders | — | done |
| P0-006 | Nginx deny `/internal` on public API hosts | — | done |
| P0-007 | Set `INTERNAL_ALLOWED_CIDRS=127.0.0.1/32` in prod template + VPS | P0-006 | done |
| P0-008 | Stripe webhook idempotency (event ID dedup table) | — | done |
| P0-009 | RevenueCat webhook idempotency | — | done |
| P0-010 | DB backup in crontab + offsite copy docs/script | — | done |

## P1 — Security & ops

| ID | Task | Depends | Status |
|----|------|---------|--------|
| P1-001 | Redis requirepass + update REDIS_URL | P0-007 | done |
| P1-002 | Run migrations in `deploy_api.sh` (fail on error) | — | done |
| P1-003 | CI: fail on Ruff (remove `\|\| true`) | — | done |
| P1-004 | CI: pip-audit + npm audit | — | done |
| P1-005 | Pin backend dependencies | — | done |
| P1-006 | Cancel Stripe/RC subscriptions on account delete | P0-008, P0-009 | done |
| P1-007 | Remove unsourced "62%+" from web copy | — | done |
| P1-008 | Fix live ASC keywords `ports` → `sports` | — | done |
| P1-009 | Add `coverage.xml` to `.gitignore` | — | done |

## P2 — ML integrity

| ID | Task | Depends | Status |
|----|------|---------|--------|
| P2-001 | PIT-only features at inference (no current standings fallback in prod) | P0-003 | done |
| P2-002 | Train native soccer 1X2 model | P2-001 | done |
| P2-003 | Walk-forward backtest script | P2-001 | done |
| P2-004 | Fix explainability (per-league model dir + calibrated coefs) | — | done |
| P2-005 | Archive stale `ml/` + Rust services; update ARCHITECTURE.md | — | done |
| P2-006 | RC entitlement default: don't over-grant unknown entitlements | — | done |

## P3 — Mobile UX

| ID | Task | Depends | Status |
|----|------|---------|--------|
| P3-001 | Fix push consent order (register after onboarding opt-in) | — | done |
| P3-002 | Password reset flow | — | done |
| P3-003 | NetInfo + offline banner | — | done |
| P3-004 | VoiceOver labels on tabs and GameCard | — | done |
| P3-005 | iOS Manage Subscriptions link | — | done |
| P3-006 | React Query for server state (Home/Games) | P0-002 | done |

## P4 — Growth & product

| ID | Task | Depends | Status |
|----|------|---------|--------|
| P4-001 | Product analytics (PostHog/Mixpanel) | — | done |
| P4-002 | App Store link on landing page | — | done |
| P4-003 | Referral/share pick cards | — | done |

## P5 — Scale

| ID | Task | Depends | Status |
|----|------|---------|--------|
| P5-001 | Leaderboard SQL aggregation (no full table scan) | — | done |
| P5-002 | WebSocket pub/sub refactor | — | done |
| P5-003 | Managed Postgres migration plan (doc + script) | P0-010 | done |

---

## Discovered during implementation

| ID | Task | Found during | Status |
|----|------|--------------|--------|
| DISC-001 | Share endpoint leaks pick confidence without limit check | P0-001 | done |

## Phase 2 — Post-audit (ongoing)

| ID | Task | Audit ref | Status |
|----|------|-----------|--------|
| PH2-001 | Guest paywall preview (production) | Weakness #31, Imp #40 | done |
| PH2-002 | Home feed error surfacing + retry | Weakness #39 | done |
| PH2-003 | Sentry alerts on webhook anomalies | Imp #19 | done |
| PH2-004 | Uptime probe script + cron example | Imp #20 | done |
| PH2-005 | Offsite DB backup configured on VPS | Weakness #4 | in_progress |
| PH2-006 | Split god screens (HomeScreen) | Weakness #14, Imp #32 | pending |
| PH2-007 | 60%+ test coverage | Imp #71 | pending |
| PH2-008 | Annual subscription plan | Imp #41 | pending |
| PH2-009 | Staging environment | Weakness #50, Imp #58 | pending |
| PH2-010 | Prometheus metrics | Weakness #28, Imp #60 | pending |

---

## Completed

| ID | Task | Completed |
|----|------|-----------|
| P0-001 | Free-tier daily prediction limit on all endpoints | 2026-07-04 |
| P0-002 | Centralized subscription tier gating | 2026-07-04 |
