#!/usr/bin/env bash
# Rename Figma-exported PNGs into asc-upload/ + iPad letterbox.
# Put exports in app-store-screenshots/figma-export/ as 01.png … 10.png (any names OK if 10 files).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IN_DIR="${MOBILE_DIR}/app-store-screenshots/figma-export"
OUT_IPHONE="${MOBILE_DIR}/app-store-screenshots/6.5-inch/asc-upload"
OUT_IPAD="${MOBILE_DIR}/app-store-screenshots/ipad-13-inch/asc-upload"

NAMES=(
  "01-home-top-picks.png"
  "02-game-detail-prediction.png"
  "03-model-accuracy.png"
  "04-trending-picks.png"
  "05-subscription-paywall.png"
  "06-favorites.png"
  "07-games-model-picks.png"
  "08-leaderboards.png"
  "09-landing-hero.png"
  "10-profile.png"
)

log() { echo "▸ $*"; }

if [[ ! -d "$IN_DIR" ]]; then
  mkdir -p "$IN_DIR"
  echo "Created ${IN_DIR}"
  echo "Export 10 frames from Figma (PNG, 1284×2778) here, then re-run."
  exit 1
fi

mapfile -t files < <(find "$IN_DIR" -maxdepth 1 -name '*.png' -type f | sort)
if [[ ${#files[@]} -lt 10 ]]; then
  echo "Need 10 PNG files in ${IN_DIR} (found ${#files[@]})"
  exit 1
fi

mkdir -p "$OUT_IPHONE"
for i in "${!NAMES[@]}"; do
  cp "${files[$i]}" "${OUT_IPHONE}/${NAMES[$i]}"
  log "${NAMES[$i]} ← $(basename "${files[$i]}")"
done

"$SCRIPT_DIR/resize-screenshots-ipad-13.sh" "$OUT_IPHONE" "$OUT_IPAD"
log "Upload iPhone: ${OUT_IPHONE}"
log "Upload iPad:    ${OUT_IPAD}"
