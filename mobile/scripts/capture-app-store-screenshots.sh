#!/usr/bin/env bash
# Capture iPhone 6.5" App Store screenshots (1284×2778) from the iOS Simulator.
#
# Prerequisites:
#   - Metro running with capture flags (see README in app-store-screenshots/)
#   - Dev build installed on simulator (expo run:ios)
#   - For shots 02–10: log in once before running the interactive section
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${MOBILE_DIR}/app-store-screenshots/6.5-inch"
DEVICE="${SIMULATOR_DEVICE:-iPhone 17}"
SCHEME="com.sportsprediction.app"
# App Store Connect → iPhone 6.5" Display (portrait)
TARGET_W=1284
TARGET_H=2778
RAW="/tmp/octobetiq-screenshot-raw.png"

mkdir -p "$OUT_DIR"

log() { echo "▸ $*"; }

boot_sim() {
  local booted_name
  booted_name="$(xcrun simctl list devices booted 2>/dev/null | grep Booted | sed 's/^[[:space:]]*//' | cut -d'(' -f1 | sed 's/[[:space:]]*$//' || true)"
  if [[ -n "$booted_name" && "$booted_name" != "$DEVICE" ]]; then
    log "Shutting down $booted_name (use SIMULATOR_DEVICE=$booted_name to keep it)"
    xcrun simctl shutdown booted 2>/dev/null || true
    sleep 2
    booted_name=""
  fi
  if [[ -z "$booted_name" ]]; then
    log "Booting $DEVICE..."
    xcrun simctl boot "$DEVICE" 2>/dev/null || true
    sleep 4
  else
    log "Using booted $DEVICE"
  fi
}

clean_status_bar() {
  log "Status bar → 9:41 (App Store style)"
  xcrun simctl status_bar booted override \
    --time "9:41" \
    --batteryState charged \
    --batteryLevel 100 \
    --wifiBars 3 \
    --cellularBars 4 2>/dev/null || true
}

clear_status_bar() {
  xcrun simctl status_bar booted clear 2>/dev/null || true
}

require_app_installed() {
  if ! xcrun simctl get_app_container booted "$SCHEME" &>/dev/null; then
    echo "Error: $SCHEME is not installed on the booted simulator."
    echo "Install the dev build first:"
    echo "  cd mobile && npx expo run:ios -d \"$DEVICE\""
    exit 1
  fi
}

launch_app() {
  require_app_installed
  log "Launching ${SCHEME}..."
  xcrun simctl terminate booted "$SCHEME" 2>/dev/null || true
  sleep 1
  xcrun simctl launch booted "$SCHEME" 2>&1 || true
  log "Waiting for Metro bundle (15s)..."
  sleep 15
}

open_route() {
  local path="$1"
  log "Open ${SCHEME}://${path}"
  xcrun simctl openurl booted "${SCHEME}://${path}" 2>/dev/null || true
  sleep 8
}

capture() {
  local filename="$1"
  xcrun simctl io booted screenshot "$RAW" 2>/dev/null
  sips -z "$TARGET_H" "$TARGET_W" "$RAW" --out "$OUT_DIR/$filename" >/dev/null
  log "Saved $OUT_DIR/$filename (${TARGET_W}×${TARGET_H})"
}

wait_enter() {
  local msg="$1"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$msg"
  echo "Press Enter when the screen is ready…"
  read -r _
}

fetch_soccer_game_id() {
  local api="${EXPO_PUBLIC_API_URL:-https://api.octobetiq.com/api/v1}"
  local id
  id="$(curl -sf "${api}/games/upcoming?league=premier_league&limit=20" 2>/dev/null \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
games = data if isinstance(data, list) else data.get('games') or []
for g in games:
    if g.get('prediction'):
        print(g['id'])
        break
" 2>/dev/null || true)"
  if [[ -n "$id" ]]; then
    echo "$id"
    return
  fi
  curl -sf "${api}/feed/top-picks?limit=5&leagues=premier_league" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); picks=d.get('picks') or []; print(picks[0].get('game_id','') if picks else '')" 2>/dev/null || true
}

# --- Guest screens (no login) ---
capture_guest() {
  log "=== Guest screenshots (no login required) ==="
  launch_app
  log "Sign out + open Landing (shot 01 must be guest hero, not paywall/home)..."
  open_route "capture/logout"
  sleep 4
  open_route "capture/landing"
  sleep 6
  capture "01-landing-hero.png"
  open_route "capture/accuracy"
  sleep 4
  capture "02-model-accuracy.png"
}

