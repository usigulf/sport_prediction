#!/usr/bin/env bash
set -euo pipefail

# Deploy support + privacy pages and nginx snippets.
#
#   scripts/deploy_web_legal.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@198.211.109.76}"
SSH_OPTS=(-o BatchMode=yes)
[[ -n "${DEPLOY_SSH_KEY:-}" ]] && SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
[[ -f "$HOME/.ssh/id_ed25519" && -z "${DEPLOY_SSH_KEY:-}" ]] && SSH_OPTS+=(-i "$HOME/.ssh/id_ed25519")

echo "[deploy] Uploading HTML..."
scp "${SSH_OPTS[@]}" "$ROOT/web/support.html" "$HOST:/var/www/octobetiq/support.html"
scp "${SSH_OPTS[@]}" "$ROOT/web/privacy.html" "$HOST:/var/www/octobetiq/privacy.html"
scp "${SSH_OPTS[@]}" "$ROOT/web/terms.html" "$HOST:/var/www/octobetiq/terms.html"
scp "${SSH_OPTS[@]}" "$ROOT/deploy/nginx-octobetiq-support-snippet.conf" "$HOST:/etc/nginx/snippets/octobetiq-support.conf"
scp "${SSH_OPTS[@]}" "$ROOT/deploy/nginx-octobetiq-privacy-snippet.conf" "$HOST:/etc/nginx/snippets/octobetiq-privacy.conf"
scp "${SSH_OPTS[@]}" "$ROOT/deploy/nginx-octobetiq-terms-snippet.conf" "$HOST:/etc/nginx/snippets/octobetiq-terms.conf"

echo "[deploy] Nginx includes..."
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
SITE=/etc/nginx/sites-enabled/octobetiq-web
for snippet in octobetiq-support.conf octobetiq-privacy.conf octobetiq-terms.conf; do
  if ! grep -q "$snippet" "$SITE"; then
    sed -i '/location = \/payment\/cancel/,/^    }/{
/^    }/a\
\
    include /etc/nginx/snippets/'"$snippet"';
}' "$SITE"
  fi
done
nginx -t
systemctl reload nginx
REMOTE

for path in support privacy terms; do
  url="https://www.octobetiq.com/${path}"
  code=$(curl -sI -o /dev/null -w '%{http_code}' "$url" || true)
  echo "  $url -> HTTP $code"
  [[ "$code" == "200" ]] || { echo "[deploy] ERROR: $url"; exit 1; }
done
echo "[deploy] Success."
