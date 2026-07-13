# Security threat model (audit #17)

In-repo **self-audit scaffold** for the soccer-wedge API + mobile + VPS Postgres stack.

> This closes external audit **#17** as documentation, dependency scanning, mobile
> checklist, and restore-drill scaffolding. **It is not a penetration test**, red-team
> exercise, or security certification.

## Scope

| In scope | Out of scope (known exceptions) |
|----------|----------------------------------|
| JWT auth / refresh revocation | Certificate pinning |
| SecureStore token storage | Jailbreak / root detection |
| Postgres dumps + offsite copy | Third-party pen-test / bug bounty |
| Stripe / RevenueCat webhooks | WAF / multi-region HA |
| Provider API keys on VPS | Full Semgrep / CodeQL / Trivy suite |

## Assets

| Asset | Where | Sensitivity |
|-------|-------|-------------|
| `JWT_SECRET` / cron secrets | VPS env | Critical |
| Access + refresh tokens | Mobile SecureStore (native) | High |
| Postgres dumps | `/root/backups`, optional Spaces/SCP | Critical |
| Stripe / RC webhook secrets | VPS env | High |
| Sportradar / ClearSports / Odds keys | VPS env | High |
| User PII (email, favorites) | Postgres | High |

## STRIDE-lite

| Threat | Example | Mitigation in repo |
|--------|---------|-------------------|
| Spoofing | Stolen JWT | Short-lived access tokens; refresh revocation (`token_revocation_service`); SecureStore on native |
| Tampering | Altered backup restore | Custom-format `pg_dump`; staging restore drill before prod |
| Repudiation | Unsigned webhooks | Stripe / RC signature verification + idempotency tables |
| Information disclosure | Secrets in git / logs | `.gitignore` secrets; OpenAPI public but no secrets; nginx denies `/metrics` /internal |
| Denial of service | Auth / prediction spam | Redis rate limits; guest teaser caps |
| Elevation of privilege | Free → Premium bypass | Server-side tier checks; Premium gating tests |

## Implemented scanning

| Control | How |
|---------|-----|
| Python deps | `scripts/pip_audit_backend.sh` in CI |
| Mobile npm deps | `npm audit --omit=dev --audit-level=high` in CI |
| Python SAST (lightweight) | `scripts/bandit_backend.sh` (Bandit, high severity) |
| Dependency PRs | `.github/dependabot.yml` |

## Related docs

- Mobile checklist: `docs/MOBILE_SECURITY_CHECKLIST.md`
- Restore drill: `docs/RESTORE_DRILL.md`
- Backups: `docs/DATABASE_BACKUP.md`, `docs/OFFSITE_BACKUP_RUNBOOK.md`
- External ops: `docs/EXTERNAL_OPS_PLAYBOOK.md`

## Verify (no secrets)

```bash
bash scripts/verify_security_scaffold.sh
bash scripts/verify_audit_scaffolds.sh
```

## Review stamp (ops)

| Field | Value |
|-------|-------|
| Last reviewed | 2026-07-12 |
| Reviewer | Engineering (self-audit) |
| Next review | Before invite-beta public charge claims |