capture_landing_only() {
  log "=== Landing hero only (01-landing-hero.png) ==="
  require_app_installed
  xcrun simctl terminate booted "$SCHEME" 2>/dev/null || true
  sleep 1
  xcrun simctl launch booted "$SCHEME" 2>&1 || true
  log "Waiting for Metro bundle (20s)..."
  sleep 20
  open_route "capture/logout"
  sleep 4
  open_route "capture/landing"
  sleep 6
  capture "01-landing-hero.png"
  log "Regenerating iPad 13\" shot 01..."
  python3 <<PY
from pathlib import Path
from PIL import Image
inp = Path("$OUT_DIR/01-landing-hero.png")
out = Path("${MOBILE_DIR}/app-store-screenshots/ipad-13-inch/01-landing-hero.png")
bg = (10, 20, 40)
im = Image.open(inp).convert("RGB")
w, h = im.size
scale = 2752 / h
nw, nh = int(w * scale), int(h * scale)
resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
canvas = Image.new("RGB", (2064, 2752), bg)
canvas.paste(resized, ((2064 - nw) // 2, (2752 - nh) // 2))
out.parent.mkdir(parents=True, exist_ok=True)
canvas.save(out, "PNG", optimize=True)
print(f"OK {out}")
PY
}

# --- Logged-in screens (deep links + manual fallbacks) ---
capture_authenticated() {
  log "=== Logged-in screenshots (manual navigation) ==="
  log "Deep links cannot sign you in — you must be on the main app (tab bar visible)."
  echo ""
  echo "1. Open the simulator and LOG IN if you see Landing."
  echo "2. Each step: navigate to the screen, then press Enter here to capture."
  echo ""

  require_app_installed
  xcrun simctl launch booted "$SCHEME" 2>&1 || true
  sleep 3

  wait_enter "03 — HOME tab: greeting, Best Picks carousel, sport row"
  capture "03-home-top-picks.png"

  wait_enter "04 — GAMES tab → Model Picks (list of upcoming games)"
  capture "04-games-model-picks.png"

  wait_enter "05 — TRENDING tab (top picks feed)"
  capture "05-trending-picks.png"

  wait_enter "06 — Open any soccer game → Game Detail with win % prediction"
  capture "06-game-detail-prediction.png"

  wait_enter "07 — Profile → Subscription, or open Paywall (upgrade screen)"
  capture "07-subscription-paywall.png"

  wait_enter "08 — FAVORITES tab"
  capture "08-favorites.png"

  wait_enter "09 — PROFILE tab (email, account menu, Logout at bottom)"
  capture "09-profile.png"

  wait_enter "10 — Profile → Leaderboard (Pro gate or rankings list)"
  capture "10-leaderboards.png"
}

# Optional: try automated capture/* routes (only works when already logged in + JS reloaded)
capture_authenticated_auto() {
  log "=== Logged-in screenshots (automated capture/* routes) ==="
  require_app_installed
  xcrun simctl terminate booted "$SCHEME" 2>/dev/null || true
  sleep 1
  xcrun simctl launch booted "$SCHEME" 2>&1 || true
  log "Waiting for app + Metro bundle (25s)..."
  sleep 25
  log "Auto-login (requires EXPO_PUBLIC_CAPTURE_LOGIN_* in Metro env)..."
  open_route "capture/login"
  sleep 15

  open_route "capture/home"
  sleep 5
  capture "03-home-top-picks.png"
  open_route "capture/games"
  capture "04-games-model-picks.png"
  open_route "capture/trending"
  capture "05-trending-picks.png"
  GAME_ID="$(fetch_soccer_game_id)"
  if [[ -n "$GAME_ID" ]]; then
    open_route "capture/game/${GAME_ID}"
    sleep 8
  else
    log "No soccer game id from API — capturing Games tab for shot 06"
    open_route "capture/games"
    sleep 8
  fi
  capture "06-game-detail-prediction.png"
  open_route "capture/paywall"
  capture "07-subscription-paywall.png"
  open_route "capture/favorites"
  capture "08-favorites.png"
  open_route "capture/profile"
  capture "09-profile.png"
  open_route "capture/leaderboards"
  capture "10-leaderboards.png"
}

capture_paywall_only() {
  log "=== Paywall screenshot only (07-subscription-paywall.png) ==="
  log "Uses capture/paywall (guest paywall in dev, or capture/login if Metro has review credentials)."
  require_app_installed
  xcrun simctl terminate booted "$SCHEME" 2>/dev/null || true
  sleep 1
  xcrun simctl launch booted "$SCHEME" 2>&1 || true
  log "Waiting for app + Metro bundle (25s)..."
  sleep 25
  if [[ -n "${EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL:-}" && -n "${EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD:-}" ]]; then
    open_route "capture/login"
    sleep 12
  fi
  open_route "capture/paywall"
  sleep 4
  open_route "paywall"
  log "Waiting for paywall + legal footer scroll (10s)..."
  sleep 10
  capture "07-subscription-paywall.png"
  log "Regenerating iPad 13\" from iPhone shot..."
  "$SCRIPT_DIR/resize-screenshots-ipad-13.sh" "$OUT_DIR" "${MOBILE_DIR}/app-store-screenshots/ipad-13-inch" 2>/dev/null || {
    log "iPad resize skipped (install Pillow: pip3 install Pillow)"
  }
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [guest|auth|auth-auto|all|interactive|paywall]

  guest        Landing + Accuracy (automated)
  auth         Home–Leaderboards — YOU navigate, script captures (recommended)
  auth-auto    Same routes via capture/* deep links (only if already logged in)
  all          guest + auth (manual)
  interactive  Same as auth after guest shots
  paywall      Shot 07 only (capture/paywall) + iPad 13" resize
  landing      Shot 01 only (guest Landing hero) + iPad 13" resize

Output: $OUT_DIR
EOF
}

main() {
  boot_sim
  clean_status_bar
  trap clear_status_bar EXIT

  case "${1:-interactive}" in
    guest) capture_guest ;;
    auth) capture_authenticated ;;
    auth-auto) capture_authenticated_auto ;;
    all) capture_guest; capture_authenticated ;;
    interactive)
      capture_guest
      capture_authenticated
      ;;
    paywall) capture_paywall_only ;;
    landing) capture_landing_only ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac

  log "Done. Upload PNGs from: $OUT_DIR"
  ls -la "$OUT_DIR"/*.png 2>/dev/null || true
}

main "$@"
