"""Phase-2 audit fixes: guest paywall, feed errors, webhook Sentry, uptime probe."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_guest_stack_always_includes_paywall():
    nav = (REPO_ROOT / "mobile" / "src" / "navigation" / "AppNavigator.tsx").read_text(
        encoding="utf-8"
    )
    guest = nav.split("function GuestStack")[1].split("function MainTabs")[0]
    assert 'name="Paywall"' in guest
    assert "captureRoutesEnabled()" not in guest or guest.count("Paywall") >= 1
    assert "captureRoutesEnabled() ?" not in guest.split("Paywall")[0][-200:]


def test_paywall_supports_guest_preview():
    paywall = (REPO_ROOT / "mobile" / "src" / "screens" / "PaywallScreen.tsx").read_text(
        encoding="utf-8"
    )
    assert "guestPreview" in paywall
    assert "Register" in paywall


def test_guest_profile_links_to_paywall():
    profile = (REPO_ROOT / "mobile" / "src" / "screens" / "GuestProfileScreen.tsx").read_text(
        encoding="utf-8"
    )
    assert "Paywall" in profile


def test_home_screen_surfaces_feed_errors():
    home_dir = REPO_ROOT / "mobile" / "src" / "screens" / "home"
    for_you = (home_dir / "HomeFeedSections.tsx").read_text(encoding="utf-8")
    assert "forYouError" in for_you
    assert "trendingError" in for_you


def test_home_screen_split_into_modules():
    home = REPO_ROOT / "mobile" / "src" / "screens" / "HomeScreen.tsx"
    text = home.read_text(encoding="utf-8")
    assert "useHomeScreenData" in text
    assert "HomeFeedSections" in text
    assert len(text.splitlines()) < 180


def test_subscription_webhooks_report_to_sentry():
    sub = (REPO_ROOT / "backend" / "app" / "api" / "v1" / "subscription.py").read_text(
        encoding="utf-8"
    )
    assert "report_webhook_issue" in sub


def test_sentry_alerts_helper_exists():
    path = REPO_ROOT / "backend" / "app" / "utils" / "sentry_alerts.py"
    assert path.is_file()
    assert "capture_message" in path.read_text(encoding="utf-8")


def test_api_health_check_script():
    script = REPO_ROOT / "scripts" / "check_api_health.sh"
    assert script.is_file()
    text = script.read_text(encoding="utf-8")
    assert "/health" in text
    assert "/ready" in text


def test_crontab_includes_health_check():
    crontab = (REPO_ROOT / "deploy" / "crontab.example").read_text(encoding="utf-8")
    assert "check_api_health.sh" in crontab


def test_offsite_backup_setup_and_verify_scripts():
    setup = REPO_ROOT / "scripts" / "setup_offsite_backup.sh"
    verify = REPO_ROOT / "scripts" / "verify_db_backup.sh"
    offsite = REPO_ROOT / "scripts" / "pg_backup_offsite_copy.sh"
    for path in (setup, verify):
        assert path.is_file(), f"missing {path}"
    offsite_text = offsite.read_text(encoding="utf-8")
    assert "AWS_ENDPOINT_URL" in offsite_text
    assert "pg_backup_offsite.last" in offsite_text
    assert "OFFSITE_REQUIRED" in verify.read_text(encoding="utf-8")
    example = (REPO_ROOT / "docs" / "backup_offsite.env.example").read_text(encoding="utf-8")
    assert "digitaloceanspaces.com" in example


def test_crontab_includes_backup_verify():
    crontab = (REPO_ROOT / "deploy" / "crontab.example").read_text(encoding="utf-8")
    assert "verify_db_backup.sh" in crontab
