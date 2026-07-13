#!/usr/bin/env bash
# Verify invite-beta VPS cutover scaffold. Does not SSH or mutate production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in \
  docs/INVITE_BETA_OPS.md \
  docs/MODEL_ACCEPTANCE_PROTOCOL.md \
  docs/MODEL_ARTIFACT_BOM.md \
  docs/DATA_TELEMETRY.md \
  docs/SUBSCRIPTION_OFFER_POLICY.md \
  docs/RESTORE_DRILL.md \
  docs/SLO_AND_CAPACITY.md \
  deploy/crontab.example \
  .env.production.example \
  scripts/deploy_api.sh \
  scripts/verify_model_acceptance.py \
  scripts/cron/internal_odds_freeze_closing.sh \
  scripts/cron/internal_train_model.sh \
  scripts/cron/internal_soccer_sync_schedules.sh \
  scripts/cron/internal_predictions_run.sh \
  scripts/run_pg_backup.sh \
  backend/alembic/versions/020_provider_sync_events.py \
  mobile/src/constants/subscriptionPricing.ts
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL missing $f"
    exit 1
  fi
done

python3 <<'PY'
from pathlib import Path

needles = {
    "docs/INVITE_BETA_OPS.md": (
        "not proof that the live VPS",
        "ALLOW_HEURISTIC_INFERENCE=false",
        "REQUIRE_PUBLISH_READY_MODEL=true",
        "alembic upgrade head",
        "internal_odds_freeze_closing.sh",
        "invite_beta",
        "invite_founder",
        "#20",
    ),
    "docs/MODEL_ACCEPTANCE_PROTOCOL.md": (
        "invite_beta",
        "ALLOW_HEURISTIC_INFERENCE",
        "REQUIRE_PUBLISH_READY_MODEL",
    ),
    "deploy/crontab.example": (
        "internal_odds_freeze_closing.sh",
        "internal_train_model.sh",
        "internal_soccer_sync_schedules.sh",
    ),
    ".env.production.example": (
        "ALLOW_HEURISTIC_INFERENCE",
        "REQUIRE_PUBLISH_READY_MODEL",
        "SOCCER_SYNC_LEAGUES",
        "EXPLANATION_MODEL_DIR",
    ),
    "scripts/deploy_api.sh": ("alembic",),
    "scripts/verify_model_acceptance.py": ("invite_beta",),
    "backend/alembic/versions/020_provider_sync_events.py": ("provider_sync_events",),
    "mobile/src/constants/subscriptionPricing.ts": ("invite_founder", "ACTIVE_OFFER_PHASE"),
}
for path, tids in needles.items():
    text = Path(path).read_text(encoding="utf-8")
    for tid in tids:
        if tid not in text:
            raise SystemExit(f"missing {tid!r} in {path}")
print("OK  invite-beta ops scaffold (runbook, cron, fail-closed env, migration 020)")
PY

echo "[invite-beta-verify] Done."
