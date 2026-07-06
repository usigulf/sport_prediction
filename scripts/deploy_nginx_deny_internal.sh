#!/usr/bin/env bash
# Install nginx snippet that returns 403 for /internal on public API hosts.
#
# Usage:
#   ./scripts/deploy_nginx_deny_internal.sh
#   DEPLOY_HOST=root@198.211.109.76 ./scripts/deploy_nginx_deny_internal.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@198.211.109.76}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)

SNIPPET_SRC="${ROOT}/deploy/nginx-deny-internal-snippet.conf"
SNIPPET_NAME="octobetiq-deny-internal.conf"
API_SITE="/etc/nginx/sites-available/octobetiq-api"

echo "[nginx] Copy deny-internal snippet to ${HOST}..."
scp "${SSH_OPTS[@]}" "$SNIPPET_SRC" "${HOST}:/etc/nginx/snippets/${SNIPPET_NAME}"

echo "[nginx] Ensure api vhost includes snippet (before catch-all location /)..."
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<REMOTE
set -euo pipefail
SITE="${API_SITE}"
INCLUDE='include /etc/nginx/snippets/${SNIPPET_NAME};'
if [[ ! -f "\$SITE" ]]; then
  echo "ERROR: missing \$SITE — copy deploy/nginx-octobetiq-api.conf.example first" >&2
  exit 1
fi
if grep -q 'octobetiq-deny-internal.conf' "\$SITE"; then
  echo "OK  api vhost already includes deny-internal snippet"
else
  awk -v inc="\$INCLUDE" '
    /server_name api.octobetiq.com;/ {
      print
      print ""
      print "    " inc
      next
    }
    { print }
  ' "\$SITE" > "\${SITE}.tmp"
  mv "\${SITE}.tmp" "\$SITE"
  echo "OK  inserted deny-internal include into \$SITE"
fi
nginx -t
systemctl reload nginx
echo "OK  nginx reloaded"
REMOTE

echo "[nginx] Verify public /internal is blocked..."
public_code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  "https://api.octobetiq.com/internal/predictions/run" \
  -H "Content-Type: application/json" -d '{}' || echo "000")
health_code=$(curl -sS -o /dev/null -w "%{http_code}" "https://api.octobetiq.com/health" || echo "000")
if [[ "$public_code" != "403" ]]; then
  echo "FAIL expected public /internal → 403, got $public_code" >&2
  exit 1
fi
if [[ "$health_code" != "200" ]]; then
  echo "FAIL expected /health → 200, got $health_code" >&2
  exit 1
fi
echo "OK  public /internal → 403, /health → 200"
echo "[nginx] Done."
