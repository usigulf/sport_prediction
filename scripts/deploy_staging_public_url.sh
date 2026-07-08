#!/usr/bin/env bash
# Expose staging API at https://api-staging.octobetiq.com (DNS + TLS + nginx).
#
# Prereqs:
#   - A record: api-staging.octobetiq.com → VPS IP (Namecheap Advanced DNS)
#   - ./scripts/deploy_staging_api.sh completed (API on 127.0.0.1:8001)
#
# Usage:
#   ./scripts/deploy_staging_public_url.sh
#   SKIP_DNS_CHECK=1 ./scripts/deploy_staging_public_url.sh   # force (certbot may fail)
#   DEPLOY_HOST=root@198.211.109.76 ./scripts/deploy_staging_public_url.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@198.211.109.76}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
[[ -n "${DEPLOY_SSH_KEY:-}" ]] && SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")

STAGING_HOST="${STAGING_HOST:-api-staging.octobetiq.com}"
VPS_IP="${VPS_IP:-198.211.109.76}"
STAGING_SITE="/etc/nginx/sites-available/octobetiq-staging-api"
CERT_PATH="/etc/letsencrypt/live/${STAGING_HOST}/fullchain.pem"

echo "[staging-public] Checking DNS for ${STAGING_HOST} → ${VPS_IP}..."
resolved="$(dig +short "${STAGING_HOST}" A 2>/dev/null | head -1 || true)"
if [[ "${SKIP_DNS_CHECK:-0}" != "1" ]]; then
  if [[ -z "${resolved}" ]]; then
    echo "[staging-public] ERROR: no A record for ${STAGING_HOST}" >&2
    echo "[staging-public] Add in Namecheap → Domain → Advanced DNS:" >&2
    echo "  Type A | Host api-staging | Value ${VPS_IP} | TTL Automatic" >&2
    exit 1
  fi
  if [[ "${resolved}" != "${VPS_IP}" ]]; then
    echo "[staging-public] ERROR: ${STAGING_HOST} resolves to ${resolved}, expected ${VPS_IP}" >&2
    exit 1
  fi
  echo "[staging-public] DNS OK (${resolved})"
else
  echo "[staging-public] SKIP_DNS_CHECK=1 — continuing (resolved=${resolved:-none})"
fi

echo "[staging-public] Verifying staging API on VPS (127.0.0.1:8001)..."
ssh "${SSH_OPTS[@]}" "$HOST" \
  'curl -fsS http://127.0.0.1:8001/health | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get(\"environment\")==\"staging\", d"'

echo "[staging-public] Uploading nginx configs..."
scp "${SSH_OPTS[@]}" "${ROOT}/deploy/nginx-deny-internal-snippet.conf" \
  "${HOST}:/etc/nginx/snippets/octobetiq-deny-internal.conf"
scp "${SSH_OPTS[@]}" "${ROOT}/deploy/nginx-octobetiq-staging-api-http-bootstrap.conf.example" \
  "${HOST}:/tmp/staging-nginx-bootstrap.conf"
scp "${SSH_OPTS[@]}" "${ROOT}/deploy/nginx-octobetiq-staging-api.conf.example" \
  "${HOST}:/tmp/staging-nginx-tls.conf"

echo "[staging-public] Configuring nginx on VPS..."
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<REMOTE
set -euo pipefail
STAGING_SITE="${STAGING_SITE}"
CERT_PATH="${CERT_PATH}"

if [[ -f "\${CERT_PATH}" ]]; then
  cp /tmp/staging-nginx-tls.conf "\${STAGING_SITE}"
else
  cp /tmp/staging-nginx-bootstrap.conf "\${STAGING_SITE}"
fi
ln -sf "\${STAGING_SITE}" /etc/nginx/sites-enabled/octobetiq-staging-api
nginx -t
systemctl reload nginx
REMOTE

if ssh "${SSH_OPTS[@]}" "$HOST" "test -f ${CERT_PATH}"; then
  echo "[staging-public] TLS cert already present — skipping certbot"
else
  echo "[staging-public] Requesting Let's Encrypt certificate..."
  ssh "${SSH_OPTS[@]}" "$HOST" \
    "certbot certonly --nginx -d ${STAGING_HOST} --non-interactive --agree-tos --redirect"
  ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<REMOTE
set -euo pipefail
cp /tmp/staging-nginx-tls.conf "${STAGING_SITE}"
nginx -t
systemctl reload nginx
REMOTE
fi

echo "[staging-public] Verifying public endpoints..."
health_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "https://${STAGING_HOST}/health" || echo "000")"
metrics_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "https://${STAGING_HOST}/metrics" || echo "000")"
body="$(curl -fsS --max-time 20 "https://${STAGING_HOST}/health")"

if [[ "$health_code" != "200" ]]; then
  echo "[staging-public] ERROR: https://${STAGING_HOST}/health → ${health_code}" >&2
  exit 1
fi
if ! echo "${body}" | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("environment")=="staging" else 1)'; then
  echo "[staging-public] ERROR: /health missing environment=staging: ${body}" >&2
  exit 1
fi
if [[ "$metrics_code" != "403" ]]; then
  echo "[staging-public] WARN: expected /metrics → 403, got ${metrics_code}"
fi

echo "[staging-public] OK https://${STAGING_HOST}/health → 200 (${body})"
echo "[staging-public] Run ./scripts/check_staging_health.sh to probe /ready"
echo "[staging-public] Done."
