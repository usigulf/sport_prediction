#!/usr/bin/env bash
# Swap nginx upstream to a new API port after blue/green health check (I59).
set -euo pipefail

PORT="${1:?Usage: nginx_swap_upstream.sh <port> [nginx_conf_path]}"
CONF="${2:-/etc/nginx/sites-available/octobetiq-api}"

if [[ ! -f "$CONF" ]]; then
  echo "[nginx-swap] Config not found: $CONF" >&2
  echo "[nginx-swap] Manual: point upstream to 127.0.0.1:${PORT} and run: sudo nginx -t && sudo systemctl reload nginx" >&2
  exit 1
fi

TMP="$(mktemp)"
sudo cp "$CONF" "$TMP.bak"
sudo sed -E "s/127\\.0\\.0\\.1:[0-9]+/127.0.0.1:${PORT}/g" "$CONF" | sudo tee "$TMP" >/dev/null
sudo mv "$TMP" "$CONF"
sudo nginx -t
sudo systemctl reload nginx
echo "[nginx-swap] Upstream now 127.0.0.1:${PORT}"
