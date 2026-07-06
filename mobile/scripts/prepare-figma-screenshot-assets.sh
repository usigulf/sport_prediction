#!/usr/bin/env bash
# Prepare raw simulator PNGs for the Figma App Store template (no banner overlays).
# https://www.figma.com/make/3jFXJYNTqUKvvQPjOHxgLt/App-Store-Screenshot-Design--Community-
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="${MOBILE_DIR}/app-store-screenshots/6.5-inch"
OUT_DIR="${MOBILE_DIR}/app-store-screenshots/figma-import"

# ASC slot order → raw capture filename (from capture-app-store-screenshots.sh)
declare -a SLOTS=(
  "01:03-home-top-picks.png:Home — Best Picks"
  "02:06-game-detail-prediction.png:Game detail"
  "03:02-model-accuracy.png:Model accuracy"
  "04:05-trending-picks.png:Trending"
  "05:07-subscription-paywall.png:Paywall"
  "06:08-favorites.png:Favorites"
  "07:04-games-model-picks.png:Games"
  "08:10-leaderboards.png:Leaderboards"
  "09:01-landing-hero.png:Landing hero"
  "10:09-profile.png:Profile"
)

log() { echo "▸ $*"; }

mkdir -p "$OUT_DIR"

missing=0
for entry in "${SLOTS[@]}"; do
  IFS=':' read -r slot src _label <<< "$entry"
  if [[ ! -f "${SRC_DIR}/${src}" ]]; then
    echo "Missing ${SRC_DIR}/${src}"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "Capture raw screenshots first:"
  echo "  cd mobile"
  echo "  EXPO_PUBLIC_HIDE_DEV_UI=true EXPO_PUBLIC_APP_STORE_CAPTURE=true \\"
  echo "  set -a && source secrets/app_review_demo.env && set +a"
  echo "  EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL=\"\$VERIFY_DEMO_EMAIL\" \\"
  echo "  EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD=\"\$VERIFY_DEMO_PASSWORD\" \\"
  echo "  npx expo start --dev-client"
  echo "  ./scripts/capture-app-store-screenshots.sh auth-auto"
  exit 1
fi

log "Copying 10 PNGs → ${OUT_DIR}/"
for entry in "${SLOTS[@]}"; do
  IFS=':' read -r slot src label <<< "$entry"
  dest="${OUT_DIR}/slide-${slot}-$(echo "$label" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -d '—').png"
  cp "${SRC_DIR}/${src}" "$dest"
  # Stable name for Figma drag-drop
  cp "${SRC_DIR}/${src}" "${OUT_DIR}/slide-${slot}.png"
  log "slide-${slot}.png ← ${src}  (${label})"
done

cat > "${OUT_DIR}/README.txt" <<'EOF'
Drop slide-01.png … slide-10.png into your Figma file (Edit mode):
https://www.figma.com/make/3jFXJYNTqUKvvQPjOHxgLt/App-Store-Screenshot-Design--Community-

Export frames at 1284×2778 → ../figma-export/
Then run: ./scripts/import-figma-exports.sh

Full guide: mobile/docs/FIGMA_APP_STORE_SCREENSHOTS.md
EOF

log "Done. Open Figma and import from: ${OUT_DIR}"
