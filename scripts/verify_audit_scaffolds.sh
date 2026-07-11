#!/usr/bin/env bash
# Run all audit scaffold verifiers (no external credentials). Used in CI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[audit-scaffolds] Offsite backup..."
bash scripts/verify_offsite_backup_scaffold.sh

echo "[audit-scaffolds] Annual IAP..."
bash scripts/verify_annual_iap_scaffold.sh

echo "[audit-scaffolds] Staging..."
bash scripts/verify_staging_scaffold.sh

echo "[audit-scaffolds] Detox..."
bash scripts/verify_detox_scaffold.sh

echo "[audit-scaffolds] External ops runbooks..."
bash scripts/verify_external_ops_readiness.sh

echo "[audit-scaffolds] All scaffolds OK."
