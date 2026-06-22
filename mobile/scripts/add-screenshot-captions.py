#!/usr/bin/env python3
"""
Add branded headline banners to App Store screenshots.
Output: app-store-screenshots/6.5-inch/asc-upload/01-....png (reordered for conversion)
"""
from __future__ import annotations

import json
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("Install Pillow: pip3 install Pillow")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app-store-screenshots" / "6.5-inch"
OUT = SRC / "asc-upload"

# octobetiQ brand
BG = (10, 20, 40)  # #0A1428
ACCENT = (0, 255, 159)  # #00FF9F
TEXT = (255, 255, 255)
SUBTEXT = (180, 195, 220)

# source filename → (headline, subtitle)
CAPTIONS: dict[str, tuple[str, str]] = {
    "01-landing-hero.png": (
        "Smarter Sports Predictions",
        "AI picks across major competitions worldwide",
    ),
    "02-model-accuracy.png": (
        "Accuracy You Can Verify",
        "Methodology & rolling stats on every finished game",
    ),
    "03-home-top-picks.png": (
        "AI Picks That Win More",
        "Daily confidence-ranked plays for you",
    ),
    "04-games-model-picks.png": (
        "Browse Every Match",
        "Upcoming games with model win probabilities",
    ),
    "05-trending-picks.png": (
        "Today's Top Plays",
        "Discover high-confidence picks fast",
    ),
    "06-game-detail-prediction.png": (
        "Win Probability · Deep Context",
        "See the model's read on every matchup",
    ),
    "07-subscription-paywall.png": (
        "Start Your 7-Day Free Trial",
        "Premium · unlimited picks & in-play updates",
    ),
    "08-favorites.png": (
        "Your Leagues. Your Feed.",
        "Personalized Best Picks from favorites",
    ),
    "09-profile.png": (
        "Your Hub",
        "Accuracy, subscription & account in one place",
    ),
    "10-leaderboards.png": (
        "Compete on Accuracy",
        "Challenges & leaderboards for Premium",
    ),
}

# Recommended App Store slot order (product-first for conversion)
UPLOAD_ORDER = [
    "03-home-top-picks.png",
    "06-game-detail-prediction.png",
    "02-model-accuracy.png",
    "05-trending-picks.png",
    "07-subscription-paywall.png",
    "08-favorites.png",
    "04-games-model-picks.png",
    "10-leaderboards.png",
    "01-landing-hero.png",
    "09-profile.png",
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates += [
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
        ]
    else:
        candidates += [
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
        ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def wrap_headline(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def add_banner(im: Image.Image, headline: str, subtitle: str) -> Image.Image:
    w, h = im.size
    base = im.convert("RGBA")
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    banner_h = int(h * 0.26)
    for y in range(banner_h):
        t = y / max(banner_h - 1, 1)
        alpha = int(235 * (1 - t * 0.35))
        draw.line([(0, y), (w, y)], fill=(*BG, alpha))

    pad = int(w * 0.07)
    max_text_w = w - pad * 2
    title_font = load_font(max(42, int(w * 0.052)), bold=True)
    sub_font = load_font(max(24, int(w * 0.028)), bold=False)

    lines = wrap_headline(draw, headline, title_font, max_text_w)
    y = int(h * 0.055)
    for line in lines:
        draw.text((pad, y), line, font=title_font, fill=(*TEXT, 255))
        bbox = draw.textbbox((pad, y), line, font=title_font)
        y = bbox[3] + 6

    accent_w = min(int(w * 0.18), 220)
    draw.rectangle(
        [pad, y + 4, pad + accent_w, y + 8],
        fill=(*ACCENT, 255),
    )
    y += 22

    sub_lines = wrap_headline(draw, subtitle, sub_font, max_text_w)
    for line in sub_lines:
        draw.text((pad, y), line, font=sub_font, fill=(*SUBTEXT, 230))
        bbox = draw.textbbox((pad, y), line, font=sub_font)
        y = bbox[3] + 4

    return Image.alpha_composite(base, overlay).convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for slot, src_name in enumerate(UPLOAD_ORDER, start=1):
        src = SRC / src_name
        if not src.exists():
            raise SystemExit(f"Missing {src}")
        headline, subtitle = CAPTIONS[src_name]
        out_name = f"{slot:02d}-{src_name.split('-', 1)[1]}"
        out_path = OUT / out_name
        im = Image.open(src)
        result = add_banner(im, headline, subtitle)
        result.save(out_path, "PNG", optimize=True)
        manifest.append(
            {
                "slot": slot,
                "source": src_name,
                "output": out_name,
                "headline": headline,
                "subtitle": subtitle,
            }
        )
        print(f"OK {out_name} ← {src_name}")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nUpload PNGs from: {OUT}")
    print("Then run: ./scripts/resize-screenshots-ipad-13.sh asc-upload ipad-13-inch/asc-upload")


if __name__ == "__main__":
    main()
