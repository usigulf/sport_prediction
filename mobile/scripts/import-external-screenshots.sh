#!/usr/bin/env bash
# Import finished App Store screenshots from external folders → asc-upload/.
#
# iPhone 6.5" (1284×2778): APP_SCREENSHOT_SRC (default ~/Documents/app_screenshot)
# iPad 13"   (2064×2752): APP_SCREENSHOT_IPAD_SRC (default ~/Documents/app_ipad)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_IPHONE="${APP_SCREENSHOT_SRC:-/Users/Users/Documents/app_screenshot}"
SRC_IPAD="${APP_SCREENSHOT_IPAD_SRC:-/Users/Users/Documents/app_ipad}"
OUT_IPHONE="${MOBILE_DIR}/app-store-screenshots/6.5-inch/asc-upload"
OUT_IPAD="${MOBILE_DIR}/app-store-screenshots/ipad-13-inch/asc-upload"

log() { echo "→ $*"; }

import_screenshots() {
  local src_dir="$1"
  local out_dir="$2"
  local target_w="$3"
  local target_h="$4"
  local label="$5"

  if [[ ! -d "$src_dir" ]]; then
    echo "Source folder not found: ${src_dir}"
    return 1
  fi

  mkdir -p "$out_dir"
  log "${label}: ${src_dir} → ${out_dir} (${target_w}×${target_h})"

  python3 - "$src_dir" "$out_dir" "$target_w" "$target_h" <<'PY'
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip3 install Pillow")

src_dir, out_dir, tw, th = sys.argv[1:5]
src = Path(src_dir)
out = Path(out_dir)
target = (int(tw), int(th))

names = [
    "01-home-top-picks.png",
    "02-game-detail-prediction.png",
    "03-model-accuracy.png",
    "04-trending-picks.png",
    "05-subscription-paywall.png",
    "06-favorites.png",
    "07-games-model-picks.png",
    "08-leaderboards.png",
    "09-landing-hero.png",
    "10-profile.png",
]
labels = [
    "Home — Best Picks",
    "Game detail",
    "Model accuracy",
    "Trending",
    "Paywall",
    "Favorites",
    "Games",
    "Leaderboards",
    "Landing hero",
    "Profile",
]

files = sorted(src.glob("*.png"), key=lambda p: p.name.lower())
if len(files) < len(names):
    raise SystemExit(f"Need {len(names)} PNGs in {src} (found {len(files)})")

for i, name in enumerate(names):
    src_file = files[i]
    im = Image.open(src_file).convert("RGB")
    resized = im.resize(target, Image.Resampling.LANCZOS)
    dest = out / name
    resized.save(dest, "PNG", optimize=True)
    print(f"  {name} ← {src_file.name}  ({labels[i]}) [{im.size[0]}×{im.size[1]} → {target[0]}×{target[1]}]")
PY
}

# Resolve iPad source: explicit env → default app_ipad → app_screenshot/ipad → iPhone folder
if [[ -n "${APP_SCREENSHOT_IPAD_SRC:-}" ]]; then
  IPAD_SRC="$SRC_IPAD"
elif [[ -d "$SRC_IPAD" ]]; then
  IPAD_SRC="$SRC_IPAD"
elif [[ -d "${SRC_IPHONE}/ipad" ]]; then
  IPAD_SRC="${SRC_IPHONE}/ipad"
else
  IPAD_SRC="$SRC_IPHONE"
fi

import_screenshots "$SRC_IPHONE" "$OUT_IPHONE" 1284 2778 "iPhone 6.5\""
echo ""
import_screenshots "$IPAD_SRC" "$OUT_IPAD" 2064 2752 "iPad 13\""

echo ""
log "iPhone asc-upload → ${OUT_IPHONE}"
log "iPad asc-upload   → ${OUT_IPAD}"
if [[ "$IPAD_SRC" == "$SRC_IPHONE" ]]; then
  log "Tip: add iPad PNGs to ~/Documents/app_ipad/ (or set APP_SCREENSHOT_IPAD_SRC)."
fi
log "Upload 01→10 from each asc-upload/ folder to App Store Connect."
