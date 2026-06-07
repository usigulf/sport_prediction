#!/usr/bin/env bash
# Letterbox iPhone 6.5" screenshots (1284×2778) → iPad 13" App Store size (2064×2752).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IN_DIR="${1:-$SCRIPT_DIR/../app-store-screenshots/6.5-inch}"
OUT_DIR="${2:-$SCRIPT_DIR/../app-store-screenshots/ipad-13-inch}"
TARGET_W=2064
TARGET_H=2752
BG="#0A1428"

mkdir -p "$OUT_DIR"

python3 <<PY
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip3 install Pillow")

inp = Path("$IN_DIR")
out = Path("$OUT_DIR")
bg = tuple(int("$BG"[i:i+2], 16) for i in (1, 3, 5))

for src in sorted(inp.glob("*.png")):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    scale = $TARGET_H / h
    nw, nh = int(w * scale), int(h * scale)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", ($TARGET_W, $TARGET_H), bg)
    canvas.paste(resized, (($TARGET_W - nw) // 2, ($TARGET_H - nh) // 2))
    dest = out / src.name
    canvas.save(dest, "PNG", optimize=True)
    print(f"OK {dest.name} ({nw}x{nh} on {$TARGET_W}x{$TARGET_H})")
PY

echo "Upload PNGs from: $OUT_DIR"
