# Invite-beta VPS cutover (constrained beta)

Operator checklist to run an **invite-only** soccer wedge on the production VPS
after in-repo audit tasks **#1–#19**. External audit **#20** (live/props/social)
stays deferred until this beta proves retention and model value.

> This is a **runbook + scaffold**, not proof that the live VPS already passes
> `invite_beta`. Run the steps on the host and record the ops log below.

## Preconditions (in-repo)

| Item | Doc / script |
|------|----------------|
| Model gates | [MODEL_ACCEPTANCE_PROTOCOL.md](./MODEL_ACCEPTANCE_PROTOCOL.md) |
| Artifact BOM | [MODEL_ARTIFACT_BOM.md](./MODEL_ARTIFACT_BOM.md) |
| Data telemetry (migration 020) | [DATA_TELEMETRY.md](./DATA_TELEMETRY.md) |
| Founder pricing | [SUBSCRIPTION_OFFER_POLICY.md](./SUBSCRIPTION_OFFER_POLICY.md) |
| SLOs / restore | [SLO_AND_CAPACITY.md](./SLO_AND_CAPACITY.md), [RESTORE_DRILL.md](./RESTORE_DRILL.md) |
| Security self-audit | [SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md) |

Verify scaffolds (no VPS credentials):

```bash
bash scripts/verify_invite_beta_scaffold.sh
bash scripts/verify_audit_scaffolds.sh
```

## Cutover order (VPS)

### 1. Pull + migrate

```bash
cd ~/sport_prediction
git pull origin main
./scripts/deploy_api.sh   # includes alembic upgrade head → migration 020
```

Confirm: `provider_sync_events` exists (telemetry) and API container is healthy.

### 2. Fail-closed env

In `.env.production` (see `.env.production.example`):

```bash
SOCCER_SYNC_LEAGUES=premier_league
PREDICTION_LEAGUES=premier_league
EXPLANATION_MODEL_DIR=/models
ALLOW_HEURISTIC_INFERENCE=false
REQUIRE_PUBLISH_READY_MODEL=true
# STRICT_LOW_TRUST_SUPPRESSION=true   # recommended
```

Redeploy API after edits so Compose picks up env.

### 3. Train / mount publish-ready soccer artifacts

```bash
# Prefer cron path (writes into ml/models mount)
./scripts/cron/internal_train_model.sh

# Or: cd backend && python train_model.py --out ../ml/models
```

Compose must mount `./ml/models` → `/models`. Until `publish_ready`, `/health` returns **503** with fail-closed flags on — expected.

### 4. Cron (schedules, freeze, train, backup)

Install from `deploy/crontab.example` (or merge missing lines):

| Job | Script |
|-----|--------|
| Closing-line freeze | `scripts/cron/internal_odds_freeze_closing.sh` |
| Soccer sync | `scripts/cron/internal_soccer_sync_schedules.sh` |
| Predictions | `scripts/cron/internal_predictions_run.sh` |
| Weekly train | `scripts/cron/internal_train_model.sh` |
| DB backup | `scripts/run_pg_backup.sh` |

```bash
# Optional helpers
./scripts/setup_weekly_train_cron.sh
./scripts/setup_db_backup_cron.sh
```

### 5. Acceptance + smoke

```bash
python3 scripts/verify_model_acceptance.py --level invite_beta --api https://api.octobetiq.com
curl -fsS https://api.octobetiq.com/health | python3 -m json.tool
curl -fsS 'https://api.octobetiq.com/api/v1/stats/model-acceptance?level=invite_beta' | python3 -m json.tool
curl -fsS https://api.octobetiq.com/api/v1/stats/data-telemetry | python3 -m json.tool
VERIFY_API_BASE=http://127.0.0.1:8000 ./scripts/verify_clearsports_prod.sh .env.production
```

### 6. Mobile / store (invite cohort)

| Step | Notes |
|------|-------|
| `EXPO_PUBLIC_BETA_SOCCER_ONLY=true` | Soccer wedge UI |
| `EXPO_PUBLIC_OFFER_PHASE=invite_founder` | $9.99 marketing; store SKU must match |
| Founder IAP in ASC + RevenueCat | [SUBSCRIPTION_OFFER_POLICY.md](./SUBSCRIPTION_OFFER_POLICY.md) |
| TestFlight / Play internal | Small invite list only |
| Do **not** set `public_list` / charge $29.99 | Until `public_charge` + retention evidence |

### 7. Post-cutover drills (first week)

1. `DRY_RUN=1` then live staging: [LOAD_AND_CHAOS.md](./LOAD_AND_CHAOS.md)  
2. Staging restore: [RESTORE_DRILL.md](./RESTORE_DRILL.md)  
3. Uptime probe: `scripts/check_api_health.sh` on a 5-minute cron  

## Rollback

1. Set `REQUIRE_PUBLISH_READY_MODEL=false` only as emergency (document why).  
2. Prefer model rollback: `docs/MODEL_ACCEPTANCE_PROTOCOL.md` § Rollback (`ml/models.prev`).  
3. Revert deploy: previous image / `git` tag + `deploy_api.sh`.

## Ops log

| Field | Value |
|-------|-------|
| Date (UTC) | |
| `alembic` head | |
| Fail-closed env set | Y/N |
| `invite_beta` acceptance | pass/fail |
| Freeze cron installed | Y/N |
| Founder IAP verified | Y/N |
| Operator | |

## Related

- [EXTERNAL_OPS_PLAYBOOK.md](./EXTERNAL_OPS_PLAYBOOK.md)
- [PRODUCTION_REALITY.md](./PRODUCTION_REALITY.md)
- [ACCURACY_SCORECARD.md](./ACCURACY_SCORECARD.md)
