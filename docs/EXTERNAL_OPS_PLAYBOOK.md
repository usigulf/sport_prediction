# External ops playbook

**Audit status:** 100% implementable in-repo coverage (138 done · 0 partial · 11 blocked).  
This document is the operator checklist for items that require credentials, cloud accounts, or manual App Store / Play Console steps.

Verify all runbooks and scaffolds are present (no secrets required):

```bash
bash scripts/verify_external_ops_readiness.sh
```

---

## Quick reference

| ID | Task | Runbook | Est. time |
|----|------|---------|-----------|
| W3 | HA / second region | [HA_AND_SCALING.md](./HA_AND_SCALING.md) | 4–8 h |
| W36 / I18 | Fix ASC keywords `ports` → `sports` | [ASC_OPS_CHECKLIST.md](./ASC_OPS_CHECKLIST.md) §1 | 5 min |
| I50 | Google Play launch | [GOOGLE_PLAY_LAUNCH.md](./GOOGLE_PLAY_LAUNCH.md) | 2–4 h |
| I51 | Managed Postgres | [MANAGED_POSTGRES_MIGRATION.md](./MANAGED_POSTGRES_MIGRATION.md) | 2–4 h |
| I56 | API autoscaling (2+ instances) | [HA_AND_SCALING.md](./HA_AND_SCALING.md) § Autoscaling | 4 h |
| I57 | CDN for static assets | [CDN_STATIC_ASSETS.md](./CDN_STATIC_ASSETS.md) | 1–2 h |
| I85 | ASC privacy label (quarterly) | [ASC_OPS_CHECKLIST.md](./ASC_OPS_CHECKLIST.md) §2 | 30 min / quarter |
| I95 | Academic partnership | § Partnership (below) | External |
| I96 | Sport-specific ML hiring | § Hiring (below) | External |
| I100 | Patent / trade secret | § Legal (below) | External |

**In-repo security self-audit (#17 — not a pen-test):**

| Topic | Runbook |
|-------|---------|
| Threat model + scans | [SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md) |
| Mobile checklist | [MOBILE_SECURITY_CHECKLIST.md](./MOBILE_SECURITY_CHECKLIST.md) |
| Staging restore drill | [RESTORE_DRILL.md](./RESTORE_DRILL.md) |

Verify scaffold: `bash scripts/verify_security_scaffold.sh`

**In-repo SLO / load / chaos scaffold (#18 — not a load-test certification):**

| Topic | Runbook |
|-------|---------|
| SLOs + capacity | [SLO_AND_CAPACITY.md](./SLO_AND_CAPACITY.md) |
| Load + chaos drills | [LOAD_AND_CHAOS.md](./LOAD_AND_CHAOS.md) |

Verify scaffold: `bash scripts/verify_slo_scaffold.sh`

**Already documented elsewhere (ops-only credentials):**

| Topic | Runbook |
|-------|---------|
| Offsite DB backup | [OFFSITE_BACKUP_RUNBOOK.md](./OFFSITE_BACKUP_RUNBOOK.md) |
| Staging DNS + TLS | [STAGING_ENVIRONMENT.md](./STAGING_ENVIRONMENT.md) |
| Annual IAP | [ANNUAL_IAP_SETUP.md](./ANNUAL_IAP_SETUP.md) |

---

## Recommended ops order

1. **ASC keywords** (W36 / I18) — `./scripts/print_asc_keywords.sh` → paste in App Store Connect  
2. **Offsite backup** — `./scripts/setup_offsite_backup.sh` with DO Spaces keys  
3. **Staging public URL** — DNS A record → `./scripts/deploy_staging_public_url.sh`  
4. **Annual IAP** — ASC product + RevenueCat → [ANNUAL_IAP_SETUP.md](./ANNUAL_IAP_SETUP.md)  
5. **Google Play internal track** — [GOOGLE_PLAY_LAUNCH.md](./GOOGLE_PLAY_LAUNCH.md)  
6. **CDN** — cache static web assets before scaling traffic  
7. **Managed Postgres + HA** — when single-VPS risk exceeds ops capacity  

---

## Partnership (I95)

Not a code deliverable. If pursuing academic validation:

- Publish methodology summary from `docs/PRODUCTION_REALITY.md` + walk-forward backtest results  
- Offer anonymized accuracy aggregates via `GET /stats/model-vs-market`  
- Document data licensing constraints (ClearSports / Sportradar ToS) before sharing raw feeds  

---

## Hiring (I96)

Blocked on headcount. Per-league model ownership is documented in `docs/ENSEMBLE_GATING.md` — hire when walk-forward lift justifies dedicated NFL/NBA/soccer ML owners.

---

## Legal / patent (I100)

Blocked on counsel. Calibration display UX is described in mobile `PredictionCard` and `docs/BETQL_PHILOSOPHY_FOR_OCTOBET.md`. Consult IP counsel before filing; no repo action required for launch.

---

## After completing an external item

1. Run the verification command from the linked runbook  
2. Update ops notes in your password manager / runbook (not git secrets)  
3. Regenerate audit matrix if registry evidence changes: `python3 scripts/generate_audit_status_matrix.py`

Blocked registry entries remain 🚫 until infrastructure exists; in-repo work for these items is complete.
