#!/usr/bin/env bash
set -euo pipefail

# Deploy web/support.html to production and enable /support in nginx.
#
# Usage:
#   DEPLOY_HOST=root@198.211.109.76 scripts/deploy_web_support.sh
#
# Requires SSH key auth to the droplet.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@198.211.109.76}"
SSH_OPTS=(-o BatchMode=yes)
[[ -n "${DEPLOY_SSH_KEY:-}" ]] && SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
[[ -f "$HOME/.ssh/id_ed25519" && -z "${DEPLOY_SSH_KEY:-}" ]] && SSH_OPTS+=(-i "$HOME/.ssh/id_ed25519")

echo "[deploy] Uploading support.html..."
scp "${SSH_OPTS[@]}" "$ROOT/web/support.html" "$HOST:/var/www/octobetiq/support.html"
scp "${SSH_OPTS[@]}" "$ROOT/deploy/nginx-octobetiq-support-snippet.conf" "$HOST:/etc/nginx/snippets/octobetiq-support.conf"

echo "[deploy] Ensuring nginx includes support snippet..."
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
SITE=/etc/nginx/sites-enabled/octobetiq-web
if ! grep -q 'octobetiq-support.conf' "$SITE"; then
  sed -i '/location = \/payment\/cancel/,/^    }/{
/^    }/a\
\
    include /etc/nginx/snippets/octobetiq-support.conf;
}' "$SITE"
fi
nginx -t
systemctl reload nginx
REMOTE

echo "[deploy] Verifying URLs..."
for url in https://www.octobetiq.com/support https://octobetiq.com/support; do
  code=$(curl -sI -o /dev/null -w '%{http_code}' -L "$url" || true)
  echo "  $url -> HTTP $code"
  [[ "$code" == "200" ]] || { echo "[deploy] ERROR: expected 200 for $url"; exit 1; }
done
echo "[deploy] Success."
