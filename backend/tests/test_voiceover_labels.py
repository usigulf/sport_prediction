"""P3-004: VoiceOver labels on bottom tabs and GameCard."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"


def test_tab_bar_accessibility_labels_configured():
    tabs = (MOBILE / "src/navigation/tabAccessibility.ts").read_text(encoding="utf-8")
    nav = (MOBILE / "src/navigation/AppNavigator.tsx").read_text(encoding="utf-8")
    assert "AUTH_TAB_A11Y" in tabs
    assert "GUEST_TAB_A11Y" in tabs
    assert "tabBarAccessibilityLabel: AUTH_TAB_A11Y.Home" in nav
    assert "tabBarAccessibilityLabel: GUEST_TAB_A11Y.Profile" in nav


def test_game_card_builds_voiceover_label():
    util = (MOBILE / "src/utils/gameCardAccessibility.ts").read_text(encoding="utf-8")
    card = (MOBILE / "src/components/GameCard.tsx").read_text(encoding="utf-8")
    assert "buildGameCardAccessibilityLabel" in util
    assert "versus" in util
    assert "buildGameCardAccessibilityLabel(game)" in card
    assert "accessibilityElementsHidden" in card


def test_tab_icons_hidden_from_accessibility_tree():
    nav = (MOBILE / "src/navigation/AppNavigator.tsx").read_text(encoding="utf-8")
    assert nav.count("accessibilityElementsHidden") >= 2
