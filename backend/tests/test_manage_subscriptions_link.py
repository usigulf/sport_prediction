"""P3-005: functional iOS Manage Subscriptions link (App Store 3.1.2)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"

IOS_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions"


def test_manage_subscriptions_util_targets_ios_app_store():
    util = (MOBILE / "src/utils/manageSubscriptions.ts").read_text(encoding="utf-8")
    assert IOS_SUBSCRIPTIONS_URL in util
    assert "Platform.OS === 'ios'" in util
    assert "openIosManageSubscriptions" in util


def test_subscription_legal_footer_links_manage_subscriptions_on_ios():
    footer = (MOBILE / "src/components/SubscriptionLegalFooter.tsx").read_text(encoding="utf-8")
    assert "openIosManageSubscriptions" in footer
    assert "Manage subscriptions" in footer
    assert "Platform.OS === 'ios'" in footer


def test_settings_exposes_manage_subscriptions_on_ios():
    settings = (MOBILE / "src/screens/SettingsScreen.tsx").read_text(encoding="utf-8")
    assert "openIosManageSubscriptions" in settings
    assert "isIosManageSubscriptionsAvailable" in settings
    assert "Manage subscriptions" in settings


def test_paywall_shows_manage_link_for_active_subscribers_on_ios():
    paywall = (MOBILE / "src/screens/PaywallScreen.tsx").read_text(encoding="utf-8")
    assert "openIosManageSubscriptions" in paywall
    assert "Manage subscription in App Store" in paywall
    assert "currentTier !== 'free'" in paywall
