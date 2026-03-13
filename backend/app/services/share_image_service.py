"""
Generate a shareable image for a pick (game + confidence). Uses Pillow.
"""
import io
import base64
from typing import Optional

try:
    from PIL import Image, ImageDraw, ImageFont
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

# Dark theme to match app: #0A1428 background, #00FF9F accent
BG_COLOR = (10, 20, 40)
ACCENT_COLOR = (0, 255, 159)
TEXT_COLOR = (255, 255, 255)
SUBTLE_COLOR = (176, 190, 197)
WIDTH, HEIGHT = 600, 400


def generate_share_image(
    home_name: str,
    away_name: str,
    confidence: Optional[str] = None,
    league: Optional[str] = None,
) -> Optional[str]:
    """
    Generate a PNG image for sharing. Returns base64-encoded PNG string, or None if Pillow unavailable.
    """
    if not PILLOW_AVAILABLE:
        return None
    img = Image.new("RGB", (WIDTH, HEIGHT), color=BG_COLOR)
    draw = ImageDraw.Draw(img)
    def _font(paths: list, size: int):
        for p in paths:
            try:
                return ImageFont.truetype(p, size)
            except (OSError, IOError):
                continue
        return ImageFont.load_default()
    _paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    font_large = _font(_paths, 28) or ImageFont.load_default()
    font_medium = _font(_paths, 20) or font_large
    font_small = _font(_paths, 16) or font_large

    y = 40
    draw.text((WIDTH // 2, y), "Octobet", fill=ACCENT_COLOR, font=font_large, anchor="mt")
    y += 50
    if league:
        draw.text((WIDTH // 2, y), league.upper().replace("_", " "), fill=SUBTLE_COLOR, font=font_small, anchor="mt")
        y += 28
    draw.text((WIDTH // 2, y), f"{home_name}", fill=TEXT_COLOR, font=font_medium, anchor="mt")
    y += 32
    draw.text((WIDTH // 2, y), "vs", fill=SUBTLE_COLOR, font=font_small, anchor="mt")
    y += 28
    draw.text((WIDTH // 2, y), f"{away_name}", fill=TEXT_COLOR, font=font_medium, anchor="mt")
    y += 40
    if confidence:
        draw.text((WIDTH // 2, y), f"{confidence} confidence", fill=ACCENT_COLOR, font=font_medium, anchor="mt")
        y += 36
    draw.text((WIDTH // 2, HEIGHT - 44), "Get picks in the app", fill=SUBTLE_COLOR, font=font_small, anchor="mt")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")
