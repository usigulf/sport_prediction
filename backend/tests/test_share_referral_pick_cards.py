"""P4-003: Referral-aware share pick cards and URLs."""
from pathlib import Path

from fastapi import status

from app.models.user import User
from app.services.share_referral_service import (
    build_share_deep_link,
    build_share_web_url,
    pick_favored_team,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_share_web_url_includes_game_and_referral():
    url = build_share_web_url("abc-123", "user-456")
    assert "game=abc-123" in url
    assert "ref=user-456" in url
    assert url.startswith("https://www.octobetiq.com/")


def test_share_web_url_omits_ref_for_guests():
    url = build_share_web_url("abc-123", None)
    assert "game=abc-123" in url
    assert "ref=" not in url


def test_share_deep_link_includes_referral_query():
    link = build_share_deep_link("abc-123", "user-456")
    assert link == "com.sportsprediction.app://game/abc-123?ref=user-456"


def test_pick_favored_team_prefers_home_on_tie():
    team, pct = pick_favored_team("Home FC", "Away FC", 0.55, 0.45)
    assert team == "Home FC"
    assert pct == 55


def test_share_pick_returns_referral_url_for_authenticated_user(
    client, auth_headers, test_game, test_prediction, db
):
    user = db.query(User).filter(User.email == "test@example.com").first()
    response = client.post(
        f"/api/v1/games/{test_game.id}/share",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["share_url"]
    assert f"game={test_game.id}" in body["share_url"]
    assert f"ref={user.id}" in body["share_url"]
    assert body["deep_link"].startswith("com.sportsprediction.app://game/")
    assert f"ref={user.id}" in body["deep_link"]
    assert body["share_url"] in body["message"]
    card = body["card"]
    assert card["home_name"]
    assert card["away_name"]
    assert card["referral_code"] == str(user.id)
    assert card.get("favored_team")
    assert card.get("pick_probability_pct") is not None


def test_share_pick_guest_url_has_game_without_ref(client, test_game, test_prediction):
    response = client.post(f"/api/v1/games/{test_game.id}/share")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert f"game={test_game.id}" in body["share_url"]
    assert "ref=" not in body["share_url"]
    assert body["card"]["referral_code"] is None
    assert body["card"]["confidence"] is None


def test_mobile_share_pick_card_component_exists():
    src = (REPO_ROOT / "mobile" / "src" / "components" / "SharePickCard.tsx").read_text(
        encoding="utf-8"
    )
    assert "SharePickCard" in src
    assert "buildSharePickCardData" in src
    assert "referral link" in src.lower()


def test_game_detail_renders_share_pick_card():
    screen = (REPO_ROOT / "mobile" / "src" / "screens" / "GameDetailScreen.tsx").read_text(
        encoding="utf-8"
    )
    assert "SharePickCard" in screen
    assert "buildSharePickCardData" in screen
    assert "shareMessage" in screen
    assert "deep_link" in screen


def test_web_landing_handles_referral_query_params():
    html = (REPO_ROOT / "web" / "index.html").read_text(encoding="utf-8")
    assert "handleReferralLanding" in html
    assert "octobet_referral" in html
    assert "apps.apple.com/app/id6762173223" in html


def test_share_referral_service_module_exists():
    path = REPO_ROOT / "backend" / "app" / "services" / "share_referral_service.py"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "build_share_web_url" in text
    assert "build_share_card" in text
