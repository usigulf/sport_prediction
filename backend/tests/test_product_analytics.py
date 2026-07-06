"""P4-001: optional PostHog product analytics in mobile app."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"


def test_product_analytics_service_is_optional_posthog():
    svc = (MOBILE / "src/services/productAnalytics.ts").read_text(encoding="utf-8")
    assert "EXPO_PUBLIC_POSTHOG_API_KEY" in svc
    assert "isProductAnalyticsEnabled" in svc
    assert "/capture/" in svc


def test_analytics_events_cover_core_funnel():
    events = (MOBILE / "src/constants/analyticsEvents.ts").read_text(encoding="utf-8")
    assert "app_opened" in events
    assert "screen_viewed" in events
    assert "sign_in_completed" in events
    assert "sign_up_completed" in events
    assert "onboarding_completed" in events
    assert "subscription_activated" in events


def test_navigation_tracks_screen_views():
    nav = (MOBILE / "src/navigation/AppNavigator.tsx").read_text(encoding="utf-8")
    assert "trackScreenView" in nav
    assert "onStateChange" in nav


def test_sign_in_and_sign_out_wire_analytics():
    sign_in = (MOBILE / "src/utils/signIn.ts").read_text(encoding="utf-8")
    sign_out = (MOBILE / "src/utils/signOut.ts").read_text(encoding="utf-8")
    assert "trackSignInCompleted" in sign_in
    assert "resetAnalyticsIdentity" in sign_out


def test_env_example_documents_posthog():
    env = (MOBILE / ".env.example").read_text(encoding="utf-8")
    assert "EXPO_PUBLIC_POSTHOG_API_KEY" in env
