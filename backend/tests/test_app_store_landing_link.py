"""P4-002: App Store link on public landing page."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_STORE_URL = "https://apps.apple.com/app/id6762173223"
GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.sportsprediction.app"


def test_web_landing_links_to_app_store():
    html = (REPO_ROOT / "web" / "index.html").read_text(encoding="utf-8")
    assert APP_STORE_URL in html
    assert GOOGLE_PLAY_URL in html
    hero = html.split('aria-label="Welcome"')[1].split("</section>")[0]
    assert APP_STORE_URL in hero


def test_mobile_store_links_constant():
    links = (REPO_ROOT / "mobile" / "src/constants/storeLinks.ts").read_text(encoding="utf-8")
    assert APP_STORE_URL in links
    assert GOOGLE_PLAY_URL in links


def test_mobile_landing_shows_app_store_on_web_only():
    landing = (REPO_ROOT / "mobile" / "src/screens/LandingScreen.tsx").read_text(encoding="utf-8")
    assert "APP_STORE_URL" in landing
    assert "Platform.OS === 'web'" in landing
    assert "Download on the App Store" in landing
    assert "Platform.OS === 'ios'" not in landing
