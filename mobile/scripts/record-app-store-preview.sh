#!/usr/bin/env bash
# Record a 15–30s App Store app preview (iPhone 6.5" slot) from the iOS Simulator.
#
# Prerequisites (same as screenshots):
#   cd mobile
#   EXPO_PUBLIC_HIDE_DEV_UI=true EXPO_PUBLIC_APP_STORE_CAPTURE=true \
#   EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL=appstore-review@octobetiq.com \
#   EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD='AppReview2026!' \
#   npx expo start --dev-client
#
#   npx expo run:ios -d "iPhone 17"   # dev build installed once
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${MOBILE_DIR}/app-store-screenshots/6.5-inch/previews"
DEVICE="${SIMULATOR_DEVICE:-iPhone 17}"
SCHEME="com.sportsprediction.app"
RAW="/tmp/octobetiq-preview-raw.mov"
# App Store Connect → iPhone 6.5" Display (portrait preview)
TARGET_W=886
TARGET_H=1920
MAX_SECONDS="${PREVIEW_MAX_SECONDS:-28}"

mkdir -p "$OUT_DIR"

log() { echo "▸ $*"; }

boot_sim() {
  local booted_name
  booted_name="$(xcrun simctl list devices booted 2>/dev/null | grep Booted | sed 's/^[[:space:]]*//' | cut -d'(' -f1 | sed 's/[[:space:]]*$//' || true)"
  if [[ -n "$booted_name" && "$booted_name" != "$DEVICE" ]]; then
    log "Shutting down $booted_name"
    xcrun simctl shutdown booted 2>/dev/null || true
    sleep 2
    booted_name=""
  fi
  if [[ -z "$booted_name" ]]; then
    log "Booting $DEVICE..."
    xcrun simctl boot "$DEVICE" 2>/dev/null || true
    sleep 4
  fi
}

clean_status_bar() {
  log "Status bar → 9:41"
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
    echo "Error: $SCHEME not installed. Run: cd mobile && npx expo run:ios -d \"$DEVICE\""
    exit 1
  fi
}

open_route() {
  local path="$1"
  log "Navigate → ${SCHEME}://${path}"
  xcrun simctl openurl booted "${SCHEME}://${path}" 2>/dev/null || true
}

fetch_soccer_game_id() {
  local api="${EXPO_PUBLIC_API_URL:-https://api.octobetiq.com/api/v1}"
  curl -sf "${api}/games/upcoming?league=premier_league&limit=20" 2>/dev/null \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
games = data if isinstance(data, list) else data.get('games') or []
for g in games:
    if g.get('prediction'):
        print(g['id'])
        break
" 2>/dev/null || true
}

start_recording() {
  rm -f "$RAW"
  log "Recording started (max ${MAX_SECONDS}s)..."
  xcrun simctl io booted recordVideo "$RAW" --codec=h264 --force &
  REC_PID=$!
  sleep 1
}

stop_recording() {
  if [[ -n "${REC_PID:-}" ]]; then
    kill -INT "$REC_PID" 2>/dev/null || true
    wait "$REC_PID" 2>/dev/null || true
    unset REC_PID
  fi
  log "Recording stopped"
}

encode_preview() {
  local out="$OUT_DIR/01-app-preview.mp4"
  if [[ ! -s "$RAW" ]]; then
    echo "Error: no recording at $RAW"
    exit 1
  fi
  if command -v ffmpeg >/dev/null 2>&1; then
    log "Encoding → ${TARGET_W}×${TARGET_H} H.264 (${MAX_SECONDS}s max)..."
    ffmpeg -y -hide_banner -loglevel error \
      -i "$RAW" \
      -t "$MAX_SECONDS" \
      -vf "scale=${TARGET_W}:${TARGET_H}:force_original_aspect_ratio=decrease,pad=${TARGET_W}:${TARGET_H}:(ow-iw)/2:(oh-ih)/2:color=0x0A1428,setsar=1" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 -movflags +faststart \
      -an \
      "$out"
    log "Saved $out"
    return
  fi
  if xcrun avconvert --help >/dev/null 2>&1; then
    log "Encoding with avconvert (HEVC, ${MAX_SECONDS}s trim)..."
    xcrun avconvert --source "$RAW" --preset PresetHEVCHighestQuality \
      --duration "$MAX_SECONDS" --output "$out" --replace 2>/dev/null
    if [[ -s "$out" ]]; then
      log "Saved $out (native simulator resolution; ASC accepts HEVC)"
      cp "$RAW" "$OUT_DIR/01-app-preview-raw.mov"
      return
    fi
  fi
  log "No ffmpeg/avconvert — saving raw .mov for QuickTime export"
  cp "$RAW" "$OUT_DIR/01-app-preview-raw.mov"
  echo "Open in QuickTime → Trim to 28s → File → Export As → 1080p"
}

run_choreography() {
  require_app_installed
  xcrun simctl terminate booted "$SCHEME" 2>/dev/null || true
  sleep 1
  xcrun simctl launch booted "$SCHEME" 2>&1 || true
  log "Waiting for Metro bundle (20s)..."
  sleep 20

  start_recording

  # Story: sign in → home picks → game prediction → accuracy (trust)
  open_route "capture/login"
  sleep 14
  open_route "capture/home"
  sleep 5
  GAME_ID="$(fetch_soccer_game_id)"
  if [[ -n "$GAME_ID" ]]; then
    open_route "capture/game/${GAME_ID}"
    sleep 6
  else
    open_route "capture/games"
    sleep 6
  fi
  open_route "capture/accuracy"
  sleep 5

  stop_recording
}

usage() {
  cat <<EOF
Usage: $(basename "$0")

Records an App Store app preview (~${MAX_SECONDS}s) for iPhone 6.5" Display.

Metro must be running with capture env (see script header).

Output:
  ${OUT_DIR}/01-app-preview.mp4   (886×1920 H.264, no audio)

Upload: App Store Connect → Previews and Screenshots → iPhone 6.5" → App Preview
EOF
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
  esac

  boot_sim
  clean_status_bar
  trap 'stop_recording 2>/dev/null; clear_status_bar' EXIT

  run_choreography
  encode_preview

  log "Done. Upload ${OUT_DIR}/01-app-preview.mp4 to App Store Connect."
}

main "$@"
